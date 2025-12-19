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

function wsBase(): string {
  const base = apiBase()
  if (base) return base.replace(/^http/, 'ws')
  return window.location.origin.replace(/^http/, 'ws')
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
  const [state, setState] = useState<CollabState>({ connected: false, rev: 0, peers: [], me })

  const wsRef = useRef<WebSocket | null>(null)
  const ignoreNextRef = useRef(false)
  const lastSentGraphRef = useRef<string>('')
  const revRef = useRef(0)
  const bootstrappedRef = useRef(false)
  const hasInitRef = useRef(false)
  const serverEmptyAtInitRef = useRef<boolean | null>(null)

  // Initial load from server (best-effort)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapKey)}`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data?.graph) {
          const remote = data.graph as Graph
          const local = useAppStore.getState()
          const localCount = Object.keys(local.tasks || {}).length
          const remoteCount = Object.keys(remote.tasks || {}).length
          // If server is empty but local has data (first time), don't wipe local.
          if (remoteCount === 0 && localCount > 0) {
            revRef.current = Number(data.rev ?? 0)
            setState((s) => ({ ...s, rev: revRef.current }))
            return
          }
          ignoreNextRef.current = true
          useAppStore.getState().setGraph(remote)
          revRef.current = Number(data.rev ?? 0)
          setState((s) => ({ ...s, rev: revRef.current }))
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [mapKey])

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
    const ws = new WebSocket(`${wsBase()}/ws/${encodeURIComponent(mapKey)}?${qs}`)
    wsRef.current = ws

    ws.onopen = () => {
      setState((s) => ({ ...s, connected: true }))
    }
    ws.onclose = () => {
      setState((s) => ({ ...s, connected: false }))
    }
    ws.onerror = () => {
      setState((s) => ({ ...s, connected: false }))
    }

    ws.onopen = () => {
      setState((s) => ({ ...s, connected: true }))
    }

    ws.onmessage = (ev) => {
      let msg: any
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg?.type === 'init') {
        hasInitRef.current = true
        if (msg.graph) {
          const remote = msg.graph as Graph
          const local = useAppStore.getState()
          const localCount = Object.keys(local.tasks || {}).length
          const remoteCount = Object.keys(remote.tasks || {}).length
          serverEmptyAtInitRef.current = remoteCount === 0
          // If server is empty but local has data (first time), bootstrap local -> server once.
          if (remoteCount === 0 && localCount > 0) {
            revRef.current = Number(msg.rev ?? revRef.current)
            setState((s) => ({ ...s, rev: Number(msg.rev ?? s.rev) }))
            maybeBootstrapLocalToServer()
          } else {
            ignoreNextRef.current = true
            useAppStore.getState().setGraph(remote)
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
          ignoreNextRef.current = true
          useAppStore.getState().setGraph(msg.graph as Graph)
          revRef.current = Number(msg.rev ?? revRef.current)
          setState((s) => ({ ...s, rev: revRef.current }))
        }
        return
      }
    }

    return () => {
      try {
        ws.close()
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
      const serialized = JSON.stringify(graph)
      if (serialized === last) return
      last = serialized
      lastSentGraphRef.current = serialized
      ;(window as any).__taskmapSendTimer && clearTimeout((window as any).__taskmapSendTimer)
      ;(window as any).__taskmapSendTimer = setTimeout(() => {
        try {
          ws.send(JSON.stringify({ type: 'state', rev: revRef.current, graph }))
        } catch {}
      }, 250)
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


