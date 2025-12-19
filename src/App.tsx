import React, { useEffect, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { Canvas } from './Canvas'
import { Legend } from './components/Legend'
import { Sidebar } from './components/Sidebar'
import { FloatingButton } from './components/FloatingButton'
import { useAppStore } from './store'
import { useIsMobile } from './hooks/useIsMobile'
import { useCollab } from './sync/collab'
import { MobileTaskSheet } from './components/MobileTaskSheet'

export const App: React.FC = () => {
    const createTask = useAppStore((s) => s.createTask)
    const rootIds = useAppStore((s) => s.rootTaskIds)
    const isMobile = useIsMobile()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarPinned, setSidebarPinned] = useState(false)
    const { collab } = useCollab()
    const mobileSheetTaskId = useAppStore((s) => s.mobileSheetTaskId)

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
                    {collab.connected ? `同期中（オンライン ${Math.max(1, collab.peers.length)}）` : 'オフライン（ローカルのみ）'}
                </div>
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
                </div>
                {isMobile ? (
                    <>
                        <Sidebar
                            isOpen={sidebarOpen}
                            isPinned={sidebarPinned}
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
                        onClose={() => {}}
                        onTogglePin={() => {}}
                    />
                )}
            </div>
        </div>
    )
}


