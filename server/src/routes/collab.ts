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
  lastPersistError: { at: number; message: string } | null
  lastDbRefreshAt: number
}

const MAPS = new Map<string, ServerMapState>() // key: mapKey (slug)

const DEFAULT_GRAPH: Graph = { users: {}, tasks: {}, rootTaskIds: [] }

function uniqStrings(xs: string[]): string[] {
  return Array.from(new Set(xs.filter((x) => typeof x === 'string' && x.length > 0)))
}

function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function finiteNumber(v: any, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function normalizeGraph(g: Graph): Graph {
  const tasks = (g?.tasks && typeof g.tasks === 'object') ? g.tasks : {}
  const users = (g?.users && typeof g.users === 'object') ? g.users : {}
  const rootTaskIds = Array.isArray(g?.rootTaskIds) ? g.rootTaskIds : []
  const merged: Graph = { tasks, users, rootTaskIds: uniqStrings(rootTaskIds) }
  // Keep only roots that exist.
  merged.rootTaskIds = merged.rootTaskIds.filter((id) => Object.prototype.hasOwnProperty.call(tasks, id))
  return merged
}

// Normalize to avoid "canvas disappears" states:
// - Ensure every task has finite {position.x, position.y}
// - Rebuild children arrays from parentId (single source of truth)
// - If a task references a missing parent, treat it as a root (parentId=null)
// - Ensure rootTaskIds is consistent (and includes all parentId=null tasks)
function sanitizeGraph(g: Graph): Graph {
  const n = normalizeGraph(g)
  const rawTasks = isPlainObject(n.tasks) ? n.tasks : {}
  const tasks: Record<string, any> = {}
  // Avoid extreme coordinates that can make ReactFlow appear blank due to precision/viewport issues.
  const POS_LIMIT = 100000

  // First pass: copy + coerce fields we rely on.
  for (const id of Object.keys(rawTasks)) {
    const t = rawTasks[id]
    if (!isPlainObject(t)) continue
    const parentIdRaw = t.parentId
    const parentId = typeof parentIdRaw === 'string' && parentIdRaw.length > 0 ? parentIdRaw : null
    const position = isPlainObject(t.position)
      ? {
          x: clamp(finiteNumber(t.position.x, 0), -POS_LIMIT, POS_LIMIT),
          y: clamp(finiteNumber(t.position.y, 0), -POS_LIMIT, POS_LIMIT),
        }
      : { x: 0, y: 0 }
    tasks[id] = {
      ...t,
      id: typeof t.id === 'string' && t.id.length > 0 ? t.id : id,
      title: typeof t.title === 'string' ? t.title : '',
      parentId,
      // children is rebuilt below
      children: [],
      dependsOn: Array.isArray(t.dependsOn) ? uniqStrings(t.dependsOn) : [],
      // `expanded` is UI-only; ignore incoming to avoid hiding nodes across clients.
      expanded: undefined,
      // Conflict resolution uses this. Default to 0 for legacy snapshots.
      updatedAt: finiteNumber((t as any).updatedAt, 0),
      position,
    }
  }

  // Second pass: fix missing parent -> root, rebuild children.
  for (const id of Object.keys(tasks)) {
    const t = tasks[id]
    const pid = t.parentId as string | null
    if (pid && !tasks[pid]) {
      t.parentId = null
    }
  }
  for (const id of Object.keys(tasks)) {
    const t = tasks[id]
    const pid = t.parentId as string | null
    if (pid && tasks[pid]) {
      tasks[pid].children.push(id)
    }
  }

  // Third pass: default expanded safely.
  // Always keep parents expanded so children don't "disappear" across clients.
  for (const id of Object.keys(tasks)) {
    const t = tasks[id]
    if (Array.isArray(t.children) && t.children.length > 0) t.expanded = true
  }

  const incomingRoots = Array.isArray(n.rootTaskIds) ? uniqStrings(n.rootTaskIds) : []
  const derivedRoots = Object.keys(tasks).filter((id) => !tasks[id]?.parentId)
  const rootTaskIds = uniqStrings([...incomingRoots, ...derivedRoots]).filter((id) => Object.prototype.hasOwnProperty.call(tasks, id))

  return { users: isPlainObject(n.users) ? n.users : {}, tasks, rootTaskIds }
}

// Merge policy to prevent catastrophic "wipe":
// - Incoming graph updates/overrides existing tasks by id
// - Missing tasks in incoming do NOT delete existing tasks
// - Roots are unioned and de-duped, then filtered to existing tasks
function mergeGraph(prev: Graph, incoming: Graph): Graph {
  const p = normalizeGraph(prev)
  const n = normalizeGraph(incoming)
  const now = Date.now()
  const tasks: Record<string, any> = { ...(p.tasks || {}) }

  // Conflict resolution (prevents rollback):
  // - Prefer the task with newer `updatedAt`
  // - If incoming has no updatedAt (legacy client/snapshot) and prev has updatedAt, ignore incoming
  // - If both lack updatedAt, accept incoming but stamp server-time updatedAt so it becomes stable
  for (const [id, it] of Object.entries(n.tasks || {})) {
    const prevTask = (tasks as any)[id]
    const prevTs = finiteNumber((prevTask as any)?.updatedAt, 0)
    const incTs = finiteNumber((it as any)?.updatedAt, 0)
    if (!prevTask) {
      ;(tasks as any)[id] = incTs > 0 ? it : { ...(it as any), updatedAt: now }
      continue
    }
    if (incTs === 0 && prevTs > 0) {
      continue
    }
    if (prevTs === 0 && incTs === 0) {
      ;(tasks as any)[id] = { ...(it as any), updatedAt: now }
      continue
    }
    if (incTs >= prevTs) {
      ;(tasks as any)[id] = it
    }
  }
  const users = { ...(p.users || {}), ...(n.users || {}) }
  const rootTaskIds = uniqStrings([...(p.rootTaskIds || []), ...(n.rootTaskIds || [])]).filter((id) =>
    Object.prototype.hasOwnProperty.call(tasks, id),
  )
  return sanitizeGraph({ tasks, users, rootTaskIds })
}

function applyDeletions(prev: Graph, deletedTaskIds: string[]): Graph {
  const del = uniqStrings(Array.isArray(deletedTaskIds) ? deletedTaskIds : [])
  if (del.length === 0) return sanitizeGraph(prev)
  const delSet = new Set(del)

  const n = normalizeGraph(prev)
  const tasks: Record<string, any> = { ...(n.tasks || {}) }
  for (const id of delSet) delete tasks[id]

  // Remove references to deleted ids (parent/dependsOn/root).
  for (const id of Object.keys(tasks)) {
    const t = tasks[id]
    if (!isPlainObject(t)) continue
    if (typeof t.parentId === 'string' && delSet.has(t.parentId)) {
      t.parentId = null
    }
    if (Array.isArray(t.dependsOn)) {
      t.dependsOn = t.dependsOn.filter((x: any) => typeof x === 'string' && !delSet.has(x))
    }
  }

  const rootTaskIds = (Array.isArray(n.rootTaskIds) ? n.rootTaskIds : []).filter((id) => typeof id === 'string' && !delSet.has(id))
  return sanitizeGraph({ users: n.users || {}, tasks, rootTaskIds })
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
  // Some maps may have an accidental "empty" snapshot at the head (legacy bug).
  // Prefer the newest snapshot that actually contains tasks; if none exist, fall back to newest.
  const snaps = await prisma.snapshot.findMany({
    where: { mapId },
    orderBy: { createdAt: 'desc' },
    take: 25,
  })
  if (!snaps.length) return null

  const parse = (snap: any): { rev: number; graph: Graph } | null => {
    const data = snap?.data as any
    const rev = typeof data?.rev === 'number' ? data.rev : 0
    const graph = (data?.graph ?? data) as Graph
    if (!graph?.tasks || !graph?.users || !Array.isArray(graph?.rootTaskIds)) return null
    return { rev, graph }
  }

  const parsedAll = snaps.map(parse).filter(Boolean) as Array<{ rev: number; graph: Graph }>
  if (!parsedAll.length) return null

  const nonEmpty = parsedAll.find((p) => Object.keys(p.graph?.tasks || {}).length > 0)
  const fallback = parsedAll[0]!
  return nonEmpty ?? fallback
}

function getOrInitMapState(mapKey: string): ServerMapState {
  let st = MAPS.get(mapKey)
  if (!st) {
    st = { rev: 0, graph: DEFAULT_GRAPH, peers: new Map(), sockets: new Map(), lastPersistError: null, lastDbRefreshAt: 0 }
    MAPS.set(mapKey, st)
  }
  return st
}

async function refreshFromDbIfNewer(mapKey: string, mapId: string, force = false): Promise<ServerMapState> {
  const st = getOrInitMapState(mapKey)
  const now = Date.now()
  if (!force && st.lastDbRefreshAt && now - st.lastDbRefreshAt < 2000) return st
  st.lastDbRefreshAt = now

  const latest = await loadLatestSnapshot(mapId)
  if (!latest) return st

  const latestRev = Number(latest.rev ?? 0)
  const latestTasks = Object.keys(latest.graph?.tasks || {}).length
  const curTasks = Object.keys(st.graph?.tasks || {}).length

  if (latestRev > st.rev || (curTasks === 0 && latestTasks > 0)) {
    st.rev = latestRev
    st.graph = sanitizeGraph(latest.graph)
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

  // GET current graph (for initial load)
  app.get('/api/maps/:mapKey', async (req, reply) => {
    const mapKey = (req.params as any).mapKey as string
    const { mapId } = await ensureSystemMap(mapKey)

    const st0 = getOrInitMapState(mapKey)
    const st = await refreshFromDbIfNewer(mapKey, mapId, st0.rev === 0 && st0.graph === DEFAULT_GRAPH)
    // Always serve a sanitized graph to clients.
    return reply.send({ ok: true, rev: st.rev, graph: sanitizeGraph(st.graph), lastPersistError: st.lastPersistError })
  })

  // POST save graph (for beforeunload/pagehide keepalive flush)
  app.post('/api/maps/:mapKey/state', async (req, reply) => {
    const mapKey = (req.params as any).mapKey as string
    const { mapId } = await ensureSystemMap(mapKey)
    const st = await refreshFromDbIfNewer(mapKey, mapId, false)

    const body = (req.body as any) || {}
    const incomingRev = Number(body.rev ?? -1)
    const graph = body.graph as Graph
    const deletedTaskIds = Array.isArray(body.deletedTaskIds) ? (body.deletedTaskIds as string[]) : []
    const clientId = typeof body.clientId === 'string' ? body.clientId : undefined
    if (!graph?.tasks || !graph?.users || !Array.isArray(graph?.rootTaskIds)) {
      return reply.status(400).send({ ok: false, error: 'invalid_graph' })
    }

    // Avoid accepting stale full-state that can rollback newer changes.
    if (Number.isFinite(incomingRev) && incomingRev < st.rev) {
      return reply.send({ ok: true, accepted: false, rev: st.rev })
    }
    // Advance rev safely even if client claims a higher number.
    st.rev = Math.max(st.rev, Number.isFinite(incomingRev) ? incomingRev : st.rev) + 1
    st.graph = applyDeletions(mergeGraph(st.graph, graph), deletedTaskIds)

    try {
      await prisma.snapshot.create({
        data: { mapId, data: { rev: st.rev, graph: st.graph } as any, createdBy: clientId },
      })
      st.lastPersistError = null
    } catch (e: any) {
      const msg = String(e?.message || e || 'snapshot_create_failed')
      st.lastPersistError = { at: Date.now(), message: msg }
    }

    // Broadcast to connected peers (best-effort).
    const stateMsg = { type: 'state', rev: st.rev, graph: st.graph, from: clientId ?? 'http' }
    broadcast(mapKey, stateMsg)
    return reply.send({ ok: true, accepted: true, rev: st.rev })
  })

  // WS: realtime collaboration
  // @ts-ignore - @fastify/websocket route option types
  app.get('/ws/:mapKey', { websocket: true }, (conn, req: any) => {
    // Avoid `async` websocket handler; some versions close the socket when the handler promise resolves.
    ;(async () => {
      const ws: any = (conn as any)?.socket ?? conn

      // NOTE: Depending on fastify/websocket versions, `req` may be FastifyRequest or raw IncomingMessage-like.
      // We parse from URL to be robust.
      const rawUrl: string = (req?.raw?.url as string) || (req?.url as string) || ''
      const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `http://local${rawUrl}`)

      const mapKey =
        ((req?.params as any)?.mapKey as string) ||
        urlObj.pathname.split('/').filter(Boolean).slice(-1)[0] ||
        'default'

      const q = Object.fromEntries(urlObj.searchParams.entries()) as Record<string, string>
      const headers = (req?.headers as any) || (req?.raw?.headers as any) || {}

      const clientId = (q.clientId as string) || (headers['x-client-id'] as string) || ''
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
      const st = await refreshFromDbIfNewer(mapKey, mapId, false)

      // register socket
      const set = st.sockets.get(clientId) ?? new Set<any>()
      set.add(ws)
      st.sockets.set(clientId, set)

      st.peers.set(clientId, { clientId, name, color, updatedAt: Date.now() })

      // send init
      wsSend(ws, {
        type: 'init',
        rev: st.rev,
        graph: sanitizeGraph(st.graph),
        peers: Array.from(st.peers.values()),
      })
      broadcast(mapKey, { type: 'peer:join', peer: st.peers.get(clientId) }, clientId)

      ws?.on?.('message', async (raw: any) => {
        let msg: any
        try {
          msg = JSON.parse(raw.toString())
        } catch {
          return
        }

        // Heartbeat (keep connections alive through proxies)
        if (msg?.type === 'ping') {
          wsSend(ws, { type: 'pong', t: Number(msg.t ?? Date.now()) })
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
          const deletedTaskIds = Array.isArray(msg.deletedTaskIds) ? (msg.deletedTaskIds as string[]) : []
          if (!graph?.tasks || !graph?.users || !Array.isArray(graph?.rootTaskIds)) return

          // Refresh from DB to avoid stale in-memory state on multi-instance setups.
          await refreshFromDbIfNewer(mapKey, mapId, false)

          // Avoid accepting stale full-state that can rollback newer changes.
          if (Number.isFinite(incomingRev) && incomingRev < st.rev) {
            // Force the sender to resync (prevents "stuck edits" while keeping server authoritative).
            wsSend(ws, { type: 'state', rev: st.rev, graph: st.graph, from: 'server' })
            return
          }

          // Advance rev safely even if client claims a higher number.
          st.rev = Math.max(st.rev, Number.isFinite(incomingRev) ? incomingRev : st.rev) + 1
          // Merge instead of replace to avoid wiping others' tasks when a stale/empty graph arrives.
          st.graph = applyDeletions(mergeGraph(st.graph, graph), deletedTaskIds)

          // persist snapshot (best-effort)
          try {
            await prisma.snapshot.create({
              data: { mapId, data: { rev: st.rev, graph: st.graph } as any, createdBy: clientId },
            })
            st.lastPersistError = null
          } catch {
            // surface to clients via init/api
            st.lastPersistError = { at: Date.now(), message: 'snapshot_create_failed' }
          }

          // IMPORTANT: also notify the sender so it can advance its local rev.
          // Without this, single-user edits can get stuck once the sender's rev lags behind.
          const stateMsg = { type: 'state', rev: st.rev, graph: st.graph, from: clientId }
          wsSend(ws, stateMsg)
          broadcast(mapKey, stateMsg, clientId)
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
      // best-effort close (connection might already be gone)
      try {
        const ws: any = (conn as any)?.socket ?? conn
        ws?.close?.(1011, 'server_error')
      } catch {}
    })
  })
}







