import React, { FC, useState} from 'react'
import {
    Box,
    Button,
    Slide,
    Paper,
    FormControlLabel,
    Checkbox,
    Typography,
    ClickAwayListener,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import dayjs from 'dayjs'
import { WeatherForecast } from '../typesWeatherObservations'
import { scrollbarSx } from '../../market/TradeBotTable'
import {makeForecastKey} from "../WeatherObservationsGraph";

interface ForecastDriverProps {
    forecastBySource: Record<string, WeatherForecast[]>
    visibleIds: string[]
    latestIds: string[]
    toggleForecast: (id: string) => void
    toggleAllForSource: (source: string, checked: boolean) => void
    toggleLatestForecasts: (checked: boolean) => void
    colorMap: Record<string, string>
    makeForecastId: (fx: WeatherForecast) => string
}

export const ForecastSlider: FC<ForecastDriverProps> = ({
    forecastBySource,
    visibleIds,
    latestIds,
    toggleForecast,
    toggleAllForSource,
    toggleLatestForecasts,
    colorMap,
    makeForecastId,
}) => {
    const [open, setOpen] = useState(false)
    const handleToggle = () => setOpen(prev => !prev)

    const allIds = latestIds
    const hasForecasts = allIds.length > 0
    const allChecked = allIds.every(id => visibleIds.includes(id))

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Button
                variant="outlined"
                onClick={handleToggle}
                disabled={!hasForecasts}
                sx={{
                    m: 0.5,
                    minWidth: 30,
                    width: 35,
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    letterSpacing: '0.1em',
                    height: "30%",
                }}
            >
                Forecasts
            </Button>
            <Button
                variant="outlined"
                onClick={() => toggleLatestForecasts(!allChecked)}
                disabled={!hasForecasts}
                sx={{
                    m: 0.5,
                    minWidth: 30,
                    width: 35,
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    height: "60%",
                }}
            >
                {allChecked ? 'Hide latest forecasts' : 'Show latest forecasts'}
            </Button>
            <Slide
                timeout={{ enter: 400, exit: 300 }}
                easing={{
                  enter: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  exit:  'cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                direction="left"
                in={open}
                mountOnEnter
                unmountOnExit>
                <Paper
                    elevation={4}
                    sx={{
                        zIndex: 10,
                        position: 'absolute',
                        right: 50,
                        gap: 1,
                        display: 'flex',
                        flexWrap: 'wrap',
                        width: '27vw',
                        borderRadius: '15px',
                        p: 2,
                        boxSizing: 'border-box',
                        ...scrollbarSx,
                    }}
                >
                    {Object.entries(forecastBySource).map(([src, entries]) => {
                        const ids = entries.map(makeForecastId)
                        const allChecked = ids.every(id => visibleIds.includes(id))

                        return (
                            <Box key={src} sx={{ mb: 1, width: '130px' }}>
                                <FormControlLabel
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        width: '100%',
                                    }}
                                    control={
                                        <Checkbox
                                            disableRipple
                                            checked={allChecked}
                                            onChange={e => toggleAllForSource(src, e.target.checked)}
                                        />
                                    }
                                    label={<Typography sx={{ fontWeight: 400, fontSize: '0.8rem' }}>{src}</Typography>}
                                />
                                <Box
                                    sx={{
                                        ml: 3,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                        maxHeight: 200,
                                        ...scrollbarSx,
                                    }}
                                >
                                    {entries
                                        .slice()
                                        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
                                        .map(entry => {
                                            const id = makeForecastKey(entry)
                                            const checked = visibleIds.includes(id)
                                            const timeLabel = dayjs.unix(entry.timestamp.seconds).utc().format('HH:mm')

                                            return (
                                                <FormControlLabel
                                                    key={id}
                                                    control={
                                                        <Checkbox
                                                            disableRipple
                                                            icon={<CheckIcon sx={{ visibility: 'hidden' }} />}
                                                            checkedIcon={<CheckIcon sx={{ color: colorMap[id] }} />}
                                                            checked={checked}
                                                            onChange={() => toggleForecast(id)}
                                                            sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 16 } }}
                                                        />
                                                    }
                                                    label={<Typography sx={{ color: colorMap[id], fontSize: '0.9rem' }}>{timeLabel}</Typography>}
                                                    sx={{ ml: 0 }}
                                                />
                                            )
                                        })}
                                </Box>
                            </Box>
                        )
                    })}
                </Paper>
            </Slide>
        </Box>
        </ClickAwayListener>
    )
}