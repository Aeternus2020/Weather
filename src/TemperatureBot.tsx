import React, {useCallback, useEffect, useState} from "react"
import dayjs, { Dayjs } from "dayjs"
import utc from "dayjs/plugin/utc"
import { onAuthStateChanged, User } from "firebase/auth"
import { auth } from "./firebase"
import {
    Box,
    Button,
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
import TradeBotTable from "./market/TradeBotTable"

dayjs.extend(utc)

const LAST_DATE_KEY = "temperatureBot:lastDate"
const LAST_LOC_KEY = "temperatureBot:lastLocation"
const locations = ['London','NY'] as const

const TemperatureBotPage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null)
    const qc = useQueryClient()
    const [distributions, setDistributions] = useState<Array<Record<string, number>>>([])

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
        const unsub = onAuthStateChanged(auth, setUser)
        return () => unsub()
    }, [])

    const updateDateParam = useCallback((next: string) => {
        setDateParam(prev => (prev === next ? prev : next))
    }, [])

    const [loading, setLoading] = useState(false)

    const handleLoadData = useCallback(async () => {
        if (!user) return

        setLoading(true)
        try {
            await qc.invalidateQueries({ queryKey: ["weather-observations"] })
            await qc.invalidateQueries({ queryKey: ["weather-forecasts"] })
            await qc.invalidateQueries({ queryKey: ["temperature-evaluation"] })
            await qc.invalidateQueries({ queryKey: ["tradeBot"] })
        } finally {
            setLoading(false)
        }
    }, [user, qc])

    return (
        <Box sx={{ p: 1, m: 1 }}>
            <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
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
                    disabled={!user || loading}
                >
                    {loading ? "Loading…" : "Load Data"}
                </Button>
            </Box>

            {isToday && (
                <Typography variant="body2" color="textSecondary" sx={{mb: 2}}>
                    You are viewing data for today (UTC).
                </Typography>
            )}

            {!user ? (
                <Typography color="error">Please log in to view logs.</Typography>
            ) : (
                <>
                    <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
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

                    <WeatherObservationsGraph
                        user={user}
                        date={dateParam}
                        location={selectedLocation}
                        distributions={distributions}
                    />

                    <TemperatureEvaluationTable
                        user={user}
                        date={dateParam}
                        location={selectedLocation}
                        setDistributions={setDistributions}
                    />
                    <TradeBotTable
                        location={selectedLocation}
                        user={user}
                        date={dateParam}
                    />
                </>
            )}
        </Box>
    )
}

export default TemperatureBotPage
