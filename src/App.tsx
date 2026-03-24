import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { Box, CssBaseline, useMediaQuery } from '@mui/material'
import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query'
import ForecastAtlasPage from './ForecastAtlasPage'
import AppHeader from './app-shell/AppHeader'
import HowItWorksDialog from './app-shell/HowItWorksDialog'
import { getPageTitle, normalizePublicPath } from './seo'
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
const DEMO_DISMISSED_STORAGE_KEY = 'forecast-atlas:demo-dismissed'

type RouteState = {
    pathname: string
    search: string
}

type NavigateOptions = {
    replace?: boolean
}

function getRouteState(): RouteState {
    return {
        pathname: normalizePublicPath(window.location.pathname),
        search: window.location.search,
    }
}

function AppShell() {
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
    const [routeState, setRouteState] = useState<RouteState>(getRouteState)

    const [mode, setMode] = useState<WeatherThemeMode>(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY)
        return saved === 'dark' ? 'dark' : 'light'
    })
    const [isDemoOpen, setIsDemoOpen] = useState(() => (
        localStorage.getItem(DEMO_DISMISSED_STORAGE_KEY) !== 'true'
    ))

    useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, mode)
    }, [mode])

    useEffect(() => {
        document.title = getPageTitle(routeState.pathname)
    }, [routeState.pathname])

    useEffect(() => {
        const handlePopState = () => {
            setRouteState(getRouteState())
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, [])

    const theme = useMemo(() => createWeatherTheme(mode), [mode])

    const closeDemo = useCallback(() => {
        localStorage.setItem(DEMO_DISMISSED_STORAGE_KEY, 'true')
        setIsDemoOpen(false)
    }, [])

    const openDemo = useCallback(() => {
        setIsDemoOpen(true)
    }, [])

    const navigateToHref = useCallback((href: string, options: NavigateOptions = {}) => {
        const url = new URL(href, window.location.origin)
        const nextPathname = normalizePublicPath(url.pathname)
        const nextSearch = url.search

        if (nextPathname === routeState.pathname && nextSearch === routeState.search) {
            return
        }

        const nextUrl = `${nextPathname}${nextSearch}${url.hash}`

        if (options.replace) {
            window.history.replaceState(null, '', nextUrl)
        } else {
            window.history.pushState(null, '', nextUrl)
        }

        setRouteState({
            pathname: nextPathname,
            search: nextSearch,
        })
    }, [routeState.pathname, routeState.search])

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={appShellSx}>
                <Box sx={backgroundDecorSx}>
                    <Box sx={leftOrbSx} />
                    <Box sx={rightOrbSx} />
                </Box>

                <Box sx={pageContentSx}>
                    <AppHeader
                        isDemoOpen={isDemoOpen}
                        mode={mode}
                        onOpenDemo={openDemo}
                        onToggleTheme={() => setMode(prev => (prev === 'dark' ? 'light' : 'dark'))}
                    />

                    <ForecastAtlasPage
                        pathname={routeState.pathname}
                        search={routeState.search}
                        navigateToHref={navigateToHref}
                    />
                </Box>

                <HowItWorksDialog
                    isOpen={isDemoOpen}
                    onClose={closeDemo}
                    prefersReducedMotion={prefersReducedMotion}
                />
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
