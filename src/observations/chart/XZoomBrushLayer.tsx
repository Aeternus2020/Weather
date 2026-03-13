import React, { useRef, useState } from "react"
import type { CustomLayerProps } from "@nivo/line"
import { alpha, useTheme } from "@mui/material/styles"

export interface ZoomRange {
    start: Date
    end: Date
}

interface Props extends Pick<CustomLayerProps, "innerHeight" | "innerWidth" | "xScale"> {
    enabled: boolean
    onZoom: (range: ZoomRange) => void
    onReset: () => void
}

type TimeScaleLike = {
    invert: (value: number) => Date
}

const MIN_DRAG_PIXELS = 8

export const XZoomBrushLayer: React.FC<Props> = ({
    enabled,
    innerHeight,
    innerWidth,
    xScale,
    onZoom,
    onReset,
}) => {
    const muiTheme = useTheme()
    const [selection, setSelection] = useState<{ startX: number; endX: number } | null>(null)
    const selectionRef = useRef<{ startX: number; endX: number } | null>(null)

    const clampX = (x: number) => Math.max(0, Math.min(innerWidth, x))

    const pointerToX = (event: React.PointerEvent<SVGRectElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        return clampX(event.clientX - rect.left)
    }

    const overlayFill = enabled
        ? alpha(muiTheme.palette.primary.main, muiTheme.palette.mode === "dark" ? 0.04 : 0.03)
        : "transparent"
    const brushFill = alpha(muiTheme.palette.primary.main, muiTheme.palette.mode === "dark" ? 0.22 : 0.16)
    const brushStroke = alpha(muiTheme.palette.primary.main, 0.85)

    const invertScale = (xScale as Partial<TimeScaleLike>).invert
    if (typeof invertScale !== "function") {
        return null
    }

    const finalizeSelection = (startX: number, endX: number) => {
        const left = Math.min(startX, endX)
        const right = Math.max(startX, endX)

        if (right - left < MIN_DRAG_PIXELS) return

        const fromMs = invertScale(left).getTime()
        const toMs = invertScale(right).getTime()
        if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs === toMs) return

        onZoom({
            start: new Date(Math.min(fromMs, toMs)),
            end: new Date(Math.max(fromMs, toMs)),
        })
    }

    const onPointerDown = (event: React.PointerEvent<SVGRectElement>) => {
        if (!enabled) return
        const x = pointerToX(event)
        const next = { startX: x, endX: x }
        selectionRef.current = next
        setSelection(next)
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: React.PointerEvent<SVGRectElement>) => {
        if (!enabled || !selectionRef.current) return
        const x = pointerToX(event)
        const next = { startX: selectionRef.current.startX, endX: x }
        selectionRef.current = next
        setSelection(next)
    }

    const onPointerUp = (event: React.PointerEvent<SVGRectElement>) => {
        if (!enabled || !selectionRef.current) return
        const x = pointerToX(event)
        const current = selectionRef.current
        selectionRef.current = null
        event.currentTarget.releasePointerCapture(event.pointerId)
        setSelection(null)
        finalizeSelection(current.startX, x)
    }

    const onPointerCancel = () => {
        selectionRef.current = null
        setSelection(null)
    }

    const left = selection ? Math.min(selection.startX, selection.endX) : 0
    const width = selection ? Math.abs(selection.endX - selection.startX) : 0

    return (
        <g>
            <rect
                x={0}
                y={0}
                width={innerWidth}
                height={innerHeight}
                fill={overlayFill}
                pointerEvents={enabled ? "all" : "none"}
                cursor={enabled ? "crosshair" : "default"}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onDoubleClick={enabled ? onReset : undefined}
            />
            {enabled && selection && width > 0 && (
                <rect
                    x={left}
                    y={0}
                    width={width}
                    height={innerHeight}
                    fill={brushFill}
                    stroke={brushStroke}
                    strokeWidth={1}
                    pointerEvents="none"
                />
            )}
        </g>
    )
}
