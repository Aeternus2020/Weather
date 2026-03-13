import React, { FC, useEffect, useRef, useState } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import TuneIcon from '@mui/icons-material/Tune'
import {
    Box,
    Button,
    Checkbox,
    ClickAwayListener,
    Fade,
    FormControlLabel,
    Paper,
    Popper,
    Typography,
} from '@mui/material'
import dayjs from 'dayjs'

import { scrollbarSx } from '../../ui/scrollbarSx'
import type { WeatherForecast } from '../typesWeatherObservations'

const FORECAST_PANEL_DEFAULT_MAX_HEIGHT = 420
const FORECAST_PANEL_MIN_HEIGHT = 120

interface ForecastDriverProps {
    forecastBySource: Record<string, WeatherForecast[]>
    visibleIds: string[]
    latestIds: string[]
    toggleForecast: (id: string) => void
    toggleAllForSource: (source: string, checked: boolean) => void
    toggleLatestForecasts: (checked: boolean) => void
    toggleAllForecasts: (checked: boolean) => void
    colorMap: Record<string, string>
    makeForecastId: (fx: WeatherForecast) => string
}

interface ForecastPanelBounds {
    boundaryEl: HTMLElement | null
    maxHeight: number
}

function getForecastPanelBounds(
    anchor: HTMLDivElement | null,
): ForecastPanelBounds | null {
    if (!anchor) {
        return null
    }

    const boundaryEl = anchor.closest('[data-forecast-boundary]') as HTMLElement | null

    if (!boundaryEl) {
        return {
            boundaryEl: null,
            maxHeight: Math.max(
                FORECAST_PANEL_MIN_HEIGHT,
                Math.floor(window.innerHeight * 0.58),
            ),
        }
    }

    const anchorRect = anchor.getBoundingClientRect()
    const boundaryRect = boundaryEl.getBoundingClientRect()
    const spaceBelow = Math.floor(boundaryRect.bottom - anchorRect.bottom - 12)
    const spaceAbove = Math.floor(anchorRect.top - boundaryRect.top - 12)
    const availableHeight = Math.max(spaceBelow, spaceAbove)
    const maxWithinBoundary = Math.max(
        FORECAST_PANEL_MIN_HEIGHT,
        Math.floor(boundaryRect.height - 24),
    )

    return {
        boundaryEl,
        maxHeight: Math.min(
            Math.max(FORECAST_PANEL_MIN_HEIGHT, availableHeight),
            maxWithinBoundary,
        ),
    }
}

