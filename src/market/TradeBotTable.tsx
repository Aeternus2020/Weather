import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    CircularProgress,
    Typography,
    Tabs,
    Tab,
    Box,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Paper,
} from "@mui/material"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {useTradeBotQuery} from "./useTradeBotQuery"
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import { TAB_HEIGHT, scrollbarSx, useLocalStorageActive } from "../ui/tabNavigation"
import type {OrderType, TradeBotLog} from "./typesTradeBot"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

interface Props {
    date: string,
    location: string
}

dayjs.extend(utc)

const TB_KEY = 'tradeBot:lastActiveMap'

const TradeBotTable: React.FC<Props> = ({ date, location}) => {
    const [active, setActive] = useLocalStorageActive(TB_KEY, date, location)
    const [prevActive, setPrevActive] = useState(active)

    const { data: entries = [], isLoading } = useTradeBotQuery(date)

    function getLocation(e: TradeBotLog): string {
        return e.marketState?.configId?.trim() || 'London'
    }

    const reversedEntries = useMemo<TradeBotLog[]>(() => {
        const wanted = location.trim().toLowerCase()
        return [...entries]
            .filter(e => getLocation(e).toLowerCase() === wanted)
            .sort((a, b) => {
                const ta = (a.timestamp as any)?.seconds ?? 0
                const tb = (b.timestamp as any)?.seconds ?? 0
                return ta - tb
            })
            .reverse()
    }, [entries, location])

    const total= reversedEntries.length

    useEffect(() => {
        if (total > 0 && active >= total) {
            setActive(total - 1)
        }
    }, [active, total])

    const prevEntry = useMemo<TradeBotLog | null>(() => {
        if (prevActive < 0 || prevActive >= total) return null
        return reversedEntries[prevActive]
    }, [prevActive, reversedEntries, total])

    const sortedNoTokenBids = useMemo(() => {
        const entry = reversedEntries[active]
        return entry
            ? [...entry.marketState.noToken.bids].sort((a, b) => a.price - b.price)
            : []
    }, [reversedEntries, active])

    const sortedYesTokenBids = useMemo(() => {
        const entry = reversedEntries[active]
        return entry
            ? [...entry.marketState.yesToken.bids].sort((a, b) => a.price - b.price)
            : []
    }, [reversedEntries, active])

    const tabsContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const c = tabsContainerRef.current
        if (!c) return
        const top    = active * TAB_HEIGHT
        const bottom = top + TAB_HEIGHT
        if (top < c.scrollTop) c.scrollTop = top
        else if (bottom > c.scrollTop + c.clientHeight)
            c.scrollTop = bottom - c.clientHeight
    }, [active])

    if (isLoading) return <CircularProgress/>
    if (!reversedEntries.length) {
        return (
            <Typography sx={tradeBotEmptyStateSx}>
                <strong>Trade Bot: </strong>No data for
                <strong> {location}</strong> on
                <strong> {date}</strong>.
            </Typography>
        )
    }

    const entry = reversedEntries[active]

    if (!entry) return <Typography>No data for {date}.</Typography>

    const {marketState,
        desiredState: desiredStateRaw,
        errors: errorsRaw,
        availableCash = 0
    } = entry

    const desiredState = desiredStateRaw ?? []
    const errors       = errorsRaw     ?? []

    const yesProb = marketState?.yesProbability ?? 0
    const noProb  = 1 - yesProb

    const goPrev = () => {
        setPrevActive(active)
        setActive(a => Math.max(0, a - 1))
    }
    const goNext = () => {
        setPrevActive(active)
        setActive(a => Math.min(total - 1, a + 1))
    }

    return (
        <Box sx={tradeBotRootSx}>
            <Box sx={tradeBotTabsColumnSx}>
                <IconButton onClick={goPrev} disabled={active === 0} size='small' sx={tradeBotPrevButtonSx}>
                    <KeyboardArrowUpIcon />
                </IconButton>
                <Box ref={tabsContainerRef}
                     sx={tradeBotTabsScrollerSx}
                >
                    <Tabs orientation='vertical'
                          variant="standard"
                          value={active}
                          onChange={(_, i) => { setPrevActive(active); setActive(i) }}
                          sx={tradeBotTabsSx}
                    >
                        {reversedEntries.map(e => {
                            const iso = e.id.split('_').pop()!
                            const label = dayjs.utc(iso).format('HH:mm:ss')
                            return <Tab key={e.id} label={label} disableTouchRipple />
                        })}
                    </Tabs>
                </Box>
                <IconButton onClick={goNext} disabled={active === total - 1} size='small'>
                    <KeyboardArrowDownIcon />
                </IconButton>
            </Box>
            <Box sx={tradeBotContentSx}>
                <Typography
                    variant="h6"
                    gutterBottom
                    sx={highlightedCellSx(marketState.description !== prevEntry?.marketState.description)}
                >
                    Range: {marketState.description}
                </Typography>
                <Typography
                  sx={highlightedMetricTextSx(availableCash !== prevEntry?.availableCash, 1)}
                >
                  Available Cash: {availableCash.toFixed(2)}
                </Typography>
                <Typography
                  sx={highlightedMetricTextSx(yesProb !== prevEntry?.marketState.yesProbability, 2)}
                >
                  Probability (Yes / No): {yesProb.toFixed(4)} / {noProb.toFixed(4)}
                </Typography>
                <Typography variant="subtitle1" sx={sectionTitleSx}>Desired State</Typography>
                <TableContainer component={Paper} sx={sectionTableSx}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Side</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Size</TableCell>
                                <TableCell>Limit Price</TableCell>
                                <TableCell>Outcome</TableCell>
                                <TableCell>Error</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {desiredState.map((d, i) => {
                                const prevD = prevEntry?.desiredState?.[i] ?? {
                                    side: "",
                                    amount: undefined as number | undefined,
                                    size: undefined as number | undefined,
                                    limitPrice: undefined as number | undefined,
                                    outcome: "",
                                }
                                const prevError = prevEntry?.errors?.[i]

                                return (
                                    <TableRow key={i}>
                                        <TableCell
                                            sx={highlightedCellSx(d.side !== prevD.side)}
                                        >
                                            {d.side}
                                        </TableCell>
                                        <TableCell
                                            sx={highlightedCellSx(d.amount !== prevD.amount)}
                                        >
                                            {d.amount ?? "-"}
                                        </TableCell>
                                        <TableCell
                                            sx={highlightedCellSx(d.size !== prevD.size)}
                                        >
                                            {d.size ?? "-"}
                                        </TableCell>
                                        <TableCell
                                            sx={highlightedCellSx(d.limitPrice !== prevD.limitPrice)}
                                        >
                                            {d.limitPrice ?? "-"}
                                        </TableCell>
                                        <TableCell
                                            sx={highlightedCellSx(d.outcome !== prevD.outcome)}
                                        >
                                            {d.outcome}
                                        </TableCell>
                                        <TableCell
                                            sx={wrappedHighlightedCellSx(errors?.[i] !== prevError)}
                                        >
                                            {errors?.[i] ?? "-"}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Typography variant="subtitle1" sx={sectionTitleSx}>Market Bets</Typography>
                <TableContainer component={Paper} sx={sectionTableSx}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Token</TableCell>
                                <TableCell>Net Price</TableCell>
                                <TableCell>Quantity</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell>No</TableCell>
                                <TableCell
                                    sx={highlightedCellSx(
                                        marketState?.noToken?.netPrice !== prevEntry?.marketState?.noToken?.netPrice
                                    )}
                                >
                                    {Number.isFinite(marketState?.noToken?.netPrice)
                                        ? marketState?.noToken?.netPrice?.toFixed(4)
                                        : "–"}
                                </TableCell>
                                <TableCell
                                    sx={highlightedCellSx(
                                        marketState?.noToken?.quantity !== prevEntry?.marketState?.noToken?.quantity
                                    )}
                                >
                                    {marketState.noToken.quantity}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Yes</TableCell>
                                <TableCell
                                    sx={highlightedCellSx(
                                        marketState?.yesToken?.netPrice !== prevEntry?.marketState?.yesToken?.netPrice
                                    )}
                                >
                                    {Number.isFinite(marketState.yesToken.netPrice)
                                        ? marketState?.yesToken?.netPrice?.toFixed(4)
                                        : "–"}
                                </TableCell>
                                <TableCell
                                    sx={highlightedCellSx(
                                        marketState?.yesToken?.quantity !== prevEntry?.marketState?.yesToken?.quantity
                                    )}
                                >
                                    {marketState.yesToken.quantity}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
                <Typography variant="subtitle1" gutterBottom>
                    Active Orders
                </Typography>
                {marketState?.orders?.length ? (
                    <TableContainer component={Paper} sx={activeOrdersTableSx}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Order ID</TableCell>
                                    <TableCell>Side</TableCell>
                                    <TableCell>Size</TableCell>
                                    <TableCell>Limit Price</TableCell>
                                    <TableCell>Outcome</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {marketState.orders?.map((ord: OrderType, idx: number) => {
                                    const prevOrd = prevEntry?.marketState.orders?.[idx] ?? {} as OrderType
                                    const outcome =
                                        ord.tokenId === marketState.yesToken.tokenId ? "Yes" :
                                            ord.tokenId === marketState.noToken.tokenId  ? "No"  :
                                                ""

                                    return (
                                        <TableRow key={idx}>
                                            <TableCell
                                                sx={highlightedCellSx(
                                                    (ord.orderId || ord.id) !== (prevOrd.orderId || prevOrd.id)
                                                )}
                                            >
                                                {ord.orderId || ord.id || '-'}
                                            </TableCell>
                                            <TableCell sx={highlightedCellSx(ord.side !== prevOrd.side)}>{ord.side}</TableCell>
                                            <TableCell sx={highlightedCellSx(ord.size !== prevOrd.size)}>{ord.size}</TableCell>
                                            <TableCell sx={highlightedCellSx(ord.limitPrice !== prevOrd.limitPrice)}
                            >
                                {ord.limitPrice ?? '-'}
                                </TableCell>
                                <TableCell>{outcome}</TableCell>
                                <TableCell sx={highlightedCellSx(ord.status !== prevOrd.status)}>
                                    {ord.status ?? '-'}
                                </TableCell>
                                    </TableRow>
                            )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="textSecondary" sx={emptyOrdersTextSx}>
                        No active orders
                    </Typography>
                )}
                <Accordion sx={orderBookAccordionSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={orderBookSummarySx}>
                        No Token Order Book
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="subtitle2" sx={orderBookLabelSx}>Asks:</Typography>
                        <TableContainer component={Paper} sx={sectionTableSx}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Price</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedNoTokenBids.map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{item.amount}</TableCell>
                                            <TableCell>{item.price}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="subtitle2" sx={orderBookLabelSx}>Bids:</Typography>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Price</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedYesTokenBids.map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{item.amount}</TableCell>
                                            <TableCell>{item.price}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                </Accordion>
                <Accordion sx={orderBookAccordionSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={orderBookSummarySx}>
                        Yes Token Order Book
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="subtitle2" sx={orderBookLabelSx}>Asks:</Typography>
                        <TableContainer component={Paper} sx={sectionTableSx}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Price</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {marketState.yesToken.asks.map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{item.amount}</TableCell>
                                            <TableCell>{item.price}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="subtitle2" sx={orderBookLabelSx}>Bids:</Typography>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Price</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {marketState.yesToken.bids.map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{item.amount}</TableCell>
                                            <TableCell>{item.price}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                </Accordion>
            </Box>
        </Box>
    )
}

export default TradeBotTable

const changedCellBackground = "rgba(255,235,59,0.3)"

const tradeBotEmptyStateSx = {
    m: 2,
    textAlign: 'center',
} as const

const tradeBotRootSx = {
    display: 'flex',
    mb: 2,
    alignItems: 'stretch',
} as const

const tradeBotTabsColumnSx = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    p: 1,
} as const

const tradeBotPrevButtonSx = {
    mr: 1,
} as const

const tradeBotTabsScrollerSx = {
    maxHeight: '570px',
    minWidth: 110,
    ...scrollbarSx,
} as const

const tradeBotTabsSx = {
    '& .MuiTabs-indicator': { left: 0, width: 3, background: 'primary.main' },
    '& .MuiTab-root': { px: 1.5, textTransform: 'none', fontSize: 13 },
    '& .MuiTab-root.Mui-selected': { fontWeight: 600, color: 'primary.main' },
} as const

const tradeBotContentSx = {
    flex: 1,
    pl: 2,
    display: "flex",
    flexDirection: "column",
} as const

const sectionTitleSx = {
    marginBottom: 1,
} as const

const sectionTableSx = {
    mb: 2,
} as const

const activeOrdersTableSx = {
    mb: 2,
    overflowX: 'auto',
} as const

const emptyOrdersTextSx = {
    mb: 2,
} as const

const orderBookAccordionSx = {
    mt: 1,
    boxShadow: 'none',
} as const

const orderBookSummarySx = {
    fontWeight: 'bold',
} as const

const orderBookLabelSx = {
    marginBottom: 1,
} as const

const highlightedCellSx = (changed: boolean) => ({
    backgroundColor: changed ? changedCellBackground : 'inherit',
})

const highlightedMetricTextSx = (changed: boolean, marginBottom: number) => ({
    mb: marginBottom,
    backgroundColor: changed ? changedCellBackground : 'inherit',
})

const wrappedHighlightedCellSx = (changed: boolean) => ({
    maxWidth: 200,
    whiteSpace: 'normal' as const,
    wordBreak: 'break-all' as const,
    backgroundColor: changed ? changedCellBackground : 'inherit',
})
