import React from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeProps, useReactFlow } from 'reactflow'
import { getIntersectionPoint } from './getEdgeParams'

export const FloatingEdge: React.FC<EdgeProps> = (props) => {
    const rf = useReactFlow()
    const source = rf.getNode(props.source!)
    const target = rf.getNode(props.target!)

    if (!source || !target) return null

    // React Flow の絶対座標から中心点を算出
    const sc = {
        x: (source.positionAbsolute?.x ?? 0) + (source.width ?? 0) / 2,
        y: (source.positionAbsolute?.y ?? 0) + (source.height ?? 0) / 2,
    }
    const tc = {
        x: (target.positionAbsolute?.x ?? 0) + (target.width ?? 0) / 2,
        y: (target.positionAbsolute?.y ?? 0) + (target.height ?? 0) / 2,
    }
    const sp = getIntersectionPoint(source, sc, tc)
    const tp = getIntersectionPoint(target, tc, sc)
    const path = `M ${sp.x},${sp.y} L ${tp.x},${tp.y}`

    const midX = (sp.x + tp.x) / 2
    const midY = (sp.y + tp.y) / 2

    return (
        <>
            <BaseEdge path={path} {...props} />
            {props.data && (props.data as any).dep && (
                <EdgeLabelRenderer>
                    <div
                        style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`, pointerEvents: 'none' }}
                        className="text-[16px] leading-none select-none"
                    >
                        <span className="opacity-80">⛓</span>
                        <span className="ml-1 opacity-60">➔</span>
                        {(props.data as any).via && (
                            <span className="ml-1 text-[10px] opacity-70 bg-white/70 px-1 rounded">via {(props.data as any).via}</span>
                        )}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    )
}


