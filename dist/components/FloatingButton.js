"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloatingButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const FloatingButton = ({ onClick, isOpen }) => {
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", className: `fixed bottom-6 right-6 w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg z-30 flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`, onClick: onClick, "aria-label": "\u30D1\u30EC\u30C3\u30C8\u3092\u958B\u304F", children: (0, jsx_runtime_1.jsx)("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }) }));
};
exports.FloatingButton = FloatingButton;
