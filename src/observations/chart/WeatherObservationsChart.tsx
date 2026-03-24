import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    Box,
    Button,
    IconButton,
    Typography,
    useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { ResponsiveLine } from '@nivo/line'
import type {
    Point,
    PointTooltipProps,
    Serie,
} from '@nivo/line'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { useFahrenheitLinesLayer } from './useFahrenheitLinesLayer'
import { getWeatherObservationsChartStyles } from './WeatherObservationsChart.styles'
import type { GraphDataPoint } from '../typesWeatherObservations'
import { useWeatherObservationsChartZoom } from './useWeatherObservationsChartZoom'

dayjs.extend(utc)

const MOBILE_TAP_MAX_DISTANCE_PX = 20
const TOOLTIP_MAX_DISTANCE_PX = 28

interface LockedTooltip {
    point: GraphDataPoint
    anchor: { x: number; y: number }
}

type ClientPointEvent = {
    clientX?: number
    clientY?: number
    touches?: ArrayLike<{ clientX: number; clientY: number }>
    changedTouches?: ArrayLike<{ clientX: number; clientY: number }>
    nativeEvent?: ClientPointEvent
}

interface WeatherObservationsChartProps {
    ariaDescriptionId?: string
    chartData: Serie[]
    date: string
    distributions: Array<Record<string, number>>
    getColor: ({ id }: { id: string | number }) => string
    location: string
    unit: 'C' | 'F'
}

function hasGraphPointTimestamp(value: unknown): value is GraphDataPoint['timestamp'] {
    if (typeof value === 'string') {
        return true
    }

    return typeof value === 'object'
        && value !== null
        && typeof (value as { seconds?: unknown }).seconds === 'number'
}

function isGraphPointData(data: Point['data']): data is Point['data'] & GraphDataPoint {
    const candidate = data as Point['data'] & Partial<GraphDataPoint>

    return candidate.x instanceof Date
        && typeof candidate.y === 'number'
        && typeof candidate.time === 'string'
        && typeof candidate.source === 'string'
        && typeof candidate.location === 'string'
        && hasGraphPointTimestamp(candidate.timestamp)
}

function getPointSeconds(point: GraphDataPoint): number | null {
    const raw = point.timestamp

    if (typeof raw === 'object' && raw !== null) {
        const seconds = Number((raw as { seconds?: number }).seconds)
        return Number.isFinite(seconds) ? seconds : null
    }

    const parsed = new Date(raw).getTime()
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null
}

function getPointIdentity(point: GraphDataPoint): string {
    const seconds = getPointSeconds(point)

    return [
        point.source,
        point.location,
        point.time,
        Number.isFinite(seconds) ? String(seconds) : 'na',
    ].join('|')
}

function formatPointTimestamp(point: GraphDataPoint): string {
    const seconds = getPointSeconds(point)

    if (seconds == null) {
        return '–'
    }

    return dayjs.utc(seconds * 1000).format('YYYY-MM-DD HH:mm:ss')
}

function getClientPointFromEvent(event: ClientPointEvent): { x: number; y: number } | null {
    const eventObj = event ?? {}
    const native = eventObj.nativeEvent ?? eventObj
    const touch = native.touches?.[0] || native.changedTouches?.[0]

    if (touch) {
        return { x: touch.clientX, y: touch.clientY }
    }

    if (typeof native.clientX === 'number' && typeof native.clientY === 'number') {
        return { x: native.clientX, y: native.clientY }
    }

    return null
}

function stopChartEventPropagation(event: React.SyntheticEvent) {
    event.stopPropagation()
}

