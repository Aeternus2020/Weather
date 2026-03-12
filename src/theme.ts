import { PaletteMode } from '@mui/material'
import { alpha, createTheme } from '@mui/material/styles'

export type WeatherThemeMode = PaletteMode

export function createWeatherTheme(mode: WeatherThemeMode) {
    const isDark = mode === 'dark'

    return createTheme({
        palette: {
            mode,
            primary: {
                main: isDark ? '#76B6FF' : '#2A7DE1',
                light: isDark ? '#9DCBFF' : '#6AA4EB',
                dark: isDark ? '#3A8CE8' : '#1657A3',
            },
            secondary: {
                main: isDark ? '#4CC6CB' : '#0A9BA5',
                light: isDark ? '#77D8DC' : '#57C7CF',
                dark: isDark ? '#20939A' : '#0A6670',
            },
            background: {
                default: isDark ? '#081423' : '#E3ECF8',
                paper: isDark ? '#132A44' : '#FFFFFF',
            },
            text: {
                primary: isDark ? '#E9F3FF' : '#10213E',
                secondary: isDark ? '#AFC2DE' : '#3F577B',
            },
            divider: isDark ? '#335273' : '#C2D2E8',
            success: {
                main: isDark ? '#42C38A' : '#1C8F63',
            },
            warning: {
                main: isDark ? '#F0B45D' : '#D68B27',
            },
            error: {
                main: isDark ? '#F07C7C' : '#C14545',
            },
        },
        shape: {
            borderRadius: 14,
        },
        typography: {
            fontFamily: '"Manrope", "IBM Plex Sans", sans-serif',
            h1: {
                fontFamily: '"Sora", "Manrope", sans-serif',
                fontWeight: 700,
                letterSpacing: '-0.02em',
            },
            h2: {
                fontFamily: '"Sora", "Manrope", sans-serif',
                fontWeight: 700,
                letterSpacing: '-0.02em',
            },
            h3: {
                fontFamily: '"Sora", "Manrope", sans-serif',
                fontWeight: 650,
                letterSpacing: '-0.01em',
            },
            h4: {
                fontFamily: '"Sora", "Manrope", sans-serif',
                fontWeight: 650,
                letterSpacing: '-0.01em',
            },
            h5: {
                fontWeight: 640,
            },
            subtitle1: {
                fontWeight: 600,
            },
            body1: {
                lineHeight: 1.58,
            },
            button: {
                textTransform: 'none',
                fontWeight: 650,
                letterSpacing: '0.01em',
            },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        margin: 0,
                        minHeight: '100vh',
                        '@supports (height: 100svh)': {
                            minHeight: '100svh',
                        },
                        background: isDark
                            ? 'radial-gradient(95% 75% at 90% -12%, rgba(76, 148, 218, 0.22) 0%, rgba(76, 148, 218, 0) 100%), radial-gradient(90% 70% at -8% 20%, rgba(27, 140, 160, 0.2) 0%, rgba(27, 140, 160, 0) 100%), linear-gradient(180deg, #09192d 0%, #081423 52%, #071120 100%)'
                            : 'radial-gradient(95% 75% at 90% -12%, rgba(99, 175, 230, 0.34) 0%, rgba(99, 175, 230, 0) 100%), radial-gradient(90% 70% at -8% 20%, rgba(10, 155, 165, 0.14) 0%, rgba(10, 155, 165, 0) 100%), linear-gradient(180deg, #edf3fb 0%, #e5edf8 46%, #dde8f6 100%)',
                        color: isDark ? '#E9F3FF' : '#10213E',
                    },
                    '#root': {
                        minHeight: '100vh',
                        '@supports (height: 100svh)': {
                            minHeight: '100svh',
                        },
                    },
                    '*::selection': {
                        backgroundColor: isDark ? alpha('#76B6FF', 0.42) : '#9CC9F3',
                        color: isDark ? '#E9F3FF' : '#10213E',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        borderRadius: 16,
                        border: `1px solid ${isDark ? '#355578' : '#C7D7EC'}`,
                        boxShadow: isDark
                            ? '0 12px 34px rgba(2, 6, 12, 0.52)'
                            : '0 10px 30px rgba(20, 56, 96, 0.12)',
                        backgroundImage: isDark
                            ? 'linear-gradient(180deg, rgba(21,40,63,0.94) 0%, rgba(19,36,58,0.98) 100%)'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,255,0.99) 100%)',
                        backdropFilter: 'blur(8px)',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                        paddingInline: 14,
                    },
                    sizeSmall: {
                        minHeight: 34,
                        paddingInline: 12,
                        fontSize: '0.82rem',
                        lineHeight: 1.2,
                        '@media (max-width:600px)': {
                            minHeight: 32,
                            paddingInline: 10,
                            fontSize: '0.79rem',
                        },
                    },
                    containedPrimary: {
                        boxShadow: isDark
                            ? '0 8px 20px rgba(64, 147, 238, 0.34)'
                            : '0 8px 20px rgba(42, 125, 225, 0.24)',
                        ':hover': {
                            boxShadow: isDark
                                ? '0 10px 24px rgba(64, 147, 238, 0.42)'
                                : '0 10px 24px rgba(42, 125, 225, 0.3)',
                        },
                    },
                    outlined: {
                        borderColor: isDark ? '#44648D' : '#B8CAE2',
                    },
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        fontWeight: 700,
                    },
                },
            },
            MuiAccordion: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        border: `1px solid ${alpha(isDark ? '#77A8DD' : '#7A94BA', isDark ? 0.22 : 0.25)}`,
                        boxShadow: 'none',
                        ':before': {
                            display: 'none',
                        },
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        borderBottom: `1px solid ${alpha(isDark ? '#6F90B8' : '#9BB2D4', isDark ? 0.24 : 0.35)}`,
                    },
                    head: {
                        fontWeight: 700,
                        color: isDark ? '#D6E8FF' : '#1A3357',
                        backgroundColor: isDark ? alpha('#2A4568', 0.62) : alpha('#DAE8FA', 0.5),
                    },
                    body: {
                        color: isDark ? '#D6E3F8' : '#203A60',
                    },
                },
            },
            MuiTabs: {
                styleOverrides: {
                    indicator: {
                        borderRadius: 999,
                        backgroundColor: isDark ? '#76B6FF' : '#2A7DE1',
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        minHeight: 42,
                        color: isDark ? '#9CB4D4' : '#4D6285',
                        '&.Mui-selected': {
                            color: isDark ? '#CFE4FF' : '#1B4E93',
                        },
                    },
                },
            },
        },
    })
}
