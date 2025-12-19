import { motion } from 'framer-motion'
import React, { useEffect, useRef, useState } from 'react'
import { Handle, Position } from 'reactflow'
import { useAppStore } from '../store'
import { TaskId } from '../types'
import { useIsMobile } from '../hooks/useIsMobile'

const Ripple: React.FC<{ active: boolean }> = ({ active }) => (
    <motion.span
        initial={false}
        animate={active ? { scale: [0.8, 1.6, 2.2], opacity: [0.35, 0.25, 0] } : { opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-0 rounded-md border-2 border-emerald-400"
    />
)

type Props = {
    id: TaskId
    data: { title: string; depth?: number; highlight?: boolean }
    skipHandles?: boolean
}

export const TaskNode: React.FC<Props> = ({ id, data, skipHandles = false }) => {
    const task = useAppStore((s) => s.tasks[id])
    const users = useAppStore((s) => s.users)
    const allTasks = useAppStore((s) => s.tasks)
    const remaining = useAppStore((s) => s.remainingDays(id))
    const conflict = useAppStore((s) => s.hasDeadlineConflict(id))
    const actionable = useAppStore((s) => s.isActionable(id))
    const updateTask = useAppStore((s) => s.updateTask)
    const toggleExpand = useAppStore((s) => s.toggleExpand)
    const setMobileSheetTaskId = useAppStore((s) => s.setMobileSheetTaskId)
    const isMobile = useIsMobile()
    const draggingId = useAppStore((s) => s.draggingId)
    const ripples = useAppStore((s) => s.ripples)
    const [memoOpen, setMemoOpen] = useState(false)
    // タイトル編集中はローカルバッファに保持して、過度な再レンダー/フォーカス喪失を防ぐ
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState<string>(task?.title ?? '')
    const isComposingRef = useRef(false)
    const memoRef = useRef<HTMLTextAreaElement | null>(null)
    const toggleHandledRef = useRef<boolean>(false)

    useEffect(() => { if (memoOpen && memoRef.current) memoRef.current.focus() }, [memoOpen])
    // タスク名が外部更新された場合、未編集中のみドラフトを追従
    useEffect(() => {
        if (!isEditingTitle) setTitleDraft(task?.title ?? '')
    }, [task?.title, isEditingTitle])
    // 編集中は軽いデバウンスでストアにも反映（IME構成中は反映しない）
    useEffect(() => {
        if (!isEditingTitle) return
        if (isComposingRef.current) return
        const t = setTimeout(() => {
            if (task && titleDraft !== task.title) {
                updateTask(id, { title: titleDraft })
            }
        }, 180)
        return () => clearTimeout(t)
    }, [titleDraft, isEditingTitle])

    const isDragging = draggingId === id
    const hasRipple = ripples.some((r) => r.nodeId === id)

    const isHighlight = !!data.highlight
    // タスクが削除済みの一時描画タイミングで安全に抜ける（フック呼び出し後に判定）
    if (!task) return null
    const assignee = task.assigneeId ? users[task.assigneeId] : undefined
    const hasAssignee = !!assignee
    const isDone = !!task.done
    const hasDeps = (task.dependsOn ?? []).length > 0
    const allDepsDone = (task.dependsOn ?? []).every((d) => !!allTasks[d]?.done)
    const depth = data.depth ?? 0
    const hasIncompleteDescendant = (() => {
        const walk = (id: string): boolean => {
            const t = allTasks[id]
            if (!t) return false
            for (const cid of (t.children ?? [])) {
                const c = allTasks[cid]
                if (c && !c.done) return true
                if (walk(cid)) return true
            }
            return false
        }
        return walk(id)
    })()

    return (
        <motion.div
            animate={{ scale: isDragging ? 1.06 : 1, transition: { type: 'spring', stiffness: 320, damping: 18 } }}
            className={(() => {
                let borderClass = 'border-slate-300'
                if (depth === 0) {
                    borderClass = isDone ? 'border-emerald-500' : 'border-2 border-black'
                } else {
                    if (hasDeps) {
                        // リンクタスク扱い
                        if (isDone) borderClass = 'border-emerald-500'
                        else if (allDepsDone) borderClass = 'border-rose-500'
                        else borderClass = 'border-slate-300'
                    } else {
                        // 通常（Lv1以下）：子孫に未完があれば灰、なければ赤
                        if (isDone) borderClass = 'border-emerald-500'
                        else if (hasIncompleteDescendant) borderClass = 'border-slate-300'
                        else borderClass = 'border-rose-500'
                    }
                }
                return (
                    `relative overflow-visible rounded-md border ${hasAssignee ? 'pl-12 pr-2' : 'px-2'} py-1 bg-white shadow-sm text-sm ` +
                    borderClass + ' ' +
                    (isDone ? 'ring-1 ring-emerald-300 ' : '') +
                    (isHighlight ? 'outline outline-2 outline-sky-400' : '')
                )
            })()}
            onDragOver={(e) => {
                if (Array.from(e.dataTransfer.types).includes('application/x-user-id')) {
                    e.preventDefault()
                }
            }}
            onDrop={(e) => {
                if (Array.from(e.dataTransfer.types).includes('application/x-user-id')) {
                    e.preventDefault(); e.stopPropagation()
                    const uid = e.dataTransfer.getData('application/x-user-id')
                    if (uid) updateTask(id, { assigneeId: uid })
                }
            }}
        >
            <Ripple active={hasRipple} />
            {/* 上段: 担当者表示 */}
            {/* 担当者アイコンを左上に大きく・最前面で表示（ノード内に収めてパン誤爆防止） */}
            {hasAssignee && assignee && (
                <div className="pointer-events-none absolute top-1 left-1 z-30 flex flex-col items-center">
                    {assignee.avatarUrl ? (
                        <img src={assignee.avatarUrl!} alt={assignee.name} className="w-8 h-8 rounded-full border object-cover shadow" />
                    ) : (
                        <span className="inline-block w-8 h-8 rounded-full border shadow" style={{ background: assignee.color }} />
                    )}
                    <span className="mt-0.5 text-[10px] text-slate-700 leading-none bg-white/90 px-1 rounded shadow">{assignee.name}</span>
                </div>
            )}
            <div className="flex items-center gap-2 mb-1">
                <button
                    className={`nodrag nopan min-w-[28px] min-h-[28px] w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${isDone ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-200 border-slate-400 text-slate-600 hover:bg-slate-300'}`}
                    style={{ fontSize: '14px', pointerEvents: 'auto', touchAction: 'manipulation' }}
                    title={isDone ? '完了' : '未完了'}
                    aria-label="完了切替"
                    onPointerDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (toggleHandledRef.current) return
                        toggleHandledRef.current = true
                        ;(window as any)._preventNodeDrag = true
                        updateTask(id, { done: !isDone })
                        setTimeout(() => { 
                            toggleHandledRef.current = false
                            ;(window as any)._preventNodeDrag = false
                        }, 300)
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (toggleHandledRef.current) return
                        toggleHandledRef.current = true
                        ;(window as any)._preventNodeDrag = true
                        updateTask(id, { done: !isDone })
                        setTimeout(() => { 
                            toggleHandledRef.current = false
                            ;(window as any)._preventNodeDrag = false
                        }, 300)
                    }}
                    onPointerUp={(e) => {
                        e.stopPropagation()
                    }}
                    onMouseUp={(e) => {
                        e.stopPropagation()
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (toggleHandledRef.current) return
                        toggleHandledRef.current = true
                        updateTask(id, { done: !isDone })
                        setTimeout(() => { toggleHandledRef.current = false }, 300)
                    }}
                >✓</button>
                <div className="ml-auto text-[10px] text-slate-500">Lv{data.depth ?? 0}</div>
            </div>
            {/* タイトル編集（ローカルバッファ + デバウンス同期でフォーカス安定化） */}
            <input
                className="w-full bg-transparent font-medium outline-none border-b border-transparent focus:border-slate-300 nodrag nopan"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onCompositionStart={() => { isComposingRef.current = true }}
                onCompositionEnd={(e) => { isComposingRef.current = false; setTitleDraft(e.currentTarget.value) }}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onMouseDown={(e) => {
                    e.stopPropagation()
                }}
                onClick={(e) => {
                    e.stopPropagation()
                }}
                onFocus={(e) => { 
                    e.stopPropagation()
                    setIsEditingTitle(true)
                }}
                onBlur={(e) => { e.stopPropagation(); setIsEditingTitle(false); if (task && titleDraft !== task.title) updateTask(id, { title: titleDraft }) }}
                onKeyDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                autoComplete="off"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                placeholder="タスク名"
                aria-label="タスク名"
            />
            {/* 期日 */}
            <div className="mt-1 flex items-center gap-2">
                <input
                    type="date"
                    className="text-[12px] border rounded px-1 py-0.5 nodrag nopan"
                    value={task.deadline.dateISO ?? ''}
                    onChange={(e) => updateTask(id, { deadline: { dateISO: e.target.value || null } })}
                    aria-label="締切"
                />
                <span className="text-[11px] text-slate-500">{remaining === null ? '締切未設定' : `${remaining} 日`}</span>
                <button
                    className="ml-auto text-[12px] px-1 rounded hover:bg-slate-100"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(id) }}
                    title="展開/折りたたみ"
                    aria-label="展開/折りたたみ"
                >▸/▾
                </button>
            </div>

            {/* 簡易メモ（トグル） */}
            <div className="mt-1">
                <button
                    className="text-[11px] px-1 rounded hover:bg-slate-100"
                    onClick={(e) => { e.stopPropagation(); setMemoOpen((v) => !v) }}
                    aria-label="メモ"
                >✎ メモ
                </button>
                {memoOpen && (
                    <textarea
                        ref={memoRef}
                        className="mt-1 w-full h-16 text-[12px] border rounded p-1 nodrag nopan resize-none"
                        value={(task as any).memo ?? ''}
                        onChange={(e) => updateTask(id, { memo: e.target.value } as any)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                            e.stopPropagation()
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                        onFocus={(e) => {
                            e.stopPropagation()
                        }}
                        draggable={false}
                        placeholder="メモ"
                        title="メモ"
                        aria-label="メモ"
                    />
                )}
            </div>
            {/* ハンドルは非表示（React Flow 内部の要件を満たすため設置） */}
            {!skipHandles && (
                <>
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
                </>
            )}
            {/* モバイル: ノード全体タップで編集シートを開く */}
            {isMobile && (
                <button
                    type="button"
                    className="absolute inset-0 z-10 nodrag nopan"
                    style={{ background: 'transparent' }}
                    onClick={(e) => { e.stopPropagation(); setMobileSheetTaskId(id) }}
                    aria-label="タスク編集"
                />
            )}
        </motion.div>
    )
}


