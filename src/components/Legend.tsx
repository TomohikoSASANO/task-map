import React from 'react';

export const Legend: React.FC = () => {
    const Item = ({ color, label }: { color: string; label: string }) => (
        <div className="flex items-center gap-2 text-xs">
            <span className={`inline-block w-3 h-3 rounded-full`} style={{ background: color }} />
            <span>{label}</span>
        </div>
    )

    return (
        <div className="absolute left-3 bottom-3 bg-white/90 rounded-md border p-2 shadow text-slate-700">
            <div className="font-semibold text-xs mb-1">凡例</div>
            <Item color="#cbd5e1" label="待ちタスク" />
            <Item color="#ef4444" label="着手可タスク" />
            <Item color="#34d399" label="完了タスク" />
        </div>
    )
}



