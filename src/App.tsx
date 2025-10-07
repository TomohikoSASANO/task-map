import React, { useEffect } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { Canvas } from './Canvas'
import { Legend } from './components/Legend'
import { Sidebar } from './components/Sidebar'
import { useAppStore } from './store'

export const App: React.FC = () => {
    const createTask = useAppStore((s) => s.createTask)
    const rootIds = useAppStore((s) => s.rootTaskIds)

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

    return (
        <div className="h-full w-full bg-slate-50 text-slate-900 flex flex-col">
            <div className="p-3 border-b bg-white sticky top-0 z-10 flex items-center gap-3">
                <h1 className="font-bold">Task Map</h1>
                <span className="text-xs text-slate-500">正式版</span>
                <div className="ml-auto text-xs text-slate-500">Delete: 選択エッジ削除 / Ctrl+Z: Undo / Ctrl+C/V: コピー貼付 / Shift+クリック: 複数選択</div>
            </div>
            <div className="flex-1 flex min-h-0">
                <div className="flex-1 relative">
                    <ReactFlowProvider>
                        <Canvas />
                    </ReactFlowProvider>
                    <Legend />
                </div>
                <Sidebar />
            </div>
        </div>
    )
}


