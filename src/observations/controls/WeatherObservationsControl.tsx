import React, { FC, useState } from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import { alpha, lighten, type Theme } from '@mui/material/styles'

interface ControlsProps {
    sortedSources: string[]
    selectedSources: string[]
    sourceColorMap: Record<string, string>
    onlyNoaa: boolean
    toggleAll: () => void
    toggleSource: (src: string, checked: boolean) => void
    unit: 'C' | 'F'
    onUnitChange: (newUnit: 'C' | 'F') => void
}

const ObservationControls: FC<ControlsProps> = ({
    sortedSources,
    selectedSources,
    sourceColorMap,
    onlyNoaa,
    toggleAll,
    toggleSource,
    unit,
    onUnitChange,
}) => {
    const [expanded, setExpanded] = useState(false)
    const styles = getObservationControlStyles()

    return (
        <Box sx={{ mb: 1.4 }}>
            <Box sx={styles.controlsHeader}>
                <ToggleButtonGroup
                    value={unit}
                    exclusive
                    onChange={(_, newUnit) => newUnit && onUnitChange(newUnit)}
                    size="small"
                    sx={getUnitToggleGroupSx}
                >
                    <ToggleButton value="C">°C</ToggleButton>
                    <ToggleButton value="F">°F</ToggleButton>
                </ToggleButtonGroup>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={toggleAll}
                    sx={styles.toggleAllButton}
                >
                    {onlyNoaa ? 'Show all observations' : 'Show only NOAA observations'}
                </Button>
            </Box>
            <Accordion
                elevation={0}
                expanded={expanded}
                onChange={(_, next) => setExpanded(next)}
                sx={styles.sourcesAccordion}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon color="primary" />}
                    aria-controls="obs-controls-content"
                    id="obs-controls-header"
                    sx={styles.sourcesSummary}
                >
                    <Typography variant="subtitle2">
                        Sources ({selectedSources.length} selected)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={styles.sourcesDetails}>
                    <Box sx={styles.sourcesGrid}>
                        {sortedSources.map((src) => (
                            <FormControlLabel
                                key={src}
                                title={src}
                                control={
                                    <Checkbox
                                        disableRipple
                                        checked={selectedSources.includes(src)}
                                        disabled={src === 'tgftp.nws.noaa.gov'}
                                        onChange={(event) => toggleSource(src, event.target.checked)}
                                        sx={getSourceCheckboxSx(sourceColorMap[src])}
                                    />
                                }
                                label={src}
                                sx={getSourceLabelSx(sourceColorMap[src])}
                            />
                        ))}
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    )
}

function getUnitToggleGroupSx(theme: Theme) {
    return {
        width: 'fit-content',
        '& .MuiToggleButton-root': {
            color: theme.palette.grey[600],
            border: `1px solid ${alpha(theme.palette.grey[500], 0.45)}`,
            px: { xs: 1.15, sm: 1.4 },
        },
        '& .MuiToggleButton-root.Mui-selected': {
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.58)}`,
            '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.18),
            },
        },
    }
}

function getSourceCheckboxSx(baseColor: string) {
    return (theme: Theme) => {
        const visibleColor = theme.palette.mode === 'dark'
            ? lighten(baseColor, 0.2)
            : baseColor

        return {
            color: visibleColor,
            '&.Mui-checked': { color: visibleColor },
        }
    }
}

function getSourceLabelSx(baseColor: string) {
    return (theme: Theme) => {
        const visibleColor = theme.palette.mode === 'dark'
            ? lighten(baseColor, 0.2)
            : baseColor

        return {
            maxWidth: '100%',
            mr: 0,
            ml: 0,
            '& .MuiFormControlLabel-label': {
                color: visibleColor,
                fontSize: { xs: 13, sm: 13.5 },
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: { xs: '13ch', sm: '16ch', md: '22ch' },
            },
        }
    }
}

function getObservationControlStyles() {
    return {
        controlsHeader: {
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: { xs: 'auto minmax(0, 1fr)' },
            alignItems: 'center',
            justifyContent: { sm: 'space-between' },
            gap: 0.8,
            mb: 1,
        },
        toggleAllButton: {
            alignSelf: 'center',
            ml: { xs: 0, sm: 'auto' },
            width: 'fit-content',
            justifySelf: { xs: 'end' },
            maxWidth: '100%',
            minWidth: 0,
            minHeight: { xs: 36, sm: 32 },
            px: { xs: 1.1, sm: 1.5 },
            fontSize: { xs: '0.74rem', sm: '0.8125rem' },
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        sourcesAccordion: {
            borderColor: 'divider',
            overflow: 'hidden',
            '&.Mui-expanded': { margin: 0 },
        },
        sourcesSummary: {
            minHeight: 42,
            '&.Mui-expanded': { minHeight: 42 },
            '& .MuiAccordionSummary-content': { my: 0.5 },
            '& .MuiAccordionSummary-content.Mui-expanded': { my: 0.5 },
        },
        sourcesDetails: {
            pt: 0.2,
            minHeight: 74,
            maxHeight: { xs: 160, md: 170 },
            overflowY: 'auto',
        },
        sourcesGrid: {
            display: 'grid',
            gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
            },
            columnGap: 0.5,
            rowGap: 0.2,
            alignItems: 'start',
        },
    } as const
}

export default ObservationControls
