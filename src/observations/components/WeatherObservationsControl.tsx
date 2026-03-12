import React, { FC } from 'react'
import {
    Box,
    Button,
    FormControlLabel,
    Checkbox,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    ToggleButton,
    ToggleButtonGroup, alpha,
} from '@mui/material'
import type { Theme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

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
}) => (
    <Box sx={controlsRootSx}>
        <Box sx={controlsToolbarSx}>
        <ToggleButtonGroup
            value={unit}
            exclusive
            onChange={(_, newUnit) => newUnit && onUnitChange(newUnit)}
            size="small"
            sx={unitToggleGroupSx}
        >
            <ToggleButton value="C">°C</ToggleButton>
            <ToggleButton value="F">°F</ToggleButton>
        </ToggleButtonGroup>
        <Button
            size="small"
            variant="outlined"
            onClick={toggleAll}
        >
            {onlyNoaa ? 'Show all observations' : 'Show only NOAA'}
        </Button>
        </Box>
    <Accordion sx={controlsAccordionSx} elevation={0}>
        <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={controlsExpandIconSx} />}
            aria-controls="obs-controls-content"
            id="obs-controls-header"
            sx={controlsSummarySx}
        >
        </AccordionSummary>
        <AccordionDetails>
            <Box sx={checkboxGroupSx}>
                {sortedSources.map((src) => (
                    <FormControlLabel
                        key={src}
                        control={
                            <Checkbox
                                disableRipple
                                checked={selectedSources.includes(src)}
                                disabled={src === 'tgftp.nws.noaa.gov'}
                                onChange={(e) => toggleSource(src, e.target.checked)}
                                sx={sourceCheckboxSx(sourceColorMap[src])}
                            />
                        }
                        label={src}
                        sx={sourceLabelSx(sourceColorMap[src])}
                    />
                ))}
            </Box>
        </AccordionDetails>
    </Accordion>
    </Box>
)

export default ObservationControls

const controlsRootSx = {
    mb: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'column',
} as const

const controlsToolbarSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    zIndex: 5,
    gap: '10px',
    marginBottom: '-45px',
    marginLeft: '73%',
    marginRight: '50px',
} as const

const unitToggleGroupSx = (theme: Theme) => ({
    alignSelf: 'flex-end',
    height: '30px',
    '& .MuiToggleButton-root': {
        color: theme.palette.grey[500],
        border: `1px solid ${alpha(theme.palette.grey[500], 0.5)}`,
    },
    '& .MuiToggleButton-root.Mui-selected': {
        color: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
        '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.15),
        },
    },
})

const controlsAccordionSx = {
    mb: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    '& .MuiAccordion-heading': {
        display: "block",
        width: "50px",
    },
    '&.Mui-expanded': { margin: 0 },
    '& .MuiAccordion-root': { boxShadow: 'none' },
    '& .MuiAccordionSummary-root.Mui-expanded': { height: "30px" },
    '&:before': { display: 'none' },
} as const

const controlsExpandIconSx = (theme: Theme) => ({
    height: "40px",
    width: "40px",
    color: theme.palette.primary.main,
    '& .MuiSvgIcon-root': {
        width: "35px",
        height: "35px",
    },
    '&.MuiAccordionSummary-root': { minHeight: 0 },
    '&.MuiAccordionSummary-root.Mui-expanded': { minHeight: 0 },
    '& .MuiAccordionSummary-content': { margin: 0 },
    '& .MuiAccordionSummary-content.Mui-expanded': { margin: 0 },
    '& .MuiAccordionSummary-expandIconWrapper': { transition: 'transform 0.2s' },
    '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': { transform: 'rotate(180deg)' },
})

const controlsSummarySx = {
    padding: "0 5px",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
} as const

const checkboxGroupSx = {
    display: 'flex',
    flexWrap: 'wrap',
} as const

const sourceCheckboxSx = (color: string) => ({
    color,
    '&.Mui-checked': { color },
})

const sourceLabelSx = (color: string) => ({
    '& .MuiFormControlLabel-label': {
        color,
        fontSize: '14px',
    },
})
