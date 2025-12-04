"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloatingEdge = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const reactflow_1 = require("reactflow");
const getEdgeParams_1 = require("./getEdgeParams");
const FloatingEdge = (props) => {
    const rf = (0, reactflow_1.useReactFlow)();
    const source = rf.getNode(props.source);
    const target = rf.getNode(props.target);
    if (!source || !target)
        return null;
    // React Flow の絶対座標から中心点を算出
    const sc = {
        x: (source.positionAbsolute?.x ?? 0) + (source.width ?? 0) / 2,
        y: (source.positionAbsolute?.y ?? 0) + (source.height ?? 0) / 2,
    };
    const tc = {
        x: (target.positionAbsolute?.x ?? 0) + (target.width ?? 0) / 2,
        y: (target.positionAbsolute?.y ?? 0) + (target.height ?? 0) / 2,
    };
    const sp = (0, getEdgeParams_1.getIntersectionPoint)(source, sc, tc);
    const tp = (0, getEdgeParams_1.getIntersectionPoint)(target, tc, sc);
    const path = `M ${sp.x},${sp.y} L ${tp.x},${tp.y}`;
    const midX = (sp.x + tp.x) / 2;
    const midY = (sp.y + tp.y) / 2;
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(reactflow_1.BaseEdge, { path: path, ...props }), props.data && props.data.dep && ((0, jsx_runtime_1.jsx)(reactflow_1.EdgeLabelRenderer, { children: (0, jsx_runtime_1.jsxs)("div", { style: { position: 'absolute', transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`, pointerEvents: 'none' }, className: "text-[16px] leading-none select-none", children: [(0, jsx_runtime_1.jsx)("span", { className: "opacity-80", children: "\u26D3" }), (0, jsx_runtime_1.jsx)("span", { className: "ml-1 opacity-60", children: "\u2794" }), props.data.via && ((0, jsx_runtime_1.jsxs)("span", { className: "ml-1 text-[10px] opacity-70 bg-white/70 px-1 rounded", children: ["via ", props.data.via] }))] }) }))] }));
};
exports.FloatingEdge = FloatingEdge;
