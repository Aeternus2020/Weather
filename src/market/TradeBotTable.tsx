import React, {Dispatch, SetStateAction, useEffect, useMemo, useRef, useState} from "react"
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
import { TAB_HEIGHT} from "../temperature/TemperatureEvaluationTable"
import type {OrderType, TradeBotLog} from "./typesTradeBot"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type {User} from "firebase/auth"

interface Props {
    user: User
    date: string,
    location: string
}

dayjs.extend(utc)

const TB_KEY = 'tradeBot:lastActiveMap'

export const scrollbarSx = {
    overflowY: 'auto',
    "&::-webkit-scrollbar": {
        width: 12,
    },
    "&::-webkit-scrollbar-track": {
        backgroundColor: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
        backgroundColor: "grey.400",
        borderRadius: 3,
    },
    "&::-webkit-scrollbar-thumb:hover": {
        backgroundColor: "primary.main",
    },
}

export function useLocalStorageActive(
    storageKey: string,
    date: string,
    location: string
): [number, Dispatch<SetStateAction<number>>] {
    type Saved = { date: string; location: string; active: number }

    const read = (): Saved | null => {
        try {
            const obj = JSON.parse(localStorage.getItem(storageKey) || "null")
            if (
                obj &&
                typeof obj.date === "string" &&
                typeof obj.location === "string" &&
                typeof obj.active === "number"
            )
                return obj as Saved
        } catch {/* ignore */}
        return null
    }

    const chooseInitial = (): number => {
        const saved = read()
        return saved && saved.date === date && saved.location === location
            ? saved.active
            : 0
    }

    const [active, setActive] = useState<number>(chooseInitial)

    useEffect(() => {
        const saved = read()
        setActive(
            saved && saved.date === date && saved.location === location
                ? saved.active
                : 0
        )
    }, [date, location])

    useEffect(() => {
        localStorage.setItem(
            storageKey,
            JSON.stringify({ date, location, active })
        )
    }, [date, location, active])

    return [active, setActive]
}

