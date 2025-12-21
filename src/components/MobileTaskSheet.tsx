import React, { useMemo } from 'react'
import { useAppStore } from '../store'

export const MobileTaskSheet: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const taskId = useAppStore((s) => s.mobileSheetTaskId)
  const task = useAppStore((s) => (taskId ? s.tasks[taskId] : null))
  const users = useAppStore((s) => s.users)
  const updateTask = useAppStore((s) => s.updateTask)
  const addChild = useAppStore((s) => s.addChild)
  const setFocusTask = useAppStore((s) => s.setFocusTask)
  const addRipple = useAppStore((s) => s.addRipple)
  const setMobileSheetTaskId = useAppStore((s) => s.setMobileSheetTaskId)

  const assigneeOptions = useMemo(() => Object.values(users), [users])

  if (!isOpen || !taskId || !task) return null

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
    </div>
  )
}

