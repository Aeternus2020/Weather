import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react"
import dayjs, { Dayjs } from "dayjs"
import utc from "dayjs/plugin/utc"
import {
    Box,
    Button,
    Paper,
    Skeleton,
    Typography,
} from "@mui/material"
import {
    LocalizationProvider,
    DatePicker
} from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { visuallyHidden } from "@mui/utils"

import { useQueryClient } from "@tanstack/react-query"
import {
    getLocationFromPathname,
    getPublicPageHref,
    type PublicLocation,
} from "./seo"
import { shouldHandleClientNavigation } from "./ui/shouldHandleClientNavigation"

dayjs.extend(utc)

const LAST_DATE_KEY = "forecastAtlas:lastDate"
const LEGACY_LAST_DATE_KEY = "temperatureBot:lastDate"
const locations = [
    { value: 'London' as const, label: 'London' },
    { value: 'NY' as const, label: 'New York' },
] as const
const WeatherObservationsGraph = lazy(() => import("./observations/WeatherObservationsGraph"))
const TemperatureEvaluationTable = lazy(() => import("./temperature/TemperatureEvaluationTable"))

type NavigateOptions = {
    replace?: boolean
}

type ForecastAtlasPageProps = {
    navigateToHref: (href: string, options?: NavigateOptions) => void
    pathname: string
    search: string
}

function isValidUtcDateParam(value: string | null): value is string {
    if (value == null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
    }

    const parsed = new Date(`${value}T00:00:00Z`)

    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function readDateParam(search: string): string {
    const params = new URLSearchParams(search)
    const urlDate = params.get('date')

    if (isValidUtcDateParam(urlDate)) {
        return urlDate
    }

    const storedDate = localStorage.getItem(LAST_DATE_KEY) ?? localStorage.getItem(LEGACY_LAST_DATE_KEY)

    return isValidUtcDateParam(storedDate)
        ? storedDate
        : dayjs.utc().format('YYYY-MM-DD')
}

function readLocation(
    pathname: string,
): PublicLocation {
    const pathnameLocation = getLocationFromPathname(pathname)

    if (pathnameLocation != null) {
        return pathnameLocation
    }

    return 'London'
}

function getLocationLabel(location: PublicLocation): string {
    return location === 'NY' ? 'New York' : 'London'
}

function formatLocalComputerTime(now: Date): string {
    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short',
    }).format(now)
}

function getPageIntro(location: PublicLocation): { title: string; description: string } {
    const locationLabel = getLocationLabel(location)
    return {
        title: `${locationLabel} forecast comparison`,
        description: `Compare observed temperatures, forecast snapshots, and provider drift for ${locationLabel}.`,
    }
}

function SectionPlaceholder({
    title,
    minHeight,
}: {
    title: string
    minHeight: number
}) {
    return (
        <Paper
            aria-busy="true"
            aria-live="polite"
            role="status"
            sx={{ ...sectionPlaceholderPaperSx, minHeight }}
        >
            <Box component="span" sx={visuallyHidden}>
                {title}
            </Box>
            <Typography sx={sectionPlaceholderTitleSx} variant="h6">
                {title}
            </Typography>
            <Box sx={sectionPlaceholderBodySx}>
                <Skeleton animation="wave" height={28} width="38%" />
                <Skeleton animation="wave" height={18} width="82%" />
                <Skeleton animation="wave" height={18} width="74%" />
                <Skeleton animation="wave" sx={sectionPlaceholderBlockSx} variant="rounded" />
            </Box>
        </Paper>
    )
}

function LocalClockText() {
    const [localClock, setLocalClock] = useState(() => new Date())

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setLocalClock(new Date())
        }, 60_000)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [])

    return (
        <Typography variant="body2" color="text.secondary">
            All update times below are shown in UTC. Local time: {formatLocalComputerTime(localClock)}.
        </Typography>
    )
}

