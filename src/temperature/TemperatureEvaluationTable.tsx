import { useEffect, useMemo, useRef } from 'react'
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Paper,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
    useMediaQuery,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { alpha, useTheme } from '@mui/material/styles'
import type { BasedOnItem } from './typesTemperatureEvaluation'
import { useTemperatureEvaluationQuery } from './useTemperatureEvaluationQuery'
import { convertBoundsToC } from '../observations/chart/useFahrenheitLinesLayer'
import { getQueryErrorInfo } from '../observations/queryError'
import { scrollbarSx } from '../ui/scrollbarSx'
import { useLocalStorageActive } from '../ui/tabUiState'

const LAST_ACTIVE_STORAGE_KEY = 'temperatureEvaluation:lastActiveMap'
const SNAPSHOT_TAB_HEIGHT = 48
const SNAPSHOT_TAB_WIDTH = 92
const CHANGED_CELL_BACKGROUND = alpha('#B7D4F9', 0.42)
const TABLE_BORDER_COLOR = alpha('#90A9CD', 0.38)

interface Props {
    date: string
    location: string
    setDistributions: (arr: Array<Record<string, number>>) => void
}

type Bucket = {
    key: string
    labelF: string
    labelC: string
}

function formatSnapshotTime(snapshotId: string): string {
    const timestampIso = snapshotId.split('_', 3)[2] ?? ''
    const snapshotDate = new Date(timestampIso)

    if (Number.isNaN(snapshotDate.getTime())) {
        return '–'
    }

    const hoursUtc = String(snapshotDate.getUTCHours()).padStart(2, '0')
    const minutesUtc = String(snapshotDate.getUTCMinutes()).padStart(2, '0')
    const secondsUtc = String(snapshotDate.getUTCSeconds()).padStart(2, '0')

    return `${hoursUtc}:${minutesUtc}:${secondsUtc}`
}

function formatSnapshotUpdatedAt(timestampSeconds: number): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(timestampSeconds * 1000))
}

function clampActiveSnapshotIndex(
    index: number,
    totalSnapshots: number,
): number {
    if (totalSnapshots <= 0) {
        return 0
    }

    return Math.min(Math.max(index, 0), totalSnapshots - 1)
}

function formatBucketValue(
    item: BasedOnItem,
    probability: number | undefined,
): string | number {
    if (
        item.evaluator === 'forecast'
        || item.evaluator === 'temperature prediction model'
    ) {
        return `${Math.round((probability ?? 0) * 100)}%`
    }

    if (item.evaluator === 'maxTempReached' && typeof probability === 'number') {
        const fixedProbability = probability.toFixed(1)
        return fixedProbability.endsWith('.0')
            ? fixedProbability.slice(0, -2)
            : fixedProbability
    }

    if (item.evaluator === 'certain' && probability != null) {
        return probability
    }

    return '–'
}

