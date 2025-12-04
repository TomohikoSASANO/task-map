"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskNode = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const framer_motion_1 = require("framer-motion");
const react_1 = require("react");
const reactflow_1 = require("reactflow");
const store_1 = require("../store");
const Ripple = ({ active }) => ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.span, { initial: false, animate: active ? { scale: [0.8, 1.6, 2.2], opacity: [0.35, 0.25, 0] } : { opacity: 0 }, transition: { duration: 0.6, ease: 'easeOut' }, className: "pointer-events-none absolute inset-0 rounded-md border-2 border-emerald-400" }));
const TaskNode = ({ id, data }) => {
    const task = (0, store_1.useAppStore)((s) => s.tasks[id]);
    const users = (0, store_1.useAppStore)((s) => s.users);
    const allTasks = (0, store_1.useAppStore)((s) => s.tasks);
    const remaining = (0, store_1.useAppStore)((s) => s.remainingDays(id));
    const conflict = (0, store_1.useAppStore)((s) => s.hasDeadlineConflict(id));
    const actionable = (0, store_1.useAppStore)((s) => s.isActionable(id));
    const updateTask = (0, store_1.useAppStore)((s) => s.updateTask);
    const toggleExpand = (0, store_1.useAppStore)((s) => s.toggleExpand);
    const draggingId = (0, store_1.useAppStore)((s) => s.draggingId);
    const ripples = (0, store_1.useAppStore)((s) => s.ripples);
    const [memoOpen, setMemoOpen] = (0, react_1.useState)(false);
    // タイトル編集中はローカルバッファに保持して、過度な再レンダー/フォーカス喪失を防ぐ
    const [isEditingTitle, setIsEditingTitle] = (0, react_1.useState)(false);
    const [titleDraft, setTitleDraft] = (0, react_1.useState)(task?.title ?? '');
    const isComposingRef = (0, react_1.useRef)(false);
    const memoRef = (0, react_1.useRef)(null);
    const toggleHandledRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => { if (memoOpen && memoRef.current)
        memoRef.current.focus(); }, [memoOpen]);
    // タスク名が外部更新された場合、未編集中のみドラフトを追従
    (0, react_1.useEffect)(() => {
        if (!isEditingTitle)
            setTitleDraft(task?.title ?? '');
    }, [task?.title, isEditingTitle]);
    // 編集中は軽いデバウンスでストアにも反映（IME構成中は反映しない）
    (0, react_1.useEffect)(() => {
        if (!isEditingTitle)
            return;
        if (isComposingRef.current)
            return;
        const t = setTimeout(() => {
            if (task && titleDraft !== task.title) {
                updateTask(id, { title: titleDraft });
            }
        }, 180);
        return () => clearTimeout(t);
    }, [titleDraft, isEditingTitle]);
    const isDragging = draggingId === id;
    const hasRipple = ripples.some((r) => r.nodeId === id);
    const isHighlight = !!data.highlight;
    // タスクが削除済みの一時描画タイミングで安全に抜ける（フック呼び出し後に判定）
    if (!task)
        return null;
    const assignee = task.assigneeId ? users[task.assigneeId] : undefined;
    const hasAssignee = !!assignee;
    const isDone = !!task.done;
    const hasDeps = (task.dependsOn ?? []).length > 0;
    const allDepsDone = (task.dependsOn ?? []).every((d) => !!allTasks[d]?.done);
    const depth = data.depth ?? 0;
    const hasIncompleteDescendant = (() => {
        const walk = (id) => {
            const t = allTasks[id];
            if (!t)
                return false;
            for (const cid of (t.children ?? [])) {
                const c = allTasks[cid];
                if (c && !c.done)
                    return true;
                if (walk(cid))
                    return true;
            }
            return false;
        };
        return walk(id);
    })();
    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { animate: { scale: isDragging ? 1.06 : 1, transition: { type: 'spring', stiffness: 320, damping: 18 } }, className: (() => {
            let borderClass = 'border-slate-300';
            if (depth === 0) {
                borderClass = isDone ? 'border-emerald-500' : 'border-2 border-black';
            }
            else {
                if (hasDeps) {
                    // リンクタスク扱い
                    if (isDone)
                        borderClass = 'border-emerald-500';
                    else if (allDepsDone)
                        borderClass = 'border-rose-500';
                    else
                        borderClass = 'border-slate-300';
                }
                else {
                    // 通常（Lv1以下）：子孫に未完があれば灰、なければ赤
                    if (isDone)
                        borderClass = 'border-emerald-500';
                    else if (hasIncompleteDescendant)
                        borderClass = 'border-slate-300';
                    else
                        borderClass = 'border-rose-500';
                }
            }
            return (`relative overflow-visible rounded-md border ${hasAssignee ? 'pl-12 pr-2' : 'px-2'} py-1 bg-white shadow-sm text-sm ` +
                borderClass + ' ' +
                (isDone ? 'ring-1 ring-emerald-300 ' : '') +
                (isHighlight ? 'outline outline-2 outline-sky-400' : ''));
        })(), onDragOver: (e) => {
            if (Array.from(e.dataTransfer.types).includes('application/x-user-id')) {
                e.preventDefault();
            }
        }, onDrop: (e) => {
            if (Array.from(e.dataTransfer.types).includes('application/x-user-id')) {
                e.preventDefault();
                e.stopPropagation();
                const uid = e.dataTransfer.getData('application/x-user-id');
                if (uid)
                    updateTask(id, { assigneeId: uid });
            }
        }, children: [(0, jsx_runtime_1.jsx)(Ripple, { active: hasRipple }), hasAssignee && assignee && ((0, jsx_runtime_1.jsxs)("div", { className: "pointer-events-none absolute top-1 left-1 z-30 flex flex-col items-center", children: [assignee.avatarUrl ? ((0, jsx_runtime_1.jsx)("img", { src: assignee.avatarUrl, alt: assignee.name, className: "w-8 h-8 rounded-full border object-cover shadow" })) : ((0, jsx_runtime_1.jsx)("span", { className: "inline-block w-8 h-8 rounded-full border shadow", style: { background: assignee.color } })), (0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 text-[10px] text-slate-700 leading-none bg-white/90 px-1 rounded shadow", children: assignee.name })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-1", onPointerDown: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("button", { className: `nodrag nopan min-w-[28px] min-h-[28px] w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${isDone ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-200 border-slate-400 text-slate-600 hover:bg-slate-300'}`, style: { fontSize: '14px', pointerEvents: 'auto', touchAction: 'manipulation' }, title: isDone ? '完了' : '未完了', "aria-label": "\u5B8C\u4E86\u5207\u66FF", onPointerDown: (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (toggleHandledRef.current)
                                return;
                            toggleHandledRef.current = true;
                            window._preventNodeDrag = true;
                            updateTask(id, { done: !isDone });
                            setTimeout(() => {
                                toggleHandledRef.current = false;
                                window._preventNodeDrag = false;
                            }, 300);
                        }, onMouseDown: (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (toggleHandledRef.current)
                                return;
                            toggleHandledRef.current = true;
                            window._preventNodeDrag = true;
                            updateTask(id, { done: !isDone });
                            setTimeout(() => {
                                toggleHandledRef.current = false;
                                window._preventNodeDrag = false;
                            }, 300);
                        }, onPointerUp: (e) => {
                            e.stopPropagation();
                        }, onMouseUp: (e) => {
                            e.stopPropagation();
                        }, onClick: (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (toggleHandledRef.current)
                                return;
                            toggleHandledRef.current = true;
                            updateTask(id, { done: !isDone });
                            setTimeout(() => { toggleHandledRef.current = false; }, 300);
                        }, children: "\u2713" }), (0, jsx_runtime_1.jsxs)("div", { className: "ml-auto text-[10px] text-slate-500", children: ["Lv", data.depth ?? 0] })] }), (0, jsx_runtime_1.jsx)("input", { className: "w-full bg-transparent font-medium outline-none border-b border-transparent focus:border-slate-300 nodrag nopan", value: titleDraft, onChange: (e) => setTitleDraft(e.target.value), onCompositionStart: () => { isComposingRef.current = true; }, onCompositionEnd: (e) => { isComposingRef.current = false; setTitleDraft(e.currentTarget.value); }, onPointerDown: (e) => { e.stopPropagation(); }, onMouseDown: (e) => e.stopPropagation(), onClick: (e) => e.stopPropagation(), onFocus: (e) => { e.stopPropagation(); setIsEditingTitle(true); }, onBlur: (e) => { e.stopPropagation(); setIsEditingTitle(false); if (task && titleDraft !== task.title)
                    updateTask(id, { title: titleDraft }); }, onKeyDown: (e) => e.stopPropagation(), onDoubleClick: (e) => e.stopPropagation(), autoComplete: "off", spellCheck: false, autoCorrect: "off", autoCapitalize: "off", placeholder: "\u30BF\u30B9\u30AF\u540D", "aria-label": "\u30BF\u30B9\u30AF\u540D" }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-1 flex items-center gap-2", onPointerDown: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation(), onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("input", { type: "date", className: "text-[12px] border rounded px-1 py-0.5", value: task.deadline.dateISO ?? '', onChange: (e) => updateTask(id, { deadline: { dateISO: e.target.value || null } }), "aria-label": "\u7DE0\u5207" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-slate-500", children: remaining === null ? '締切未設定' : `${remaining} 日` }), (0, jsx_runtime_1.jsx)("button", { className: "ml-auto text-[12px] px-1 rounded hover:bg-slate-100", onClick: (e) => { e.stopPropagation(); toggleExpand(id); }, title: "\u5C55\u958B/\u6298\u308A\u305F\u305F\u307F", "aria-label": "\u5C55\u958B/\u6298\u308A\u305F\u305F\u307F", children: "\u25B8/\u25BE" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-1", onPointerDown: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation(), onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("button", { className: "text-[11px] px-1 rounded hover:bg-slate-100", onClick: (e) => { e.stopPropagation(); setMemoOpen((v) => !v); }, "aria-label": "\u30E1\u30E2", children: "\u270E \u30E1\u30E2" }), memoOpen && ((0, jsx_runtime_1.jsx)("textarea", { ref: memoRef, className: "mt-1 w-full h-16 text-[12px] border rounded p-1 nodrag nopan resize-none", value: task.memo ?? '', onChange: (e) => updateTask(id, { memo: e.target.value }), onPointerDown: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation(), onClick: (e) => e.stopPropagation(), onFocus: (e) => e.stopPropagation(), draggable: false, placeholder: "\u30E1\u30E2", title: "\u30E1\u30E2", "aria-label": "\u30E1\u30E2" }))] }), (0, jsx_runtime_1.jsx)(reactflow_1.Handle, { type: "source", position: reactflow_1.Position.Right, style: { opacity: 0 } }), (0, jsx_runtime_1.jsx)(reactflow_1.Handle, { type: "target", position: reactflow_1.Position.Left, style: { opacity: 0 } })] }));
};
exports.TaskNode = TaskNode;
