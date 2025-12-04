"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAppStore = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
function generateId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
const defaultUsers = {
    u_alice: { id: 'u_alice', name: 'Alice', color: '#e11d48' },
    u_bob: { id: 'u_bob', name: 'Bob', color: '#0ea5e9' },
};
const initialState = {
    users: defaultUsers,
    tasks: {},
    rootTaskIds: [],
};
function computeRemainingDays(iso) {
    if (!iso)
        return null;
    const diff = (0, dayjs_1.default)(iso).diff((0, dayjs_1.default)(), 'day');
    return diff;
}
function computeDeadlineConflict(task, state) {
    if (!task.deadline.dateISO)
        return false;
    // 子の締切が親より遅い場合に警告
    if (task.parentId) {
        const parent = state.tasks[task.parentId];
        if (parent?.deadline.dateISO) {
            return (0, dayjs_1.default)(task.deadline.dateISO).isAfter((0, dayjs_1.default)(parent.deadline.dateISO));
        }
    }
    // 依存先(先行タスク)より締切が早すぎる場合に警告
    for (const depId of task.dependsOn) {
        const dep = state.tasks[depId];
        if (dep?.deadline.dateISO && task.deadline.dateISO) {
            if ((0, dayjs_1.default)(task.deadline.dateISO).isBefore((0, dayjs_1.default)(dep.deadline.dateISO))) {
                return true;
            }
        }
    }
    return false;
}
function computeActionable(task, state) {
    // 先行タスクが存在し、どれかが未完了という概念は MVP では未実装のため、
    // 締切矛盾がなく、依存先がない場合は着手可とする
    return !computeDeadlineConflict(task, state) && task.dependsOn.length === 0;
}
exports.useAppStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    ...initialState,
    draggingId: null,
    ripples: [],
    focusTaskId: null,
    setDragging: (id) => set(() => ({ draggingId: id })),
    addRipple: (nodeId) => set((s) => ({ ripples: [...s.ripples, { id: generateId('rp'), nodeId, createdAt: Date.now() }] })),
    clearOldRipples: () => set((s) => ({ ripples: s.ripples.filter((r) => Date.now() - r.createdAt < 1000) })),
    setFocusTask: (id) => set(() => ({ focusTaskId: id })),
    remainingDays: (taskId) => {
        const t = get().tasks[taskId];
        return t ? computeRemainingDays(t.deadline.dateISO) : null;
    },
    hasDeadlineConflict: (taskId) => {
        const t = get().tasks[taskId];
        return t ? computeDeadlineConflict(t, get()) : false;
    },
    isActionable: (taskId) => {
        const t = get().tasks[taskId];
        return t ? computeActionable(t, get()) : false;
    },
    descendantCount: (taskId) => {
        const s = get();
        const walk = (id) => {
            const t = s.tasks[id];
            if (!t)
                return 0;
            return t.children.reduce((acc, cid) => acc + 1 + walk(cid), 0);
        };
        return walk(taskId);
    },
    addUser: (name, color) => {
        const id = generateId('u');
        const user = { id, name, color: color ?? '#10b981' };
        set((s) => ({ users: { ...s.users, [id]: user } }));
        return user;
    },
    updateUser: (userId, patch) => {
        set((s) => {
            const u = s.users[userId];
            if (!u)
                return {};
            const updated = { ...u, ...patch };
            return { users: { ...s.users, [userId]: updated } };
        });
    },
    createTask: (input) => {
        const id = generateId('t');
        const parentId = input?.parentId ?? null;
        const parent = parentId ? get().tasks[parentId] : undefined;
        const task = {
            id,
            title: input?.title ?? '新しいタスク',
            assigneeId: input?.assigneeId ?? parent?.assigneeId ?? null,
            deadline: {
                dateISO: input?.deadline?.dateISO ?? parent?.deadline.dateISO ?? null,
            },
            parentId,
            children: [],
            dependsOn: [],
            position: { x: 0, y: 0 },
            expanded: false,
        };
        set((s) => {
            const tasks = { ...s.tasks, [id]: task };
            const rootTaskIds = [...s.rootTaskIds];
            if (parentId) {
                const p = tasks[parentId];
                p.children = [...p.children, id];
            }
            else {
                rootTaskIds.push(id);
            }
            return { tasks, rootTaskIds };
        });
        return task;
    },
    addChild: (parentId, input) => get().createTask({ ...input, parentId }),
    updateTask: (taskId, patch) => {
        set((s) => {
            const t = s.tasks[taskId];
            if (!t)
                return {};
            const updated = {
                ...t,
                ...patch,
                deadline: patch.deadline ? { ...t.deadline, ...patch.deadline } : t.deadline,
            };
            return { tasks: { ...s.tasks, [taskId]: updated } };
        });
    },
    // 既存ノード消失対策: setGraph のみが tasks を丸ごと差し替える。個別更新では他タスクを消さない。
    setNodePosition: (taskId, x, y) => {
        set((s) => {
            const t = s.tasks[taskId];
            if (!t)
                return {};
            const updated = { ...t, position: { x, y } };
            return { tasks: { ...s.tasks, [taskId]: updated } };
        });
    },
    setPositions: (updates) => {
        set((s) => {
            const tasks = { ...s.tasks };
            Object.entries(updates).forEach(([id, pos]) => {
                const t = tasks[id];
                if (t)
                    tasks[id] = { ...t, position: { x: pos.x, y: pos.y } };
            });
            return { tasks };
        });
    },
    linkPrecedence: (beforeId, afterId) => {
        if (beforeId === afterId)
            return;
        set((s) => {
            const after = s.tasks[afterId];
            if (!after)
                return {};
            if (!after.dependsOn.includes(beforeId)) {
                const updated = { ...after, dependsOn: [...after.dependsOn, beforeId] };
                return { tasks: { ...s.tasks, [afterId]: updated } };
            }
            return {};
        });
    },
    unlinkPrecedence: (beforeId, afterId) => {
        set((s) => {
            const after = s.tasks[afterId];
            if (!after)
                return {};
            const updated = { ...after, dependsOn: after.dependsOn.filter((id) => id !== beforeId) };
            return { tasks: { ...s.tasks, [afterId]: updated } };
        });
    },
    toggleExpand: (taskId) => {
        set((s) => {
            const t = s.tasks[taskId];
            if (!t)
                return {};
            const nextExpanded = !t.expanded;
            const tasks = { ...s.tasks, [taskId]: { ...t, expanded: nextExpanded } };
            if (nextExpanded && t.children.length > 0) {
                const n = t.children.length;
                const radius = 140;
                t.children.forEach((cid, idx) => {
                    const child = tasks[cid];
                    if (!child)
                        return;
                    const isUnplaced = !child.position || (child.position.x === 0 && child.position.y === 0);
                    if (isUnplaced) {
                        const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
                        tasks[cid] = {
                            ...child,
                            position: {
                                x: (t.position?.x ?? 0) + Math.cos(angle) * radius,
                                y: (t.position?.y ?? 0) + Math.sin(angle) * radius,
                            },
                        };
                    }
                });
            }
            return { tasks };
        });
    },
    moveSubtree: (taskId, toX, toY) => {
        set((s) => {
            const target = s.tasks[taskId];
            if (!target)
                return {};
            const dx = toX - (target.position?.x ?? 0);
            const dy = toY - (target.position?.y ?? 0);
            const collect = (id, acc = []) => {
                const t = s.tasks[id];
                if (!t)
                    return acc;
                t.children.forEach((cid) => collect(cid, acc));
                acc.push(id);
                return acc;
            };
            const all = collect(taskId, []);
            const tasks = { ...s.tasks };
            all.forEach((id) => {
                const t = tasks[id];
                const cx = t.position?.x ?? 0;
                const cy = t.position?.y ?? 0;
                tasks[id] = { ...t, position: { x: cx + dx, y: cy + dy } };
            });
            return { tasks };
        });
    },
    beginDragAbsolute: (rootId) => {
        const s0 = get();
        const root = s0.tasks[rootId];
        if (!root)
            return;
        const offsets = {};
        const collect = (id) => {
            const t = s0.tasks[id];
            if (!t)
                return;
            t.children.forEach((cid) => collect(cid));
            if (id !== rootId) {
                offsets[id] = {
                    x: (t.position?.x ?? 0) - (root.position?.x ?? 0),
                    y: (t.position?.y ?? 0) - (root.position?.y ?? 0),
                };
            }
        };
        collect(rootId);
        set(() => ({ draggingId: rootId, ripples: get().ripples }));
        get()._dragOffsets = offsets;
    },
    dragToAbsolute: (rootId, toX, toY) => {
        const s0 = get();
        const offsets = s0._dragOffsets;
        set((s) => {
            const tasks = { ...s.tasks };
            const root = tasks[rootId];
            if (root)
                tasks[rootId] = { ...root, position: { x: toX, y: toY } };
            if (offsets) {
                Object.entries(offsets).forEach(([id, off]) => {
                    const t = tasks[id];
                    if (!t)
                        return;
                    tasks[id] = { ...t, position: { x: toX + off.x, y: toY + off.y } };
                });
            }
            return { tasks };
        });
    },
    endDragAbsolute: () => {
        const s0 = get();
        s0._dragOffsets = undefined;
        set(() => ({ draggingId: null }));
    },
    gatherAll: () => {
        set((s) => {
            const tasks = { ...s.tasks };
            const spacing = 140;
            let i = 0;
            Object.keys(tasks).forEach((id) => {
                const t = tasks[id];
                const x = (i % 6) * spacing;
                const y = Math.floor(i / 6) * spacing;
                tasks[id] = { ...t, expanded: false, position: { x, y } };
                i++;
            });
            return { tasks };
        });
    },
    setGraph: (next) => {
        set(() => ({ tasks: next.tasks, users: next.users, rootTaskIds: next.rootTaskIds }));
    },
}), { name: 'task-map-store' }));
