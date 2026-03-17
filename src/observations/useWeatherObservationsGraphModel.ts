import { useEffect, useMemo, useState } from 'react'
import type { Serie } from '@nivo/line'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import type {
    GraphDataPoint,
    WeatherForecast,
    WeatherObservations,
} from './typesWeatherObservations'

dayjs.extend(utc)

const NOAA_SOURCE = 'tgftp.nws.noaa.gov'
const OPEN_METEO_SOURCE_MATCH = 'open-meteo'
const SERIES_COLOR_PALETTE = [
    '#0072B2',
    '#E69F00',
    '#009E73',
    '#D55E00',
    '#CC79A7',
    '#56B4E9',
    '#F0E442',
    '#C44E52',
    '#4C78A8',
    '#72B7B2',
    '#F58518',
    '#54A24B',
]

interface ObservationLineDescriptor {
    source: string
    location: string
    isForecast: false
}

interface ForecastLineDescriptor {
    source: string
    location: string
    isForecast: true
    runTime: string
}

type LineDescriptor = ObservationLineDescriptor | ForecastLineDescriptor

interface LineEntry {
    descriptor: LineDescriptor
    data: GraphDataPoint[]
}

interface UseWeatherObservationsGraphModelArgs {
    date: string
    entries: WeatherObservations[]
    forecastEntries: WeatherForecast[]
    location: string
    themeMode: 'light' | 'dark'
    unit: 'C' | 'F'
}

export function makeForecastKey(forecast: WeatherForecast): string {
    return makeKey({
        source: forecast.source,
        location: forecast.location,
        isForecast: true,
        runTime: dayjs.unix(forecast.timestamp.seconds).toISOString(),
    })
}

function setLocationSources(
    selectedSourcesByLocation: Record<string, string[]>,
    location: string,
    sources: string[],
) {
    return {
        ...selectedSourcesByLocation,
        [location]: sources,
    }
}

function makeKey(descriptor: LineDescriptor): string {
    return `${descriptor.isForecast ? 'F' : 'O'}|${descriptor.source}|${descriptor.location}|${descriptor.isForecast ? descriptor.runTime : ''}`
}

