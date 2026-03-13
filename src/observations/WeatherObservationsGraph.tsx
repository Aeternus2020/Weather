import React, { useState } from "react"
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Typography,
} from "@mui/material"
import { useTheme } from "@mui/material/styles"

import ObservationControls from "./controls/WeatherObservationsControl"
import { ForecastSlider } from "./controls/ForecastSlider"
import WeatherObservationsChart from "./chart/WeatherObservationsChart"
import { getWeatherObservationsGraphStateStyles } from "./WeatherObservationsGraphState.styles"
import { getQueryErrorInfo } from "./queryError"
import { useWeatherForecastsQuery } from "./useWeatherForecastsQuery"
import { useWeatherObservationsGraphModel, makeForecastKey } from "./useWeatherObservationsGraphModel"
import { useWeatherObservationsQuery } from "./useWeatherObservationsQuery"

interface Props {
    date: string
    location: string
    distributions: Array<Record<string, number>>
}

const WeatherObservationsGraph: React.FC<Props> = ({ date, location, distributions }) => {
    const muiTheme = useTheme()
    const [unit, setUnit] = useState<'C' | 'F'>('C')
    const styles = getWeatherObservationsGraphStateStyles(muiTheme)

    const {
        data: entries = [],
        isLoading,
        isError: isObservationsError,
        error: observationsError,
        refetch: refetchObservations,
    } = useWeatherObservationsQuery(date, location)

    const {
        data: forecastEntries = [],
        isError: isForecastError,
        error: forecastError,
        refetch: refetchForecasts,
    } = useWeatherForecastsQuery(date, location)

    const {
        chartData,
        colorMap,
        forecastBySource,
        getColor,
        latestForecastIds,
        latestForecastUpdatedUtc,
        latestObservationsUpdatedUtc,
        onlyNoaa,
        selectedSources,
        sourceColorMap,
        sources,
        toggleAllForecasts,
        toggleAllForSource,
        toggleAllObservations,
        toggleLatestForecasts,
        toggleLine,
        toggleSource,
        visibleLines,
    } = useWeatherObservationsGraphModel({
        date,
        entries,
        forecastEntries,
        location,
        themeMode: muiTheme.palette.mode,
        unit,
    })

    const observationsErrorInfo = getQueryErrorInfo(observationsError)
    const forecastErrorInfo = getQueryErrorInfo(forecastError)

    if (isLoading) {
        return (
            <Paper sx={styles.centeredStatePaper}>
                <CircularProgress />
            </Paper>
        )
    }

    if (isObservationsError) {
        return (
            <Paper sx={styles.statePaper}>
                <Box sx={styles.stateContent}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body1" color="error.main" fontWeight={700} sx={{ mb: 0.25 }}>
                            Weather observations are temporarily unavailable.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {observationsErrorInfo.details ?? observationsErrorInfo.summary}
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => void refetchObservations()}
                        sx={{ flexShrink: 0 }}
                    >
                        Try again
                    </Button>
                </Box>
            </Paper>
        )
    }

    if (!entries.length) {
        return (
            <Paper sx={styles.centeredStatePaper}>
                <Typography sx={{ textAlign: 'center' }}>
                    <strong>Weather Observations: </strong>No data for
                    <strong> {location}</strong> on
                    <strong> {date}</strong>.
                </Typography>
            </Paper>
        )
    }

    return (
        <Paper data-forecast-boundary sx={styles.shellPaper}>
            <Box sx={{ mb: 1.1 }}>
                <Typography variant="h5" sx={{ mb: 0.2 }}>
                    Weather Observations
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Last updated (UTC): observations {latestObservationsUpdatedUtc} • forecasts {latestForecastUpdatedUtc}
                </Typography>
            </Box>
            {isForecastError && (
                <Box sx={styles.forecastWarning}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ mb: 0.15, color: muiTheme.palette.warning.main }}
                        >
                            Some forecast data is temporarily unavailable.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            The chart may be incomplete right now. {forecastErrorInfo.details ?? forecastErrorInfo.summary}
                        </Typography>
                    </Box>
                    <Button
                        color="inherit"
                        size="small"
                        onClick={() => void refetchForecasts()}
                        sx={{ flexShrink: 0 }}
                    >
                        Try again
                    </Button>
                </Box>
            )}
            <ObservationControls
                sortedSources={sources}
                selectedSources={selectedSources}
                sourceColorMap={sourceColorMap}
                onlyNoaa={onlyNoaa}
                toggleAll={toggleAllObservations}
                toggleSource={toggleSource}
                unit={unit}
                onUnitChange={(nextUnit) => setUnit(nextUnit)}
            />
            <Box sx={styles.forecastActionsRow}>
                <ForecastSlider
                    forecastBySource={forecastBySource}
                    visibleIds={visibleLines}
                    latestIds={latestForecastIds}
                    toggleForecast={toggleLine}
                    toggleLatestForecasts={toggleLatestForecasts}
                    toggleAllForecasts={toggleAllForecasts}
                    toggleAllForSource={toggleAllForSource}
                    colorMap={colorMap}
                    makeForecastId={makeForecastKey}
                />
            </Box>
            <Box sx={{ position: 'relative' }}>
                <WeatherObservationsChart
                    chartData={chartData}
                    date={date}
                    distributions={distributions}
                    getColor={getColor}
                    location={location}
                    unit={unit}
                />
            </Box>
        </Paper>
    )
}

export default WeatherObservationsGraph
