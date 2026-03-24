import React from 'react'
import { alpha, type Theme } from '@mui/material/styles'
import {
    Box,
    Button,
    IconButton,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded'
import { WeatherThemeMode } from '../theme'

type AppHeaderProps = {
    isDemoOpen: boolean
    mode: WeatherThemeMode
    onOpenDemo: () => void
    onToggleTheme: () => void
}

export default function AppHeader({
    isDemoOpen,
    mode,
    onOpenDemo,
    onToggleTheme,
}: AppHeaderProps) {
    return (
        <Paper
            component="header"
            sx={headerCardSx}
        >
            <Box sx={headerTopRowSx}>
                <Box sx={headerCopySx}>
                    <Typography variant="h4" color="primary.main" sx={headerTitleSx}>
                        Forecast Atlas
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={headerSubtitleSx}
                    >
                        Observation streams, forecast runs, and evaluation snapshots by location.
                    </Typography>
                </Box>

                <Box sx={headerActionsSx}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PlayCircleOutlineRoundedIcon />}
                        onClick={onOpenDemo}
                        sx={replayButtonSx}
                    >
                        {isDemoOpen ? 'Watching demo' : 'How it works'}
                    </Button>
                    <Tooltip
                        arrow
                        title={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    >
                        <IconButton
                            size="small"
                            aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                            onClick={onToggleTheme}
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
            </Box>
        </Paper>
    )
}

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

const headerTopRowSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
    gap: 1,
    alignItems: 'start',
    minWidth: 0,
} as const

const headerCopySx = {
    minWidth: 0,
} as const

const headerTitleSx = {
    mb: 0,
    minWidth: 0,
    fontSize: { xs: 'clamp(1.85rem, 9.2vw, 2.45rem)', sm: undefined },
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
} as const

const headerSubtitleSx = {
    mt: 0.45,
    maxWidth: { xs: '34ch', sm: '52ch' },
} as const

const headerActionsSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 0.8,
    justifyContent: { xs: 'space-between', sm: 'flex-end' },
} as const

const replayButtonSx = {
    minWidth: { xs: 'auto', sm: 0 },
    whiteSpace: 'nowrap',
} as const

const themeToggleButtonSx = (theme: Theme) => ({
    width: 34,
    height: 34,
    borderRadius: '10px',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    color: 'primary.main',
})

const themeToggleIconSx = {
    fontSize: 18,
} as const
