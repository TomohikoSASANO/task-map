import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, { Background, Controls, Edge, Node, useReactFlow } from 'reactflow'
import 'reactflow/dist/style.css'
import { FloatingEdge } from './components/edges/FloatingEdge'
import { TaskNode } from './components/TaskNode'
import { useAppStore } from './store'
import { useCollab } from './sync/collab'

const nodeTypes = { task: TaskNode }
const edgeTypes = { floating: FloatingEdge }

export const Canvas: React.FC = () => {
    const graph = useAppStore((s) => ({ tasks: s.tasks, rootTaskIds: s.rootTaskIds }))
    const focusTaskId = useAppStore((s) => (s as any).focusTaskId as string | null)
    const setDragging = useAppStore((s) => s.setDragging)
    const addRipple = useAppStore((s) => s.addRipple)
    const clearOldRipples = useAppStore((s) => s.clearOldRipples)
    const setNodePosition = useAppStore((s) => s.setNodePosition)
    const setPositions = useAppStore((s) => s.setPositions)
    const dragRef = useRef<{ rootId: string; selection?: string[]; offsets?: Record<string, { dx: number; dy: number }> } | null>(null)
    const [candidateId, setCandidateId] = useState<string | null>(null)
    const [sourceId, setSourceId] = useState<string | null>(null)
    const toggleExpand = useAppStore((s) => s.toggleExpand)
    const linkPrecedence = useAppStore((s) => s.linkPrecedence)
    const createTask = useAppStore((s) => s.createTask)
    const updateTask = useAppStore((s) => s.updateTask)
    const rf = useReactFlow()
    const historyRef = useRef<any[]>([])
    const clipboardRef = useRef<{ type: 'subgraph'; nodes: any[] } | null>(null)
    const lastMouseFlowRef = useRef<{ x: number; y: number } | null>(null)
    const dragPosRef = useRef<Record<string, { x: number; y: number }>>({})
    // Shift は無効化（要望）
    const [isShiftDown, setIsShiftDown] = useState(false)
    const [isCtrlDown, setIsCtrlDown] = useState(false)
    const [isKeyPanning, setIsKeyPanning] = useState(false)
    const [isMiddlePanning, setIsMiddlePanning] = useState(false)
    const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
    const viewportRef = useRef<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 1 })
    const [dragVersion, setDragVersion] = useState(0)
    const selectedIdsRef = useRef<string[]>([])
    const mobileDragRef = useRef<{ type: 'task' | 'user'; id?: string; active: boolean } | null>(null)
    const { collab, sendPresence } = useCollab()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const presencePeers = collab.peers


    const snapshotGraph = () => {
        const s = useAppStore.getState()
        return JSON.parse(JSON.stringify({ tasks: s.tasks, users: s.users, rootTaskIds: s.rootTaskIds })) as { tasks: any; users: any; rootTaskIds: any }
    }
    // フォーカス要求が来たら、そのノードを画面中央へ（ズームは維持）
    useEffect(() => {
        if (!focusTaskId) return
        const n = rf.getNode(focusTaskId)
        if (!n) return
        try {
            const currentZoom = viewportRef.current.zoom
            rf.setCenter((n.position?.x ?? 0) + (n.width ?? 0) / 2, (n.position?.y ?? 0) + (n.height ?? 0) / 2, { zoom: currentZoom, duration: 300 })
        } catch { }
    }, [focusTaskId])

    const isVisible = (id: string): boolean => {
        let cur = graph.tasks[id]
        while (cur && cur.parentId) {
            const p = graph.tasks[cur.parentId]
            if (!p) return false
            if (!p.expanded) return false
            cur = p
        }
        return true
    }

    const nearestVisible = (id: string): string => {
        let cur = graph.tasks[id]
        while (cur && !isVisible(cur.id)) {
            if (!cur.parentId) break
            cur = graph.tasks[cur.parentId]!
        }
        return cur?.id ?? id
    }

    const nodes: Node[] = useMemo(() => {
        const arr: Node[] = []
        // 大タスクのみ、または展開済みのサブツリー内のノードだけ表示
        for (const id of Object.keys(graph.tasks)) {
            const t = graph.tasks[id]
            const pos = dragPosRef.current[id] ?? t.position ?? { x: 0, y: 0 }
            // 深さ
            let depth = 0; let p = t.parentId; while (p) { depth += 1; p = graph.tasks[p]?.parentId ?? null }
            if (isVisible(id)) {
                arr.push({ 
                    id, 
                    type: 'task', 
                    data: { 
                        title: t.title, 
                        depth, 
                        highlight: candidateId === id
                    }, 
                    position: pos, 
                    draggable: true 
                })
            }
        }
        return arr
    }, [graph, dragVersion, candidateId])
    const edges: Edge[] = useMemo(() => {
        const arr: Edge[] = []
        Object.values(graph.tasks).forEach((t) => {
            // 親子エッジは双方が可視のときのみ
            if (t.parentId && isVisible(t.id) && isVisible(t.parentId)) {
                arr.push({ id: `p-${t.parentId}-${t.id}`, source: t.parentId, target: t.id, animated: false, type: 'floating', data: { dep: false } })
            }
            // 依存エッジは、可視代表ノード間で表示。途中が畳まれている場合は via ラベルで示す
            t.dependsOn.forEach((dep) => {
                const srcRep = nearestVisible(dep)
                const tgtRep = nearestVisible(t.id)
                const via = (tgtRep !== t.id) ? (graph.tasks[t.id]?.title ?? 'task') : undefined
                arr.push({
                    id: `d-${dep}-${t.id}-rep-${srcRep}-${tgtRep}`,
                    source: srcRep, target: tgtRep, animated: true,
                    style: { strokeDasharray: '4 2' }, type: 'floating', data: { dep: true, via, before: dep, after: t.id }
                })
            })
        })
        // プレビュー破線（ドラッグ中の視覚フィードバック）
        if (sourceId && candidateId && graph.tasks[sourceId] && graph.tasks[candidateId]) {
            arr.push({ id: 'preview-edge', source: sourceId, target: candidateId, animated: true, style: { strokeDasharray: '2 2', stroke: '#0ea5e9' }, type: 'floating', data: { dep: true, before: sourceId, after: candidateId } })
        }
        return arr
    }, [graph, sourceId, candidateId])

    // グローバルショートカット（フォーカスに依存しない）
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Delete edge
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const edge: any = (window as any)._selectedEdge
                if (edge && edge.data && edge.data.before && edge.data.after) {
                    historyRef.current.push(snapshotGraph())
                    useAppStore.getState().unlinkPrecedence(edge.data.before, edge.data.after)
                        ; (window as any)._selectedEdge = undefined
                        ; (window as any)._selectedEdgeId = undefined
                    e.preventDefault()
                    return
                }
                const selected = rf.getNodes().filter((n) => n.selected)
                if (selected.length) {
                    historyRef.current.push(snapshotGraph())
                    const cur = useAppStore.getState()
                    const tasks = { ...cur.tasks }
                    const rootTaskIds = [...cur.rootTaskIds]
                    const removeRecursive = (id: string) => {
                        const t = tasks[id]
                        if (!t) return
                        t.children.forEach((cid) => removeRecursive(cid))
                        if (t.parentId && tasks[t.parentId]) {
                            tasks[t.parentId] = { ...tasks[t.parentId], children: tasks[t.parentId].children.filter((cid) => cid !== id) }
                        }
                        const idx = rootTaskIds.indexOf(id)
                        if (idx >= 0) rootTaskIds.splice(idx, 1)
                        Object.keys(tasks).forEach((oid) => {
                            const ot = tasks[oid]
                            if (!ot) return
                            if (ot.dependsOn.includes(id)) tasks[oid] = { ...ot, dependsOn: ot.dependsOn.filter((x) => x !== id) }
                        })
                        delete tasks[id]
                    }
                    selected.forEach((n) => removeRecursive(n.id))
                    useAppStore.getState().setGraph({ tasks, users: cur.users, rootTaskIds })
                    // 削除後、プレビューやドラッグ由来の一時状態が残ると missing node で落ちるためクリア
                    setCandidateId(null)
                    setSourceId(null)
                    dragRef.current = null
                    e.preventDefault()
                    return
                }
            }
            // Copy: 選択サブグラフをクリップボードへ
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
                const selected = rf.getNodes().filter((n) => n.selected)
                if (selected.length) {
                    const s = useAppStore.getState()
                    const selectedIds = new Set(selected.map((n) => n.id))
                    const nodes = Array.from(selectedIds).map((id) => {
                        const t = s.tasks[id]
                        if (!t) return null
                        return {
                            id,
                            title: t.title,
                            assigneeId: t.assigneeId,
                            deadline: { dateISO: t.deadline?.dateISO ?? null },
                            done: !!t.done,
                            memo: (t as any).memo,
                            expanded: !!t.expanded,
                            parentId: t.parentId && selectedIds.has(t.parentId) ? t.parentId : null,
                            dependsOn: (t.dependsOn ?? []).filter((d) => selectedIds.has(d)),
                            position: t.position ?? { x: 0, y: 0 },
                        }
                    }).filter(Boolean) as any[]
                    clipboardRef.current = { type: 'subgraph', nodes }
                    e.preventDefault()
                }
            }
            // Paste（サブグラフをカーソル位置に貼り付け、内部リンク/階層/属性を保持）
            if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
                const clip: any = clipboardRef.current
                if (clip && clip.type === 'subgraph' && clip.nodes && clip.nodes.length) {
                    historyRef.current.push(snapshotGraph())
                    const nodes = clip.nodes as Array<any>
                    const minX = Math.min(...nodes.map((n) => n.position.x))
                    const minY = Math.min(...nodes.map((n) => n.position.y))
                    const cursor = lastMouseFlowRef.current
                    const offsetX = cursor ? (cursor.x - minX) : 0
                    const offsetY = cursor ? (cursor.y - minY) : 0

                    // 親→子の順に作成
                    const idMap: Record<string, string> = {}
                    const pending = new Set(nodes.map((n) => n.id as string))
                    const byId: Record<string, any> = {}
                    nodes.forEach((n) => { byId[n.id] = n })

                    let safety = 0
                    while (pending.size && safety < 10000) {
                        safety++
                        for (const oid of Array.from(pending)) {
                            const n = byId[oid]
                            const parentOld = n.parentId as string | null
                            const parentReady = !parentOld || idMap[parentOld]
                            if (!parentReady) continue
                            const newParentId = parentOld ? idMap[parentOld] : null
                            const created = useAppStore.getState().createTask({ title: n.title, assigneeId: n.assigneeId, deadline: { dateISO: n.deadline?.dateISO ?? null }, parentId: newParentId })
                            idMap[oid] = created.id
                            // 位置・その他属性
                            useAppStore.getState().updateTask(created.id, {
                                position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
                                done: !!n.done,
                                expanded: !!n.expanded,
                                memo: n.memo,
                            } as any)
                            pending.delete(oid)
                        }
                    }

                    // 依存リンク（選択内のみ復元）
                    nodes.forEach((n) => {
                        const afterNew = idMap[n.id]
                            ; (n.dependsOn as string[]).forEach((depOld) => {
                                const beforeNew = idMap[depOld]
                                if (beforeNew && afterNew) {
                                    useAppStore.getState().linkPrecedence(beforeNew, afterNew)
                                }
                            })
                    })

                    e.preventDefault()
                }
            }
            // Undo
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                const last = historyRef.current.pop()
                if (last) {
                    useAppStore.getState().setGraph(last)
                    e.preventDefault()
                }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [rf])

    // 修飾キー状態を監視（Ctrl のみ使用）
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'Control') setIsCtrlDown(true)
        }
        const up = (e: KeyboardEvent) => {
            if (e.key === 'Control') setIsCtrlDown(false)
        }
        window.addEventListener('keydown', down)
        window.addEventListener('keyup', up)
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
    }, [])

    // 監視ロールバックは撤廃（操作単位のロールバックに限定）

    // モバイル時のタッチイベント処理
    useEffect(() => {
        const handleTouchMove = (e: TouchEvent) => {
            const mobileDrag = (window as any)._mobileDrag
            if (!mobileDrag || !mobileDrag.active) return

            const touch = e.touches[0]
            if (!touch) return

            const p = rf.screenToFlowPosition({ x: touch.clientX, y: touch.clientY })
            const rfNodes = rf.getNodes()
            let hit: string | null = null
            for (const n of rfNodes) {
                const w = n.width ?? 160
                const h = n.height ?? 64
                const left = n.position.x
                const top = n.position.y
                const right = left + w
                const bottom = top + h
                if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) { hit = n.id; break }
            }
            if (hit !== candidateId) setCandidateId(hit)
        }

        const handleTouchEnd = (e: TouchEvent) => {
            const mobileDrag = (window as any)._mobileDrag
            if (!mobileDrag || !mobileDrag.active) return

            const touch = e.changedTouches[0]
            if (!touch) return

            // ドロップ処理（既存のonDropロジックを再利用）
            const prev = snapshotGraph()
            historyRef.current.push(prev)
            const p = rf.screenToFlowPosition({ x: touch.clientX, y: touch.clientY })
            
            let parentId: string | null = candidateId
            if (!parentId) {
                const rfNodes = rf.getNodes()
                for (const n of rfNodes) {
                    const w = n.width ?? 160
                    const h = n.height ?? 64
                    const left = n.position.x
                    const top = n.position.y
                    const right = left + w
                    const bottom = top + h
                    if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) { parentId = n.id; break }
                }
            }

            if (mobileDrag.type === 'task') {
                // タスク追加
                let task: { id: string }
                try {
                    task = createTask({ title: '新しいタスク', parentId })
                } catch (e) {
                    useAppStore.getState().setGraph(prev)
                    return
                }
                if (parentId) {
                    const parent = graph.tasks[parentId]
                    useAppStore.getState().updateTask(parentId, { expanded: true })
                    const pos = { x: (parent.position?.x ?? 0) + 220, y: (parent.position?.y ?? 0) }
                    updateTask(task.id, { position: pos })
                } else {
                    updateTask(task.id, { position: { x: p.x, y: p.y } })
                }
            } else if (mobileDrag.type === 'user' && mobileDrag.id) {
                // ユーザー割り当て（既存のノードに割り当てる場合）
                if (parentId) {
                    updateTask(parentId, { assigneeId: mobileDrag.id })
                }
            }

            setCandidateId(null)
            mobileDragRef.current = null
            ;(window as any)._mobileDrag = null
        }

        window.addEventListener('touchmove', handleTouchMove, { passive: false })
        window.addEventListener('touchend', handleTouchEnd, { passive: false })

        return () => {
            window.removeEventListener('touchmove', handleTouchMove)
            window.removeEventListener('touchend', handleTouchEnd)
        }
    }, [rf, candidateId, graph.tasks, createTask, updateTask])

    return (
        <div
            ref={containerRef}
            className={`h-full w-full ${((isCtrlDown) && !isKeyPanning && !isMiddlePanning) ? 'cursor-grab' : ''} ${(isKeyPanning || isMiddlePanning) ? 'cursor-grabbing' : ''}`}
            onMouseMove={(e) => {
                const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
                lastMouseFlowRef.current = p
                // presence: cursor (throttle)
                const now = Date.now()
                const last = (window as any).__taskmapPresenceTs as number | undefined
                if (!last || now - last > 60) {
                    ;(window as any).__taskmapPresenceTs = now
                    sendPresence({ cursor: { x: p.x, y: p.y }, selectedIds: selectedIdsRef.current })
                }
                if (isKeyPanning || isMiddlePanning) {
                    const last = lastMouseRef.current
                    if (last) {
                        const dx = e.clientX - last.x
                        const dy = e.clientY - last.y
                        const v = viewportRef.current
                        rf.setViewport({ x: v.x + dx, y: v.y + dy, zoom: v.zoom })
                        viewportRef.current = { x: v.x + dx, y: v.y + dy, zoom: v.zoom }
                    }
                    lastMouseRef.current = { x: e.clientX, y: e.clientY }
                    e.preventDefault()
                }
            }}
            onMouseDownCapture={(e) => {
                if (e.button === 1) {
                    setIsMiddlePanning(true)
                    lastMouseRef.current = { x: e.clientX, y: e.clientY }
                    e.preventDefault()
                } else if ((isCtrlDown) && e.button === 0) {
                    setIsKeyPanning(true)
                    lastMouseRef.current = { x: e.clientX, y: e.clientY }
                    e.preventDefault()
                }
            }}
            onMouseUpCapture={() => { if (isKeyPanning) setIsKeyPanning(false); if (isMiddlePanning) setIsMiddlePanning(false); lastMouseRef.current = null }}
            onMouseLeave={() => { if (isKeyPanning) setIsKeyPanning(false); if (isMiddlePanning) setIsMiddlePanning(false); lastMouseRef.current = null }}
        >
            {/* Remote cursors (screen space overlay) */}
            <div className="pointer-events-none absolute inset-0 z-20">
                {containerRef.current && presencePeers
                    .filter((p) => p.clientId !== collab.me.clientId && p.cursor)
                    .map((p) => {
                        const v = viewportRef.current
                        const rect = containerRef.current!.getBoundingClientRect()
                        const x = (p.cursor!.x * v.zoom) + v.x + rect.left
                        const y = (p.cursor!.y * v.zoom) + v.y + rect.top
                        return (
                            <div
                                key={p.clientId}
                                style={{ position: 'fixed', left: x, top: y, transform: 'translate(-50%, -50%)' }}
                            >
                                <div className="w-2.5 h-2.5 rounded-full border border-white shadow" style={{ background: p.color }} />
                                <div className="mt-1 text-[10px] text-slate-800 bg-white/90 px-1 rounded shadow whitespace-nowrap">
                                    {p.name}
                                </div>
                            </div>
                        )
                    })}
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                selectionOnDrag={true}
                multiSelectionKeyCode={null as unknown as any}
                panOnDrag={false}
                nodesDraggable={!isCtrlDown}
                nodesConnectable={!isCtrlDown}
                elementsSelectable={true}
                selectNodesOnDrag={false}
                panOnScroll
                zoomOnDoubleClick={false}
                onMove={(_, viewport) => { viewportRef.current = viewport }}
                onSelectionChange={(sel) => {
                    // React Flow の選択イベントをそのまま採用
                    selectedIdsRef.current = (sel?.nodes ?? []).map((n) => n.id)
                    sendPresence({ selectedIds: selectedIdsRef.current })
                }}
                onInit={(_) => {
                    // 初期表示時のみ軽くフィット。内部ノードは制御しない。
                    try { rf.fitView({ padding: 0.2 }) } catch { }
                    try {
                        const vp = (rf as any).toObject?.().viewport || (rf as any).getViewport?.()
                        if (vp) viewportRef.current = vp
                    } catch { }
                }}
                onNodeDrag={(_, node) => {
                    const selection = dragRef.current?.selection
                    const offsets = dragRef.current?.offsets
                    if (selection && offsets && selection.length > 0) {
                        // グループのリアルタイム描画
                        selection.forEach((id) => {
                            const off = offsets[id] ?? { dx: 0, dy: 0 }
                            dragPosRef.current[id] = { x: node.position.x + off.dx, y: node.position.y + off.dy }
                        })
                    } else {
                        dragPosRef.current[node.id] = { x: node.position.x, y: node.position.y }
                    }
                    if (!(window as any)._dragRaf) {
                        ; (window as any)._dragRaf = requestAnimationFrame(() => {
                            setDragVersion((v) => v + 1)
                                ; (window as any)._dragRaf = 0
                        })
                    }
                    // 候補判定（単独ドラッグ時のみ）
                    if (selection && selection.length > 1) return
                    const meId = dragRef.current?.rootId
                    if (!meId) return
                    const rfNodes = rf.getNodes()
                    const meNode = rfNodes.find((n) => n.id === meId)
                    if (!meNode) return
                    const meCenterX = meNode.position.x + (meNode.width ?? 0) / 2
                    const meCenterY = meNode.position.y + (meNode.height ?? 0) / 2
                    let hit: string | null = null
                    for (const n of rfNodes) {
                        if (n.id === meId) continue
                        const w = n.width ?? 160
                        const h = n.height ?? 64
                        const left = n.position.x
                        const top = n.position.y
                        const right = left + w
                        const bottom = top + h
                        if (meCenterX >= left && meCenterX <= right && meCenterY >= top && meCenterY <= bottom) { hit = n.id; break }
                    }
                    if (hit !== candidateId) setCandidateId(hit)
                }}
                onEdgeClick={(e, edge) => { (window as any)._selectedEdgeId = edge.id; (window as any)._selectedEdge = edge; e.stopPropagation() }}
                onNodeDragStart={(_, node) => {
                    // ボタンクリックからのドラッグを無視
                    if ((window as any)._preventNodeDrag) {
                        dragRef.current = null
                        return
                    }
                    setDragging(node.id)
                    const rfNodes = rf.getNodes()
                    // 現在の選択群（ドラッグ対象を含むもののみ有効）
                    const fromRef = (selectedIdsRef.current && selectedIdsRef.current.includes(node.id)) ? selectedIdsRef.current : []
                    const fromRf = rfNodes.filter((n) => n.selected).map((n) => n.id)
                    const selectedIds = (fromRef.length ? fromRef : fromRf)
                        .filter((id) => id === node.id || fromRf.includes(id))
                    const group = selectedIds.length > 0 ? selectedIds : [node.id]
                    const offsets: Record<string, { dx: number; dy: number }> = {}
                    group.forEach((id) => {
                        const n = rfNodes.find((x) => x.id === id)
                        const nx = n?.position?.x ?? 0
                        const ny = n?.position?.y ?? 0
                        offsets[id] = { dx: nx - node.position.x, dy: ny - node.position.y }
                    })
                    dragRef.current = { rootId: node.id, selection: group, offsets }
                    setSourceId(node.id)
                }}
                onNodesChange={(_) => { /* 内部ドラッグ描画は React Flow に任せ、候補判定は onNodeDrag 側で実施 */ }}

                onNodeDragStop={(_, node) => {
                    // snapshot for undo
                    historyRef.current.push(snapshotGraph())
                    setDragging(null)
                    // 1) 位置確定（グループ対応）
                    const selection = dragRef.current?.selection ?? [node.id]
                    if (selection.length > 1) {
                        const updates: Record<string, { x: number; y: number }> = {}
                        selection.forEach((id) => {
                            const pos = dragPosRef.current[id]
                            if (pos) {
                                updates[id] = { x: pos.x, y: pos.y }
                                delete dragPosRef.current[id]
                            }
                        })
                        if (Object.keys(updates).length) setPositions(updates)
                        setDragVersion((v) => v + 1)
                    } else {
                        const finalPos = dragPosRef.current[node.id] ?? node.position
                        setNodePosition(node.id, finalPos.x, finalPos.y)
                        delete dragPosRef.current[node.id]
                        setDragVersion((v) => v + 1)
                    }


                    // 2) グループドラッグ時はリンク作成を行わない（単独時のみ）
                    const selection2 = dragRef.current?.selection ?? [node.id]
                    if (selection2.length === 1) {
                        const me = graph.tasks[node.id]
                        if (me) {
                            let nearestId = candidateId
                            if (nearestId) {
                                // 依存リンク作成: me -> nearest（既存逆方向を禁止）
                                historyRef.current.push(JSON.parse(JSON.stringify(useAppStore.getState())))
                                const tgt = graph.tasks[nearestId]
                                const hasOpposite = tgt?.dependsOn.includes(me.id)
                                if (!hasOpposite) linkPrecedence(me.id, nearestId)
                                // 隣接スナップ（me を nearest の左側へ寄せる）
                                const target = graph.tasks[nearestId]
                                if (target) {
                                    const gapX = 230
                                    const pos = { x: target.position.x - gapX, y: target.position.y }
                                    setPositions({ [me.id]: pos })
                                }
                            }
                        }
                    }

                    setCandidateId(null); setSourceId(null); dragRef.current = null
                    addRipple(node.id); clearOldRipples()
                }}

                defaultViewport={{ x: 0, y: 0, zoom: 1.25 }}
                minZoom={0.4}
                maxZoom={3}
                onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('application/x-task-new')) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy'
                        // 実測ノード矩形でヒット判定（ヒット=ノードサイズ）
                        const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
                        const rfNodes = rf.getNodes()
                        let hit: string | null = null
                        for (const n of rfNodes) {
                            const w = n.width ?? 160
                            const h = n.height ?? 64
                            const left = n.position.x
                            const top = n.position.y
                            const right = left + w
                            const bottom = top + h
                            if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) { hit = n.id; break }
                        }
                        if (hit !== candidateId) setCandidateId(hit)
                    }
                }}
                onDrop={(e) => {
                    if (e.dataTransfer.types.includes('application/x-task-new')) {
                        e.preventDefault()
                        const prev = snapshotGraph()
                        historyRef.current.push(prev)
                        const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
                        // 直前の候補（candidateId）を優先して親決定。なければ座標で再判定
                        let parentId: string | null = candidateId
                        if (!parentId) {
                            const rfNodes = rf.getNodes()
                            for (const n of rfNodes) {
                                const w = n.width ?? 160
                                const h = n.height ?? 64
                                const left = n.position.x
                                const top = n.position.y
                                const right = left + w
                                const bottom = top + h
                                if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) { parentId = n.id; break }
                            }
                        }
                        // 追加はトランザクション的に扱う（失敗時は復元）
                        let task: { id: string }
                        try {
                            task = createTask({ title: '新しいタスク', parentId })
                        } catch (e) {
                            useAppStore.getState().setGraph(prev)
                            return
                        }
                        if (parentId) {
                            const parent = graph.tasks[parentId]
                            // 親を強制展開し、右側へオフセット配置
                            useAppStore.getState().updateTask(parentId, { expanded: true })
                            const pos = { x: (parent.position?.x ?? 0) + 220, y: (parent.position?.y ?? 0) }
                            updateTask(task.id, { position: pos })
                        } else {
                            updateTask(task.id, { position: { x: p.x, y: p.y } })
                        }
                        setCandidateId(null)
                        // 追加後に整合性チェック（万一減っていたらロールバック）
                        const cur = useAppStore.getState()
                        const prevCount = Object.keys(prev.tasks).length
                        const curCount = Object.keys(cur.tasks).length
                        if (curCount < prevCount || curCount !== prevCount + 1) {
                            useAppStore.getState().setGraph(prev)
                        }
                        // Controlled nodes使用のため、内部setNodesは行わない
                        return
                    }
                }}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    )
}


