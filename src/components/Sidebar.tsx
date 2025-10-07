import React, { useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store'

export const Sidebar: React.FC = () => {
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

    const previewUrl = useMemo(() => avatarDataUrl, [avatarDataUrl])

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
        // 黒（Lv0未完）と赤のみを表示。黒→黒に紐づく赤（依存され側=黒、依存する側=赤）の順に展開
        // 表示順は: 黒(作業単位のヘッダ) → その黒に直接依存する赤
        // 並びはキャンバス上のX座標で安定化（視覚的順序と揃える）
        const blacks = all.filter((t: any) => classify(t) === 'black')
            .sort((a, b) => ((a.position?.x ?? 0) - (b.position?.x ?? 0)) || ((a.position?.y ?? 0) - (b.position?.y ?? 0)))
        const reds = all.filter((t: any) => classify(t) === 'red')
        // r が黒 b に間接/直接依存しているかを判定（上流へ遡る）
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
        // 黒ごとの赤（間接依存も含む）
        const redsByBlack: Record<string, any[]> = {}
        blacks.forEach((b) => { redsByBlack[b.id] = [] })
        reds.forEach((r) => {
            blacks.forEach((b) => { if (isTransitiveDependent(r.id, b.id)) redsByBlack[b.id].push(r) })
        })
        Object.values(redsByBlack).forEach((arr) => arr.sort((a, b) => ((a.position?.x ?? 0) - (b.position?.x ?? 0)) || ((a.position?.y ?? 0) - (b.position?.y ?? 0))))

        // 赤を持つ黒を先に、赤を持たない黒は後ろに
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
        // どの黒にも紐づかなかった赤も表示（最後にまとめて）
        reds.filter((r) => !usedRed.has(r.id)).forEach((r) => result.push({ ...r, _cat: 'red' }))
        return result
    }, [editId, tasks])
    return (
        <aside className="w-80 border-l bg-white h-full flex flex-col text-[14px] overflow-x-auto">
            <div className="p-4 border-b">
                <div className="font-semibold">パレット</div>
            </div>
            <div className="p-4 border-b space-y-2">
                <div className="text-sm text-slate-500">登録済メンバー（ドラッグして担当割当／クリックで編集）</div>
                <div className="flex gap-3 flex-wrap">
                    {Object.values(users).map((u) => (
                        <div key={u.id} className="w-10 h-10 rounded-full border shadow cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden" style={{ background: u.color }} title={u.name} draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-user-id', u.id); e.dataTransfer.effectAllowed = 'copy' }} onClick={(e) => { e.preventDefault(); setEditId(u.id); setName(u.name); setColor(u.color); setAvatarFile(null) }}>
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