const ForecastAtlasPage: React.FC<ForecastAtlasPageProps> = ({
    navigateToHref,
    pathname,
    search,
}) => {
    const qc = useQueryClient()
    const [distributions, setDistributions] = useState<Array<Record<string, number>>>([])

    const dateParam = readDateParam(search)
    const selectedLocation = readLocation(pathname)
    const date: Dayjs = useMemo(() => dayjs.utc(dateParam).startOf("day"), [dateParam])
    const [draftDate, setDraftDate] = useState<Dayjs | null>(date)
    const isToday = date.isSame(dayjs.utc().startOf("day"), "day")
    const pageIntro = getPageIntro(selectedLocation)

    useEffect(() => {
        localStorage.setItem(LAST_DATE_KEY, dateParam)
    }, [dateParam])

    useEffect(() => {
        setDraftDate(date)
    }, [date])

    const updateDateParam = useCallback((next: string) => {
        if (next === dateParam) {
            return
        }

        navigateToHref(getPublicPageHref(selectedLocation, next), { replace: true })
    }, [dateParam, navigateToHref, selectedLocation])

    const [loading, setLoading] = useState(false)

    const handleLoadData = useCallback(async () => {
        setLoading(true)
        try {
            await Promise.all([
                qc.invalidateQueries({ queryKey: ["weather-observations"] }),
                qc.invalidateQueries({ queryKey: ["weather-forecasts"] }),
                qc.invalidateQueries({ queryKey: ["temperature-evaluation"] }),
            ])
        } finally {
            setLoading(false)
        }
    }, [qc])

    return (
        <Box sx={forecastAtlasRootSx}>
            <Paper component="section" sx={pageIntroPaperSx}>
                <Typography component="h1" variant="h5" sx={pageIntroTitleSx}>
                    {pageIntro.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={pageIntroBodySx}>
                    {pageIntro.description}
                </Typography>
            </Paper>

            <Box sx={controlsRowSx}>
                <Button
                    onClick={() => updateDateParam(
                        date.add(-1, "day").utc().format("YYYY-MM-DD")
                    )}
                    variant="outlined"
                    sx={controlsButtonSx}
                >
                    Previous
                </Button>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                        label="Select date (UTC)"
                        value={draftDate}
                        format="YYYY-MM-DD"
                        onChange={(d) => {
                            setDraftDate(d)
                        }}
                        onAccept={(d) => {
                            if (d?.isValid()) {
                                updateDateParam(d.utc().format("YYYY-MM-DD"))
                            }
                        }}
                        slotProps={{ textField: { size: "small", sx: datePickerFieldSx } }}
                    />
                </LocalizationProvider>
                <Button
                    disabled={isToday}
                    onClick={() => updateDateParam(
                        date.add(1, "day").utc().format("YYYY-MM-DD")
                    )}
                    variant="outlined"
                    sx={controlsButtonSx}
                >
                    Next
                </Button>
                <Button
                    disabled={loading}
                    onClick={handleLoadData}
                    variant="contained"
                    sx={controlsButtonSx}
                >
                    {loading ? "Loading…" : "Load Data"}
                </Button>
            </Box>

            {isToday && (
                <Typography variant="body2" color="textSecondary" sx={todayBannerSx}>
                    You are viewing data for today (UTC).
                </Typography>
            )}

            <Box sx={locationButtonsRowSx}>
                {locations.map((loc) => (
                    <Button
                        key={loc.value}
                        component="a"
                        href={getPublicPageHref(loc.value, dateParam)}
                        onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                            if (!shouldHandleClientNavigation(event)) {
                                return
                            }

                            event.preventDefault()
                            navigateToHref(getPublicPageHref(loc.value, dateParam))
                        }}
                        variant={loc.value === selectedLocation ? "contained" : "outlined"}
                        size="small"
                    >
                        {loc.label}
                    </Button>
                ))}
            </Box>

            <Paper variant="outlined" sx={pageContextPaperSx}>
                <Box sx={pageContextMetaRowSx}>
                    <Box sx={pageContextMetaItemSx}>
                        <Typography variant="body2" color="text.secondary">
                            Location
                        </Typography>
                        <Typography variant="subtitle1">
                            {getLocationLabel(selectedLocation)}
                        </Typography>
                    </Box>
                    <Box sx={pageContextMetaItemSx}>
                        <Typography variant="body2" color="text.secondary">
                            UTC day
                        </Typography>
                        <Typography variant="subtitle1">
                            {dateParam}
                        </Typography>
                    </Box>
                </Box>
                <LocalClockText />
            </Paper>

            <Suspense
                fallback={(
                    <SectionPlaceholder
                        minHeight={520}
                        title="Loading weather observations"
                    />
                )}
            >
                <WeatherObservationsGraph
                    date={dateParam}
                    location={selectedLocation}
                    distributions={distributions}
                />
            </Suspense>

            <Suspense
                fallback={(
                    <SectionPlaceholder
                        minHeight={420}
                        title="Loading temperature evaluation"
                    />
                )}
            >
                <TemperatureEvaluationTable
                    date={dateParam}
                    location={selectedLocation}
                    setDistributions={setDistributions}
                />
            </Suspense>
        </Box>
    )
}

export default ForecastAtlasPage

const forecastAtlasRootSx = {
    p: 1,
    m: 1,
} as const

const pageIntroPaperSx = {
    mb: 2,
    p: { xs: 1.4, md: 1.7 },
} as const

const pageIntroTitleSx = {
    mb: 0.35,
} as const

const pageIntroBodySx = {
    maxWidth: 720,
} as const

const controlsRowSx = {
    display: "flex",
    flexWrap: { xs: "wrap", sm: "nowrap" },
    gap: 1,
    mb: 2,
    alignItems: "center",
} as const

const controlsButtonSx = {
    flexShrink: 0,
} as const

const datePickerFieldSx = {
    width: { xs: 172, sm: 182 },
    maxWidth: "100%",
    '& .MuiInputBase-input': {
        minWidth: 0,
    },
} as const

const todayBannerSx = {
    mb: 2,
} as const

const locationButtonsRowSx = {
    display: "flex",
    flexWrap: "wrap",
    gap: 1,
    mb: 2,
} as const

const pageContextPaperSx = {
    mb: 2,
    p: { xs: 1.2, md: 1.5 },
} as const

const pageContextMetaRowSx = {
    display: "flex",
    gap: { xs: 1.5, md: 2.2 },
    flexWrap: "wrap",
    alignItems: "baseline",
    mb: 0.45,
} as const

const pageContextMetaItemSx = {
    display: "inline-flex",
    gap: 0.75,
    alignItems: "baseline",
} as const

const sectionPlaceholderPaperSx = {
    mb: 2.2,
    p: { xs: 1.4, md: 1.8 },
} as const

const sectionPlaceholderTitleSx = {
    mb: 1.1,
} as const

const sectionPlaceholderBodySx = {
    display: "flex",
    flexDirection: "column",
    gap: 0.45,
} as const

const sectionPlaceholderBlockSx = {
    mt: 0.8,
    flex: 1,
    minHeight: 220,
} as const
