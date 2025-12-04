"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeCenter = getNodeCenter;
exports.getIntersectionPoint = getIntersectionPoint;
function getNodeCenter(node) {
    return {
        x: (node.positionAbsolute?.x ?? 0) + (node.width ?? 0) / 2,
        y: (node.positionAbsolute?.y ?? 0) + (node.height ?? 0) / 2,
    };
}
function getRect(node) {
    const x = node.positionAbsolute?.x ?? 0;
    const y = node.positionAbsolute?.y ?? 0;
    const w = node.width ?? 0;
    const h = node.height ?? 0;
    return { x, y, w, h };
}
// 線分(中心→相手中心)とノード矩形の交点を求める
function getIntersectionPoint(node, from, to) {
    const { x, y, w, h } = getRect(node);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const candidates = [];
    if (dx !== 0) {
        const tLeft = (x - from.x) / dx;
        const yLeft = from.y + tLeft * dy;
        if (tLeft > 0 && yLeft >= y && yLeft <= y + h)
            candidates.push({ x, y: yLeft });
        const tRight = (x + w - from.x) / dx;
        const yRight = from.y + tRight * dy;
        if (tRight > 0 && yRight >= y && yRight <= y + h)
            candidates.push({ x: x + w, y: yRight });
    }
    if (dy !== 0) {
        const tTop = (y - from.y) / dy;
        const xTop = from.x + tTop * dx;
        if (tTop > 0 && xTop >= x && xTop <= x + w)
            candidates.push({ x: xTop, y });
        const tBottom = (y + h - from.y) / dy;
        const xBottom = from.x + tBottom * dx;
        if (tBottom > 0 && xBottom >= x && xBottom <= x + w)
            candidates.push({ x: xBottom, y: y + h });
    }
    // 最も近い交点
    if (candidates.length === 0)
        return { x: from.x, y: from.y };
    candidates.sort((a, b) => (a.x - from.x) ** 2 + (a.y - from.y) ** 2 - ((b.x - from.x) ** 2 + (b.y - from.y) ** 2));
    return candidates[0];
}
