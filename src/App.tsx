import React, { useEffect, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { Canvas } from './Canvas'
import { Legend } from './components/Legend'
import { Sidebar } from './components/Sidebar'
import { FloatingButton } from './components/FloatingButton'
import { useAppStore } from './store'
import { useIsMobile } from './hooks/useIsMobile'
import { CollabProvider, useCollabContext } from './sync/collab'
import { MobileTaskSheet } from './components/MobileTaskSheet'

type CapturedError = {
    at: number
    message: string
    stack?: string
    source?: string
}

const AppInner: React.FC = () => {
    const createTask = useAppStore((s) => s.createTask)
    const rootIds = useAppStore((s) => s.rootTaskIds)
    const isMobile = useIsMobile()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarPinned, setSidebarPinned] = useState(false)
    const { collab } = useCollabContext()
    const mobileSheetTaskId = useAppStore((s) => s.mobileSheetTaskId)
    const tasksCount = Object.keys(useAppStore((s) => s.tasks)).length
    const [showOffline, setShowOffline] = useState(false)
    const offlineTimerRef = React.useRef<number | null>(null)
    const [lastErr, setLastErr] = useState<CapturedError | null>(() => {
        try {
            const raw = localStorage.getItem('taskmap-last-error')
            return raw ? (JSON.parse(raw) as CapturedError) : null
        } catch {
            return null
        }
    })
    const [showErr, setShowErr] = useState(false)

    // Optional debug logging. Enable via: localStorage.setItem('taskmap-debug', '1')
    useEffect(() => {
        if (localStorage.getItem('taskmap-debug') === '1') {
            console.log('[App] Collab state:', { connected: collab.connected, peers: collab.peers.length, rev: collab.rev })
        }
    }, [collab.connected, collab.peers.length, collab.rev])

    // Capture runtime errors so mobile users can report without DevTools.
    useEffect(() => {
        const save = (e: CapturedError) => {
            setLastErr(e)
            try {
                localStorage.setItem('taskmap-last-error', JSON.stringify(e))
            } catch { }
        }
        const onError = (ev: ErrorEvent) => {
            const msg = ev?.message || 'Unknown error'
            const src = ev?.filename ? `${ev.filename}:${ev.lineno ?? ''}:${ev.colno ?? ''}` : undefined
            const stack = (ev as any)?.error?.stack as string | undefined
            save({ at: Date.now(), message: msg, source: src, stack })
        }
        const onRej = (ev: PromiseRejectionEvent) => {
            const reason = (ev as any)?.reason
            const msg =
                typeof reason === 'string'
                    ? reason
                    : (reason?.message as string | undefined) || 'Unhandled promise rejection'
            const stack = (reason?.stack as string | undefined) || undefined
            save({ at: Date.now(), message: msg, stack })
        }
        window.addEventListener('error', onError)
        window.addEventListener('unhandledrejection', onRej)
        return () => {
            window.removeEventListener('error', onError)
            window.removeEventListener('unhandledrejection', onRej)
        }
    }, [])

    // If offline persists, show a reload prompt (avoid silent "everything disappeared" UX).
    useEffect(() => {
        if (offlineTimerRef.current) {
            window.clearTimeout(offlineTimerRef.current)
            offlineTimerRef.current = null
        }
        if (collab.connected) {
            setShowOffline(false)
            return
        }
        // If we have no tasks and offline, show earlier.
        const delay = tasksCount === 0 ? 2000 : 8000
        offlineTimerRef.current = window.setTimeout(() => {
            setShowOffline(true)
        }, delay)
        return () => {
            if (offlineTimerRef.current) {
                window.clearTimeout(offlineTimerRef.current)
                offlineTimerRef.current = null
            }
        }
    }, [collab.connected, tasksCount])

    // 初回起動時にサンプルタスクを1つ作成
    useEffect(() => {
        if (rootIds.length === 0) {
            const root = createTask({ title: '大タスク1', parentId: null })
            const c1 = useAppStore.getState().addChild(root.id, { title: '中タスクA' })
            const c2 = useAppStore.getState().addChild(root.id, { title: '中タスクB' })
            useAppStore.getState().linkPrecedence(c1.id, c2.id)
            // もう一つの大タスクも作成
            createTask({ title: '大タスク2', parentId: null })
        }
    }, [])

    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen)
    }

    const handleCloseSidebar = () => {
        setSidebarOpen(false)
    }

    const handleTogglePin = () => {
        setSidebarPinned(!sidebarPinned)
    }

    return (
        <div className="h-full w-full bg-slate-50 text-slate-900 flex flex-col">
            <div className="p-3 border-b bg-white sticky z-10 flex items-center gap-3">
                <h1 className="font-bold">Task Map</h1>
                <div className="text-xs text-slate-500">
                    {collab.connected
                        ? `同期中（オンライン ${Math.max(1, collab.peers.length)}）`
                        : (collab.reconnecting ? '再接続中…' : 'オフライン（ローカルのみ）')}
                </div>
                {lastErr && (
                    <button
                        type="button"
                        className="ml-2 text-[11px] px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200"
                        onClick={() => setShowErr(true)}
                        title="最後のエラーを表示"
                        aria-label="最後のエラーを表示"
                    >
                        エラー
                    </button>
                )}
                {!isMobile && (
                <div className="ml-auto text-xs text-slate-500">Delete: 選択エッジ削除 / Ctrl+Z: Undo / Ctrl+C/V: コピー貼付 / Shift+クリック: 複数選択</div>
                )}
            </div>
            <div className="flex-1 flex min-h-0 relative overflow-hidden">
                <div 
                    className="flex-1 relative" 
                    style={{ 
                        minHeight: 0,
                        height: '100%',
                        width: '100%',
                        paddingBottom: isMobile && sidebarOpen ? '20vh' : '0'
                    }}
                >
                    <ReactFlowProvider>
                        <Canvas />
                    </ReactFlowProvider>
                    <Legend />
                    {isMobile && (
                        <MobileTaskSheet
                            isOpen={!!mobileSheetTaskId}
                            onClose={() => useAppStore.getState().setMobileSheetTaskId(null)}
                        />
                    )}
                    {showOffline && (
                        <div className="fixed inset-0 z-[80]">
                            <div className="absolute inset-0 bg-black/40" />
                            <div className="absolute left-4 right-4 top-24 bg-white rounded-2xl shadow-xl border p-4">
                                <div className="font-semibold text-base">接続が不安定です</div>
                                <div className="mt-2 text-sm text-slate-600">
                                    サーバーとの接続が切れました。再接続を試みていますが、改善しない場合は再読み込みしてください。
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        type="button"
                                        className="flex-1 bg-slate-900 text-white rounded-lg py-2"
                                        onClick={() => window.location.reload()}
                                    >
                                        再読み込み
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 rounded-lg border"
                                        onClick={() => setShowOffline(false)}
                                    >
                                        閉じる
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showErr && lastErr && (
                        <div className="fixed inset-0 z-[90]">
                            <div className="absolute inset-0 bg-black/40" onClick={() => setShowErr(false)} />
                            <div className="absolute left-4 right-4 top-24 bg-white rounded-2xl shadow-xl border p-4 max-h-[70vh] overflow-auto">
                                <div className="font-semibold text-base">最後のエラー</div>
                                <div className="mt-2 text-xs text-slate-600 break-words whitespace-pre-wrap">
                                    {new Date(lastErr.at).toLocaleString()}
                                    {'\n'}
                                    {lastErr.message}
                                    {lastErr.source ? `\n${lastErr.source}` : ''}
                                    {lastErr.stack ? `\n\n${lastErr.stack}` : ''}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        type="button"
                                        className="flex-1 bg-slate-900 text-white rounded-lg py-2"
                                        onClick={async () => {
                                            const text =
                                                `${new Date(lastErr.at).toISOString()}\n` +
                                                `${lastErr.message}\n` +
                                                `${lastErr.source ? lastErr.source + '\n' : ''}` +
                                                `${lastErr.stack ?? ''}`
                                            try {
                                                await navigator.clipboard.writeText(text)
                                            } catch {
                                                // fallback
                                                window.prompt('コピーして送ってください', text)
                                            }
                                        }}
                                    >
                                        コピー
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 rounded-lg border"
                                        onClick={() => {
                                            try { localStorage.removeItem('taskmap-last-error') } catch { }
                                            setLastErr(null)
                                            setShowErr(false)
                                        }}
                                    >
                                        クリア
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 rounded-lg border"
                                        onClick={() => setShowErr(false)}
                                    >
                                        閉じる
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {isMobile ? (
                    <>
                        <Sidebar
                            isOpen={sidebarOpen}
                            isPinned={sidebarPinned}
                            isMobile={isMobile}
                            onClose={handleCloseSidebar}
                            onTogglePin={handleTogglePin}
                        />
                        {!sidebarOpen && (
                            <FloatingButton
                                onClick={handleToggleSidebar}
                                isOpen={sidebarOpen}
                            />
                        )}
                    </>
                ) : (
                    <Sidebar
                        isOpen={true}
                        isPinned={true}
                        isMobile={false}
                        onClose={() => {}}
                        onTogglePin={() => {}}
                    />
                )}
            </div>
        </div>
    )
}

export const App: React.FC = () => {
    return (
        <CollabProvider>
            <AppInner />
        </CollabProvider>
    )
}


