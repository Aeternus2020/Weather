import { alpha, type Breakpoint, type Theme } from '@mui/material/styles'

type StateMinHeight = Partial<Record<Breakpoint, number>>

const OBSERVATIONS_STATE_MIN_HEIGHT: StateMinHeight = {
    xs: 88,
    sm: 92,
}

export function getWeatherObservationsGraphStateStyles(theme: Theme) {
    const statePaper = {
        mb: 2.2,
        p: { xs: 1.4, md: 1.7 },
        minHeight: OBSERVATIONS_STATE_MIN_HEIGHT,
    }

    return {
        shellPaper: {
            mb: 2.2,
            p: { xs: 1.4, md: 2 },
        },
        statePaper,
        centeredStatePaper: {
            ...statePaper,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        stateContent: {
            minHeight: '100%',
            width: '100%',
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.2,
            flexDirection: { xs: 'column', sm: 'row' },
        },
        forecastWarning: {
            mb: 1.1,
            px: { xs: 1.15, md: 1.25 },
            py: 1,
            borderRadius: 2,
            backgroundColor: alpha(
                theme.palette.warning.main,
                theme.palette.mode === 'dark' ? 0.12 : 0.08,
            ),
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
        },
        forecastActionsRow: {
            display: 'flex',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
            mb: { xs: 1, md: 1.2 },
        },
    } as const
}