const TradeBotTable: React.FC<Props> = ({ user, date, location}) => {
    const [active, setActive] = useLocalStorageActive(TB_KEY, date, location)
    const [prevActive, setPrevActive] = useState(active)

    const { data: entries = [], isLoading } = useTradeBotQuery(user.uid, date)

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
            <Typography sx={{m: 2, textAlign: 'center'}}>
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
        <Box sx={{ display: 'flex', mb: 2, alignItems: 'stretch'}}>
            <Box sx={{ display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 1 }}>
                <IconButton onClick={goPrev} disabled={active === 0} size='small' sx={{mr: 1}}>
                    <KeyboardArrowUpIcon />
                </IconButton>
                <Box ref={tabsContainerRef}
                     sx={{ maxHeight: '570px',
                         minWidth: 110,
                         ...scrollbarSx,
                     }}
                >
                    <Tabs orientation='vertical'
                          variant="standard"
                          value={active}
                          onChange={(_, i) => { setPrevActive(active); setActive(i) }}
                          sx={{
                              '& .MuiTabs-indicator': {left: 0, width: 3, background: 'primary.main'},
                              '& .MuiTab-root': {px: 1.5, textTransform: 'none', fontSize: 13},
                              '& .MuiTab-root.Mui-selected': {fontWeight: 600, color: 'primary.main'},
                          }}
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
            <Box sx={{
                flex: 1,
                pl: 2,
                display: "flex",
                flexDirection: "column"}}
            >
                <Typography
                    variant="h6"
                    gutterBottom
                    style={{
                        backgroundColor:
                            marketState.description !== prevEntry?.marketState.description
                                ? "rgba(255,235,59,0.3)"
                                : undefined,
                    }}
                >
                    Range: {marketState.description}
                </Typography>
                <Typography
                  sx={{ mb: 1 }}
                  style={{
                    backgroundColor:
                      availableCash !== prevEntry?.availableCash
                        ? "rgba(255,235,59,0.3)"
                        : undefined,
                  }}
                >
                  Available Cash: {availableCash.toFixed(2)}
                </Typography>
                <Typography
                  sx={{ mb: 2 }}
                  style={{
                    backgroundColor:
                      yesProb !== prevEntry?.marketState.yesProbability
                        ? "rgba(255,235,59,0.3)"
                        : undefined,
                  }}
                >
                  Probability (Yes / No): {yesProb.toFixed(4)} / {noProb.toFixed(4)}
                </Typography>
                <Typography variant="subtitle1" sx={{marginBottom: 1}}>Desired State</Typography>
                <TableContainer component={Paper} sx={{mb: 2}}>
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
                                            style={{
                                                backgroundColor:
                                                    d.side !== prevD.side ? "rgba(255,235,59,0.3)" : undefined,
                                            }}
                                        >
                                            {d.side}
                                        </TableCell>
                                        <TableCell
                                            style={{
                                                backgroundColor:
                                                    d.amount !== prevD.amount ? "rgba(255,235,59,0.3)" : undefined,
                                            }}
                                        >
                                            {d.amount ?? "-"}
                                        </TableCell>
                                        <TableCell
                                            style={{
                                                backgroundColor:
                                                    d.size !== prevD.size ? "rgba(255,235,59,0.3)" : undefined,
                                            }}
                                        >
                                            {d.size ?? "-"}
                                        </TableCell>
                                        <TableCell
                                            style={{
                                                backgroundColor:
                                                    d.limitPrice !== prevD.limitPrice
                                                        ? "rgba(255,235,59,0.3)"
                                                        : undefined,
                                            }}
                                        >
                                            {d.limitPrice ?? "-"}
                                        </TableCell>
                                        <TableCell
                                            style={{
                                                backgroundColor:
                                                    d.outcome !== prevD.outcome ? "rgba(255,235,59,0.3)" : undefined,
                                            }}
                                        >
                                            {d.outcome}
                                        </TableCell>
                                        <TableCell
                                            sx={{ maxWidth: 200, whiteSpace: "normal", wordBreak: "break-all" }}
                                            style={{
                                                backgroundColor:
                                                    errors?.[i] !== prevError ? "rgba(255,235,59,0.3)" : undefined,
                                            }}
                                        >
                                            {errors?.[i] ?? "-"}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Typography variant="subtitle1" sx={{marginBottom: 1}}>Market Bets</Typography>
                <TableContainer component={Paper} sx={{mb: 2}}>
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
                                    style={{
                                        backgroundColor:
                                            marketState?.noToken?.netPrice !== prevEntry?.marketState?.noToken?.netPrice
                                                ? "rgba(255,235,59,0.3)"
                                                : undefined,
                                    }}
                                >
                                    {Number.isFinite(marketState?.noToken?.netPrice)
                                        ? marketState?.noToken?.netPrice?.toFixed(4)
                                        : "–"}
                                </TableCell>
                                <TableCell
                                    style={{
                                        backgroundColor:
                                            marketState?.noToken?.quantity !== prevEntry?.marketState?.noToken?.quantity
                                                ? "rgba(255,235,59,0.3)"
                                                : undefined,
                                    }}
                                >
                                    {marketState.noToken.quantity}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Yes</TableCell>
                                <TableCell
                                    style={{
                                        backgroundColor:
                                            marketState?.yesToken?.netPrice !== prevEntry?.marketState?.yesToken?.netPrice
                                                ? "rgba(255,235,59,0.3)"
                                                : undefined,
                                    }}
                                >
                                    {Number.isFinite(marketState.yesToken.netPrice)
                                        ? marketState?.yesToken?.netPrice?.toFixed(4)
                                        : "–"}
                                </TableCell>
                                <TableCell
                                    style={{
                                        backgroundColor:
                                            marketState?.yesToken?.quantity !== prevEntry?.marketState?.yesToken?.quantity
                                                ? "rgba(255,235,59,0.3)"
                                                : undefined,
                                    }}
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
                    <TableContainer component={Paper} sx={{mb: 2, overflowX: 'auto'}}>
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
                                                style={{backgroundColor: (ord.orderId || ord.id) !== (prevOrd.orderId || prevOrd.id) ? "rgba(255,235,59,0.3)" : undefined,
                                                }}
                                            >
                                                {ord.orderId || ord.id || '-'}
                                            </TableCell><TableCell style={{backgroundColor:
                                                ord.side !== prevOrd.side ? "rgba(255,235,59,0.3)"
                                                    : undefined,
                                        }}>{ord.side}</TableCell><TableCell style={{
                                            backgroundColor:
                                                ord.size !== prevOrd.size ? "rgba(255,235,59,0.3)"
                                                    : undefined,
                                        }}>{ord.size}</TableCell><TableCell style={{
                                            backgroundColor:
                                                ord.limitPrice !== prevOrd.limitPrice ? "rgba(255,235,59,0.3)"
                                                    : undefined,
                                        }}
                            >
                                {ord.limitPrice ?? '-'}
                                </TableCell>
                                <TableCell>{outcome}</TableCell>
                                <TableCell style={{
                                    backgroundColor:
                                        ord.status !== prevOrd.status
                                            ? "rgba(255,235,59,0.3)"
                                            : undefined,
                                }}
                                >
                                    {ord.status ?? '-'}
                                </TableCell>
                                    </TableRow>
                            )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="textSecondary" sx={{mb: 2}}>
                        No active orders
                    </Typography>
                )}
                <Accordion sx={{ mt: 1,
                    boxShadow: 'none'}}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{fontWeight: 'bold'}}>
                        No Token Order Book
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="subtitle2" sx={{marginBottom: 1}}>Asks:</Typography>
                        <TableContainer component={Paper} sx={{ mb: 2 }}>
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
                        <Typography variant="subtitle2" sx={{marginBottom: 1}}>Bids:</Typography>
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
                <Accordion sx={{ mt: 1,
                        boxShadow: 'none'}}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{fontWeight: 'bold'}}>
                        Yes Token Order Book
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="subtitle2" sx={{marginBottom: 1}}>Asks:</Typography>
                        <TableContainer component={Paper} sx={{mb: 2}}>
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
                        <Typography variant="subtitle2" sx={{marginBottom: 1}}>Bids:</Typography>
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