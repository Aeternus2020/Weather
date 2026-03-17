import React, {useCallback, useEffect, useState} from "react"
import dayjs, { Dayjs } from "dayjs"
import utc from "dayjs/plugin/utc"
import {
    Box,
    Button,
    Paper,
    Typography,
} from "@mui/material"
import {
    LocalizationProvider,
    DatePicker
} from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"

import WeatherObservationsGraph from "./observations/WeatherObservationsGraph"
import TemperatureEvaluationTable from "./temperature/TemperatureEvaluationTable"
import { useQueryClient } from "@tanstack/react-query"

dayjs.extend(utc)

const LAST_DATE_KEY = "temperatureBot:lastDate"
const LAST_LOC_KEY = "temperatureBot:lastLocation"
const locations = ['London','NY'] as const

function formatLocalComputerTime(now: Date): string {
    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short',
    }).format(now)
}

const TemperatureBotPage: React.FC = () => {
    const qc = useQueryClient()
    const [distributions, setDistributions] = useState<Array<Record<string, number>>>([])
    const [localClock, setLocalClock] = useState(() => new Date())

    const [dateParam, setDateParam] = useState<string>(() =>
          localStorage.getItem(LAST_DATE_KEY) ?? dayjs.utc().format('YYYY-MM-DD')
        )
    const [selectedLocation, setSelectedLocation] = useState<string>(() =>
          localStorage.getItem(LAST_LOC_KEY) ?? 'London'
        )
    const date: Dayjs = dayjs.utc(dateParam).startOf("day")
    const isToday = date.isSame(dayjs.utc().startOf("day"), "day")

    useEffect(() => {
        localStorage.setItem(LAST_DATE_KEY, dateParam)
        localStorage.setItem(LAST_LOC_KEY,  selectedLocation)

        const params = new URLSearchParams(window.location.search)
        params.set('date', dateParam)
        params.set('loc',  selectedLocation)
        window.history.replaceState(null, '', `?${params.toString()}`)
    }, [dateParam, selectedLocation])

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setLocalClock(new Date())
        }, 60_000)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [])

    const updateDateParam = useCallback((next: string) => {
        setDateParam(prev => (prev === next ? prev : next))
    }, [])

    const [loading, setLoading] = useState(false)

    const handleLoadData = useCallback(async () => {
        setLoading(true)
        try {
            await qc.invalidateQueries({ queryKey: ["weather-observations"] })
            await qc.invalidateQueries({ queryKey: ["weather-forecasts"] })
            await qc.invalidateQueries({ queryKey: ["temperature-evaluation"] })
        } finally {
            setLoading(false)
        }
    }, [qc])

    return (
        <Box sx={temperatureBotRootSx}>
            <Box sx={controlsRowSx}>
                <Button variant="outlined" onClick={() => updateDateParam(
                    date.add(-1, "day").utc().format("YYYY-MM-DD")
                )}>
                    Previous
                </Button>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                        label="Select date (UTC)"
                        value={date}
                        format="YYYY-MM-DD"
                        onChange={(d) => {
                            if (d) updateDateParam(d.utc().format("YYYY-MM-DD"))
                        }}
                        slotProps={{ textField: { size: "small" } }}
                    />
                </LocalizationProvider>
                <Button variant="outlined" onClick={() => updateDateParam(
                    date.add(1, "day").utc().format("YYYY-MM-DD")
                )} disabled={isToday}
                >
                    Next
                </Button>
                <Button
                    variant="contained"
                    onClick={handleLoadData}
                    disabled={loading}
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
                {locations.map(loc => (
                    <Button
                        key={loc}
                        variant={loc === selectedLocation ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setSelectedLocation(loc)}
                    >
                        {loc}
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
                            {selectedLocation}
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
                <Typography variant="body2" color="text.secondary">
                    All update times below are shown in UTC. Local time: {formatLocalComputerTime(localClock)}.
                </Typography>
            </Paper>

            <WeatherObservationsGraph
                date={dateParam}
                location={selectedLocation}
                distributions={distributions}
            />

            <TemperatureEvaluationTable
                date={dateParam}
                location={selectedLocation}
                setDistributions={setDistributions}
            />
        </Box>
    )
}

export default TemperatureBotPage

const temperatureBotRootSx = {
    p: 1,
    m: 1,
} as const

const controlsRowSx = {
    display: "flex",
    gap: 1,
    mb: 2,
    alignItems: "center",
} as const

const todayBannerSx = {
    mb: 2,
} as const

const locationButtonsRowSx = {
    display: "flex",
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
