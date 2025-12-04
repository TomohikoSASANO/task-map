import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useAppStore } from '../store'
import { useIsMobile } from '../hooks/useIsMobile'

type TabType = 'members-tasks' | 'add-member' | 'all'

interface SidebarProps {
    isOpen: boolean
    isPinned: boolean
    onClose: () => void
    onTogglePin: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, isPinned, onClose, onTogglePin }) => {
    const tasks = useAppStore((s) => s.tasks)
    const users = useAppStore((s) => s.users)
    const addUser = useAppStore((s) => s.addUser)
    const updateUser = useAppStore((s) => s.updateUser)

    const [name, setName] = useState('')
    const [color, setColor] = useState('#38bdf8')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
    const [editId, setEditId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const isMobile = useIsMobile()
    const [activeTab, setActiveTab] = useState<TabType>('members-tasks')
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

    // モバイル時の長押し→ドラッグ→ドロップ用の状態
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
    const dragStartRef = useRef<{ type: 'task' | 'user'; id?: string; x: number; y: number } | null>(null)
    const dragElementRef = useRef<HTMLElement | null>(null)
    const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const isScrollingRef = useRef<boolean>(false)
    const lastTapTimeRef = useRef<number>(0)
    const lastTappedMemberRef = useRef<string | null>(null)

    const previewUrl = useMemo(() => avatarDataUrl, [avatarDataUrl])

    // タスクの縁取り色をマップ上のロジックに合わせる
    const getTaskBorderClass = (t: any): string => {
        const isDone = !!t.done
        const depth = (() => {
            let d = 0
            let p = t.parentId
            while (p) {
                d += 1
                p = tasks[p]?.parentId ?? null
            }
            return d
        })()

        if (depth === 0) {
            // 大タスク
            return isDone ? 'border-emerald-500' : 'border-2 border-black'
        } else {
            // 中タスク以下
            const hasDeps = (t.dependsOn ?? []).length > 0
            if (hasDeps) {
                // 依存リンクあり
                const allDepsDone = (t.dependsOn ?? []).every((depId: string) => !!tasks[depId]?.done)
                if (isDone) return 'border-emerald-500'
                else if (allDepsDone) return 'border-rose-500'
                else return 'border-slate-300'
            } else {
                // 通常（依存リンクなし）
                const hasIncompleteDescendant = (() => {
                    const walk = (id: string): boolean => {
                        const task = tasks[id]
                        if (!task) return false
                        for (const cid of (task.children ?? [])) {
                            const c = tasks[cid]
                            if (c && !c.done) return true
                            if (walk(cid)) return true
                        }
                        return false
                    }
                    return walk(t.id)
                })()
                if (isDone) return 'border-emerald-500'
                else if (hasIncompleteDescendant) return 'border-slate-300'
                else return 'border-rose-500'
            }
        }
    }

    // 選択中メンバー（editId）の担当タスクを、黒→赤→灰→緑の順に整列
    const sortedTasksForEditUser = useMemo(() => {
        if (!editId) return [] as Array<any>
        const all = Object.values(tasks).filter((t: any) => t.assigneeId === editId)

        const getDepth = (id: string): number => {
            let d = 0; let p: any = tasks[id]?.parentId ?? null
            while (p) { d += 1; p = (tasks as any)[p]?.parentId ?? null }
            return d
        }
        const hasIncompleteDescendant = (id: string): boolean => {
            const t: any = (tasks as any)[id]
            if (!t) return false
            for (const cid of (t.children ?? [])) {
                const c: any = (tasks as any)[cid]
                if (c && !c.done) return true
                if (hasIncompleteDescendant(cid)) return true
            }
            return false
        }
        const classify = (t: any): 'black' | 'red' | 'gray' | 'green' => {
            const depth = getDepth(t.id)
            if (depth === 0) return t.done ? 'green' : 'black'
            if (t.done) return 'green'
            const hasDeps = (t.dependsOn ?? []).length > 0
            if (hasDeps) {
                const allDepsDone = (t.dependsOn ?? []).every((d: string) => !!(tasks as any)[d]?.done)
                return allDepsDone ? 'red' : 'gray'
            }
            return hasIncompleteDescendant(t.id) ? 'gray' : 'red'
        }
        const blacks = all.filter((t: any) => classify(t) === 'black')
            .sort((a, b) => ((a.position?.x ?? 0) - (b.position?.x ?? 0)) || ((a.position?.y ?? 0) - (b.position?.y ?? 0)))
        const reds = all.filter((t: any) => classify(t) === 'red')
        const isTransitiveDependent = (redId: string, blackId: string): boolean => {
            const visited = new Set<string>()
            const stack: string[] = [redId]
            while (stack.length) {
                const curId = stack.pop()!
                if (visited.has(curId)) continue
                visited.add(curId)
                const cur: any = (tasks as any)[curId]
                if (!cur) continue
                const deps: string[] = cur.dependsOn ?? []
                if (deps.includes(blackId)) return true
                deps.forEach((d) => { if (!visited.has(d)) stack.push(d) })
            }
            return false
        }
        const redsByBlack: Record<string, any[]> = {}
        blacks.forEach((b) => { redsByBlack[b.id] = [] })
        reds.forEach((r) => {
            blacks.forEach((b) => { if (isTransitiveDependent(r.id, b.id)) redsByBlack[b.id].push(r) })
        })
        Object.values(redsByBlack).forEach((arr) => arr.sort((a, b) => ((a.position?.x ?? 0) - (b.position?.x ?? 0)) || ((a.position?.y ?? 0) - (b.position?.y ?? 0))))

        const blacksWithReds = blacks.filter((b) => (redsByBlack[b.id]?.length ?? 0) > 0)
        const blacksNoReds = blacks.filter((b) => (redsByBlack[b.id]?.length ?? 0) === 0)

        const result: any[] = []
        const usedRed = new Set<string>()
        blacksWithReds.forEach((blk) => {
            result.push({ ...blk, _cat: 'black' })
                ; (redsByBlack[blk.id] ?? []).forEach((r) => { result.push({ ...r, _cat: 'red' }); usedRed.add(r.id) })
        })
        blacksNoReds.forEach((blk) => {
            result.push({ ...blk, _cat: 'black' })
        })
        reds.filter((r) => !usedRed.has(r.id)).forEach((r) => result.push({ ...r, _cat: 'red' }))
        return result
    }, [editId, tasks])

    // モバイル時の長押し→ドラッグ→ドロップ処理
    const handleTouchStart = (e: React.TouchEvent, type: 'task' | 'user', id?: string) => {
        if (!isMobile) return

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }

        const target = e.currentTarget as HTMLElement
        dragElementRef.current = target
        const touch = e.touches[0]
        const startX = touch.clientX
        const startY = touch.clientY
        touchStartPosRef.current = { x: startX, y: startY, time: Date.now() }
        isScrollingRef.current = false

        longPressTimerRef.current = setTimeout(() => {
            // 長押しが検出されたらドラッグ開始
            dragStartRef.current = { type, id, x: startX, y: startY }
            
            target.style.opacity = '0.5'
            target.style.transform = 'scale(1.1)'
            
            ;(window as any)._mobileDrag = {
                type,
                id,
                active: true,
                startX,
                startY,
            }
        }, 300)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isMobile) return

        const touch = e.touches[0]
        if (!touchStartPosRef.current) return

        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)

        // 長押しが開始されていない場合、一定距離以上移動したらスクロールと判断
        if (longPressTimerRef.current && !dragStartRef.current) {
            if (dx > 10 || dy > 10) {
                // スクロール開始
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
                isScrollingRef.current = true
                // touchStartPosRefは保持（touchEndで使用するため）
                return
            }
        }

        // ドラッグ中の処理
        if (!dragStartRef.current || !dragElementRef.current) return

        const currentX = touch.clientX
        const currentY = touch.clientY

        if (dragElementRef.current) {
            dragElementRef.current.style.position = 'fixed'
            dragElementRef.current.style.left = `${currentX - 20}px`
            dragElementRef.current.style.top = `${currentY - 20}px`
            dragElementRef.current.style.zIndex = '9999'
            dragElementRef.current.style.pointerEvents = 'none'
        }

        e.preventDefault()
    }

    const handleTouchEnd = (e: React.TouchEvent, onTap?: () => void) => {
        if (!isMobile) return

        const wasDragging = !!dragStartRef.current
        const touchDuration = touchStartPosRef.current ? Date.now() - touchStartPosRef.current.time : 0
        const isQuickTap = touchDuration < 300 && !wasDragging && !isScrollingRef.current

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }

        // スクロール中だった場合は何もしない
        if (isScrollingRef.current) {
            isScrollingRef.current = false
            touchStartPosRef.current = null
            return
        }

        // ドラッグが開始されていた場合
        if (wasDragging && dragElementRef.current) {
            if (dragElementRef.current) {
                dragElementRef.current.style.opacity = ''
                dragElementRef.current.style.transform = ''
                dragElementRef.current.style.position = ''
                dragElementRef.current.style.left = ''
                dragElementRef.current.style.top = ''
                dragElementRef.current.style.zIndex = ''
                dragElementRef.current.style.pointerEvents = ''
            }
            dragStartRef.current = null
            dragElementRef.current = null
            touchStartPosRef.current = null
            return
        }

        // クイックタップの場合（300ms未満で終了）
        if (isQuickTap && onTap) {
            onTap()
        }

        if (dragElementRef.current) {
            dragElementRef.current.style.opacity = ''
            dragElementRef.current.style.transform = ''
        }
        touchStartPosRef.current = null
    }

    // メンバーのクリック処理
    const handleMemberClick = (e: React.MouseEvent | React.TouchEvent, userId: string) => {
        e.preventDefault()
        e.stopPropagation()

        // 既に選択されている場合は変更画面に飛ぶ
        if (selectedMemberId === userId) {
            setEditId(userId)
            const u = users[userId]
            if (u) {
                setName(u.name)
                setColor(u.color)
                setAvatarFile(null)
            }
            setActiveTab('add-member')
            setSelectedMemberId(null)
            lastTappedMemberRef.current = null
            lastTapTimeRef.current = 0
        } else {
            // 選択状態にする
            setSelectedMemberId(userId)
            lastTappedMemberRef.current = userId
            lastTapTimeRef.current = Date.now()
        }
    }

    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
            }
        }
    }, [])

    // タブコンテンツのレンダリング
    const renderTabContent = () => {
        if (activeTab === 'members-tasks') {
            // 選択中のメンバーが担当しているタスクを取得
            const memberTasks = selectedMemberId 
                ? Object.values(tasks).filter((t: any) => t.assigneeId === selectedMemberId)
                : Object.values(tasks).slice(0, 10)

            return (
                <div className="flex flex-col gap-3 h-full">
                    {/* 登録済メンバー */}
                    <div className="flex-shrink-0">
                        <div 
                            ref={scrollContainerRef}
                            className="flex gap-3 overflow-x-auto pb-2" 
                            style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
                        >
                            {/* 新規メンバーボタン */}
                            <button
                                type="button"
                                className="w-10 h-10 rounded-full border-2 border-dashed border-slate-400 bg-white flex items-center justify-center flex-shrink-0 text-slate-600 text-xs hover:bg-slate-50"
                                onClick={() => {
                                    setEditId(null)
                                    setName('')
                                    setColor('#38bdf8')
                                    setActiveTab('add-member')
                                }}
                            >
                                新規
                            </button>
                            {Object.values(users).map((u) => {
                                const isSelected = selectedMemberId === u.id
                                return (
                                    <div
                                        key={u.id}
                                        className={`w-10 h-10 rounded-full border shadow flex items-center justify-center overflow-hidden flex-shrink-0 relative ${
                                            isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                                        } ${isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
                                        style={{ 
                                            background: isSelected ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), ${u.color}` : u.color 
                                        }}
                                        title={u.name}
                                        draggable={!isMobile}
                                        onDragStart={!isMobile ? (e) => { e.dataTransfer.setData('application/x-user-id', u.id); e.dataTransfer.effectAllowed = 'copy' } : undefined}
                                        onTouchStart={isMobile ? (e) => {
                                            // タッチ開始時は長押しタイマーを開始
                                            handleTouchStart(e, 'user', u.id)
                                        } : undefined}
                                        onTouchMove={isMobile ? handleTouchMove : undefined}
                                        onTouchEnd={isMobile ? (e) => {
                                            handleTouchEnd(e, () => handleMemberClick(e, u.id))
                                        } : undefined}
                                        onClick={!isMobile ? (e) => handleMemberClick(e, u.id) : undefined}
                                    >
                                        {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : <span className="text-white text-[10px]">{u.name.slice(0, 2)}</span>}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                                <span className="text-white text-[8px] font-bold">変更</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    {/* タスク雛形 */}
                    <div className="flex-1 min-h-0">
                        <div 
                            ref={scrollContainerRef}
                            className="flex gap-3 overflow-x-auto pb-2" 
                            style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
                        >
                            <div
                                className="h-12 w-32 rounded border border-slate-300 bg-white cursor-grab active:cursor-grabbing flex items-center justify-center text-xs text-slate-500 flex-shrink-0"
                                draggable={!isMobile}
                                onDragStart={!isMobile ? (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy' } : undefined}
                                onTouchStart={isMobile ? (e) => handleTouchStart(e, 'task') : undefined}
                                onTouchMove={isMobile ? handleTouchMove : undefined}
                                onTouchEnd={isMobile ? (e) => handleTouchEnd(e) : undefined}
                                title={isMobile ? "長押し→ドラッグして新規タスクを作成" : "ドラッグして新規タスクを作成"}
                            >
                                ドラッグしてタスク追加
                            </div>
                            {memberTasks.map((t: any) => {
                                const border = getTaskBorderClass(t)
                                return (
                                    <div
                                        key={t.id}
                                        className={`h-12 w-24 rounded border ${border} bg-white overflow-hidden flex items-center justify-center text-[11px] text-slate-600 cursor-pointer flex-shrink-0`}
                                        title={t.title}
                                        draggable={!isMobile}
                                        onDragStart={!isMobile ? (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy' } : undefined}
                                        onTouchStart={isMobile ? (e) => handleTouchStart(e, 'task', t.id) : undefined}
                                        onTouchMove={isMobile ? handleTouchMove : undefined}
                                        onTouchEnd={isMobile ? (e) => handleTouchEnd(e) : undefined}
                                        onClick={() => (useAppStore.getState() as any).setFocusTask?.(t.id)}
                                    >
                                        <span className="truncate px-2 w-full text-center">{t.title}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )
        }

        if (activeTab === 'add-member') {
            return (
                <div className="p-4">
                    <div className="font-semibold mb-2 text-sm">メンバー追加/編集</div>
                    <form className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col text-[12px]">
                            <span className="mb-1 text-slate-500">名前</span>
                            <input className="border rounded px-2 py-1 w-40" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: Alice" aria-label="メンバー名" />
                        </label>
                        <label className="flex flex-col text-[12px] items-center">
                            <span className="mb-1 text-slate-500">色</span>
                            <input className="w-8 h-8" type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="メンバー色" />
                        </label>
                        <label className="flex flex-col text-[12px]">
                            <span className="mb-1 text-slate-500">画像</span>
                            <input ref={fileInputRef} className="text-[12px]" type="file" accept="image/*" onChange={(e) => {
                                const f = e.target.files?.[0] ?? null
                                setAvatarFile(f)
                                if (f) {
                                    const reader = new FileReader()
                                    reader.onload = () => setAvatarDataUrl(typeof reader.result === 'string' ? reader.result : null)
                                    reader.readAsDataURL(f)
                                } else {
                                    setAvatarDataUrl(null)
                                }
                            }} aria-label="アバター画像" />
                        </label>
                        <div className="flex items-center gap-2 ml-auto">
                            {previewUrl && <img src={previewUrl} alt="preview" className="w-8 h-8 rounded-full border object-cover" />}
                            <button type="button" className="px-3 py-1 rounded bg-slate-800 text-white text-[12px]" onClick={() => {
                                if (!name.trim()) return
                                if (editId) {
                                    const toUrl = avatarDataUrl ?? undefined
                                    updateUser(editId, { name, color, avatarUrl: toUrl })
                                    setEditId(null)
                                } else {
                                    const u = addUser(name, color)
                                    if (avatarDataUrl) updateUser(u.id, { avatarUrl: avatarDataUrl })
                                }
                                setName('')
                                setColor('#38bdf8')
                                setAvatarFile(null)
                                setAvatarDataUrl(null)
                                if (fileInputRef.current) fileInputRef.current.value = ''
                            }}>保存</button>
                            {editId && (
                                <button type="button" className="px-3 py-1 rounded bg-slate-200 text-slate-800 text-[12px]" onClick={() => {
                                    setEditId(null); setName(''); setColor('#38bdf8'); setAvatarFile(null); setAvatarDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''
                                }}>キャンセル</button>
                            )}
                        </div>
                    </form>
                </div>
            )
        }

        if (activeTab === 'all') {
            return (
                <div className="p-4 flex-1 overflow-auto">
                    <div className="text-sm text-slate-500 mb-2">登録済メンバー（ドラッグして担当割当／クリックで編集）</div>
                    <div className="flex gap-3 flex-wrap mb-4">
                        {Object.values(users).map((u) => (
                            <div
                                key={u.id}
                                className="w-10 h-10 rounded-full border shadow cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden touch-none"
                                style={{ background: u.color }}
                                title={u.name}
                                draggable={!isMobile}
                                onDragStart={!isMobile ? (e) => { e.dataTransfer.setData('application/x-user-id', u.id); e.dataTransfer.effectAllowed = 'copy' } : undefined}
                                onTouchStart={isMobile ? (e) => handleTouchStart(e, 'user', u.id) : undefined}
                                onTouchMove={isMobile ? handleTouchMove : undefined}
                                onTouchEnd={isMobile ? handleTouchEnd : undefined}
                                onClick={(e) => { e.preventDefault(); setEditId(u.id); setName(u.name); setColor(u.color); setAvatarFile(null); setActiveTab('add-member') }}
                            >
                                {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : <span className="text-white text-[10px]">{u.name.slice(0, 2)}</span>}
                            </div>
                        ))}
                    </div>
                    <div className="text-sm text-slate-500 mb-2">タスク雛形（ドラッグで追加）</div>
                    <div className="grid grid-cols-3 gap-3">
                        <div
                            className="h-12 rounded border border-slate-300 bg-white cursor-grab active:cursor-grabbing flex items-center justify-center text-xs text-slate-500 touch-none"
                            draggable={!isMobile}
                            onDragStart={!isMobile ? (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy' } : undefined}
                            onTouchStart={isMobile ? (e) => handleTouchStart(e, 'task') : undefined}
                            onTouchMove={isMobile ? handleTouchMove : undefined}
                            onTouchEnd={isMobile ? handleTouchEnd : undefined}
                            title={isMobile ? "長押し→ドラッグして新規タスクを作成" : "ドラッグして新規タスクを作成"}
                        >
                            新規タスク
                        </div>
                        {(editId ? sortedTasksForEditUser : Object.values(tasks)).map((t: any) => {
                            const border = getTaskBorderClass(t)
                            return (
                                <div
                                    key={t.id}
                                    className={`h-12 rounded border ${border} bg-white overflow-hidden flex items-center justify-center text-[11px] text-slate-600 cursor-pointer touch-none`}
                                    title={t.title}
                                    draggable={!isMobile}
                                    onDragStart={!isMobile ? (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy' } : undefined}
                                    onTouchStart={isMobile ? (e) => handleTouchStart(e, 'task', t.id) : undefined}
                                    onTouchMove={isMobile ? handleTouchMove : undefined}
                                    onTouchEnd={isMobile ? handleTouchEnd : undefined}
                                    onClick={() => (useAppStore.getState() as any).setFocusTask?.(t.id)}
                                >
                                    <span className="truncate px-2 w-full text-center">{t.title}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        return null
    }

    if (isMobile) {
        const isAllTab = activeTab === 'all'
        if (!isOpen) return null
        
        return (
            <>
                {/* パレット表示ゾーン */}
                <div
                    className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 flex flex-col text-[14px]"
                    style={{
                        height: isAllTab ? '60%' : '20%',
                        maxHeight: isAllTab ? '80%' : '20%',
                    }}
                >
                    {/* タブ切り替え */}
                    <div className="flex border-b bg-slate-50" style={{ minHeight: '32px' }}>
                        <button
                            type="button"
                            className={`px-2 py-1 text-[10px] font-medium flex-1 whitespace-nowrap ${
                                activeTab === 'members-tasks' ? 'bg-white border-b-2 border-slate-800 text-slate-800' : 'text-slate-600'
                            }`}
                            onClick={() => setActiveTab('members-tasks')}
                            style={{ fontSize: 'clamp(8px, 2vw, 10px)' }}
                        >
                            メンバー&タスク
                        </button>
                        <button
                            type="button"
                            className={`px-2 py-1 text-[10px] font-medium flex-1 whitespace-nowrap ${
                                activeTab === 'add-member' ? 'bg-white border-b-2 border-slate-800 text-slate-800' : 'text-slate-600'
                            }`}
                            onClick={() => setActiveTab('add-member')}
                            style={{ fontSize: 'clamp(8px, 2vw, 10px)' }}
                        >
                            メンバー追加
                        </button>
                        <button
                            type="button"
                            className={`px-2 py-1 text-[10px] font-medium flex-1 whitespace-nowrap ${
                                activeTab === 'all' ? 'bg-white border-b-2 border-slate-800 text-slate-800' : 'text-slate-600'
                            }`}
                            onClick={() => setActiveTab('all')}
                            style={{ fontSize: 'clamp(8px, 2vw, 10px)' }}
                        >
                            全パレット
                        </button>
                        <button
                            type="button"
                            className="px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                            onClick={onClose}
                            style={{ fontSize: 'clamp(8px, 2vw, 10px)' }}
                        >
                            閉じる
                        </button>
                    </div>
                    {/* コンテンツ */}
                    <div className="flex-1 overflow-auto p-4">
                        {renderTabContent()}
                    </div>
                </div>
            </>
        )
    }

    // PC版（既存の実装）
    return (
        <aside className="w-80 border-l bg-white h-full flex flex-col text-[14px] overflow-x-auto">
            <div className="p-4 border-b">
                <div className="font-semibold">パレット</div>
            </div>
            <div className="p-4 border-b space-y-2">
                <div className="text-sm text-slate-500">登録済メンバー（ドラッグして担当割当／クリックで編集）</div>
                <div className="flex gap-3 flex-wrap">
                    {Object.values(users).map((u) => (
                        <div
                            key={u.id}
                            className="w-10 h-10 rounded-full border shadow cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden"
                            style={{ background: u.color }}
                            title={u.name}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('application/x-user-id', u.id); e.dataTransfer.effectAllowed = 'copy' }}
                            onClick={(e) => { e.preventDefault(); setEditId(u.id); setName(u.name); setColor(u.color); setAvatarFile(null) }}
                        >
                            {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : <span className="text-white text-[10px]">{u.name.slice(0, 2)}</span>}
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-4 border-b">
                <div className="font-semibold mb-2 text-sm">メンバー追加/編集</div>
                <form className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col text-[12px]">
                        <span className="mb-1 text-slate-500">名前</span>
                        <input className="border rounded px-2 py-1 w-40" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: Alice" aria-label="メンバー名" />
                    </label>
                    <label className="flex flex-col text-[12px] items-center">
                        <span className="mb-1 text-slate-500">色</span>
                        <input className="w-8 h-8" type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="メンバー色" />
                    </label>
                    <label className="flex flex-col text-[12px]">
                        <span className="mb-1 text-slate-500">画像</span>
                        <input ref={fileInputRef} className="text-[12px]" type="file" accept="image/*" onChange={(e) => {
                            const f = e.target.files?.[0] ?? null
                            setAvatarFile(f)
                            if (f) {
                                const reader = new FileReader()
                                reader.onload = () => setAvatarDataUrl(typeof reader.result === 'string' ? reader.result : null)
                                reader.readAsDataURL(f)
                            } else {
                                setAvatarDataUrl(null)
                            }
                        }} aria-label="アバター画像" />
                    </label>
                    <div className="flex items-center gap-2 ml-auto">
                        {previewUrl && <img src={previewUrl} alt="preview" className="w-8 h-8 rounded-full border object-cover" />}
                        <button type="button" className="px-3 py-1 rounded bg-slate-800 text-white text-[12px]" onClick={() => {
                            if (!name.trim()) return
                            if (editId) {
                                const toUrl = avatarDataUrl ?? undefined
                                updateUser(editId, { name, color, avatarUrl: toUrl })
                                setEditId(null)
                            } else {
                                const u = addUser(name, color)
                                if (avatarDataUrl) updateUser(u.id, { avatarUrl: avatarDataUrl })
                            }
                            setName('')
                            setColor('#38bdf8')
                            setAvatarFile(null)
                            setAvatarDataUrl(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                        }}>保存</button>
                        {editId && (
                            <button type="button" className="px-3 py-1 rounded bg-slate-200 text-slate-800 text-[12px]" onClick={() => {
                                setEditId(null); setName(''); setColor('#38bdf8'); setAvatarFile(null); setAvatarDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''
                            }}>キャンセル</button>
                        )}
                    </div>
                </form>
            </div>
            <div className="p-4 flex-1 overflow-auto">
                <div className="text-sm text-slate-500 mb-2">タスク雛形（ドラッグで追加）</div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="h-12 rounded border border-slate-300 bg-white cursor-grab active:cursor-grabbing flex items-center justify-center text-xs text-slate-500" draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy' }} title="ドラッグして新規タスクを作成">新規タスク</div>
                    {(editId ? sortedTasksForEditUser : Object.values(tasks)).map((t: any) => {
                        const border = t._cat === 'black' ? 'border-black' : t._cat === 'red' ? 'border-rose-500' : t._cat === 'gray' ? 'border-slate-300' : (t.done ? 'border-emerald-500' : 'border-slate-300')
                        return (
                            <div key={t.id} className={`h-12 rounded border ${border} bg-white overflow-hidden flex items-center justify-center text-[11px] text-slate-600 cursor-pointer`} title={t.title} onClick={() => (useAppStore.getState() as any).setFocusTask?.(t.id)}>
                                <span className="truncate px-2 w-full text-center">{t.title}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </aside>
    )
}
