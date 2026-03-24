import React, { useEffect, useRef } from 'react'
import { alpha, type Theme } from '@mui/material/styles'
import {
    Box,
    Dialog,
    Grow,
    IconButton,
    Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { visuallyHidden } from '@mui/utils'

const DEMO_PLAYBACK_RATE = 0.85

type HowItWorksDialogProps = {
    isOpen: boolean
    onClose: () => void
    prefersReducedMotion: boolean
}

export default function HowItWorksDialog({
    isOpen,
    onClose,
    prefersReducedMotion,
}: HowItWorksDialogProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const demoTransitionTimeout = prefersReducedMotion
        ? 0
        : {
            enter: 760,
            exit: 640,
        }

    useEffect(() => {
        const video = videoRef.current

        if (video == null) {
            return
        }

        video.defaultPlaybackRate = prefersReducedMotion ? 1 : DEMO_PLAYBACK_RATE
        video.playbackRate = prefersReducedMotion ? 1 : DEMO_PLAYBACK_RATE

        if (!isOpen) {
            video.pause()
            return
        }

        video.currentTime = 0

        if (prefersReducedMotion) {
            video.pause()
            return
        }

        const playPromise = video.play()
        playPromise?.catch(() => {})

        return () => {
            video.pause()
        }
    }, [isOpen, prefersReducedMotion])

    return (
        <Dialog
            open={isOpen}
            onClose={(_event, _reason) => {
                onClose()
            }}
            aria-labelledby="how-it-works-title"
            aria-describedby="how-it-works-summary how-it-works-transcript"
            fullWidth
            maxWidth={false}
            TransitionComponent={Grow}
            TransitionProps={{
                timeout: demoTransitionTimeout,
                style: { transformOrigin: 'top right' },
            }}
            slotProps={{
                backdrop: {
                    sx: demoBackdropSx,
                },
                paper: {
                    component: 'section',
                    sx: demoCardSx,
                },
            }}
        >
            <Box sx={demoHeaderSx}>
                <Box sx={demoHeaderCopySx}>
                    <Typography
                        variant="overline"
                        color="primary.main"
                        sx={demoEyebrowSx}
                    >
                        Walkthrough
                    </Typography>
                    <Typography
                        id="how-it-works-title"
                        variant="h4"
                        sx={demoTitleSx}
                    >
                        A quick look at Forecast Atlas
                    </Typography>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={demoBodySx}
                        id="how-it-works-summary"
                    >
                        See how forecasts line up, where providers drift, and how the timeline reads.
                    </Typography>
                </Box>

                <IconButton
                    aria-label="Close demo"
                    onClick={onClose}
                    sx={demoCloseButtonSx}
                >
                    <CloseRoundedIcon />
                </IconButton>
            </Box>

            <Box sx={demoStageSx}>
                <Box sx={demoVideoFrameSx}>
                    <video
                        ref={videoRef}
                        autoPlay={!prefersReducedMotion}
                        aria-describedby="how-it-works-summary how-it-works-transcript"
                        onEnded={onClose}
                        controls
                        loop={false}
                        muted
                        playsInline
                        preload="metadata"
                    >
                        <source src="/videos/forecast-atlas-hero-loop.mp4" type="video/mp4" />
                        <track
                            kind="captions"
                            label="English captions"
                            src="/captions/forecast-atlas-hero-loop.vtt"
                            srcLang="en"
                        />
                    </video>
                </Box>
            </Box>

            <Box component="ol" id="how-it-works-transcript" sx={visuallyHidden}>
                <li>Forecast Atlas opens on the main dashboard for the selected city and UTC day.</li>
                <li>The chart compares observed temperatures with forecast runs from multiple providers.</li>
                <li>The evaluation log below shows how probability buckets change between forecast snapshots.</li>
            </Box>
        </Dialog>
    )
}

const demoBackdropSx = (theme: Theme) => ({
    px: 2,
    pt: { xs: 1.5, md: 4.5 },
    alignItems: 'flex-start',
    backgroundColor: theme.palette.mode === 'dark'
        ? alpha('#05080D', 0.46)
        : alpha('#05080D', 0.22),
    backdropFilter: 'blur(8px)',
})

const demoCardSx = (theme: Theme) => ({
    width: 'min(1120px, calc(100vw - 32px))',
    p: { xs: 1, md: 1.05 },
    borderRadius: 2,
    backgroundColor: theme.palette.mode === 'dark'
        ? alpha('#11161D', 0.96)
        : alpha('#FFFFFF', 0.96),
    border: `1px solid ${theme.palette.mode === 'dark'
        ? alpha('#FFFFFF', 0.08)
        : alpha('#0B1628', 0.08)}`,
    boxShadow: theme.palette.mode === 'dark'
        ? '0 28px 70px rgba(2, 7, 12, 0.5)'
        : '0 28px 70px rgba(12, 24, 42, 0.16)',
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gap: { xs: 0.85, md: 0.95 },
})

const demoHeaderSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr auto', md: 'minmax(0, 1fr) auto' },
    gap: 1,
    alignItems: 'start',
    px: { xs: 0.15, md: 0.3 },
    pt: { xs: 0.15, md: 0.25 },
} as const

const demoHeaderCopySx = {
    minWidth: 0,
} as const

const demoEyebrowSx = {
    fontWeight: 700,
    letterSpacing: '0.14em',
} as const

const demoTitleSx = {
    mt: 0.15,
    maxWidth: '24ch',
    fontSize: {
        xs: '1.45rem',
        md: '1.9rem',
    },
    lineHeight: 1.02,
} as const

const demoBodySx = {
    mt: 0.4,
    maxWidth: '72ch',
    fontSize: { xs: '0.96rem', md: '1rem' },
} as const

const demoCloseButtonSx = (theme: Theme) => ({
    mt: 0.1,
    borderRadius: '10px',
    border: `1px solid ${theme.palette.mode === 'dark'
        ? alpha('#FFFFFF', 0.08)
        : alpha('#0B1628', 0.1)}`,
    color: theme.palette.mode === 'dark' ? '#E3EDFA' : '#34547C',
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
})

const demoStageSx = {
    width: '100%',
} as const

const demoVideoFrameSx = (theme: Theme) => ({
    width: '100%',
    aspectRatio: '960 / 544',
    borderRadius: '14px',
    overflow: 'hidden',
    border: `1px solid ${theme.palette.mode === 'dark'
        ? alpha('#FFFFFF', 0.08)
        : alpha('#0B1628', 0.08)}`,
    backgroundColor: 'transparent',
    boxShadow: theme.palette.mode === 'dark'
        ? '0 18px 40px rgba(3, 9, 16, 0.28)'
        : '0 18px 40px rgba(12, 24, 42, 0.1)',
    '& video': {
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: 'contain',
        objectPosition: 'center center',
    },
})
