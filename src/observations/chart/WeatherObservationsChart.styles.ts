import { alpha, type Theme } from '@mui/material/styles'

interface LockedTooltipAnchor {
    anchor: { x: number; y: number }
}

interface WeatherObservationsChartStylesOptions {
    isTouchDevice: boolean
    theme: Theme
    zoomModeEnabled: boolean
}

export function getWeatherObservationsChartStyles({
    isTouchDevice,
    theme,
    zoomModeEnabled,
}: WeatherObservationsChartStylesOptions) {
    const tooltipBorderColor = alpha(theme.palette.divider, 0.9)
    const tooltipShadow = theme.palette.mode === 'dark'
        ? '0 10px 18px rgba(0, 0, 0, 0.45)'
        : '0 8px 16px rgba(16, 33, 62, 0.14)'

    return {
        chartFrame: {
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            backgroundColor: theme.palette.mode === 'dark'
                ? alpha('#0D1C2D', 0.78)
                : alpha('#FFFFFF', 0.9),
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'visible',
            p: { xs: 0.75, md: 1.1 },
        },
        chartToolbar: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.55,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            position: 'relative',
            px: { xs: 1.1, md: 1.25 },
            pt: { xs: 0.5, md: 0.35 },
            pb: { xs: 0.35, md: 0.25 },
            mb: { xs: 0.2, md: 0.12 },
        },
        zoomButtonGroup: {
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(0, 1fr)' },
            alignItems: 'center',
            gap: 0.7,
            flexWrap: 'nowrap',
            width: { xs: '100%', sm: 'auto' },
        },
        zoomModeButton: {
            minHeight: 34,
            minWidth: { xs: 0, sm: 136 },
            width: { xs: '100%', sm: 136 },
            whiteSpace: 'nowrap',
            justifyContent: 'center',
            fontWeight: 700,
            flexShrink: 0,
        },
        zoomResetButton: {
            minHeight: 34,
            minWidth: { xs: 0, sm: 124 },
            width: { xs: '100%', sm: 'auto' },
            whiteSpace: 'nowrap',
            justifyContent: 'center',
            flexShrink: 0,
        },
        zoomHelpRow: {
            px: { xs: 1.1, md: 1.25 },
            pb: { xs: 0.15, md: 0.1 },
            minHeight: { xs: 34, md: 22 },
            display: 'flex',
            alignItems: 'flex-start',
        },
        chartArea: {
            position: 'relative',
            mt: { xs: 0.15, md: 0.1 },
            height: {
                xs: 'clamp(250px, 66vw, 320px)',
                sm: 'clamp(300px, 58vw, 430px)',
                md: 'clamp(380px, 50vw, 540px)',
            },
            minHeight: { xs: 250, sm: 300, md: 380 },
            overflow: isTouchDevice ? 'hidden' : 'visible',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: zoomModeEnabled ? 'none' : 'pan-y',
        },
        hoverTooltip: {
            padding: '8px 10px',
            backgroundColor: alpha(theme.palette.background.paper, 0.96),
            color: theme.palette.text.primary,
            border: `1px solid ${tooltipBorderColor}`,
            boxShadow: tooltipShadow,
            borderRadius: '8px',
            minWidth: '170px',
        },
        lockedTooltipCloseButton: {
            position: 'absolute',
            top: 4,
            right: 4,
            p: 0.35,
        },
        getLockedTooltip(tooltip: LockedTooltipAnchor) {
            return {
                position: 'absolute',
                left: `clamp(8px, ${Math.round(tooltip.anchor.x + 8)}px, calc(100% - 236px))`,
                top: `clamp(8px, ${Math.round(tooltip.anchor.y - 116)}px, calc(100% - 150px))`,
                zIndex: 5,
                width: 228,
                maxWidth: 'calc(100% - 16px)',
                padding: '8px 10px 8px',
                backgroundColor: alpha(theme.palette.background.paper, 0.985),
                color: theme.palette.text.primary,
                border: `1px solid ${tooltipBorderColor}`,
                boxShadow: tooltipShadow,
                borderRadius: '8px',
                backdropFilter: 'blur(2px)',
            }
        },
    } as const
}
