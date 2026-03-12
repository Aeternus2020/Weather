import React, { useEffect, useMemo, useState } from 'react'
import { alpha, ThemeProvider, type Theme } from '@mui/material/styles'
import { Box, CssBaseline, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query'
import TemperatureBotPage from './TemperatureBot'
import { createWeatherTheme, WeatherThemeMode } from './theme'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime:      Infinity,
            gcTime:         Infinity,
            refetchOnWindowFocus: false,
            refetchOnMount:       false,
            refetchOnReconnect:   false,
        },
    },
})

const THEME_STORAGE_KEY = 'weather-dashboard:theme-mode'

function AppShell() {
    const [mode, setMode] = useState<WeatherThemeMode>(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY)
        return saved === 'dark' ? 'dark' : 'light'
    })

    useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, mode)
    }, [mode])

    const theme = useMemo(() => createWeatherTheme(mode), [mode])

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={appShellSx}>
                <Box sx={backgroundDecorSx}>
                    <Box sx={leftOrbSx} />
                    <Box sx={rightOrbSx} />
                </Box>
                <Box sx={pageContentSx}>
                    <Paper
                        component="header"
                        sx={headerCardSx}
                    >
                        <Box sx={headerGridSx}>
                            <Typography
                                variant="h4"
                                color="primary.main"
                                sx={headerTitleSx}
                            >
                                Weather Intelligence
                            </Typography>
                            <Tooltip
                                arrow
                                title={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                            >
                                <IconButton
                                    size="small"
                                    aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                                    onClick={() => setMode(prev => (prev === 'dark' ? 'light' : 'dark'))}
                                    sx={themeToggleButtonSx}
                                >
                                    {mode === 'dark' ? (
                                        <DarkModeRoundedIcon sx={themeToggleIconSx} />
                                    ) : (
                                        <LightModeRoundedIcon sx={themeToggleIconSx} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={headerSubtitleSx}
                        >
                            Observation streams and forecast confidence by location.
                        </Typography>
                    </Paper>
                    <TemperatureBotPage />
                </Box>
            </Box>
        </ThemeProvider>
    )
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AppShell />
        </QueryClientProvider>
    )
}

const appShellSx = {
    minHeight: '100vh',
    '@supports (height: 100svh)': {
        minHeight: '100svh',
    },
    py: { xs: 1.3, md: 4 },
    position: 'relative',
} as const

const backgroundDecorSx = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
} as const

const leftOrbSx = {
    width: 280,
    height: 280,
    borderRadius: '50%',
    position: 'absolute',
    top: 10,
    left: -50,
    background: 'radial-gradient(circle at center, rgba(91,182,224,0.3) 0%, rgba(91,182,224,0) 72%)',
} as const

const rightOrbSx = {
    width: 360,
    height: 360,
    borderRadius: '50%',
    position: 'absolute',
    top: -70,
    right: -80,
    background: 'radial-gradient(circle at center, rgba(10,155,165,0.2) 0%, rgba(10,155,165,0) 68%)',
} as const

const pageContentSx = {
    mx: 'auto',
    maxWidth: 1360,
    px: { xs: 1, sm: 2.5 },
    position: 'relative',
} as const

const headerCardSx = (theme: Theme) => ({
    mb: 2.1,
    p: { xs: 1.25, md: 1.55 },
    backgroundImage: 'none',
    backgroundColor: theme.palette.mode === 'dark'
        ? alpha('#10253B', 0.9)
        : alpha('#F5FAFF', 0.92),
    borderColor: alpha(theme.palette.primary.main, 0.34),
    boxShadow: theme.palette.mode === 'dark'
        ? '0 8px 18px rgba(3, 9, 16, 0.28)'
        : '0 6px 16px rgba(24, 69, 118, 0.1)',
})

const headerGridSx = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'start',
    columnGap: 0.8,
    minWidth: 0,
} as const

const headerTitleSx = {
    mb: 0,
    minWidth: 0,
    fontSize: { xs: 'clamp(1.85rem, 9.2vw, 2.45rem)', sm: undefined },
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
} as const

const themeToggleButtonSx = (theme: Theme) => ({
    width: 34,
    height: 34,
    borderRadius: 1.8,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    color: 'primary.main',
})

const themeToggleIconSx = {
    fontSize: 18,
} as const

const headerSubtitleSx = {
    mt: 0.45,
    maxWidth: { xs: '34ch', sm: 'unset' },
} as const
