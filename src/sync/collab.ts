import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store'

type Graph = { users: Record<string, any>; tasks: Record<string, any>; rootTaskIds: string[] }

export type PeerPresence = {
  clientId: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  selectedIds?: string[]
  updatedAt: number
}

type CollabState = {
  connected: boolean
  reconnecting: boolean
  offlineSince: number | null
  rev: number
  peers: PeerPresence[]
  me: { clientId: string; name: string; color: string }
}

function randomColor() {
  const colors = ['#0ea5e9', '#10b981', '#e11d48', '#f59e0b', '#8b5cf6', '#22c55e', '#06b6d4']
  return colors[Math.floor(Math.random() * colors.length)]
}

function getClientId(): string {
  const key = 'taskmap-client-id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = `c_${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem(key, id)
  return id
}

function getMe(): { clientId: string; name: string; color: string } {
  const key = 'taskmap-me'
  const id = getClientId()
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.name && parsed?.color) return { clientId: id, name: parsed.name, color: parsed.color }
    } catch {}
  }
  const me = { clientId: id, name: `User-${id.slice(-4)}`, color: randomColor() }
  localStorage.setItem(key, JSON.stringify({ name: me.name, color: me.color }))
  return me
}

function getMapKey(): string {
  const url = new URL(window.location.href)
  return url.searchParams.get('map') || 'default'
}

function apiBase(): string {
  // Prefer same-origin (nginx reverse proxy).
  // Optional override for local dev without using import.meta (tsconfig is CJS).
  // Set in DevTools: localStorage.setItem('taskmap-api-base', 'http://localhost:8080')
  return (localStorage.getItem('taskmap-api-base') || '').trim()
}

function isDebug(): boolean {
  return localStorage.getItem('taskmap-debug') === '1'
}
function dlog(...args: any[]) {
  if (isDebug()) console.log(...args)
}
function derr(...args: any[]) {
  if (isDebug()) console.error(...args)
}

function rememberAnomaly(kind: string, info: any) {
  try {
    localStorage.setItem('taskmap-last-sync-anomaly', JSON.stringify({ at: Date.now(), kind, info }))
  } catch {}
}

// UI-only fields must not be synced across clients.
function stripUiFieldsFromGraph(g: Graph): Graph {
  const tasks: Record<string, any> = {}
  for (const [id, t] of Object.entries(g.tasks || {})) {
    if (!t || typeof t !== 'object') continue
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { expanded, ...rest } = t as any
    tasks[id] = rest
  }
  return { users: g.users || {}, tasks, rootTaskIds: Array.isArray(g.rootTaskIds) ? g.rootTaskIds : [] }
}

function wsBase(): string {
  const base = apiBase()
  if (base) {
    const wsUrl = base.replace(/^http/, 'ws')
    dlog('[Collab] Using apiBase override:', wsUrl)
    return wsUrl
  }
  const originWs = window.location.origin.replace(/^http/, 'ws')
  dlog('[Collab] Using window.location.origin:', originWs)
  return originWs
}

type CollabApi = {
  collab: CollabState
  sendPresence: (p: { cursor?: { x: number; y: number }; selectedIds?: string[] }) => void
}

const CollabContext = createContext<CollabApi | null>(null)

export function CollabProvider(props: { children: any }) {
  const api = useCollab()
  // JSX を使わずに Provider を返す（.ts のまま維持）
  return createElement(CollabContext.Provider, { value: api }, props.children)
}

export function useCollabContext(): CollabApi {
  const v = useContext(CollabContext)
  if (!v) throw new Error('useCollabContext must be used within <CollabProvider>')
  return v
}

