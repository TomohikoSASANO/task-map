"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Legend = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const Legend = () => {
    const Item = ({ color, label }) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-xs", children: [(0, jsx_runtime_1.jsx)("span", { className: `inline-block w-3 h-3 rounded-full`, style: { background: color } }), (0, jsx_runtime_1.jsx)("span", { children: label })] }));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "absolute left-3 bottom-3 bg-white/90 rounded-md border p-2 shadow text-slate-700", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-semibold text-xs mb-1", children: "\u51E1\u4F8B" }), (0, jsx_runtime_1.jsx)(Item, { color: "#cbd5e1", label: "\u5F85\u3061\u30BF\u30B9\u30AF" }), (0, jsx_runtime_1.jsx)(Item, { color: "#ef4444", label: "\u7740\u624B\u53EF\u30BF\u30B9\u30AF" }), (0, jsx_runtime_1.jsx)(Item, { color: "#34d399", label: "\u5B8C\u4E86\u30BF\u30B9\u30AF" })] }));
};
exports.Legend = Legend;