export const ForecastSlider: FC<ForecastDriverProps> = ({
    forecastBySource,
    visibleIds,
    latestIds,
    toggleForecast,
    toggleAllForSource,
    toggleLatestForecasts,
    toggleAllForecasts,
    colorMap,
    makeForecastId,
}) => {
    const [open, setOpen] = useState(false)
    const [panelMaxHeight, setPanelMaxHeight] = useState(FORECAST_PANEL_DEFAULT_MAX_HEIGHT)
    const [boundaryEl, setBoundaryEl] = useState<HTMLElement | null>(null)
    const anchorRef = useRef<HTMLDivElement | null>(null)
    const styles = getForecastSliderStyles(panelMaxHeight)

    const allForecastIds = Object.values(forecastBySource).flatMap((entries) =>
        entries.map(makeForecastId),
    )
    const hasForecasts = allForecastIds.length > 0
    const latestChecked = latestIds.length > 0 && latestIds.every((id) => visibleIds.includes(id))
    const allForecastsChecked = allForecastIds.length > 0 && allForecastIds.every((id) => visibleIds.includes(id))
    const latestButtonLabel = latestChecked ? 'Hide latest forecasts' : 'Show latest forecasts'
    const allButtonLabel = allForecastsChecked ? 'Hide all forecasts' : 'Show all forecasts'

    useEffect(() => {
        if (!hasForecasts) {
            setOpen(false)
        }
    }, [hasForecasts])

    useEffect(() => {
        if (!open) return

        const syncPanelBounds = () => {
            const bounds = getForecastPanelBounds(anchorRef.current)
            if (!bounds) return

            setBoundaryEl(bounds.boundaryEl)
            setPanelMaxHeight(bounds.maxHeight)
        }

        syncPanelBounds()
        window.addEventListener('resize', syncPanelBounds)

        return () => {
            window.removeEventListener('resize', syncPanelBounds)
        }
    }, [open])

    return (
        <ClickAwayListener
            onClickAway={(event) => {
                if (anchorRef.current?.contains(event.target as Node)) return
                setOpen(false)
            }}
        >
            <Box ref={anchorRef} sx={styles.sliderRoot}>
                <Box sx={styles.controlsRow}>
                    <Button
                        aria-label="Open forecast sources"
                        variant="outlined"
                        size="small"
                        onClick={() => setOpen((prev) => !prev)}
                        disabled={!hasForecasts}
                        startIcon={<TuneIcon />}
                        sx={styles.sourcesButton}
                    >
                        Forecast sources
                    </Button>
                    <Box sx={styles.actionButtonsWrap}>
                        <Button
                            aria-label={latestButtonLabel}
                            variant={latestChecked ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => toggleLatestForecasts(!latestChecked)}
                            disabled={!hasForecasts}
                            sx={styles.bulkButton}
                        >
                            {latestButtonLabel}
                        </Button>
                        <Button
                            aria-label={allButtonLabel}
                            variant={allForecastsChecked ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => toggleAllForecasts(!allForecastsChecked)}
                            disabled={!hasForecasts}
                            sx={styles.bulkButton}
                        >
                            {allButtonLabel}
                        </Button>
                    </Box>
                </Box>
                <Popper
                    open={open && hasForecasts}
                    anchorEl={anchorRef.current}
                    placement="bottom-end"
                    transition
                    disablePortal
                    modifiers={[
                        { name: 'offset', options: { offset: [0, 8] } },
                        {
                            name: 'preventOverflow',
                            options: {
                                padding: 8,
                                boundary: boundaryEl ?? 'clippingParents',
                                altBoundary: true,
                            },
                        },
                        {
                            name: 'flip',
                            enabled: true,
                            options: {
                                fallbackPlacements: ['top-end', 'bottom-start', 'top-start'],
                                boundary: boundaryEl ?? 'clippingParents',
                                altBoundary: true,
                            },
                        },
                    ]}
                    sx={{ zIndex: 12 }}
                >
                    {({ TransitionProps }) => (
                        <Fade {...TransitionProps} timeout={180}>
                            <Paper elevation={4} sx={styles.panel}>
                                {Object.entries(forecastBySource).map(([src, entries]) => {
                                    const ids = entries.map(makeForecastId)
                                    const selectedCount = ids.filter((id) => visibleIds.includes(id)).length
                                    const allChecked = ids.length > 0 && selectedCount === ids.length
                                    const partiallyChecked = selectedCount > 0 && !allChecked

                                    return (
                                        <Box key={src} sx={styles.sourceGroup}>
                                            <FormControlLabel
                                                sx={styles.sourceRow}
                                                control={
                                                    <Checkbox
                                                        disableRipple
                                                        checked={allChecked}
                                                        indeterminate={partiallyChecked}
                                                        onChange={(event) =>
                                                            toggleAllForSource(src, event.target.checked)
                                                        }
                                                        size="small"
                                                    />
                                                }
                                                label={
                                                    <Box sx={styles.sourceMeta}>
                                                        <Typography sx={styles.sourceName}>{src}</Typography>
                                                    </Box>
                                                }
                                            />
                                            <Box sx={styles.forecastRuns}>
                                                {entries
                                                    .slice()
                                                    .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
                                                    .map((entry) => {
                                                        const id = makeForecastId(entry)
                                                        const checked = visibleIds.includes(id)
                                                        const timeLabel = dayjs
                                                            .unix(entry.timestamp.seconds)
                                                            .utc()
                                                            .format('HH:mm')

                                                        return (
                                                            <FormControlLabel
                                                                key={id}
                                                                control={
                                                                    <Checkbox
                                                                        disableRipple
                                                                        icon={<CheckIcon sx={{ visibility: 'hidden' }} />}
                                                                        checkedIcon={
                                                                            <CheckIcon sx={{ color: colorMap[id] }} />
                                                                        }
                                                                        checked={checked}
                                                                        onChange={() => toggleForecast(id)}
                                                                        sx={styles.forecastCheckbox}
                                                                    />
                                                                }
                                                                label={
                                                                    <Typography
                                                                        sx={{ color: colorMap[id], fontSize: '0.9rem' }}
                                                                    >
                                                                        {timeLabel}
                                                                    </Typography>
                                                                }
                                                                sx={{ ml: 0 }}
                                                            />
                                                        )
                                                    })}
                                            </Box>
                                        </Box>
                                    )
                                })}
                            </Paper>
                        </Fade>
                    )}
                </Popper>
            </Box>
        </ClickAwayListener>
    )
}