export function useCollab() {
  const mapKey = useMemo(() => getMapKey(), [])
  const me = useMemo(() => getMe(), [])
  const [state, setState] = useState<CollabState>({ connected: false, reconnecting: false, offlineSince: null, rev: 0, peers: [], me })

  const wsRef = useRef<WebSocket | null>(null)
  const unmountedRef = useRef(false)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const heartbeatTimerRef = useRef<number | null>(null)
  const lastPongAtRef = useRef<number>(Date.now())
  const ignoreNextRef = useRef(false)
  const lastSentGraphRef = useRef<string>('')
  const revRef = useRef(0)
  const bootstrappedRef = useRef(false)
  const hasInitRef = useRef(false)
  const serverEmptyAtInitRef = useRef<boolean | null>(null)
  const sendTimerRef = useRef<number | null>(null)
  // Track deletions robustly:
  // - lastLocalIdsRef: last observed local ids (for diffing)
  // - pendingDeletedIdsRef: deletions since last server ack (sent on next state)
  const lastLocalIdsRef = useRef<Set<string> | null>(null)
  const pendingDeletedIdsRef = useRef<Set<string>>(new Set())

  // Seed deletion diff baseline so "first change is delete" is handled.
  useEffect(() => {
    try {
      lastLocalIdsRef.current = new Set(Object.keys((useAppStore.getState().tasks as any) || {}))
    } catch {
      lastLocalIdsRef.current = new Set()
    }
  }, [])

  // Initial load from server (best-effort)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapKey)}`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data?.lastPersistError) {
          rememberAnomaly('server_persist_error', data.lastPersistError)
        }
        if (data?.graph) {
          const remote = data.graph as Graph
          const local = useAppStore.getState()
          const localCount = Object.keys(local.tasks || {}).length
          const remoteCount = Object.keys(remote.tasks || {}).length
          // If server is empty but local has data (first time), don't wipe local.
          if (remoteCount === 0 && localCount > 0) {
            rememberAnomaly('api_empty_graph', { localCount, rev: data.rev })
            // Keep baseline in sync with current local tasks to support deletions.
            lastLocalIdsRef.current = new Set(Object.keys((local.tasks as any) || {}))
            pendingDeletedIdsRef.current.clear()
            revRef.current = Number(data.rev ?? 0)
            setState((s) => ({ ...s, rev: revRef.current }))
            return
          }
          ignoreNextRef.current = true
          useAppStore.getState().setGraph(remote)
          // Set baseline to remote graph ids so subsequent deletions are detected.
          lastLocalIdsRef.current = new Set(Object.keys(remote.tasks || {}))
          pendingDeletedIdsRef.current.clear()
          revRef.current = Number(data.rev ?? 0)
          setState((s) => ({ ...s, rev: revRef.current }))
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [mapKey])

  const getOutgoingGraph = (): Graph => {
    const s = useAppStore.getState()
    const graph: Graph = { tasks: s.tasks as any, users: s.users as any, rootTaskIds: s.rootTaskIds as any }
    return stripUiFieldsFromGraph(graph)
  }

  const updatePendingDeletionsFromLocal = (outgoing: Graph) => {
    const nextIds = new Set(Object.keys(outgoing.tasks || {}))
    const prev = lastLocalIdsRef.current
    if (prev) {
      for (const id of prev) {
        if (!nextIds.has(id)) pendingDeletedIdsRef.current.add(id)
      }
      // If an id was re-added locally, remove it from pending deletions.
      for (const id of nextIds) {
        if (pendingDeletedIdsRef.current.has(id)) pendingDeletedIdsRef.current.delete(id)
      }
    }
    lastLocalIdsRef.current = nextIds
  }

  const flushToServer = async (reason: string) => {
    // cancel scheduled ws send
    if (sendTimerRef.current) {
      clearTimeout(sendTimerRef.current)
      sendTimerRef.current = null
    }
    const outgoing = getOutgoingGraph()
    updatePendingDeletionsFromLocal(outgoing)
    const deletedTaskIds = Array.from(pendingDeletedIdsRef.current)
    const ws = wsRef.current
    // Prefer WS when open.
    if (ws && ws.readyState === WebSocket.OPEN && hasInitRef.current) {
      try {
        dlog('[Collab] flush via ws', { reason, rev: revRef.current, tasksCount: Object.keys(outgoing.tasks || {}).length, deleted: deletedTaskIds.length })
        ws.send(JSON.stringify({ type: 'state', rev: revRef.current, graph: outgoing, deletedTaskIds }))
        return
      } catch {}
    }
    // Fallback: HTTP keepalive (works on unload/pagehide)
    try {
      const body = JSON.stringify({ rev: revRef.current, graph: outgoing, deletedTaskIds, clientId: me.clientId })
      await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapKey)}/state`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true as any,
        credentials: 'include',
      } as any)
      dlog('[Collab] flush via http', { reason })
      // Assume accepted best-effort; clear pending deletions so we don't repeat them forever.
      // (Server is still authoritative; if rejected, it'll resend its state on next WS sync.)
      pendingDeletedIdsRef.current.clear()
    } catch (e) {
      derr('[Collab] flush http failed', e)
    }
  }

  const maybeBootstrapLocalToServer = () => {
    if (bootstrappedRef.current) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (!hasInitRef.current) return
    if (serverEmptyAtInitRef.current !== true) return
    const s = useAppStore.getState()
    const graph: Graph = { tasks: s.tasks as any, users: s.users as any, rootTaskIds: s.rootTaskIds as any }
    const localCount = Object.keys(graph.tasks || {}).length
    if (localCount === 0) return
    bootstrappedRef.current = true
    try {
      ws.send(JSON.stringify({ type: 'state', rev: revRef.current, graph }))
    } catch {}
  }

  // WebSocket connect
  useEffect(() => {
    const qs = new URLSearchParams({
      clientId: me.clientId,
      name: me.name,
      color: me.color,
    }).toString()
    const wsUrl = `${wsBase()}/ws/${encodeURIComponent(mapKey)}?${qs}`
    unmountedRef.current = false

    const clearTimers = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
    }

    const scheduleReconnect = (reason: string) => {
      if (unmountedRef.current) return
      const attempt = Math.min(12, reconnectAttemptRef.current + 1)
      reconnectAttemptRef.current = attempt
      const base = 800 // ms
      const max = 15000 // ms
      const delay = Math.min(max, Math.round(base * Math.pow(1.6, attempt - 1)))
      dlog('[Collab] scheduleReconnect', { attempt, delay, reason })
      setState((s) => ({ ...s, connected: false, reconnecting: true, offlineSince: s.offlineSince ?? Date.now() }))
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = window.setTimeout(() => {
        connect('timer')
      }, delay)
    }

    const connect = (trigger: string) => {
      if (unmountedRef.current) return

      clearTimers()
      try {
        wsRef.current?.close?.()
      } catch {}
      wsRef.current = null

      lastPongAtRef.current = Date.now()
      hasInitRef.current = false

      dlog('[Collab] Connecting to WebSocket:', { wsUrl, trigger })
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        dlog('[Collab] WebSocket connected')
        reconnectAttemptRef.current = 0
        lastPongAtRef.current = Date.now()
        setState((s) => ({ ...s, connected: true, reconnecting: false, offlineSince: null }))

        // Heartbeat (keepalive + detect half-open connections)
        heartbeatTimerRef.current = window.setInterval(() => {
          const w = wsRef.current
          if (!w || w.readyState !== WebSocket.OPEN) return
          try {
            w.send(JSON.stringify({ type: 'ping', t: Date.now() }))
          } catch {}

          // If we haven't received pong for a while, force reconnect.
          if (Date.now() - lastPongAtRef.current > 70000) {
            try {
              w.close()
            } catch {}
          }
        }, 25000)
      }

      ws.onclose = (ev) => {
        dlog('[Collab] WebSocket closed', ev.code, ev.reason)
        clearTimers()
        setState((s) => ({ ...s, connected: false, reconnecting: true, offlineSince: s.offlineSince ?? Date.now() }))
        scheduleReconnect('close')
      }

      ws.onerror = (ev) => {
        derr('[Collab] WebSocket error', ev)
        // close -> reconnect (some browsers don't reliably fire close after error)
        try {
          ws.close()
        } catch {}
      }

      ws.onmessage = (ev) => {
        let msg: any
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }

        if (msg?.type === 'pong') {
          lastPongAtRef.current = Date.now()
          return
        }

        if (msg?.type === 'init') {
          dlog('[Collab] Received init message', { rev: msg.rev, peersCount: msg.peers?.length, tasksCount: Object.keys(msg.graph?.tasks || {}).length })
          hasInitRef.current = true
          if (msg.graph) {
            const remote = msg.graph as Graph
            const local = useAppStore.getState()
            const localCount = Object.keys(local.tasks || {}).length
            const remoteCount = Object.keys(remote.tasks || {}).length
            serverEmptyAtInitRef.current = remoteCount === 0
            // If server is empty but local has data (first time), bootstrap local -> server once.
            if (remoteCount === 0 && localCount > 0) {
              rememberAnomaly('ws_init_empty_graph', { localCount, rev: msg.rev })
              revRef.current = Number(msg.rev ?? revRef.current)
              setState((s) => ({ ...s, rev: Number(msg.rev ?? s.rev) }))
              maybeBootstrapLocalToServer()
            } else {
              ignoreNextRef.current = true
              useAppStore.getState().setGraph(remote)
              lastLocalIdsRef.current = new Set(Object.keys(remote.tasks || {}))
              pendingDeletedIdsRef.current.clear()
            }
          }
          if (Array.isArray(msg.peers)) {
            setState((s) => ({ ...s, peers: msg.peers as PeerPresence[], rev: Number(msg.rev ?? s.rev) }))
            revRef.current = Number(msg.rev ?? revRef.current)
          }
          return
        }
        if (msg?.type === 'peer:join') {
          const p = msg.peer as PeerPresence
          setState((s) => ({ ...s, peers: [...s.peers.filter((x) => x.clientId !== p.clientId), p] }))
          return
        }
        if (msg?.type === 'peer:leave') {
          const cid = msg.clientId as string
          setState((s) => ({ ...s, peers: s.peers.filter((x) => x.clientId !== cid) }))
          return
        }
        if (msg?.type === 'presence') {
          const p = msg.peer as PeerPresence
          setState((s) => ({ ...s, peers: [...s.peers.filter((x) => x.clientId !== p.clientId), p] }))
          return
        }
        if (msg?.type === 'state') {
          if (msg.graph) {
            dlog('[Collab] Received state update', { rev: msg.rev, from: msg.from, tasksCount: Object.keys(msg.graph.tasks || {}).length })
            revRef.current = Number(msg.rev ?? revRef.current)
            setState((s) => ({ ...s, rev: revRef.current }))
            // If this is our own update echoed back as an ack, don't re-apply the same graph.
            // But do clear pending deletions and advance baselines.
            if (msg.from === me.clientId) {
              const current = getOutgoingGraph()
              lastLocalIdsRef.current = new Set(Object.keys(current.tasks || {}))
              pendingDeletedIdsRef.current.clear()
              return
            }

            // Never apply a total wipe if we already have tasks. (Still allow normal deletes.)
            const remoteCount = Object.keys((msg.graph as any)?.tasks || {}).length
            const localCount = Object.keys(useAppStore.getState().tasks || {}).length
            if (remoteCount === 0 && localCount > 0) {
              rememberAnomaly('ws_state_empty_graph', { localCount, rev: msg.rev, from: msg.from })
              return
            }

            ignoreNextRef.current = true
            useAppStore.getState().setGraph(msg.graph as Graph)
            lastLocalIdsRef.current = new Set(Object.keys(((msg.graph as Graph).tasks as any) || {}))
            pendingDeletedIdsRef.current.clear()
          }
          return
        }
      }
    }

    // initial connect
    connect('effect')

    const onOnline = () => scheduleReconnect('online')
    const onVis = () => {
      if (!document.hidden) {
        const w = wsRef.current
        if (!w || w.readyState === WebSocket.CLOSED) scheduleReconnect('visibility')
      }
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVis)

    // Flush best-effort on unload/navigation (prevents "reload rollback")
    const onPageHide = () => {
      void flushToServer('pagehide')
    }
    const onBeforeUnload = () => {
      void flushToServer('beforeunload')
    }
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      unmountedRef.current = true
      clearTimers()
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      try {
        wsRef.current?.close?.()
      } catch {}
      wsRef.current = null
    }
  }, [mapKey])

  // Subscribe to graph changes and send full-state updates (debounced)
  useEffect(() => {
    let last = ''
    const unsub = useAppStore.subscribe((s) => {
      if (ignoreNextRef.current) {
        ignoreNextRef.current = false
        try {
          lastLocalIdsRef.current = new Set(Object.keys((s.tasks as any) || {}))
          pendingDeletedIdsRef.current.clear()
        } catch {}
        return
      }
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      // init 前に送るとサーバ既存状態を潰しうるので、init 後に限定
      if (!hasInitRef.current) return

      // サーバが空だった場合、ローカルにデータが生えたタイミングで1回だけブートストラップ
      if (serverEmptyAtInitRef.current === true && !bootstrappedRef.current) {
        const count = Object.keys((s.tasks as any) || {}).length
        if (count > 0) {
          // debounceを待たず即送信（初期共有のため）
          maybeBootstrapLocalToServer()
          // 以降は通常同期へ
        }
      }

      const graph: Graph = { tasks: s.tasks as any, users: s.users as any, rootTaskIds: s.rootTaskIds as any }
      const outgoing = stripUiFieldsFromGraph(graph)
      updatePendingDeletionsFromLocal(outgoing)
      const serialized = JSON.stringify(outgoing)
      if (serialized === last) return
      last = serialized
      lastSentGraphRef.current = serialized
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current)
      sendTimerRef.current = window.setTimeout(() => {
        try {
          const deletedTaskIds = Array.from(pendingDeletedIdsRef.current)
          dlog('[Collab] Sending state update', { rev: revRef.current, tasksCount: Object.keys(outgoing.tasks || {}).length, deleted: deletedTaskIds.length })
          ws.send(JSON.stringify({ type: 'state', rev: revRef.current, graph: outgoing, deletedTaskIds }))
        } catch (err) {
          derr('[Collab] Failed to send state', err)
        }
      }, 200)
    })
    return () => unsub()
  }, [])

  const sendPresence = (p: { cursor?: { x: number; y: number }; selectedIds?: string[] }) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'presence', ...p }))
  }

  return { collab: state, sendPresence }
}




