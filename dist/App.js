"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const reactflow_1 = require("reactflow");
const Canvas_1 = require("./Canvas");
const Legend_1 = require("./components/Legend");
const Sidebar_1 = require("./components/Sidebar");
const FloatingButton_1 = require("./components/FloatingButton");
const store_1 = require("./store");
const useIsMobile_1 = require("./hooks/useIsMobile");
const App = () => {
    const createTask = (0, store_1.useAppStore)((s) => s.createTask);
    const rootIds = (0, store_1.useAppStore)((s) => s.rootTaskIds);
    const isMobile = (0, useIsMobile_1.useIsMobile)();
    const [sidebarOpen, setSidebarOpen] = (0, react_1.useState)(false);
    const [sidebarPinned, setSidebarPinned] = (0, react_1.useState)(false);
    // 初回起動時にサンプルタスクを1つ作成
    (0, react_1.useEffect)(() => {
        if (rootIds.length === 0) {
            const root = createTask({ title: '大タスク1', parentId: null });
            const c1 = store_1.useAppStore.getState().addChild(root.id, { title: '中タスクA' });
            const c2 = store_1.useAppStore.getState().addChild(root.id, { title: '中タスクB' });
            store_1.useAppStore.getState().linkPrecedence(c1.id, c2.id);
            // もう一つの大タスクも作成
            createTask({ title: '大タスク2', parentId: null });
        }
    }, []);
    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };
    const handleCloseSidebar = () => {
        setSidebarOpen(false);
    };
    const handleTogglePin = () => {
        setSidebarPinned(!sidebarPinned);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full w-full bg-slate-50 text-slate-900 flex flex-col", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-3 border-b bg-white sticky z-10 flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("h1", { className: "font-bold", children: "Task Map" }), !isMobile && ((0, jsx_runtime_1.jsx)("div", { className: "ml-auto text-xs text-slate-500", children: "Delete: \u9078\u629E\u30A8\u30C3\u30B8\u524A\u9664 / Ctrl+Z: Undo / Ctrl+C/V: \u30B3\u30D4\u30FC\u8CBC\u4ED8 / Shift+\u30AF\u30EA\u30C3\u30AF: \u8907\u6570\u9078\u629E" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 flex min-h-0 relative overflow-hidden", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 relative", style: {
                            minHeight: 0,
                            height: '100%',
                            width: '100%',
                            paddingBottom: isMobile && sidebarOpen ? '20vh' : '0'
                        }, children: [(0, jsx_runtime_1.jsx)(reactflow_1.ReactFlowProvider, { children: (0, jsx_runtime_1.jsx)(Canvas_1.Canvas, {}) }), (0, jsx_runtime_1.jsx)(Legend_1.Legend, {})] }), isMobile ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar, { isOpen: sidebarOpen, isPinned: sidebarPinned, onClose: handleCloseSidebar, onTogglePin: handleTogglePin }), !sidebarOpen && ((0, jsx_runtime_1.jsx)(FloatingButton_1.FloatingButton, { onClick: handleToggleSidebar, isOpen: sidebarOpen }))] })) : ((0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar, { isOpen: true, isPinned: true, onClose: () => { }, onTogglePin: () => { } }))] })] }));
};
exports.App = App;
