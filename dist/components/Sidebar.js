"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const store_1 = require("../store");
const useIsMobile_1 = require("../hooks/useIsMobile");
const Sidebar = ({ isOpen, isPinned, onClose, onTogglePin }) => {
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
    const isMobile = (0, useIsMobile_1.useIsMobile)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('members-tasks');
    const [selectedMemberId, setSelectedMemberId] = (0, react_1.useState)(null);
    // モバイル時の長押し→ドラッグ→ドロップ用の状態
    const longPressTimerRef = (0, react_1.useRef)(null);
    const dragStartRef = (0, react_1.useRef)(null);
    const dragElementRef = (0, react_1.useRef)(null);
    const touchStartPosRef = (0, react_1.useRef)(null);
    const scrollContainerRef = (0, react_1.useRef)(null);
    const isScrollingRef = (0, react_1.useRef)(false);
    const lastTapTimeRef = (0, react_1.useRef)(0);
    const lastTappedMemberRef = (0, react_1.useRef)(null);
    const previewUrl = (0, react_1.useMemo)(() => avatarDataUrl, [avatarDataUrl]);
    // タスクの縁取り色をマップ上のロジックに合わせる
    const getTaskBorderClass = (t) => {
        const isDone = !!t.done;
        const depth = (() => {
            let d = 0;
            let p = t.parentId;
            while (p) {
                d += 1;
                p = tasks[p]?.parentId ?? null;
            }
            return d;
        })();
        if (depth === 0) {
            // 大タスク
            return isDone ? 'border-emerald-500' : 'border-2 border-black';
        }
        else {
            // 中タスク以下
            const hasDeps = (t.dependsOn ?? []).length > 0;
            if (hasDeps) {
                // 依存リンクあり
                const allDepsDone = (t.dependsOn ?? []).every((depId) => !!tasks[depId]?.done);
                if (isDone)
                    return 'border-emerald-500';
                else if (allDepsDone)
                    return 'border-rose-500';
                else
                    return 'border-slate-300';
            }
            else {
                // 通常（依存リンクなし）
                const hasIncompleteDescendant = (() => {
                    const walk = (id) => {
                        const task = tasks[id];
                        if (!task)
                            return false;
                        for (const cid of (task.children ?? [])) {
                            const c = tasks[cid];
                            if (c && !c.done)
                                return true;
                            if (walk(cid))
                                return true;
                        }
                        return false;
                    };
                    return walk(t.id);
                })();
                if (isDone)
                    return 'border-emerald-500';
                else if (hasIncompleteDescendant)
                    return 'border-slate-300';
                else
                    return 'border-rose-500';
            }
        }
    };
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
        const blacks = all.filter((t) => classify(t) === 'black')
            .sort((a, b) => ((a.position?.x ?? 0) - (b.position?.x ?? 0)) || ((a.position?.y ?? 0) - (b.position?.y ?? 0)));
        const reds = all.filter((t) => classify(t) === 'red');
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
        const redsByBlack = {};
        blacks.forEach((b) => { redsByBlack[b.id] = []; });
        reds.forEach((r) => {
            blacks.forEach((b) => { if (isTransitiveDependent(r.id, b.id))
                redsByBlack[b.id].push(r); });
        });
        Object.values(redsByBlack).forEach((arr) => arr.sort((a, b) => ((a.position?.x ?? 0) - (b.position?.x ?? 0)) || ((a.position?.y ?? 0) - (b.position?.y ?? 0))));
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
        reds.filter((r) => !usedRed.has(r.id)).forEach((r) => result.push({ ...r, _cat: 'red' }));
        return result;
    }, [editId, tasks]);
    // モバイル時の長押し→ドラッグ→ドロップ処理
    const handleTouchStart = (e, type, id) => {
        if (!isMobile)
            return;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        const target = e.currentTarget;
        dragElementRef.current = target;
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;
        touchStartPosRef.current = { x: startX, y: startY, time: Date.now() };
        isScrollingRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            // 長押しが検出されたらドラッグ開始
            dragStartRef.current = { type, id, x: startX, y: startY };
            target.style.opacity = '0.5';
            target.style.transform = 'scale(1.1)';
            window._mobileDrag = {
                type,
                id,
                active: true,
                startX,
                startY,
            };
        }, 300);
    };
    const handleTouchMove = (e) => {
        if (!isMobile)
            return;
        const touch = e.touches[0];
        if (!touchStartPosRef.current)
            return;
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
        // 長押しが開始されていない場合、一定距離以上移動したらスクロールと判断
        if (longPressTimerRef.current && !dragStartRef.current) {
            if (dx > 10 || dy > 10) {
                // スクロール開始
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
                isScrollingRef.current = true;
                // touchStartPosRefは保持（touchEndで使用するため）
                return;
            }
        }
        // ドラッグ中の処理
        if (!dragStartRef.current || !dragElementRef.current)
            return;
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        if (dragElementRef.current) {
            dragElementRef.current.style.position = 'fixed';
            dragElementRef.current.style.left = `${currentX - 20}px`;
            dragElementRef.current.style.top = `${currentY - 20}px`;
            dragElementRef.current.style.zIndex = '9999';
            dragElementRef.current.style.pointerEvents = 'none';
        }
        e.preventDefault();
    };
    const handleTouchEnd = (e, onTap) => {
        if (!isMobile)
            return;
        const wasDragging = !!dragStartRef.current;
        const touchDuration = touchStartPosRef.current ? Date.now() - touchStartPosRef.current.time : 0;
        const isQuickTap = touchDuration < 300 && !wasDragging && !isScrollingRef.current;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        // スクロール中だった場合は何もしない
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            touchStartPosRef.current = null;
            return;
        }
        // ドラッグが開始されていた場合
        if (wasDragging && dragElementRef.current) {
            if (dragElementRef.current) {
                dragElementRef.current.style.opacity = '';
                dragElementRef.current.style.transform = '';
                dragElementRef.current.style.position = '';
                dragElementRef.current.style.left = '';
                dragElementRef.current.style.top = '';
                dragElementRef.current.style.zIndex = '';
                dragElementRef.current.style.pointerEvents = '';
            }
            dragStartRef.current = null;
            dragElementRef.current = null;
            touchStartPosRef.current = null;
            return;
        }
        // クイックタップの場合（300ms未満で終了）
        if (isQuickTap && onTap) {
            onTap();
        }
        if (dragElementRef.current) {
            dragElementRef.current.style.opacity = '';
            dragElementRef.current.style.transform = '';
        }
        touchStartPosRef.current = null;
    };
    // メンバーのクリック処理
    const handleMemberClick = (e, userId) => {
        e.preventDefault();
        e.stopPropagation();
        // 既に選択されている場合は変更画面に飛ぶ
        if (selectedMemberId === userId) {
            setEditId(userId);
            const u = users[userId];
            if (u) {
                setName(u.name);
                setColor(u.color);
                setAvatarFile(null);
            }
            setActiveTab('add-member');
            setSelectedMemberId(null);
            lastTappedMemberRef.current = null;
            lastTapTimeRef.current = 0;
        }
        else {
            // 選択状態にする
            setSelectedMemberId(userId);
            lastTappedMemberRef.current = userId;
            lastTapTimeRef.current = Date.now();
        }
    };
    (0, react_1.useEffect)(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);
    // タブコンテンツのレンダリング
    const renderTabContent = () => {
        if (activeTab === 'members-tasks') {
            // 選択中のメンバーが担当しているタスクを取得
            const memberTasks = selectedMemberId
                ? Object.values(tasks).filter((t) => t.assigneeId === selectedMemberId)
                : Object.values(tasks).slice(0, 10);
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3 h-full", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-shrink-0", children: (0, jsx_runtime_1.jsxs)("div", { ref: scrollContainerRef, className: "flex gap-3 overflow-x-auto pb-2", style: { scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "w-10 h-10 rounded-full border-2 border-dashed border-slate-400 bg-white flex items-center justify-center flex-shrink-0 text-slate-600 text-xs hover:bg-slate-50", onClick: () => {
                                        setEditId(null);
                                        setName('');
                                        setColor('#38bdf8');
                                        setActiveTab('add-member');
                                    }, children: "\u65B0\u898F" }), Object.values(users).map((u) => {
                                    const isSelected = selectedMemberId === u.id;
                                    return ((0, jsx_runtime_1.jsxs)("div", { className: `w-10 h-10 rounded-full border shadow flex items-center justify-center overflow-hidden flex-shrink-0 relative ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`, style: {
                                            background: isSelected ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), ${u.color}` : u.color
                                        }, title: u.name, draggable: !isMobile, onDragStart: !isMobile ? (e) => { e.dataTransfer.setData('application/x-user-id', u.id); e.dataTransfer.effectAllowed = 'copy'; } : undefined, onTouchStart: isMobile ? (e) => {
                                            // タッチ開始時は長押しタイマーを開始
                                            handleTouchStart(e, 'user', u.id);
                                        } : undefined, onTouchMove: isMobile ? handleTouchMove : undefined, onTouchEnd: isMobile ? (e) => {
                                            handleTouchEnd(e, () => handleMemberClick(e, u.id));
                                        } : undefined, onClick: !isMobile ? (e) => handleMemberClick(e, u.id) : undefined, children: [u.avatarUrl ? (0, jsx_runtime_1.jsx)("img", { src: u.avatarUrl, alt: u.name, className: "w-full h-full object-cover" }) : (0, jsx_runtime_1.jsx)("span", { className: "text-white text-[10px]", children: u.name.slice(0, 2) }), isSelected && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center", children: (0, jsx_runtime_1.jsx)("span", { className: "text-white text-[8px] font-bold", children: "\u5909\u66F4" }) }))] }, u.id));
                                })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-h-0", children: (0, jsx_runtime_1.jsxs)("div", { ref: scrollContainerRef, className: "flex gap-3 overflow-x-auto pb-2", style: { scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }, children: [(0, jsx_runtime_1.jsx)("div", { className: "h-12 w-32 rounded border border-slate-300 bg-white cursor-grab active:cursor-grabbing flex items-center justify-center text-xs text-slate-500 flex-shrink-0", draggable: !isMobile, onDragStart: !isMobile ? (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy'; } : undefined, onTouchStart: isMobile ? (e) => handleTouchStart(e, 'task') : undefined, onTouchMove: isMobile ? handleTouchMove : undefined, onTouchEnd: isMobile ? (e) => handleTouchEnd(e) : undefined, title: isMobile ? "長押し→ドラッグして新規タスクを作成" : "ドラッグして新規タスクを作成", children: "\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u30BF\u30B9\u30AF\u8FFD\u52A0" }), memberTasks.map((t) => {
                                    const border = getTaskBorderClass(t);
                                    return ((0, jsx_runtime_1.jsx)("div", { className: `h-12 w-24 rounded border ${border} bg-white overflow-hidden flex items-center justify-center text-[11px] text-slate-600 cursor-pointer flex-shrink-0`, title: t.title, draggable: !isMobile, onDragStart: !isMobile ? (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy'; } : undefined, onTouchStart: isMobile ? (e) => handleTouchStart(e, 'task', t.id) : undefined, onTouchMove: isMobile ? handleTouchMove : undefined, onTouchEnd: isMobile ? (e) => handleTouchEnd(e) : undefined, onClick: () => store_1.useAppStore.getState().setFocusTask?.(t.id), children: (0, jsx_runtime_1.jsx)("span", { className: "truncate px-2 w-full text-center", children: t.title }) }, t.id));
                                })] }) })] }));
        }
        if (activeTab === 'add-member') {
            return ((0, jsx_runtime_1.jsxs)("div", { className: "p-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-semibold mb-2 text-sm", children: "\u30E1\u30F3\u30D0\u30FC\u8FFD\u52A0/\u7DE8\u96C6" }), (0, jsx_runtime_1.jsxs)("form", { className: "flex flex-wrap items-end gap-3", children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col text-[12px]", children: [(0, jsx_runtime_1.jsx)("span", { className: "mb-1 text-slate-500", children: "\u540D\u524D" }), (0, jsx_runtime_1.jsx)("input", { className: "border rounded px-2 py-1 w-40", value: name, onChange: (e) => setName(e.target.value), placeholder: "\u4F8B: Alice", "aria-label": "\u30E1\u30F3\u30D0\u30FC\u540D" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col text-[12px] items-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "mb-1 text-slate-500", children: "\u8272" }), (0, jsx_runtime_1.jsx)("input", { className: "w-8 h-8", type: "color", value: color, onChange: (e) => setColor(e.target.value), "aria-label": "\u30E1\u30F3\u30D0\u30FC\u8272" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col text-[12px]", children: [(0, jsx_runtime_1.jsx)("span", { className: "mb-1 text-slate-500", children: "\u753B\u50CF" }), (0, jsx_runtime_1.jsx)("input", { ref: fileInputRef, className: "text-[12px]", type: "file", accept: "image/*", onChange: (e) => {
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
                                        }, children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }))] })] })] }));
        }
        if (activeTab === 'all') {
            return ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 flex-1 overflow-auto", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm text-slate-500 mb-2", children: "\u767B\u9332\u6E08\u30E1\u30F3\u30D0\u30FC\uFF08\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u62C5\u5F53\u5272\u5F53\uFF0F\u30AF\u30EA\u30C3\u30AF\u3067\u7DE8\u96C6\uFF09" }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-3 flex-wrap mb-4", children: Object.values(users).map((u) => ((0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 rounded-full border shadow cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden touch-none", style: { background: u.color }, title: u.name, draggable: !isMobile, onDragStart: !isMobile ? (e) => { e.dataTransfer.setData('application/x-user-id', u.id); e.dataTransfer.effectAllowed = 'copy'; } : undefined, onTouchStart: isMobile ? (e) => handleTouchStart(e, 'user', u.id) : undefined, onTouchMove: isMobile ? handleTouchMove : undefined, onTouchEnd: isMobile ? handleTouchEnd : undefined, onClick: (e) => { e.preventDefault(); setEditId(u.id); setName(u.name); setColor(u.color); setAvatarFile(null); setActiveTab('add-member'); }, children: u.avatarUrl ? (0, jsx_runtime_1.jsx)("img", { src: u.avatarUrl, alt: u.name, className: "w-full h-full object-cover" }) : (0, jsx_runtime_1.jsx)("span", { className: "text-white text-[10px]", children: u.name.slice(0, 2) }) }, u.id))) }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-slate-500 mb-2", children: "\u30BF\u30B9\u30AF\u96DB\u5F62\uFF08\u30C9\u30E9\u30C3\u30B0\u3067\u8FFD\u52A0\uFF09" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-3 gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-12 rounded border border-slate-300 bg-white cursor-grab active:cursor-grabbing flex items-center justify-center text-xs text-slate-500 touch-none", draggable: !isMobile, onDragStart: !isMobile ? (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy'; } : undefined, onTouchStart: isMobile ? (e) => handleTouchStart(e, 'task') : undefined, onTouchMove: isMobile ? handleTouchMove : undefined, onTouchEnd: isMobile ? handleTouchEnd : undefined, title: isMobile ? "長押し→ドラッグして新規タスクを作成" : "ドラッグして新規タスクを作成", children: "\u65B0\u898F\u30BF\u30B9\u30AF" }), (editId ? sortedTasksForEditUser : Object.values(tasks)).map((t) => {
                                const border = getTaskBorderClass(t);
                                return ((0, jsx_runtime_1.jsx)("div", { className: `h-12 rounded border ${border} bg-white overflow-hidden flex items-center justify-center text-[11px] text-slate-600 cursor-pointer touch-none`, title: t.title, draggable: !isMobile, onDragStart: !isMobile ? (e) => { e.dataTransfer.setData('application/x-task-new', '1'); e.dataTransfer.effectAllowed = 'copy'; } : undefined, onTouchStart: isMobile ? (e) => handleTouchStart(e, 'task', t.id) : undefined, onTouchMove: isMobile ? handleTouchMove : undefined, onTouchEnd: isMobile ? handleTouchEnd : undefined, onClick: () => store_1.useAppStore.getState().setFocusTask?.(t.id), children: (0, jsx_runtime_1.jsx)("span", { className: "truncate px-2 w-full text-center", children: t.title }) }, t.id));
                            })] })] }));
        }
        return null;
    };
    if (isMobile) {
        const isAllTab = activeTab === 'all';
        if (!isOpen)
            return null;
        return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)("div", { className: "fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 flex flex-col text-[14px]", style: {
                    height: isAllTab ? '60%' : '20%',
                    maxHeight: isAllTab ? '80%' : '20%',
                }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex border-b bg-slate-50", style: { minHeight: '32px' }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: `px-2 py-1 text-[10px] font-medium flex-1 whitespace-nowrap ${activeTab === 'members-tasks' ? 'bg-white border-b-2 border-slate-800 text-slate-800' : 'text-slate-600'}`, onClick: () => setActiveTab('members-tasks'), style: { fontSize: 'clamp(8px, 2vw, 10px)' }, children: "\u30E1\u30F3\u30D0\u30FC&\u30BF\u30B9\u30AF" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: `px-2 py-1 text-[10px] font-medium flex-1 whitespace-nowrap ${activeTab === 'add-member' ? 'bg-white border-b-2 border-slate-800 text-slate-800' : 'text-slate-600'}`, onClick: () => setActiveTab('add-member'), style: { fontSize: 'clamp(8px, 2vw, 10px)' }, children: "\u30E1\u30F3\u30D0\u30FC\u8FFD\u52A0" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: `px-2 py-1 text-[10px] font-medium flex-1 whitespace-nowrap ${activeTab === 'all' ? 'bg-white border-b-2 border-slate-800 text-slate-800' : 'text-slate-600'}`, onClick: () => setActiveTab('all'), style: { fontSize: 'clamp(8px, 2vw, 10px)' }, children: "\u5168\u30D1\u30EC\u30C3\u30C8" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 whitespace-nowrap", onClick: onClose, style: { fontSize: 'clamp(8px, 2vw, 10px)' }, children: "\u9589\u3058\u308B" })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-auto p-4", children: renderTabContent() })] }) }));
    }
    // PC版（既存の実装）
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
