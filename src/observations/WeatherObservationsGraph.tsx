import React, {useCallback, useEffect, useMemo, useState} from "react"
import {
    CircularProgress,
    Typography,
    Box,
} from "@mui/material"
import {useWeatherObservationsQuery} from "./useWeatherObservationsQuery"
import {ResponsiveLine} from '@nivo/line'
import type { Serie, Layer } from '@nivo/line'
import { schemeCategory10 } from 'd3-scale-chromatic'
import dayjs from 'dayjs'
import {useWeatherForecastsQuery} from "./useWeatherForecastsQuery"
import { WeatherForecast, GraphDataPoint} from "./typesWeatherObservations"
import timezone from "dayjs/plugin/timezone"
import ObservationControls from "./components/WeatherObservationsControl"
import {MainLinesLayer} from "./components/MainLinesLayer"
import {useFahrenheitLinesLayer} from "./components/FahrenheitLinesLayer"
import {ForecastSlider} from "./components/ForecastSlider"

dayjs.extend(timezone)

interface LineDescriptor {
    source: string
    location: string
    isForecast: boolean
    runTime?: string
}

export const makeForecastKey = (fx: WeatherForecast): string =>
    makeKey({
        source: fx.source,
        location: fx.location,
        isForecast: true,
        runTime: dayjs.unix(fx.timestamp.seconds).toISOString(),
    })

function makeKey(d: LineDescriptor): string {
    return `${d.isForecast ? 'F' : 'O'}|${d.source}|${d.location}|${d.runTime ?? ''}`
}

const NOAA  = 'tgftp.nws.noaa.gov'

interface Props {
    date: string
    location: string
    distributions: Array<Record<string, number>>
}

