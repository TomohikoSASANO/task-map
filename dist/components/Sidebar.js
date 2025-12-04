"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const store_1 = require("../store");
const Sidebar = () => {
    const tasks = (0, store_1.useAppStore)((s) => s.tasks);
    const users = (0, store_1.useAppStore)((s) => s.users);
    const addUser = (0, store_1.useAppStore)((s) => s.addUser);
    const updateUser = (0, store_1.useAppStore)((s) => s.updateUser);
    const [name, setName] = (0, react_1.useState)('');
    const [color, setColor] = (0, react_1.useState)('#38bdf8');
    const [avatarFile, setAvatarFile] = (0, react_1.useState)(null);
    const [avatarDataUrl, setAvatarDataUrl] = (0, react_1.useState)(null);
    const [editId, setEditId] = (0, react_1.useState)(null);
    const fileInputRef = (0, react_1.useRef)(null);
    const previewUrl = (0, react_1.useMemo)(() => avatarDataUrl, [avatarDataUrl]);
    // 選択中メンバー（editId）の担当タスクを、黒→赤→灰→緑の順に整列
    const sortedTasksForEditUser = (0, react_1.useMemo)(() => {
        if (!editId)
            return [];
        const all = Object.values(tasks).filter((t) => t.assigneeId === editId);
        const getDepth = (id) => {
            let d = 0;
            let p = tasks[id]?.parentId ?? null;
            while (p) {
                d += 1;
                p = tasks[p]?.parentId ?? null;
            }
            return d;
        };
        const hasIncompleteDescendant = (id) => {
            const t = tasks[id];
            if (!t)
                return false;
            for (const cid of (t.children ?? [])) {
                const c = tasks[cid];
                if (c && !c.done)
                    return true;
                if (hasIncompleteDescendant(cid))
                    return true;
            }
            return false;
        };
        const classify = (t) => {
            const depth = getDepth(t.id);
            if (depth === 0)
                return t.done ? 'green' : 'black';
            if (t.done)
                return 'green';
            const hasDeps = (t.dependsOn ?? []).length > 0;
            if (hasDeps) {
                const allDepsDone = (t.dependsOn ?? []).every((d) => !!tasks[d]?.done);
                return allDepsDone ? 'red' : 'gray';
            }
            return hasIncompleteDescendant(t.id) ? 'gray' : 'red';
        };
        // 黒（Lv0未完）と赤のみを表示。黒→黒に紐づく赤（依存され側=黒、依存する側=赤）の順に展開
        // 表示順は: 黒(作業単位のヘッダ) → その黒に直接依存する赤
        // 並びはキャンバス上のX座標で安定化（視覚的順序と揃える）
        const blacks = all.filter((t) => classify(t) === 'black')
            .sort((a, b) => ((a.position?.x ?? 0) - (b.position?.x ?? 0)) || ((a.position?.y ?? 0) - (b.position?.y ?? 0)));
        const reds = all.filter((t) => classify(t) === 'red');
        // r が黒 b に間接/直接依存しているかを判定（上流へ遡る）
        const isTransitiveDependent = (redId, blackId) => {
            const visited = new Set();
            const stack = [redId];
            while (stack.length) {
                const curId = stack.pop();
                if (visited.has(curId))
                    continue;
                visited.add(curId);
                const cur = tasks[curId];
                if (!cur)
                    continue;
                const deps = cur.dependsOn ?? [];
                if (deps.includes(blackId))
                    return true;
                deps.forEach((d) => { if (!visited.has(d))
                    stack.push(d); });
            }
            return false;
        };
        // 黒ごとの赤（間接依存も含む）
        const redsByBlack = {};
        blacks.forEach((b) => { redsByBlack[b.id] = []; });
        reds.forEach((r) => {
            blacks.forEach((b) => { if (isTransitiveDependent(r.id, b.id))
                redsByBlack[b.id].push(r); });
        });
        Object.values(redsByBlack).forEach((arr) => arr.sort((a, b) => ((a.position?.x ?? 0) - (b.position?.x ?? 0)) || ((a.position?.y ?? 0) - (b.position?.y ?? 0))));
        // 赤を持つ黒を先に、赤を持たない黒は後ろに
        const blacksWithReds = blacks.filter((b) => (redsByBlack[b.id]?.length ?? 0) > 0);
        const blacksNoReds = blacks.filter((b) => (redsByBlack[b.id]?.length ?? 0) === 0);
        const result = [];
        const usedRed = new Set();
        blacksWithReds.forEach((blk) => {
            result.push({ ...blk, _cat: 'black' });
            (redsByBlack[blk.id] ?? []).forEach((r) => { result.push({ ...r, _cat: 'red' }); usedRed.add(r.id); });
        });
        blacksNoReds.forEach((blk) => {
            result.push({ ...blk, _cat: 'black' });
        });
        // どの黒にも紐づかなかった赤も表示（最後にまとめて）
        reds.filter((r) => !usedRed.has(r.id)).forEach((r) => result.push({ ...r, _cat: 'red' }));
        return result;
    }, [editId, tasks]);
    return ((0, jsx_runtime_1.jsxs)("aside", { className: "w-80 border-l bg-white h-full flex flex-col text-[14px] overflow-x-auto", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-4 border-b", children: (0, jsx_runtime_1.jsx)("div", { className: "font-semibold", children: "\u30D1\u30EC\u30C3\u30C8" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 border-b space-y-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm text-slate-500", children: "\u767B\u9332\u6E08\u30E1\u30F3\u30D0\u30FC\uFF08\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u62C5\u5F53\u5272\u5F53\uFF0F\u30AF\u30EA\u30C3\u30AF\u3067\u7DE8\u96C6\uFF09" }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-3 flex-wrap", children: Object.values(users).map((u) => ((0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 rounded-full border shadow cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden", style: { background: u.color }, title: u.name, draggable: true, onDragStart: (e) => { e.dataTransfer.setData('application/x-user-id', u.id); e.dataTransfer.effectAllowed = 'copy'; }, onClick: (e) => { e.preventDefault(); setEditId(u.id); setName(u.name); setColor(u.color); setAvatarFile(null); }, children: u.avatarUrl ? (0, jsx_runtime_1.jsx)("img", { src: u.avatarUrl, alt: u.name, className: "w-full h-full object-cover" }) : (0, jsx_runtime_1.jsx)("span", { className: "text-white text-[10px]", children: u.name.slice(0, 2) }) }, u.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 border-b", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-semibold mb-2 text-sm", children: "\u30E1\u30F3\u30D0\u30FC\u8FFD\u52A0/\u7DE8\u96C6" }), (0, jsx_runtime_1.jsxs)("form", { className: "flex flex-wrap items-end gap-3", children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col text-[12px]", children: [(0, jsx_runtime_1.jsx)("span", { className: "mb-1 text-slate-500", children: "\u540D\u524D" }), (0, jsx_runtime_1.jsx)("input", { className: "border rounded px-2 py-1 w-40", value: name, onChange: (e) => setName(e.target.value), placeholder: "\u4F8B: Alice", "aria-label": "\u30E1\u30F3\u30D0\u30FC\u540D" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col text-[12px] items-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "mb-1 text-slate-500", children: "\u8272" }), (0, jsx_runtime_1.jsx)("input", { className: "w-8 h-8", type: "color", value: color, onChange: (e) => setColor(e.target.value), "aria-label": "\u30E1\u30F3\u30D0\u30FC\u8272" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col text-[12px]", children: [(0, jsx_runtime_1.jsx)("span", { className: "mb-1 text-slate-500", children: "\u753B\u50CF" }), (0, jsx_runtime_1.jsx)("input", { ref: fileInputRef, className: "text-[12px]", type: "file", accept: "image/*", onChange: (e) => {
                                            const f = e.target.files?.[0] ?? null;
                                            setAvatarFile(f);
                                            if (f) {
                                                const reader = new FileReader();
                                                reader.onload = () => setAvatarDataUrl(typeof reader.result === 'string' ? reader.result : null);
                                                reader.readAsDataURL(f);
                                            }
                                            else {
                                                setAvatarDataUrl(null);
                                            }
                                        }, "aria-label": "\u30A2\u30D0\u30BF\u30FC\u753B\u50CF" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 ml-auto", children: [previewUrl && (0, jsx_runtime_1.jsx)("img", { src: previewUrl, alt: "preview", className: "w-8 h-8 rounded-full border object-cover" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "px-3 py-1 rounded bg-slate-800 text-white text-[12px]", onClick: () => {
                                            if (!name.trim())
                                                return;
                                            if (editId) {
                                                const toUrl = avatarDataUrl ?? undefined;
                                                updateUser(editId, { name, color, avatarUrl: toUrl });
                                                setEditId(null);
                                            }
                                            else {
                                                const u = addUser(name, color);
                                                if (avatarDataUrl)
                                                    updateUser(u.id, { avatarUrl: avatarDataUrl });
                                            }
                                            setName('');
                                            setColor('#38bdf8');
                                            setAvatarFile(null);
                                            setAvatarDataUrl(null);
                                            if (fileInputRef.current)
                                                fileInputRef.current.value = '';
                                        }, children: "\u4FDD\u5B58" }), editId && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "px-3 py-1 rounded bg-slate-200 text-slate-800 text-[12px]", onClick: () => {
                                            setEditId(null);
                                            setName('');
                                            setColor('#38bdf8');
                                            setAvatarFile(null);
                                            setAvatarDataUrl(null);
                                            if (fileInputRef.current)
                                                fileInputRef.current.value = '';
                                        }, children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 flex-1 overflow-auto", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm text-slate-500 mb-2", children: "\u30BF\u30B9\u30AF\u96DB\u5F62\uFF08\u30C9\u30E9\u30C3\u30B0\u3067\u8FFD\u52A0\uFF09" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-3 gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-12 rounded border border-slate-300 bg-white cursor-grab active:cursor-grabbing flex items-center justify-center text-xs text-slate-500", draggable: true, onDragStart: (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy'; }, title: "\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u65B0\u898F\u30BF\u30B9\u30AF\u3092\u4F5C\u6210", children: "\u65B0\u898F\u30BF\u30B9\u30AF" }), (editId ? sortedTasksForEditUser : Object.values(tasks)).map((t) => {
                                const border = t._cat === 'black' ? 'border-black' : t._cat === 'red' ? 'border-rose-500' : t._cat === 'gray' ? 'border-slate-300' : (t.done ? 'border-emerald-500' : 'border-slate-300');
                                return ((0, jsx_runtime_1.jsx)("div", { className: `h-12 rounded border ${border} bg-white overflow-hidden flex items-center justify-center text-[11px] text-slate-600 cursor-pointer`, title: t.title, onClick: () => store_1.useAppStore.getState().setFocusTask?.(t.id), children: (0, jsx_runtime_1.jsx)("span", { className: "truncate px-2 w-full text-center", children: t.title }) }, t.id));
                            })] })] })] }));
};
exports.Sidebar = Sidebar;