export function useWeatherObservationsGraphModel({
    date,
    entries,
    forecastEntries,
    location,
    themeMode,
    unit,
}: UseWeatherObservationsGraphModelArgs) {
    const [visibleLines, setVisibleLines] = useState<string[]>([])
    const [selectedSourcesByLocation, setSelectedSourcesByLocation] = useState<Record<string, string[]>>({})

    const dataByLine = useMemo(() => {
        const lines = new Map<string, LineEntry>()

        for (const entry of entries) {
            const descriptor: ObservationLineDescriptor = {
                source: entry.source,
                location: entry.location,
                isForecast: false,
            }
            const key = makeKey(descriptor)
            const lineEntry = lines.get(key) ?? { descriptor, data: [] }

            const time = dayjs.unix(entry.time.seconds).utc()

            lineEntry.data.push({
                x: time.toDate(),
                y: entry.temp,
                time: time.format('HH:mm'),
                source: entry.source,
                location: entry.location,
                timestamp: entry.timestamp,
            })

            lines.set(key, lineEntry)
        }

        for (const forecast of forecastEntries) {
            const descriptor: ForecastLineDescriptor = {
                source: forecast.source,
                location: forecast.location,
                isForecast: true,
                runTime: dayjs.unix(forecast.timestamp.seconds).toISOString(),
            }
            const key = makeKey(descriptor)

            const points = forecast.forecast
                .filter((point) => dayjs.unix(point.time.seconds).utc().format('YYYY-MM-DD') === date)
                .map((point) => {
                    const time = dayjs.unix(point.time.seconds).utc()

                    return {
                        x: time.toDate(),
                        y: point.temp,
                        time: time.format('HH:mm'),
                        source: forecast.source,
                        location: forecast.location,
                        timestamp: forecast.timestamp,
                    }
                })

            lines.set(key, { descriptor, data: points })
        }

        for (const line of lines.values()) {
            line.data.sort((left, right) => {
                const leftTime = new Date(left.x).getTime()
                const rightTime = new Date(right.x).getTime()

                return leftTime - rightTime
            })
        }

        return lines
    }, [date, entries, forecastEntries])

    const allIds = useMemo(() => Array.from(dataByLine.keys()), [dataByLine])

    const forecastBySource = useMemo(() => {
        return forecastEntries.reduce<Record<string, WeatherForecast[]>>((accumulator, entry) => {
            (accumulator[entry.source] ||= []).push(entry)
            return accumulator
        }, {})
    }, [forecastEntries])

    const latestObservationsUpdatedUtc = useMemo(() => {
        const latestTimestamp = entries.reduce<string | null>((currentLatest, entry) => {
            const nextTimestamp = dayjs.utc(entry.timestamp)

            if (!nextTimestamp.isValid()) {
                return currentLatest
            }

            if (!currentLatest) {
                return entry.timestamp
            }

            return nextTimestamp.valueOf() > dayjs.utc(currentLatest).valueOf()
                ? entry.timestamp
                : currentLatest
        }, null)

        return latestTimestamp
            ? dayjs.utc(latestTimestamp).format('D MMM, HH:mm')
            : '–'
    }, [entries])

    const latestForecastUpdatedUtc = useMemo(() => {
        if (!forecastEntries.length) {
            return '–'
        }

        const latestRunSeconds = Math.max(
            ...forecastEntries.map((entry) => entry.timestamp.seconds),
        )

        return dayjs.unix(latestRunSeconds).utc().format('D MMM, HH:mm')
    }, [forecastEntries])

    const latestForecastIds = useMemo(() => {
        return Object.values(forecastBySource)
            .map((entriesForSource) => {
                if (!entriesForSource.length) {
                    return null
                }

                return entriesForSource.reduce((latestEntry, entry) =>
                    entry.timestamp.seconds > latestEntry.timestamp.seconds
                        ? entry
                        : latestEntry,
                )
            })
            .filter((entry): entry is WeatherForecast => entry !== null)
            .map(makeForecastKey)
    }, [forecastBySource])

    useEffect(() => {
        if (!allIds.length) {
            return
        }

        setVisibleLines((prevVisibleLines) => {
            const observationIds = prevVisibleLines.filter((id) => {
                const line = dataByLine.get(id)

                return Boolean(line && !line.descriptor.isForecast && line.data.length > 0)
            })

            const previousForecastIds = prevVisibleLines.filter((id) => id.startsWith('F|'))
            const defaultForecastId = latestForecastIds.find((id) =>
                (dataByLine.get(id)?.descriptor.source ?? '').includes(OPEN_METEO_SOURCE_MATCH)
            )
            const keepAllLatestForecasts = latestForecastIds.every((id) =>
                previousForecastIds.includes(id)
            )
            const nextForecastIds = keepAllLatestForecasts && latestForecastIds.length
                ? latestForecastIds
                : defaultForecastId
                    ? [defaultForecastId]
                    : []
            const nextVisibleLines = [...new Set([...observationIds, ...nextForecastIds])]

            if (
                nextVisibleLines.length === prevVisibleLines.length &&
                nextVisibleLines.every((id, index) => id === prevVisibleLines[index])
            ) {
                return prevVisibleLines
            }

            return nextVisibleLines
        })
    }, [allIds, dataByLine, latestForecastIds])

    const { observationLineIds, forecastLineIds, sources } = useMemo(() => {
        const observationLineIds: string[] = []
        const forecastLineIds: string[] = []
        const observationSources = new Set<string>()

        for (const id of allIds) {
            const line = dataByLine.get(id)

            if (!line) {
                continue
            }

            if (line.descriptor.isForecast) {
                forecastLineIds.push(id)
                continue
            }

            observationLineIds.push(id)
            observationSources.add(line.descriptor.source)
        }

        return {
            observationLineIds,
            forecastLineIds,
            sources: [...observationSources].sort((left, right) => left.localeCompare(right)),
        }
    }, [allIds, dataByLine])

    const { colorMap, getColor, sourceColorMap } = useMemo(() => {
        const nextColorMap: Record<string, string> = {}
        const nextSourceColorMap: Record<string, string> = {}

        allIds.forEach((id, index) => {
            nextColorMap[id] = SERIES_COLOR_PALETTE[index % SERIES_COLOR_PALETTE.length]
        })

        const getLineColor = ({ id }: { id: string | number }) =>
            dataByLine.get(String(id))?.descriptor.source === NOAA_SOURCE
                ? themeMode === 'dark'
                    ? '#A9B9CD'
                    : '#5A6F8D'
                : nextColorMap[String(id)] ?? '#888888'

        sources.forEach((source) => {
            if (source === NOAA_SOURCE) {
                nextSourceColorMap[source] = themeMode === 'dark' ? '#A9B9CD' : '#5A6F8D'
                return
            }

            const firstIdForSource = allIds.find((id) => {
                const line = dataByLine.get(id)
                return Boolean(
                    line &&
                    !line.descriptor.isForecast &&
                    line.descriptor.source === source,
                )
            })

            nextSourceColorMap[source] = firstIdForSource
                ? nextColorMap[firstIdForSource]
                : '#888888'
        })

        return {
            colorMap: nextColorMap,
            getColor: getLineColor,
            sourceColorMap: nextSourceColorMap,
        }
    }, [allIds, dataByLine, sources, themeMode])

    const chartData = useMemo<Serie[]>(() => {
        return allIds.reduce<Serie[]>((series, id) => {
            if (!visibleLines.includes(id)) {
                return series
            }

            const line = dataByLine.get(id)

            if (!line || !line.data.length) {
                return series
            }

            series.push({
                id,
                data: line.data.map((point) => ({
                    ...point,
                    y: unit === 'C' ? point.y : +(point.y * 9 / 5 + 32).toFixed(1),
                })),
            })

            return series
        }, [])
    }, [allIds, dataByLine, unit, visibleLines])

    const onlyNoaa = visibleLines.every((id) => {
        const line = dataByLine.get(id)

        if (!line) {
            return true
        }

        return line.descriptor.source === NOAA_SOURCE || line.descriptor.isForecast
    })

    const toggleLatestForecasts = (checked: boolean) => {
        setVisibleLines((prevVisibleLines) => {
            if (checked) {
                const observationIds = prevVisibleLines.filter((id) => !latestForecastIds.includes(id))
                return [...observationIds, ...latestForecastIds]
            }

            return prevVisibleLines.filter((id) => !latestForecastIds.includes(id))
        })
    }

    const toggleLine = (id: string) => {
        setVisibleLines((prevVisibleLines) =>
            prevVisibleLines.includes(id)
                ? prevVisibleLines.filter((value) => value !== id)
                : [...prevVisibleLines, id]
        )
    }

    const toggleAllForSource = (source: string, checked: boolean) => {
        const sourceLineIds = (forecastBySource[source] ?? []).map(makeForecastKey)

        setVisibleLines((prevVisibleLines) =>
            checked
                ? Array.from(new Set([...prevVisibleLines, ...sourceLineIds]))
                : prevVisibleLines.filter((id) => !sourceLineIds.includes(id))
        )
    }

    const toggleSource = (source: string, checked: boolean) => {
        if (source === NOAA_SOURCE || !location) {
            return
        }

        setSelectedSourcesByLocation((prev) => {
            const currentSources = prev[location] ?? []
            const nextSources = checked
                ? Array.from(new Set([...currentSources, source]))
                : currentSources.filter((value) => value !== source)

            return {
                ...prev,
                [location]: nextSources,
            }
        })

        const sourceLineIds = observationLineIds.filter((id) => {
            const line = dataByLine.get(id)

            return Boolean(line && line.descriptor.source === source)
        })

        setVisibleLines((prevVisibleLines) =>
            checked
                ? Array.from(new Set([...prevVisibleLines, ...sourceLineIds]))
                : prevVisibleLines.filter((id) => !sourceLineIds.includes(id))
        )
    }

    const toggleAllForecasts = (checked: boolean) => {
        setVisibleLines((prevVisibleLines) =>
            checked
                ? Array.from(new Set([...prevVisibleLines, ...forecastLineIds]))
                : prevVisibleLines.filter((id) => !forecastLineIds.includes(id))
        )
    }

    const toggleAllObservations = () => {
        if (onlyNoaa) {
            const visibleForecastIds = visibleLines.filter((id) => dataByLine.get(id)?.descriptor.isForecast)

            setVisibleLines([...new Set([...observationLineIds, ...visibleForecastIds])])
            setSelectedSourcesByLocation((prev) => setLocationSources(prev, location, sources))
            return
        }

        const nextVisibleLines = visibleLines.filter((id) => {
            const line = dataByLine.get(id)

            if (!line) {
                return true
            }

            return line.descriptor.source === NOAA_SOURCE || line.descriptor.isForecast
        })

        setVisibleLines(nextVisibleLines)
        setSelectedSourcesByLocation((prev) => setLocationSources(prev, location, [NOAA_SOURCE]))
    }

    useEffect(() => {
        if (!location) {
            return
        }

        setVisibleLines([])
        setSelectedSourcesByLocation((prev) => {
            const currentSources = prev[location]

            if (currentSources && currentSources.length > 0) {
                return prev
            }

            return setLocationSources(prev, location, [NOAA_SOURCE])
        })
    }, [location])

    useEffect(() => {
        if (!location || !allIds.length || visibleLines.length) {
            return
        }

        const markedSources = selectedSourcesByLocation[location] ?? [NOAA_SOURCE]
        const initialObservationIds = observationLineIds.filter((id) => {
            const line = dataByLine.get(id)

            return Boolean(line && markedSources.includes(line.descriptor.source))
        })

        setSelectedSourcesByLocation((prev) => {
            const currentSources = prev[location]

            if (currentSources && currentSources.length > 0) {
                return prev
            }

            return setLocationSources(prev, location, [NOAA_SOURCE])
        })

        const latestOpenMeteoForecast = forecastEntries
            .filter((entry) => entry.source.includes(OPEN_METEO_SOURCE_MATCH))
            .sort((left, right) => right.timestamp.seconds - left.timestamp.seconds)[0]
        const latestOpenMeteoId = latestOpenMeteoForecast
            ? makeForecastKey(latestOpenMeteoForecast)
            : undefined

        setVisibleLines(
            latestOpenMeteoId
                ? [...initialObservationIds, latestOpenMeteoId]
                : initialObservationIds
        )
    }, [allIds, dataByLine, forecastEntries, location, observationLineIds, selectedSourcesByLocation, visibleLines])

    return {
        chartData,
        colorMap,
        forecastBySource,
        getColor,
        latestForecastIds,
        latestForecastUpdatedUtc,
        latestObservationsUpdatedUtc,
        onlyNoaa,
        selectedSources: selectedSourcesByLocation[location] ?? [],
        sourceColorMap,
        sources,
        toggleAllForecasts,
        toggleAllForSource,
        toggleAllObservations,
        toggleLatestForecasts,
        toggleLine,
        toggleSource,
        visibleLines,
    }
}