const WeatherObservationsGraph: React.FC<Props> = ({ date, location: activeLocation, distributions }) => {
    const [visibleLines, setVisibleLines] = useState<string[]>([])
    const [selectedSourcesByLocation, setSelectedSourcesByLocation] = useState<Record<string, string[]>>({})
    const [unit, setUnit] = useState<'C' | 'F'>('C')

    const { data: entries = [], isLoading } = useWeatherObservationsQuery(date)

    const { data: forecastEntries = [] } = useWeatherForecastsQuery(date, activeLocation) as {
        data: WeatherForecast[]
    }

    const { dataByLine} = useMemo(() => {
        type LineEntry = { descriptor: LineDescriptor; data: GraphDataPoint[] }

        const lines = new Map<string, LineEntry>()
        const locs: Record<string, string[]> = {}

        for (const e of entries) {
            const d: LineDescriptor = {
                source: e.source,
                location: e.location,
                isForecast: false,
            }
            const key = makeKey(d)

            if (!lines.has(key)) lines.set(key, { descriptor: d, data: [] })
            const dt = dayjs.utc(e.time.seconds * 1000)

            lines.get(key)!.data.push({
                x: dt.toDate(),
                y: Number(e.temp),
                time: dt.format('HH:mm'),
                source: e.source,
                location: e.location,
                timestamp: e.timestamp,
            })

            if (!locs[e.source]) locs[e.source] = []
            if (!locs[e.source].includes(e.location)) locs[e.source].push(e.location)
        }

        for (const fx of forecastEntries) {
            const runIso = dayjs.unix(fx.timestamp.seconds).toISOString()
            const d: LineDescriptor = {
                source: fx.source,
                location: fx.location,
                isForecast: true,
                runTime: runIso,
            }
            const key = makeKey(d)

            const pts = fx.forecast
                .filter(
                    f =>
                        f.time?.seconds &&
                        dayjs.unix(f.time.seconds).utc().format('YYYY-MM-DD') === date,
                )
                .map(f => {
                    const dt = dayjs.unix(f.time!.seconds).utc()
                    return {
                        x: dt.toDate(),
                        y: Number(f.temp),
                        time: dt.format('HH:mm'),
                        source: fx.source,
                        location: fx.location,
                        timestamp: fx.timestamp,
                    }
                })

            lines.set(key, { descriptor: d, data: pts })

            if (!locs[fx.source]) locs[fx.source] = []
            if (!locs[fx.source].includes(fx.location)) locs[fx.source].push(fx.location)
        }

        return {dataByLine: lines}
    }, [entries, forecastEntries, date])

    const forecastBySource = useMemo(() => {
        return forecastEntries
            .filter(e => e.location === activeLocation)
            .reduce<Record<string, WeatherForecast[]>>((acc, entry) => {
                (acc[entry.source] ||= []).push(entry)
                return acc
            }, {})
    }, [forecastEntries, activeLocation])

    const latestForecastIds = useMemo(() => {
        return Object.values(forecastBySource)
            .map(list =>
                list
                    .slice()
                    .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)[0]
            )
            .filter(Boolean)
            .map(makeForecastKey)
    }, [forecastBySource])

    const allIds = useMemo(
        () => Array.from(dataByLine.keys()),
        [dataByLine]
    )

    const dataReady = allIds.length > 0

    useEffect(() => {
        if (!dataReady) return

        setVisibleLines(prev => {
            const liveObs = prev.filter(id => {
                const entry = dataByLine.get(id)
                return (
                    entry &&
                    !entry.descriptor.isForecast &&
                    entry.data.length > 0
                )
            })

            const prevFxIds = prev.filter(id => id.startsWith("F|"))
            const defaultFxId = latestForecastIds.find(id =>
                    (dataByLine.get(id)?.descriptor.source ?? "").includes("open-meteo")
            )

            const showAllLatest = latestForecastIds.every(id => prevFxIds.includes(id))

            const nextForecast = showAllLatest && latestForecastIds.length
                ? latestForecastIds
                : defaultFxId ? [defaultFxId] : []

            const next = [...new Set([...liveObs, ...nextForecast])]

            if (next.length === prev.length && next.every((v, i) => v === prev[i])) {
                return prev
            }
            return next
        })
    }, [date, dataReady, dataByLine, latestForecastIds])

    const sourcesForLoc = useMemo(() => {
        const obsSrc = new Set(
            allIds
                .filter(id => {
                    const e = dataByLine.get(id)
                    return (
                        e &&
                        !e.descriptor.isForecast &&
                        e.descriptor.location === activeLocation
                    )
                }).map(id => dataByLine.get(id)!.descriptor.source))
    return [...obsSrc].sort((a, b) => a.localeCompare(b))
}, [allIds, dataByLine, activeLocation])

    const sortedSources = useMemo(
        () => sourcesForLoc.slice().sort((a, b) => a.localeCompare(b)),
        [sourcesForLoc]
    )

    const { colorMap, getColor } = useMemo(() => {
        const pal = schemeCategory10
        const map: Record<string, string> = {}
        allIds.forEach((id: string, i) => { map[id] = pal[i % pal.length] })
        const get = ({ id }: { id: string | number }) =>
            dataByLine.get(String(id))?.descriptor.source === NOAA
                ? '#000'
                : map[id]
        return { colorMap: map, getColor: get }
    }, [allIds, dataByLine])

    const sourceColorMap = useMemo(() => {
        return sourcesForLoc.reduce<Record<string, string>>((acc, src) => {
            if (src === NOAA) {
                acc[src] = '#888888'
            } else {
                const firstKey = allIds.find(id => {
                    const entry = dataByLine.get(id)
                    if (!entry) return true
                    const d = entry.descriptor
                    return d.source === src && d.location === activeLocation && !d.isForecast
                })
                acc[src] = firstKey ? colorMap[firstKey] : '#888888'
            }
            return acc
        }, {})
    }, [sourcesForLoc, colorMap, activeLocation])

    const normLoc = activeLocation?.trim() ?? ''

    const chartData: Serie[] = useMemo(
        () =>
            allIds
                .filter(id => {
                    const entry = dataByLine.get(id)!
                    return (
                        entry.descriptor.location === normLoc &&
                        visibleLines.includes(id) &&
                        entry.data.length
                    )
                })
                .map(id => {
                    const entry = dataByLine.get(id)!
                    return {
                        id,
                        data: entry.data.map(pt => ({
                            ...pt,
                            y: unit === 'C' ? pt.y : +(pt.y * 9 / 5 + 32).toFixed(1),
                        })),
                    }
                }),
        [allIds, visibleLines, dataByLine, unit, normLoc],
    )

    const fahrenheitLinesLayer = useFahrenheitLinesLayer(unit, distributions, activeLocation)

    const yTickValues = useMemo<number[]>(() => {

        const allYsRaw = chartData.flatMap(s => s.data.map(pt => pt.y))

        const allYs: number[] = allYsRaw.filter(
            (v): v is number => typeof v === 'number' && !isNaN(v)
        )

        if (!allYs.length) return []

        const minY = Math.floor(Math.min(...allYs))
        const maxY = Math.ceil(Math.max(...allYs))

        if (unit === 'C') {
            return Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i)
        }

        const stepF = 1
        const count = Math.floor((maxY - minY) / stepF) + 1
        return Array.from({ length: count }, (_, i) =>
            +(minY + i * stepF).toFixed(1)
        )
    }, [chartData, unit])

    const forecastIds = latestForecastIds

    const toggleLatestForecasts = (checked: boolean) => {
        setVisibleLines(prevIds => {
            if (checked) {
                const observationIds = prevIds.filter(id => !forecastIds.includes(id))
                return [...observationIds, ...forecastIds]
            } else {
                return prevIds.filter(id => !forecastIds.includes(id))
            }
        })
    }

    const toggleLine = useCallback((id: string) => {
        setVisibleLines(prevIds =>
            prevIds.includes(id) ? prevIds.filter(x => x !== id) : [...prevIds, id]
        )
    }, [])

    const handleSourceToggle = (src: string, checked: boolean) => {
        if (src === NOAA) return
        if (!activeLocation) return

        setSelectedSourcesByLocation(prev => {
            const updatedSources = checked
                ? [...(prev[activeLocation] || []), src]
                : (prev[activeLocation] || []).filter(source => source !== src)

            return {
                ...prev,
                [activeLocation]: updatedSources,
            }
        })

        const sourceLineIds = allIds.filter(id => {
            const e = dataByLine.get(id)
            return (
                e &&
                !e.descriptor.isForecast &&
                e.descriptor.location === activeLocation &&
                e.descriptor.source   === src
            )
        })

        setVisibleLines(prev =>
            checked
                ? Array.from(new Set([...prev, ...sourceLineIds]))
                : prev.filter(id => !sourceLineIds.includes(id))
        )
    }

    const obsLineIds = useMemo(() =>
            allIds.filter(id => {
                const d = dataByLine.get(id)!.descriptor
                return d.location === normLoc && !d.isForecast
            }),
        [allIds, normLoc]
    )

    const onlyNoaa = useMemo(() =>
            visibleLines.every(id => {
                const entry = dataByLine.get(id)
                if (!entry) return true
                const d = entry.descriptor
                return d.source === NOAA || d.isForecast
                }
            ),
        [visibleLines]
    )

    const handleToggleAllObservations = useCallback(() => {
        if (onlyNoaa) {
            const forecastIds = visibleLines.filter(
                id => dataByLine.get(id)!.descriptor.isForecast,
            )
            setVisibleLines([...new Set([...obsLineIds, ...forecastIds])])
            setSelectedSourcesByLocation(prev => ({
                ...prev,
                [activeLocation]: sourcesForLoc,
            }))
        } else {
            const newVisible = visibleLines.filter(id => {
                const entry = dataByLine.get(id)
                if (!entry) return true
                const d = entry.descriptor
                   return d.source === NOAA || d.isForecast
                 })
            setVisibleLines(newVisible)
            setSelectedSourcesByLocation(prev => ({
                ...prev,
                [activeLocation]: [NOAA],
            }))
        }
    }, [onlyNoaa, obsLineIds, visibleLines, sourcesForLoc, activeLocation])

    useEffect(() => {
        if (!activeLocation) return

        setVisibleLines([])

        setSelectedSourcesByLocation(prev => {
            const curr = prev[activeLocation]
            if (curr && curr.length > 0) return prev
            return { ...prev, [activeLocation]: [NOAA] }
        })
    }, [activeLocation])

    useEffect(() => {
        if (!activeLocation || !allIds.length || visibleLines.length) return
        const marked = selectedSourcesByLocation[activeLocation] ?? [NOAA]

        const initialObs = allIds.filter(id => {
            const e = dataByLine.get(id)
            return (
                e &&
                !e.descriptor.isForecast &&
                e.descriptor.location === activeLocation &&
                marked.includes(e.descriptor.source)
            )
        })

        setSelectedSourcesByLocation(prev => {
            const curr = prev[activeLocation]
            if (curr && curr.length > 0) return prev
            return { ...prev, [activeLocation]: [NOAA] }
        })

        const openMeteoForecasts = forecastEntries
            .filter(e => e.location === activeLocation && e.source === 'open-meteo.com')

        const latest = openMeteoForecasts
            .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)[0]

        const latestId = latest ? makeForecastKey(latest) : undefined

        const initialVisible = latestId
            ? [...initialObs, latestId]
            : initialObs

        setVisibleLines(initialVisible)
    }, [activeLocation, allIds, forecastEntries, visibleLines])

    if (isLoading) return <CircularProgress />
    if (!entries.length) {
        return (
            <Typography sx={emptyStateTextSx}>
                <strong>Weather Observations: </strong>No data for
                <strong> {activeLocation}</strong> on
                <strong> {date}</strong>.
            </Typography>
        )
    }

    return (
        <Box sx={graphRootSx}>
            <Typography variant="h4" sx={graphTitleSx} gutterBottom>
                Weather Observations
            </Typography>
            <Box sx={graphBodySx}>
                <Box sx={graphMainColumnSx}>
                    <ObservationControls
                        sortedSources={sortedSources}
                        selectedSources={selectedSourcesByLocation[activeLocation] || []}
                        sourceColorMap={sourceColorMap}
                        onlyNoaa={onlyNoaa}
                        toggleAll={handleToggleAllObservations}
                        toggleSource={handleSourceToggle}
                        unit={unit}
                        onUnitChange={(u) => setUnit(u)}
                    />
                    <Box sx={graphContentRowSx}>
                        <Box sx={graphChartColumnSx}>
                            <ResponsiveLine
                                curve="monotoneX"
                                colors={getColor}
                                data={chartData}
                                margin={{ top: 10, right: 10, bottom: 55, left: 70 }}
                                xScale={{ type: 'time', useUTC: true }}
                                yScale={{
                                    type: "linear",
                                    min: 'auto',
                                    max: 'auto',
                                    stacked: false,
                                    reverse: false
                                }}
                                axisBottom={{
                                    format: (value: Date) => dayjs.utc(value).format('HH:mm'),
                                    tickSize: 20,
                                    tickPadding: 5,
                                    tickRotation: 0,
                                    legend: 'Time',
                                    legendOffset: 50,
                                    legendPosition: 'middle',
                                }}
                                axisLeft={{
                                    tickValues: yTickValues,
                                    tickSize: 5,
                                    tickPadding: 5,
                                    tickRotation: 0,
                                    legend: 'Temperature',
                                    legendOffset: -55,
                                    legendPosition: 'middle',
                                }}
                                gridYValues={yTickValues}
                                pointSize={5}
                                pointColor={{ theme: 'background' }}
                                pointBorderWidth={2}
                                pointBorderColor={{ from: 'serieColor' }}
                                useMesh={true}
                                enablePointLabel={false}
                                layers={[
                                    'grid',
                                    'axes',
                                    fahrenheitLinesLayer as unknown as Layer,
                                    'lines',
                                    'points',
                                    MainLinesLayer as unknown as Layer,
                                    'mesh',
                                    'legends'
                                ]}
                                tooltip={tooltipProps => {
                                    const { point } = (tooltipProps as unknown as { point: { data: GraphDataPoint } })
                                    if (!point?.data) return null
                                    const ts = point.data.timestamp
                                    const seconds =
                                        typeof ts === 'object' && ts !== null
                                            ? ts.seconds
                                            : Math.floor(new Date(ts).getTime() / 1000)
                                    const timeFormatted = dayjs.utc(point.data.x as Date).format('HH:mm')
                                    const timestampFormatted = dayjs.utc(seconds * 1000).format('YYYY-MM-DD HH:mm:ss')
                                    return (
                                        <Box sx={chartTooltipSx}>
                                            <Typography variant="body2" fontWeight="bold">
                                                Time: <Typography component="span" variant="body2" fontWeight="normal">{timeFormatted}</Typography>
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                Location: <Typography component="span" variant="body2" fontWeight="normal">{point.data.location}</Typography>
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                Temp: <Typography component="span" variant="body2" fontWeight="normal">{point.data.y}°{unit}</Typography>
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                Source: <Typography component="span" variant="body2" fontWeight="normal">{point.data.source}</Typography>
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                Timestamp: <Typography component="span" variant="body2" fontWeight="normal">{timestampFormatted}</Typography>
                                            </Typography>
                                        </Box>
                                    )
                                }}
                            />

                        </Box>
                        <ForecastSlider
                            forecastBySource={forecastBySource}
                            visibleIds={visibleLines}
                            latestIds={latestForecastIds}
                            toggleForecast={toggleLine}
                            toggleLatestForecasts={toggleLatestForecasts}
                            toggleAllForSource={(src, checked) => {
                                const ids = (forecastBySource[src] || []).map(makeForecastKey)
                                setVisibleLines(prev =>
                                    checked
                                        ? Array.from(new Set([...prev, ...ids]))
                                        : prev.filter(id => !ids.includes(id))
                                )
                            }}
                            colorMap={colorMap}
                            makeForecastId={makeForecastKey}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

export default WeatherObservationsGraph

const emptyStateTextSx = {
    m: 2,
    textAlign: 'center',
} as const

const graphRootSx = {
    position: 'relative',
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: 1,
} as const

const graphTitleSx = {
    m: "8px 16px 0px 16px ",
} as const

const graphBodySx = {
    display: 'flex',
    gap: 1,
    mb: "40px",
} as const

const graphMainColumnSx = {
    flexGrow: 1,
    height: '100%',
} as const

const graphContentRowSx = {
    display: 'flex',
    gap: 2,
    height: '700px',
} as const

const graphChartColumnSx = {
    flexGrow: 1,
} as const

const chartTooltipSx = {
    padding: '8px',
    backgroundColor: '#fff',
    color: '#000',
    boxShadow: '0 0 10px rgba(0,0,0,0.2)',
    borderRadius: '4px',
    minWidth: '160px',
} as const