const WeatherObservationsChart: React.FC<WeatherObservationsChartProps> = ({
    ariaDescriptionId,
    chartData,
    date,
    distributions,
    getColor,
    location,
    unit,
}) => {
    const muiTheme = useTheme()
    const isCompact = useMediaQuery(muiTheme.breakpoints.down('sm'))
    const isTouchDevice = useMediaQuery('(pointer: coarse)')
    const [hoverMousePos, setHoverMousePos] = useState<{ x: number; y: number } | null>(null)
    const [lockedTooltip, setLockedTooltip] = useState<LockedTooltip | null>(null)
    const chartAreaRef = useRef<HTMLDivElement | null>(null)

    const {
        chartRenderKey,
        resetZoom,
        setZoomModeEnabled,
        xScaleMax,
        xScaleMin,
        xZoomBrushLayer,
        zoomModeEnabled,
        zoomSummaryLabel,
        zoomXRange,
    } = useWeatherObservationsChartZoom({
        chartData,
        date,
        location,
        unit,
    })
    const styles = getWeatherObservationsChartStyles({
        isTouchDevice,
        theme: muiTheme,
        zoomModeEnabled,
    })
    const fahrenheitLinesLayer = useFahrenheitLinesLayer(unit, distributions, location)

    useEffect(() => {
        setLockedTooltip(null)
    }, [date, location, unit, zoomModeEnabled, zoomXRange])

    const chartMargin = useMemo(() => {
        return {
            top: isCompact ? 18 : 16,
            right: isCompact ? 8 : 12,
            bottom: isCompact ? 52 : 62,
            left: isCompact ? 50 : 66,
        }
    }, [isCompact])

    const nivoTheme = useMemo(() => {
        return {
            text: {
                fill: muiTheme.palette.text.secondary,
                fontSize: isCompact ? 11 : 13,
                fontFamily: muiTheme.typography.fontFamily,
            },
            axis: {
                domain: {
                    line: {
                        stroke: alpha(muiTheme.palette.text.secondary, 0.35),
                        strokeWidth: 1,
                    },
                },
                ticks: {
                    line: {
                        stroke: alpha(muiTheme.palette.text.secondary, 0.26),
                        strokeWidth: 1,
                    },
                    text: {
                        fill: muiTheme.palette.text.secondary,
                        fontSize: isCompact ? 10.5 : 12.5,
                    },
                },
                legend: {
                    text: {
                        fill: muiTheme.palette.text.primary,
                        fontWeight: 700,
                        fontSize: isCompact ? 12 : 13,
                    },
                },
            },
            grid: {
                line: {
                    stroke: alpha(muiTheme.palette.primary.main, 0.13),
                    strokeWidth: 1,
                },
            },
            crosshair: {
                line: {
                    stroke: alpha(muiTheme.palette.primary.main, 0.45),
                    strokeWidth: 1.2,
                    strokeDasharray: '4 3',
                },
            },
        }
    }, [isCompact, muiTheme])

    const yAxisConfig = useMemo(() => {
        const values = chartData
            .flatMap((series) => series.data.map((point) => point.y))
            .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))

        if (!values.length) {
            return {
                min: undefined as number | undefined,
                max: undefined as number | undefined,
                ticks: [] as number[],
            }
        }

        const minBound = Math.floor(Math.min(...values))
        const maxBound = Math.ceil(Math.max(...values))
        const step = isCompact ? 2 : 1
        const count = Math.floor((maxBound - minBound) / step) + 1
        const ticks = Array.from({ length: count }, (_, index) =>
            unit === 'C'
                ? minBound + index * step
                : +(minBound + index * step).toFixed(1)
        )

        if (ticks.length && ticks[ticks.length - 1] !== maxBound) {
            ticks.push(maxBound)
        }

        return {
            min: minBound,
            max: maxBound,
            ticks,
        }
    }, [chartData, isCompact, unit])

    const handleChartMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        const svgEl = chartAreaRef.current?.querySelector('svg')

        if (!svgEl) {
            setHoverMousePos(null)
            return
        }

        const rect = svgEl.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            setHoverMousePos(null)
            return
        }

        setHoverMousePos({ x, y })
    }

    return (
        <Box sx={styles.chartFrame}>
            <Box sx={styles.chartToolbar}>
                <Typography variant="caption" color="text.secondary">
                    {zoomSummaryLabel}
                </Typography>
                <Box sx={styles.zoomButtonGroup}>
                    <Button
                        variant={zoomModeEnabled ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setZoomModeEnabled((prev) => !prev)}
                        sx={styles.zoomModeButton}
                    >
                        {zoomModeEnabled ? 'Zoom: on' : 'Zoom: off'}
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={resetZoom}
                        disabled={!zoomXRange}
                        sx={styles.zoomResetButton}
                    >
                        Reset zoom
                    </Button>
                </Box>
            </Box>
            <Box sx={styles.zoomHelpRow}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                    {zoomModeEnabled
                        ? 'Drag over chart to zoom time range (UTC). Double-click chart to reset.'
                        : 'Enable zoom to select a time range (UTC).'}
                </Typography>
            </Box>
            <Box
                aria-describedby={ariaDescriptionId}
                aria-label={`Temperature comparison chart for ${location} on ${date}`}
                ref={chartAreaRef}
                role="group"
                sx={styles.chartArea}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={() => setHoverMousePos(null)}
                onPointerDown={() => {
                    if (lockedTooltip) {
                        setLockedTooltip(null)
                    }
                }}
            >
                <ResponsiveLine
                    key={chartRenderKey}
                    curve="monotoneX"
                    colors={getColor}
                    data={chartData}
                    animate={false}
                    theme={nivoTheme}
                    margin={chartMargin}
                    xScale={{
                        type: 'time',
                        useUTC: true,
                        min: xScaleMin,
                        max: xScaleMax,
                    }}
                    yScale={{
                        type: 'linear',
                        min: yAxisConfig.min ?? 'auto',
                        max: yAxisConfig.max ?? 'auto',
                        stacked: false,
                        reverse: false,
                    }}
                    axisBottom={{
                        format: (value: Date) => dayjs.utc(value).format('HH:mm'),
                        tickValues: isCompact ? 'every 6 hours' : undefined,
                        tickSize: 6,
                        tickPadding: isCompact ? 6 : 8,
                        tickRotation: 0,
                        legend: 'Time (UTC)',
                        legendOffset: isCompact ? 44 : 52,
                        legendPosition: 'middle',
                    }}
                    axisLeft={{
                        tickValues: yAxisConfig.ticks,
                        tickSize: 4,
                        tickPadding: isCompact ? 5 : 8,
                        tickRotation: 0,
                        legend: isCompact ? '' : `Temperature (°${unit})`,
                        legendOffset: isCompact ? -42 : -56,
                        legendPosition: 'middle',
                    }}
                    gridYValues={yAxisConfig.ticks}
                    pointSize={isCompact ? 5 : 6}
                    pointColor={{ from: 'color' }}
                    pointBorderWidth={0}
                    lineWidth={isCompact ? 1.95 : 2.15}
                    useMesh
                    enableSlices={false}
                    enableCrosshair={false}
                    enablePointLabel={false}
                    onClick={(point, event) => {
                        if (!isTouchDevice) {
                            return
                        }

                        const pointData = point.data

                        if (!isGraphPointData(pointData)) {
                            return
                        }

                        const rect = chartAreaRef.current?.getBoundingClientRect()
                        const pointer = getClientPointFromEvent(event as ClientPointEvent)
                        const localTapX = rect && pointer ? pointer.x - rect.left : null
                        const localTapY = rect && pointer ? pointer.y - rect.top : null
                        const fallbackX = Number(point.x) + chartMargin.left
                        const fallbackY = Number(point.y) + chartMargin.top

                        if (localTapX != null && localTapY != null) {
                            const distanceDirect = Math.hypot(
                                localTapX - Number(point.x),
                                localTapY - Number(point.y),
                            )
                            const distanceWithMargin = Math.hypot(
                                localTapX - (Number(point.x) + chartMargin.left),
                                localTapY - (Number(point.y) + chartMargin.top),
                            )

                            if (Math.min(distanceDirect, distanceWithMargin) > MOBILE_TAP_MAX_DISTANCE_PX) {
                                return
                            }
                        }

                        const anchorX = rect && pointer ? pointer.x - rect.left : fallbackX
                        const anchorY = rect && pointer ? pointer.y - rect.top : fallbackY

                        setLockedTooltip((prev) => {
                            if (prev && getPointIdentity(prev.point) === getPointIdentity(pointData)) {
                                return null
                            }

                            return {
                                point: pointData,
                                anchor: {
                                    x: Math.max(0, anchorX),
                                    y: Math.max(0, anchorY),
                                },
                            }
                        })
                    }}
                    layers={[
                        'grid',
                        'axes',
                        fahrenheitLinesLayer,
                        'lines',
                        'points',
                        'mesh',
                        xZoomBrushLayer,
                        'legends',
                    ]}
                    tooltip={(tooltipProps: PointTooltipProps) => {
                        if (isTouchDevice || !hoverMousePos) {
                            return null
                        }

                        const point = tooltipProps.point
                        const pointData = point.data

                        if (!isGraphPointData(pointData)) {
                            return null
                        }

                        const distanceDirect = Math.hypot(
                            hoverMousePos.x - point.x,
                            hoverMousePos.y - point.y,
                        )
                        const distanceWithMargin = Math.hypot(
                            hoverMousePos.x - (point.x + chartMargin.left),
                            hoverMousePos.y - (point.y + chartMargin.top),
                        )

                        if (Math.min(distanceDirect, distanceWithMargin) > TOOLTIP_MAX_DISTANCE_PX) {
                            return null
                        }

                        const timeFormatted = dayjs.utc(pointData.x).format('HH:mm')
                        const timestampFormatted = formatPointTimestamp(pointData)

                        return (
                            <Box sx={styles.hoverTooltip}>
                                <Typography variant="body2" fontWeight={700}>
                                    Time: <Typography component="span" variant="body2" fontWeight={500}>{timeFormatted}</Typography>
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    Location: <Typography component="span" variant="body2" fontWeight={500}>{pointData.location}</Typography>
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    Temp: <Typography component="span" variant="body2" fontWeight={500}>{pointData.y}°{unit}</Typography>
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    Source: <Typography component="span" variant="body2" fontWeight={500}>{pointData.source}</Typography>
                                </Typography>
                                <Typography variant="caption" sx={{ mt: 0.6, display: 'block' }} color="text.secondary">
                                    {timestampFormatted}
                                </Typography>
                            </Box>
                        )
                    }}
                />
                {isTouchDevice && lockedTooltip && (
                    <Box
                        sx={styles.getLockedTooltip(lockedTooltip)}
                        onPointerDown={stopChartEventPropagation}
                        onClick={stopChartEventPropagation}
                    >
                        <IconButton
                            size="small"
                            aria-label="Close point details"
                            onPointerDown={stopChartEventPropagation}
                            onClick={(event) => {
                                stopChartEventPropagation(event)
                                setLockedTooltip(null)
                            }}
                            sx={styles.lockedTooltipCloseButton}
                        >
                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Typography variant="body2" fontWeight={700}>
                            Time: <Typography component="span" variant="body2" fontWeight={500}>{lockedTooltip.point.time}</Typography>
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                            Location: <Typography component="span" variant="body2" fontWeight={500}>{lockedTooltip.point.location}</Typography>
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                            Temp: <Typography component="span" variant="body2" fontWeight={500}>{lockedTooltip.point.y}°{unit}</Typography>
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                            Source: <Typography component="span" variant="body2" fontWeight={500}>{lockedTooltip.point.source}</Typography>
                        </Typography>
                        <Typography variant="caption" sx={{ mt: 0.45, display: 'block' }} color="text.secondary">
                            {formatPointTimestamp(lockedTooltip.point)}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    )
}

export default WeatherObservationsChart
