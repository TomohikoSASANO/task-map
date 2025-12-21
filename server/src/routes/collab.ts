// @ts-ignore - @fastify/websocket types may be incomplete
import websocket from '@fastify/websocket'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db'

type Graph = {
  users: Record<string, any>
  tasks: Record<string, any>
  rootTaskIds: string[]
}

type PeerPresence = {
  clientId: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  selectedIds?: string[]
  updatedAt: number
}

type ServerMapState = {
  rev: number
  graph: Graph
  peers: Map<string, PeerPresence>
  sockets: Map<string, Set<any>> // clientId -> sockets
}

const MAPS = new Map<string, ServerMapState>() // key: mapKey (slug)

const DEFAULT_GRAPH: Graph = { users: {}, tasks: {}, rootTaskIds: [] }

const WS_DEBUG = {
  connectCount: 0,
  initSentCount: 0,
  lastConnectAt: 0,
  lastRawUrl: '',
  lastMapKey: '',
  lastClientId: '',
  lastError: '',
}

async function ensureSystemMap(mapKey: string): Promise<{ mapId: string }> {
  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'system@taskmap.local'
  const workspaceName = process.env.DEFAULT_WORKSPACE_NAME || 'Public Workspace'
  const mapName = mapKey

  const user = await prisma.user.upsert({
    where: { email: systemEmail },
    update: {},
    create: { email: systemEmail },
  })

  const workspace = await prisma.workspace.upsert({
    where: { id: `${user.id}-public` },
    update: {},
    create: { id: `${user.id}-public`, name: workspaceName, ownerId: user.id },
  })

  const map = await prisma.map.upsert({
    where: { id: `${workspace.id}-${mapName}` },
    update: {},
    create: { id: `${workspace.id}-${mapName}`, name: mapName, workspaceId: workspace.id },
  })

  return { mapId: map.id }
}

async function loadLatestSnapshot(mapId: string): Promise<{ rev: number; graph: Graph } | null> {
  const snap = await prisma.snapshot.findFirst({
    where: { mapId },
    orderBy: { createdAt: 'desc' },
  })
  if (!snap) return null
  const data = snap.data as any
  const rev = typeof data?.rev === 'number' ? data.rev : 0
  const graph = (data?.graph ?? data) as Graph
  if (!graph?.tasks || !graph?.users || !Array.isArray(graph?.rootTaskIds)) return null
  return { rev, graph }
}

function getOrInitMapState(mapKey: string): ServerMapState {
  let st = MAPS.get(mapKey)
  if (!st) {
    st = { rev: 0, graph: DEFAULT_GRAPH, peers: new Map(), sockets: new Map() }
    MAPS.set(mapKey, st)
  }
  return st
}

function wsSend(ws: any, msg: any) {
  try {
    ws?.send?.(JSON.stringify(msg))
  } catch {}
}

function broadcast(mapKey: string, msg: any, exceptClientId?: string) {
  const st = MAPS.get(mapKey)
  if (!st) return
  for (const [cid, sockSet] of st.sockets.entries()) {
    if (exceptClientId && cid === exceptClientId) continue
    for (const ws of sockSet) wsSend(ws, msg)
  }
}

