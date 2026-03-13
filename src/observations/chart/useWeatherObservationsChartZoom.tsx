import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CustomLayerProps, Layer, Serie } from '@nivo/line'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { XZoomBrushLayer, ZoomRange } from './XZoomBrushLayer'

dayjs.extend(utc)

const MIN_ZOOM_SPAN_MS = 60_000

interface ChartXDomain {
    min: Date
    max: Date
}

interface UseWeatherObservationsChartZoomArgs {
    chartData: Serie[]
    date: string
    location: string
    unit: 'C' | 'F'
}

function getChartXDomain(chartData: Serie[]): ChartXDomain | null {
    const timestamps = chartData
        .flatMap((series) => series.data.map((point) => new Date(point.x as Date).getTime()))
        .filter((value) => Number.isFinite(value))

    if (!timestamps.length) {
        return null
    }

    return {
        min: new Date(Math.min(...timestamps)),
        max: new Date(Math.max(...timestamps)),
    }
}

function clampZoomRange(range: ZoomRange, chartXDomain: ChartXDomain | null): ZoomRange | null {
    if (!chartXDomain) {
        return null
    }

    const minMs = chartXDomain.min.getTime()
    const maxMs = chartXDomain.max.getTime()
    const startMsRaw = range.start.getTime()
    const endMsRaw = range.end.getTime()

    if (!Number.isFinite(startMsRaw) || !Number.isFinite(endMsRaw)) {
        return null
    }

    const startMs = Math.max(minMs, Math.min(maxMs, startMsRaw))
    const endMs = Math.max(minMs, Math.min(maxMs, endMsRaw))

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return null
    }

    const left = Math.min(startMs, endMs)
    const right = Math.max(startMs, endMs)

    if (right - left < MIN_ZOOM_SPAN_MS) {
        return null
    }

    return {
        start: new Date(left),
        end: new Date(right),
    }
}

function formatZoomSummaryLabel(zoomXRange: ZoomRange | null): string {
    return zoomXRange
        ? `Zoom (UTC): ${dayjs.utc(zoomXRange.start).format('HH:mm')} - ${dayjs.utc(zoomXRange.end).format('HH:mm')}`
        : 'Zoom (UTC): full range'
}

export function useWeatherObservationsChartZoom({
    chartData,
    date,
    location,
    unit,
}: UseWeatherObservationsChartZoomArgs) {
    const [zoomModeEnabled, setZoomModeEnabled] = useState(false)
    const [zoomXRange, setZoomXRange] = useState<ZoomRange | null>(null)

    const chartXDomain = useMemo(() => getChartXDomain(chartData), [chartData])

    const handleZoomRange = useCallback((range: ZoomRange) => {
        const clamped = clampZoomRange(range, chartXDomain)

        if (!clamped) {
            return
        }

        setZoomXRange(clamped)
    }, [chartXDomain])

    const resetZoom = useCallback(() => {
        setZoomXRange(null)
    }, [])

    useEffect(() => {
        if (!zoomXRange) {
            return
        }

        const clamped = clampZoomRange(zoomXRange, chartXDomain)

        if (!clamped) {
            setZoomXRange(null)
            return
        }

        if (
            clamped.start.getTime() !== zoomXRange.start.getTime() ||
            clamped.end.getTime() !== zoomXRange.end.getTime()
        ) {
            setZoomXRange(clamped)
        }
    }, [chartXDomain, zoomXRange])

    useEffect(() => {
        setZoomXRange(null)
        setZoomModeEnabled(false)
    }, [date, location])

    const chartRenderKey = zoomXRange
        ? `${location}|${date}|${unit}|${zoomXRange.start.getTime()}-${zoomXRange.end.getTime()}`
        : `${location}|${date}|${unit}|full`
    const zoomSummaryLabel = formatZoomSummaryLabel(zoomXRange)

    const xZoomBrushLayer = useMemo<Layer>(() => {
        return (layerProps: CustomLayerProps) => (
            <XZoomBrushLayer
                innerHeight={layerProps.innerHeight}
                innerWidth={layerProps.innerWidth}
                xScale={layerProps.xScale}
                enabled={zoomModeEnabled}
                onZoom={handleZoomRange}
                onReset={resetZoom}
            />
        )
    }, [handleZoomRange, resetZoom, zoomModeEnabled])

    return {
        chartRenderKey,
        resetZoom,
        setZoomModeEnabled,
        xScaleMax: zoomXRange?.end ?? 'auto',
        xScaleMin: zoomXRange?.start ?? 'auto',
        xZoomBrushLayer,
        zoomModeEnabled,
        zoomSummaryLabel,
        zoomXRange,
    }
}
