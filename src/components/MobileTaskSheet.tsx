import React, { useMemo, useState } from 'react'
import { useAppStore } from '../store'

export const MobileTaskSheet: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const taskId = useAppStore((s) => s.mobileSheetTaskId)
  const task = useAppStore((s) => (taskId ? s.tasks[taskId] : null))
  const tasks = useAppStore((s) => s.tasks)
  const users = useAppStore((s) => s.users)
  const updateTask = useAppStore((s) => s.updateTask)
  const addChild = useAppStore((s) => s.addChild)
  const setFocusTask = useAppStore((s) => s.setFocusTask)
  const addRipple = useAppStore((s) => s.addRipple)
  const setMobileSheetTaskId = useAppStore((s) => s.setMobileSheetTaskId)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState<{ count: number; incompleteTitles: string[] } | null>(null)

  const assigneeOptions = useMemo(() => Object.values(users), [users])

  if (!isOpen || !taskId || !task) return null

  const openDeleteConfirm = () => {
    const collect = (id: string, acc: string[] = []): string[] => {
      const t: any = (tasks as any)[id]
      if (!t) return acc
      ;(t.children ?? []).forEach((cid: string) => collect(cid, acc))
      acc.push(id)
      return acc
    }
    const ids = collect(taskId, [])
    const incomplete = ids
      .map((id) => (tasks as any)[id])
      .filter((t: any) => t && !t.done)
      .map((t: any) => String(t.title || ''))
      .filter(Boolean)

    setDeleteInfo({ count: ids.length, incompleteTitles: incomplete })
    setDeleteConfirmOpen(true)
  }

  const doDelete = () => {
    const cur = useAppStore.getState()
    const tasks0: any = { ...cur.tasks }
    const rootTaskIds: string[] = [...cur.rootTaskIds]

    const deletedIds: string[] = []
    const removeRecursive = (id: string) => {
      const t: any = tasks0[id]
      if (!t) return
      ;(t.children ?? []).forEach((cid: string) => removeRecursive(cid))
      deletedIds.push(id)
      if (t.parentId && tasks0[t.parentId]) {
        tasks0[t.parentId] = { ...tasks0[t.parentId], children: (tasks0[t.parentId].children ?? []).filter((cid: string) => cid !== id) }
      }
      const idx = rootTaskIds.indexOf(id)
      if (idx >= 0) rootTaskIds.splice(idx, 1)
      delete tasks0[id]
    }

    removeRecursive(taskId)
    const deletedSet = new Set(deletedIds)
    Object.keys(tasks0).forEach((id) => {
      const t: any = tasks0[id]
      if (!t) return
      if (Array.isArray(t.dependsOn) && t.dependsOn.some((d: string) => deletedSet.has(d))) {
        tasks0[id] = { ...t, dependsOn: t.dependsOn.filter((d: string) => !deletedSet.has(d)) }
      }
      if (t.parentId && deletedSet.has(t.parentId)) {
        tasks0[id] = { ...tasks0[id], parentId: null }
        rootTaskIds.push(id)
      }
    })

    cur.setGraph({ tasks: tasks0, users: cur.users, rootTaskIds })
    setDeleteConfirmOpen(false)
    setDeleteInfo(null)
    setMobileSheetTaskId(null)
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="閉じる"
      />
      <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl border-t">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto" />
        </div>
        <div className="px-4 pb-4 max-h-[70vh] overflow-auto">
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                task.done ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
              onClick={() => updateTask(taskId, { done: !task.done } as any)}
              aria-label="完了切替"
            >
              ✓
            </button>
            <div className="font-semibold text-lg flex-1 truncate">編集</div>
            <button type="button" className="px-3 py-2 text-sm text-slate-600" onClick={onClose}>
              閉じる
            </button>
          </div>

          <label className="block text-sm text-slate-600 mb-1">タスク名</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-base"
            value={task.title}
            onChange={(e) => updateTask(taskId, { title: e.target.value } as any)}
            aria-label="タスク名"
            placeholder="タスク名"
          />

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">締切</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-base"
                value={task.deadline?.dateISO ?? ''}
                onChange={(e) => updateTask(taskId, { deadline: { dateISO: e.target.value || null } } as any)}
                aria-label="締切"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">担当者</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-base bg-white"
                value={task.assigneeId ?? ''}
                onChange={(e) => updateTask(taskId, { assigneeId: e.target.value || null } as any)}
                aria-label="担当者"
              >
                <option value="">未設定</option>
                {assigneeOptions.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-sm text-slate-600 mb-1 mt-3">メモ</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-base min-h-[96px]"
            value={(task as any).memo ?? ''}
            onChange={(e) => updateTask(taskId, { memo: e.target.value } as any)}
            aria-label="メモ"
            placeholder="メモ"
          />

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="px-4 rounded-lg border border-rose-500 text-rose-600 py-3 text-base"
              onClick={openDeleteConfirm}
            >
              削除
            </button>
            <button
              type="button"
              className="flex-1 bg-slate-900 text-white rounded-lg py-3 text-base"
              onClick={() => {
                const child = addChild(taskId, { title: '新しいタスク' })
                // 親を展開し、子を見える位置へ。追加したことが分かるようにフォーカス＆ハイライト。
                updateTask(taskId, { expanded: true } as any)
                updateTask(child.id, { position: { x: (task.position?.x ?? 0) + 220, y: (task.position?.y ?? 0) } } as any)
                addRipple(child.id)
                setFocusTask(child.id)
                setMobileSheetTaskId(child.id)
                try {
                  ;(navigator as any).vibrate?.(15)
                } catch {}
              }}
            >
              子タスク追加
            </button>
            <button type="button" className="px-4 rounded-lg border" onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[70]">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirmOpen(false)} aria-label="削除キャンセル" />
          <div className="absolute left-4 right-4 top-24 bg-white rounded-2xl shadow-xl border p-4">
            <div className="font-semibold text-base text-rose-600">削除の確認</div>
            <div className="mt-2 text-sm text-slate-700">
              このタスクと子ノードを含む <span className="font-semibold">{deleteInfo?.count ?? 0}件</span> を削除します。元に戻せません。
            </div>
            {(deleteInfo?.incompleteTitles?.length ?? 0) > 0 && (
              <div className="mt-3 text-sm text-slate-700">
                <div className="font-semibold text-rose-600">未完了タスクが含まれます</div>
                <div className="mt-1 max-h-28 overflow-auto border rounded-lg p-2 bg-slate-50">
                  {(deleteInfo?.incompleteTitles ?? []).slice(0, 12).map((t, i) => (
                    <div key={`${i}-${t}`} className="truncate">- {t}</div>
                  ))}
                  {(deleteInfo?.incompleteTitles?.length ?? 0) > 12 && (
                    <div className="text-slate-500">…他 {((deleteInfo?.incompleteTitles?.length ?? 0) - 12)} 件</div>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 bg-rose-600 text-white rounded-lg py-2" onClick={doDelete}>
                削除する
              </button>
              <button type="button" className="px-4 rounded-lg border" onClick={() => setDeleteConfirmOpen(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


