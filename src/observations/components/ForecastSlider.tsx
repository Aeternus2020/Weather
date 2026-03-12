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
import { scrollbarSx } from '../../ui/tabNavigation'
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
        <Box sx={forecastSliderRootSx}>
            <Button
                variant="outlined"
                onClick={handleToggle}
                disabled={!hasForecasts}
                sx={forecastToggleButtonSx}
            >
                Forecasts
            </Button>
            <Button
                variant="outlined"
                onClick={() => toggleLatestForecasts(!allChecked)}
                disabled={!hasForecasts}
                sx={latestForecastButtonSx}
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
                    sx={forecastPanelSx}
                >
                    {Object.entries(forecastBySource).map(([src, entries]) => {
                        const ids = entries.map(makeForecastId)
                        const allChecked = ids.every(id => visibleIds.includes(id))

                        return (
                            <Box key={src} sx={sourceForecastGroupSx}>
                                <FormControlLabel
                                    sx={sourceToggleLabelSx}
                                    control={
                                        <Checkbox
                                            disableRipple
                                            checked={allChecked}
                                            onChange={e => toggleAllForSource(src, e.target.checked)}
                                        />
                                    }
                                    label={<Typography sx={sourceNameTextSx}>{src}</Typography>}
                                />
                                <Box sx={forecastTimesListSx}>
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
                                                            icon={<CheckIcon sx={hiddenCheckIconSx} />}
                                                            checkedIcon={<CheckIcon sx={forecastCheckIconSx(colorMap[id])} />}
                                                            checked={checked}
                                                            onChange={() => toggleForecast(id)}
                                                            sx={forecastCheckboxSx}
                                                        />
                                                    }
                                                    label={<Typography sx={forecastTimeLabelSx(colorMap[id])}>{timeLabel}</Typography>}
                                                    sx={forecastTimeRowSx}
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

const forecastSliderRootSx = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
} as const

const forecastToggleButtonSx = {
    m: 0.5,
    minWidth: 30,
    width: 35,
    writingMode: 'vertical-rl',
    textOrientation: 'upright',
    letterSpacing: '0.1em',
    height: "30%",
} as const

const latestForecastButtonSx = {
    m: 0.5,
    minWidth: 30,
    width: 35,
    writingMode: 'vertical-rl',
    textOrientation: 'upright',
    height: "60%",
} as const

const forecastPanelSx = {
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
} as const

const sourceForecastGroupSx = {
    mb: 1,
    width: '130px',
} as const

const sourceToggleLabelSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
} as const

const sourceNameTextSx = {
    fontWeight: 400,
    fontSize: '0.8rem',
} as const

const forecastTimesListSx = {
    ml: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    maxHeight: 200,
    ...scrollbarSx,
} as const

const hiddenCheckIconSx = {
    visibility: 'hidden',
} as const

const forecastCheckIconSx = (color: string) => ({
    color,
})

const forecastCheckboxSx = {
    p: 0,
    '& .MuiSvgIcon-root': { fontSize: 16 },
} as const

const forecastTimeLabelSx = (color: string) => ({
    color,
    fontSize: '0.9rem',
})

const forecastTimeRowSx = {
    ml: 0,
} as const