function getForecastSliderStyles(panelMaxHeight: number) {
    return {
        sliderRoot: {
            position: 'relative',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: { xs: 'center', sm: 'flex-end' },
            width: { xs: '100%', sm: 'auto' },
        },
        controlsRow: {
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0.65 },
            alignItems: { xs: 'center', sm: 'center' },
            justifyContent: { xs: 'center', sm: 'flex-end' },
            width: '100%',
        },
        sourcesButton: {
            whiteSpace: 'nowrap',
            justifyContent: 'center',
            minHeight: { xs: 38, sm: 30 },
            px: { xs: 0.95, sm: 1.35 },
            fontWeight: { xs: 600, sm: 500 },
            fontSize: { xs: '0.74rem', sm: '0.8125rem' },
            '& .MuiButton-startIcon': {
                mr: { xs: 0.65, sm: 1 },
            },
            '& .MuiButton-startIcon .MuiSvgIcon-root': {
                fontSize: { xs: 14, sm: 16 },
            },
        },
        actionButtonsWrap: {
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(0, 1fr)' },
            gap: { xs: 1, sm: 0.65 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: 360, sm: 'none' },
        },
        bulkButton: {
            whiteSpace: 'nowrap',
            justifyContent: 'center',
            width: { xs: '100%', sm: 'auto' },
            minWidth: 0,
            minHeight: { xs: 36, sm: 30 },
            px: { xs: 0.95, sm: 1.35 },
            fontSize: { xs: '0.74rem', sm: '0.8125rem' },
            fontWeight: { xs: 600, sm: 500 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        panel: {
            gap: 1,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            width: { xs: 'fit-content', sm: 380, md: 420 },
            minWidth: { xs: 228, sm: 380, md: 420 },
            maxWidth: { xs: 'min(calc(100vw - 28px), 260px)', sm: 380, md: 420 },
            maxHeight: panelMaxHeight,
            borderRadius: '14px',
            p: { xs: 1.2, sm: 1.6 },
            boxSizing: 'border-box',
            borderColor: 'divider',
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            ...scrollbarSx,
        },
        sourceGroup: {
            mb: 0.6,
            flex: { xs: '0 0 auto', sm: '1 1 150px' },
            width: { xs: '100%', sm: 'auto' },
            minWidth: 0,
        },
        sourceRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            mr: 0,
        },
        sourceMeta: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 0.3,
            minWidth: 0,
            maxWidth: '100%',
        },
        sourceName: {
            fontWeight: 500,
            fontSize: '0.82rem',
            lineHeight: 1.2,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        forecastRuns: {
            ml: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.8,
            maxHeight: 172,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'auto',
            WebkitOverflowScrolling: 'touch',
            ...scrollbarSx,
        },
        forecastCheckbox: {
            p: 0,
            '& .MuiSvgIcon-root': { fontSize: 16 },
        },
    } as const
}

export default ForecastSlider