const TemperatureEvaluationTable = ({
    date,
    location,
    setDistributions,
}: Props) => {
    const theme = useTheme()
    const isVerticalTabs = useMediaQuery(theme.breakpoints.up('lg'))
    const styles = getTemperatureEvaluationTableStyles(isVerticalTabs)
    const [active, setActive] = useLocalStorageActive(
        LAST_ACTIVE_STORAGE_KEY,
        date,
        location,
    )
    const {
        data: entries = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useTemperatureEvaluationQuery(date, location)

    const reversedEntries = entries.slice().reverse()
    const totalSnapshots = reversedEntries.length
    const activeIndex = clampActiveSnapshotIndex(active, totalSnapshots)
    const currentSnapshot = reversedEntries[activeIndex] ?? null
    const previousSnapshot = reversedEntries[activeIndex + 1] ?? null
    const latestEvaluationUpdatedUtc = reversedEntries[0]
        ? formatSnapshotUpdatedAt(reversedEntries[0].timestamp.seconds)
        : '–'
    const errorInfo = getQueryErrorInfo(error)

    useEffect(() => {
        if (active !== activeIndex) {
            setActive(activeIndex)
        }
    }, [active, activeIndex, setActive])

    const {
        basedOnItems,
        firstEvaluatorWithProbabilities,
        buckets,
        probabilityChangedByBucket,
        dataChangedByEvaluator,
    } = useMemo(() => {
        const basedOnItems = currentSnapshot?.basedOn ?? []
        const previousBasedOnItems = previousSnapshot?.basedOn ?? []
        const firstEvaluatorWithProbabilities = basedOnItems.find(
            (item) => Object.keys(item.p).length > 0,
        ) ?? null
        const bucketKeys = firstEvaluatorWithProbabilities
            ? Object.keys(firstEvaluatorWithProbabilities.p).sort(
                (left, right) => parseFloat(left) - parseFloat(right),
            )
            : []

        const buckets = bucketKeys.map((key) => {
            const [minStr, maxStr] = key.split('..')
            const hasMin = minStr === '-999F'
            const hasMax = maxStr === '999F'
            const minF = hasMin ? -999 : parseFloat(minStr.replace('F', ''))
            const maxF = hasMax ? 999 : parseFloat(maxStr.replace('F', ''))
            const [minC, maxC] = convertBoundsToC(minF, maxF, location)
            const labelF = `${hasMin ? '-∞' : minF}…${hasMax ? '∞' : maxF}°F`
            const labelC = `${hasMin ? '-∞' : minC}…${hasMax ? '∞' : maxC}°C`

            return { key, labelF, labelC }
        })

        const probabilityChangedByBucket = buckets.map((bucket) =>
            basedOnItems.map((item, index) => {
                const previousItem = previousBasedOnItems[index]
                const currentProbability = item.p[bucket.key] ?? null
                const previousProbability = previousItem?.p[bucket.key] ?? null

                if (currentProbability === null && previousProbability === null) {
                    return false
                }

                if (item.evaluator === 'certain') {
                    return currentProbability !== previousProbability
                }

                const currentPercent = currentProbability != null
                    ? Math.round(currentProbability * 100)
                    : null
                const previousPercent = previousProbability != null
                    ? Math.round(previousProbability * 100)
                    : null

                return currentPercent !== previousPercent
            }),
        )

        const dataChangedByEvaluator = basedOnItems.map((item, index) => {
            const previousItem = previousBasedOnItems[index]
            const currentData = item.data.trim()
            const previousData = previousItem?.data.trim() ?? ''

            return currentData !== previousData
        })

        return {
            basedOnItems,
            firstEvaluatorWithProbabilities,
            buckets,
            probabilityChangedByBucket,
            dataChangedByEvaluator,
        }
    }, [currentSnapshot, previousSnapshot, location])

    useEffect(() => {
        setDistributions(basedOnItems.map((item) => item.p))
    }, [basedOnItems, setDistributions])

    const tabsContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const tabsContainer = tabsContainerRef.current

        if (!tabsContainer) {
            return
        }

        if (!isVerticalTabs) {
            const hiddenLeftEdge = activeIndex * SNAPSHOT_TAB_WIDTH
            const hiddenRightEdge = hiddenLeftEdge + SNAPSHOT_TAB_WIDTH

            if (hiddenLeftEdge < tabsContainer.scrollLeft) {
                tabsContainer.scrollLeft = hiddenLeftEdge
            } else if (
                hiddenRightEdge
                > tabsContainer.scrollLeft + tabsContainer.clientWidth
            ) {
                tabsContainer.scrollLeft = hiddenRightEdge - tabsContainer.clientWidth
            }

            return
        }

        const hiddenTopEdge = activeIndex * SNAPSHOT_TAB_HEIGHT
        const hiddenBottomEdge = hiddenTopEdge + SNAPSHOT_TAB_HEIGHT

        if (hiddenTopEdge < tabsContainer.scrollTop) {
            tabsContainer.scrollTop = hiddenTopEdge
        } else if (
            hiddenBottomEdge
            > tabsContainer.scrollTop + tabsContainer.clientHeight
        ) {
            tabsContainer.scrollTop = hiddenBottomEdge - tabsContainer.clientHeight
        }
    }, [activeIndex, isVerticalTabs])

    if (isLoading) {
        return (
            <Paper sx={styles.loadingPaper}>
                <CircularProgress />
            </Paper>
        )
    }

    if (isError) {
        return (
            <Paper sx={styles.statusPaper}>
                <Box sx={styles.errorStateRow}>
                    <Box sx={styles.errorTextBlock}>
                        <Typography sx={styles.errorTitle}>
                            Temperature evaluation is temporarily unavailable.
                        </Typography>
                        <Typography color='text.secondary' variant='body2'>
                            {errorInfo.details ?? errorInfo.summary}
                        </Typography>
                    </Box>
                    <Button
                        onClick={() => void refetch()}
                        size='small'
                        sx={{ flexShrink: 0 }}
                        variant='outlined'
                    >
                        Try again
                    </Button>
                </Box>
            </Paper>
        )
    }

    if (!reversedEntries.length) {
        return (
            <Paper sx={styles.compactStatusPaper}>
                <Typography sx={{ m: 2, textAlign: 'center' }}>
                    <strong>Open-Meteo Evaluation: </strong>
                    No data for
                    <strong> {location}</strong> on
                    <strong> {date}</strong>.
                </Typography>
            </Paper>
        )
    }

    if (!firstEvaluatorWithProbabilities || !currentSnapshot) {
        return (
            <Paper sx={styles.compactStatusPaper}>
                <Typography>No Open-Meteo distributions for {date}.</Typography>
            </Paper>
        )
    }

    const goToPreviousSnapshot = () => {
        setActive((index) => Math.max(0, index - 1))
    }

    const goToNextSnapshot = () => {
        setActive((index) => Math.min(totalSnapshots - 1, index + 1))
    }

    return (
        <Paper sx={styles.shellPaper}>
            <Box sx={styles.headerRow}>
                <Box>
                    <Typography
                        sx={{ mb: 0.2, fontSize: { xs: 'clamp(1.4rem, 8.3vw, 2rem)', sm: undefined } }}
                        variant='h5'
                    >
                        Open-Meteo Temperature Evaluation Log
                    </Typography>
                    <Typography color='text.secondary' variant='body2'>
                        Updated (UTC): {latestEvaluationUpdatedUtc}
                    </Typography>
                    <Typography color='text.secondary' variant='caption'>
                        Built from Open-Meteo GFS forecast snapshots. Includes a synthetic
                        scenario (+1.2°F shift) to compare stability of bucket probabilities.
                    </Typography>
                </Box>
            </Box>

            <Box sx={styles.contentRow}>
                <Box sx={styles.tabsRail}>
                    <IconButton
                        aria-label='Previous evaluation snapshot'
                        disabled={activeIndex === 0}
                        onClick={goToPreviousSnapshot}
                        size='small'
                    >
                        {isVerticalTabs ? <KeyboardArrowUpIcon /> : <KeyboardArrowLeftIcon />}
                    </IconButton>

                    <Box ref={tabsContainerRef} sx={styles.tabsViewport}>
                        <Tabs
                            onChange={(_, nextIndex) => {
                                setActive(nextIndex)
                            }}
                            orientation={isVerticalTabs ? 'vertical' : 'horizontal'}
                            scrollButtons={false}
                            sx={styles.tabs}
                            value={activeIndex}
                            variant={isVerticalTabs ? 'standard' : 'scrollable'}
                        >
                            {reversedEntries.map((entry) => (
                                <Tab
                                    disableRipple
                                    key={entry.id}
                                    label={formatSnapshotTime(entry.id)}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    <IconButton
                        aria-label='Next evaluation snapshot'
                        disabled={activeIndex === totalSnapshots - 1}
                        onClick={goToNextSnapshot}
                        size='small'
                    >
                        {isVerticalTabs ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                    </IconButton>
                </Box>

                <Box sx={styles.contentPanel}>
                    <Box sx={styles.metaRow}>
                        <Box sx={styles.metaItem}>
                            <Typography color='text.secondary' variant='body2'>
                                Date in question:
                            </Typography>
                            <Typography variant='subtitle1'>
                                {currentSnapshot.dateInQuestion}
                            </Typography>
                        </Box>
                        <Box sx={styles.metaItem}>
                            <Typography color='text.secondary' variant='body2'>
                                Location:
                            </Typography>
                            <Typography variant='subtitle1'>
                                {currentSnapshot.location}
                            </Typography>
                        </Box>
                    </Box>

                    <TableContainer component={Paper} sx={styles.tableContainer}>
                        <Table
                            aria-label='Open-Meteo temperature evaluation table'
                            size='small'
                            sx={styles.table}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell component='th' scope='col' sx={{ minWidth: 100 }}>
                                        Range (°C)
                                    </TableCell>
                                    {basedOnItems.map((item) => (
                                        <TableCell component='th' key={item.evaluator} scope='col'>
                                            {item.evaluator}
                                        </TableCell>
                                    ))}
                                    <TableCell component='th' scope='col'>
                                        overall
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {buckets.map((bucket, bucketIndex) => (
                                    <TableRow key={bucket.key}>
                                        <TableCell component='th' scope='row' sx={styles.bucketCell}>
                                            <Tooltip arrow placement='right' title={bucket.labelF}>
                                                <span>{bucket.labelC}</span>
                                            </Tooltip>
                                        </TableCell>

                                        {basedOnItems.map((item, itemIndex) => {
                                            const probability = item.p[bucket.key]
                                            const hasChanged =
                                                probabilityChangedByBucket[bucketIndex][itemIndex]

                                            return (
                                                <TableCell
                                                    key={item.evaluator}
                                                    sx={{
                                                        backgroundColor: hasChanged
                                                            ? CHANGED_CELL_BACKGROUND
                                                            : 'inherit',
                                                    }}
                                                >
                                                    {formatBucketValue(item, probability)}
                                                </TableCell>
                                            )
                                        })}

                                        <TableCell>
                                            {currentSnapshot.p[bucket.key] != null
                                                ? `${Math.round(currentSnapshot.p[bucket.key] * 100)}%`
                                                : '–'}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                <TableRow>
                                    <TableCell component='th' scope='row' sx={{ fontWeight: 600 }}>
                                        Data
                                    </TableCell>

                                    {basedOnItems.map((item, itemIndex) => (
                                        <TableCell
                                            key={item.evaluator}
                                            sx={{
                                                backgroundColor: dataChangedByEvaluator[itemIndex]
                                                    ? CHANGED_CELL_BACKGROUND
                                                    : undefined,
                                            }}
                                        >
                                            <Tooltip arrow placement='top' title={item.data || '–'}>
                                                <Box component='span' sx={styles.dataPreview}>
                                                    {item.data || '–'}
                                                </Box>
                                            </Tooltip>
                                        </TableCell>
                                    ))}

                                    <TableCell>–</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>
        </Paper>
    )
}

function getTemperatureEvaluationTableStyles(isVerticalTabs: boolean) {
    return {
        loadingPaper: {
            mb: 2.2,
            p: 3,
            display: 'flex',
            justifyContent: 'center',
        },
        statusPaper: {
            mb: 2.2,
            p: { xs: 1.4, md: 1.7 },
        },
        compactStatusPaper: {
            mb: 2.2,
            p: 2,
        },
        errorStateRow: {
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.2,
            flexDirection: { xs: 'column', sm: 'row' },
        },
        errorTextBlock: {
            minWidth: 0,
        },
        errorTitle: {
            mb: 0.25,
            color: 'error.main',
            fontWeight: 700,
        },
        shellPaper: {
            mb: 2.2,
            p: { xs: 1.4, md: 2 },
        },
        headerRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 0.6,
            mb: 1.1,
        },
        contentRow: {
            mb: 1,
            display: 'flex',
            alignItems: 'flex-start',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 0.9, lg: 1.2 },
        },
        contentPanel: {
            flex: 1,
            minWidth: 0,
            width: '100%',
        },
        tabsRail: {
            display: 'flex',
            flexDirection: isVerticalTabs ? 'column' : 'row',
            alignItems: 'center',
            px: isVerticalTabs ? 0.2 : 0,
            gap: isVerticalTabs ? 0 : 0.6,
            flexShrink: 0,
            width: { xs: '100%', lg: 'auto' },
            minWidth: 0,
            alignSelf: { lg: 'flex-start' },
        },
        tabsViewport: {
            maxHeight: isVerticalTabs ? 'clamp(160px, 34vh, 320px)' : 'none',
            minWidth: isVerticalTabs ? 110 : 0,
            width: isVerticalTabs ? 'auto' : 'auto',
            flex: isVerticalTabs ? 'none' : 1,
            overflowX: isVerticalTabs ? 'hidden' : 'auto',
            overflowY: isVerticalTabs ? 'auto' : 'hidden',
            ...scrollbarSx,
        },
        tabs: {
            '& .MuiTabs-indicator': isVerticalTabs
                ? { left: 0, width: 3, background: 'primary.main' }
                : { height: 3, borderRadius: 999, background: 'primary.main' },
            '& .MuiTab-root': {
                px: isVerticalTabs ? 1.5 : 1.2,
                minWidth: isVerticalTabs ? 0 : SNAPSHOT_TAB_WIDTH,
                textTransform: 'none',
                fontSize: { xs: 12.4, sm: 12.7, md: 13 },
            },
            '& .MuiTab-root.Mui-selected': {
                fontWeight: 600,
                color: 'primary.main',
            },
        },
        metaRow: {
            display: 'flex',
            justifyContent: { xs: 'flex-start', lg: 'flex-end' },
            alignItems: 'center',
            columnGap: { xs: 1, lg: 2 },
            rowGap: 0.45,
            flexWrap: 'wrap',
            mb: 0.9,
        },
        metaItem: {
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 0.8,
            whiteSpace: 'nowrap',
            maxWidth: '100%',
        },
        tableContainer: {
            border: `1px solid ${TABLE_BORDER_COLOR}`,
            borderRadius: 2.2,
            boxShadow: 'none',
            backgroundImage: 'none',
            maxWidth: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            boxSizing: 'border-box',
            px: 0,
            pt: 0,
            pb: 0,
        },
        table: {
            width: '100%',
            minWidth: { xs: 560, sm: 620, md: 680 },
            '& .MuiTableCell-root': {
                py: { xs: 0.78, sm: 0.86, md: 1.1 },
                px: { xs: 0.82, sm: 1.02, md: 1.12 },
                fontSize: { xs: 12.2, sm: 12.7, md: 13.5 },
                lineHeight: 1.45,
                whiteSpace: 'nowrap',
            },
            '& .MuiTableCell-head': {
                fontWeight: 700,
                fontSize: { xs: 12.2, sm: 12.7, md: 13.5 },
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
                px: { xs: 0.92, sm: 1.12, md: 1.24 },
            },
            '& .MuiTableCell-root:first-of-type': {
                pl: { xs: 1.35, sm: 1.75, md: 2.15 },
            },
            '& .MuiTableCell-root:last-of-type': {
                pr: { xs: 1.35, sm: 1.75, md: 2.15 },
            },
        },
        bucketCell: {
            minWidth: 115,
            userSelect: 'none',
        },
        dataPreview: {
            display: 'inline-block',
            maxWidth: { xs: '18ch', sm: '22ch', md: '26ch' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            verticalAlign: 'bottom',
        },
    }
}

export default TemperatureEvaluationTable