export async function collabRoutes(app: FastifyInstance) {
  await app.register(websocket)

  // Debug endpoint for diagnosing websocket failures (safe to keep, but can be removed later).
  app.get('/api/ws-debug', async (_req, reply) => {
    return reply.send({ ok: true, ...WS_DEBUG })
  })

  // GET current graph (for initial load)
  app.get('/api/maps/:mapKey', async (req, reply) => {
    const mapKey = (req.params as any).mapKey as string
    const { mapId } = await ensureSystemMap(mapKey)

    const st = getOrInitMapState(mapKey)
    // lazy-load from DB once per process
    if (st.rev === 0 && st.graph === DEFAULT_GRAPH) {
      const latest = await loadLatestSnapshot(mapId)
      if (latest) {
        st.rev = latest.rev
        st.graph = latest.graph
      }
    }
    return reply.send({ ok: true, rev: st.rev, graph: st.graph })
  })

  // WS: realtime collaboration
  // @ts-ignore - @fastify/websocket route option types
  app.get('/ws/:mapKey', { websocket: true }, (conn, req: any) => {
    // Avoid `async` websocket handler; some versions close the socket when the handler promise resolves.
    ;(async () => {
      const ws: any = (conn as any)?.socket ?? conn
      WS_DEBUG.connectCount += 1
      WS_DEBUG.lastConnectAt = Date.now()
      WS_DEBUG.lastError = ''

      // NOTE: Depending on fastify/websocket versions, `req` may be FastifyRequest or raw IncomingMessage-like.
      // We parse from URL to be robust.
      const rawUrl: string = (req?.raw?.url as string) || (req?.url as string) || ''
      WS_DEBUG.lastRawUrl = rawUrl
      const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `http://local${rawUrl}`)

      const mapKey =
        ((req?.params as any)?.mapKey as string) ||
        urlObj.pathname.split('/').filter(Boolean).slice(-1)[0] ||
        'default'
      WS_DEBUG.lastMapKey = mapKey

      const q = Object.fromEntries(urlObj.searchParams.entries()) as Record<string, string>
      const headers = (req?.headers as any) || (req?.raw?.headers as any) || {}

      const clientId = (q.clientId as string) || (headers['x-client-id'] as string) || ''
      WS_DEBUG.lastClientId = clientId
      const name = (q.name as string) || (headers['x-client-name'] as string) || 'Anonymous'
      const color = (q.color as string) || (headers['x-client-color'] as string) || '#0ea5e9'

      if (!clientId) {
        wsSend(ws, { type: 'error', error: 'missing_client_id' })
        try {
          ws?.close?.(1008, 'missing_client_id')
        } catch {
          ws?.close?.()
        }
        return
      }

      const { mapId } = await ensureSystemMap(mapKey)
      const st = getOrInitMapState(mapKey)
      if (st.rev === 0 && st.graph === DEFAULT_GRAPH) {
        const latest = await loadLatestSnapshot(mapId)
        if (latest) {
          st.rev = latest.rev
          st.graph = latest.graph
        }
      }

      // register socket
      const set = st.sockets.get(clientId) ?? new Set<any>()
      set.add(ws)
      st.sockets.set(clientId, set)

      st.peers.set(clientId, { clientId, name, color, updatedAt: Date.now() })

      // send init
      wsSend(ws, {
        type: 'init',
        rev: st.rev,
        graph: st.graph,
        peers: Array.from(st.peers.values()),
      })
      WS_DEBUG.initSentCount += 1
      broadcast(mapKey, { type: 'peer:join', peer: st.peers.get(clientId) }, clientId)

      ws?.on?.('message', async (raw: any) => {
        let msg: any
        try {
          msg = JSON.parse(raw.toString())
        } catch {
          return
        }

        if (msg?.type === 'presence') {
          const cur = st.peers.get(clientId)
          if (!cur) return
          const next: PeerPresence = {
            ...cur,
            cursor: msg.cursor ?? cur.cursor,
            selectedIds: Array.isArray(msg.selectedIds) ? msg.selectedIds : cur.selectedIds,
            updatedAt: Date.now(),
          }
          st.peers.set(clientId, next)
          broadcast(mapKey, { type: 'presence', peer: next }, clientId)
          return
        }

        if (msg?.type === 'state') {
          const incomingRev = Number(msg.rev ?? -1)
          const graph = msg.graph as Graph
          if (!graph?.tasks || !graph?.users || !Array.isArray(graph?.rootTaskIds)) return

          // last-write-wins, but ignore obviously old revs
          if (incomingRev < st.rev - 5) return

          st.rev += 1
          st.graph = graph

          // persist snapshot (best-effort)
          try {
            await prisma.snapshot.create({
              data: { mapId, data: { rev: st.rev, graph } as any, createdBy: clientId },
            })
          } catch {
            // ignore
          }

          broadcast(mapKey, { type: 'state', rev: st.rev, graph, from: clientId }, clientId)
          return
        }
      })

      ws?.on?.('close', () => {
        const set = st.sockets.get(clientId)
        if (set) {
          set.delete(ws)
          if (set.size === 0) {
            st.sockets.delete(clientId)
            st.peers.delete(clientId)
            broadcast(mapKey, { type: 'peer:leave', clientId })
          }
        }
      })
    })().catch((err) => {
      WS_DEBUG.lastError = String(err?.message || err || 'unknown_error')
      try {
        ;(conn.socket as any).close?.(1011, 'server_error')
      } catch {}
    })
  })
}






