import React, {useEffect, useMemo, useRef, useState} from "react"
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    TableContainer,
    CircularProgress,
    Typography,
    Tabs,
    Tab,
    Box,
    IconButton,
} from "@mui/material"
import Tooltip from "@mui/material/Tooltip"
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import type { User } from "firebase/auth"
import { useTemperatureEvaluationQuery } from "./useTemperatureEvaluationQuery"
import type {BasedOnItem} from "./typesTemperatureEvaluation"
import {convertBoundsToC} from "../observations/components/FahrenheitLinesLayer"
import {isEqual } from "lodash"
import {scrollbarSx, useLocalStorageActive} from "../market/TradeBotTable"

interface Props {
    user: User
    date: string
    location: string
    setDistributions: (arr: Array<Record<string, number>>) => void
}

export const formatTime = (id: string) => {
    const iso = id.split("_", 3)[2]
    const d = new Date(iso)
    return isNaN(d.getTime()) ? "–" : d.toLocaleTimeString()
}

export const TAB_HEIGHT = 48

const TE_KEY = 'temperatureEvaluation:lastActiveMap'

type Bucket = { key: string; labelF: string; labelC: string }

const TemperatureEvaluationTable: React.FC<Props> = ({
    user,
    date,
    location,
    setDistributions
    }) => {
    const [active, setActive] = useLocalStorageActive(TE_KEY, date, location)
    const [prevActive, setPrevActive] = useState(active)
    const { data: entries = [], isLoading } = useTemperatureEvaluationQuery(user, date)

    const reversedEntries = useMemo(() => {
        return entries
            .filter(e => e.location === location)
            .slice()
            .reverse()
    }, [entries, location])

    const total = reversedEntries.length

    useEffect(() => {
        setPrevActive(0)
    }, [date])

    const prev = useMemo(() => {
        return (prevActive >= 0 && prevActive < total)
            ? reversedEntries[prevActive]
            : null
    }, [prevActive, reversedEntries, total])

    const {
        basedArr,
        anyWithP,
        buckets,
        diffMatrix,
        dataChanged
    } = useMemo(() => {
        const current = reversedEntries[active]
        const basedArr: BasedOnItem[] = current?.basedOn ?? []
        const anyWithP = basedArr.find(b => b.p && Object.keys(b.p).length) || null
        const pKeys = anyWithP ? Object.keys(anyWithP.p!).sort((a, b) => parseFloat(a) - parseFloat(b)) : []

        const buckets: Bucket[] = pKeys.map(key => {
            const [minStr, maxStr] = key.split("..")
            const hasMin = minStr === "-999F"
            const hasMax = maxStr === "999F"
            const minF   = hasMin ? -999 : parseFloat(minStr.replace("F", ""))
            const maxF   = hasMax ?  999 : parseFloat(maxStr.replace("F", ""))
            const [cMin, cMax] = convertBoundsToC(minF, maxF, location)
            const labelF = `${hasMin ? "-∞" : minF}…${hasMax ? "∞" : maxF}°F`
            const labelC = `${hasMin ? "-∞" : cMin}…${hasMax ? "∞" : cMax}°C`
            return { key, labelF, labelC }
        })

        const diffMatrix = buckets.map(b =>
            basedArr.map((item, idx) => {
                const cur = item.p?.[b.key] ?? null
                const prevVal = prev?.basedOn?.[idx]?.p?.[b.key] ?? null
                if (cur === null && prevVal === null) return false
                if (item.evaluator === 'certain') return cur !== prevVal
                const curPct = cur != null ? Math.round(cur * 100) : null
                const prevPct = prevVal != null ? Math.round(prevVal * 100) : null
                return curPct !== prevPct
            })
        )

        const dataChanged = basedArr.map((item, idx) => {
            const curNorm = (item.data ?? "").trim()
            const prevNorm = (prev?.basedOn?.[idx]?.data ?? "").trim()
            return curNorm !== prevNorm
        })

        return { basedArr, anyWithP, pKeys, buckets, diffMatrix, dataChanged }
    }, [reversedEntries, active, prev])

    const distArr = useMemo(
        () => basedArr.map(it => it.p ?? {}),
        [basedArr]
    )

    const prevRef = useRef<typeof distArr | null>(null)
    useEffect(() => {
        if (!isEqual(prevRef.current, distArr)) {
            setDistributions(distArr)
            prevRef.current = distArr
        }
        }, [distArr, setDistributions])

    const tabsContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const c = tabsContainerRef.current

        if (c) {
            const top = active * TAB_HEIGHT
            const bottom = top + TAB_HEIGHT
            if (top < c.scrollTop) c.scrollTop = top
            else if (bottom > c.scrollTop + c.clientHeight) c.scrollTop = bottom - c.clientHeight
        }
    }, [active])

    if (isLoading) return <CircularProgress />
    if (!reversedEntries.length) {
        return (
            <Typography sx={{m: 2, textAlign: "center"}}>
                <strong>Temperature Evaluation: </strong>No data for
                <strong> {location}</strong> on
                <strong> {date}</strong>.
            </Typography>
        )

        }

    if (!anyWithP) return <Typography>No distributions for {date}.</Typography>

    const goPrev = () => { setPrevActive(active); setActive(a => Math.max(0, a - 1)) }
    const goNext = () => { setPrevActive(active); setActive(a => Math.min(total - 1, a + 1)) }

    const current = reversedEntries[active]

    return (
        <Box sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 1,
            maxWidth: 1200,
        }}>
            <Typography variant="h4" sx={{margin: 2}} gutterBottom>
                Temperature Evaluation Log
            </Typography>
        <Box sx={{ mb: 1, display: "flex" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: 1 }}>
                <IconButton onClick={goPrev} disabled={active === 0} size="small">
                    <KeyboardArrowUpIcon />
                </IconButton>
                <Box
                    ref={tabsContainerRef}
                    sx={{
                        maxHeight: "570px",
                        minWidth: 110,
                        ...scrollbarSx,
                    }}
                >
                    <Tabs
                        orientation="vertical"
                        variant="standard"
                        value={active}
                        onChange={(_, i) => {
                            setPrevActive(active)
                            setActive(i)
                        }}
                        sx={{
                            "& .MuiTabs-indicator": { left: 0, width: 3, background: "primary.main" },
                            "& .MuiTab-root": { px: 1.5, textTransform: "none", fontSize: 13 },
                            "& .MuiTab-root.Mui-selected": { fontWeight: 600, color: "primary.main" },
                        }}
                    >
                        {reversedEntries.map(e => (
                            <Tab key={e.id} label={formatTime(e.id)} disableRipple />
                        ))}
                    </Tabs>
                </Box>
                <IconButton onClick={goNext} disabled={active === total - 1} size="small">
                    <KeyboardArrowDownIcon />
                </IconButton>
            </Box>

            <Box sx={{ width: "100%" }}>
                <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%",height: "40px", marginBottom: "10px"}}>
                <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, a: "5px" }}>
                    <Typography variant="body2">DateInQuestion:</Typography>
                    <Typography variant="h6">{current!.dateInQuestion}</Typography>
                    <Typography variant="body2">Location:</Typography>
                    <Typography variant="h6">{current!.location}</Typography>
                </Box>
                </Box>
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ minWidth: 100 }}>Range (°C)</TableCell>
                                {basedArr.map(it => (
                                    <TableCell key={it.evaluator}>{it.evaluator}</TableCell>
                                ))}
                                <TableCell>overall</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {buckets.map((b, bi) => (
                                <TableRow key={b.key}>
                                    <TableCell sx={{ minWidth: 115, userSelect: "none" }}>
                                        <Tooltip title={b.labelC} arrow placement="right">
                                            <span>{b.labelF}</span>
                                        </Tooltip>
                                    </TableCell>
                                    {basedArr.map((item, ej) => {
                                        const p = item.p?.[b.key]
                                        let display: string | number = "–"

                                        if (
                                            item.evaluator === "forecast" ||
                                            item.evaluator === "temperature prediction model"
                                        ) {
                                            display = `${Math.round((p ?? 0) * 100)}%`
                                        } else if (item.evaluator === "maxTempReached" && typeof p === "number") {
                                            const fixed = p.toFixed(1)
                                            display = fixed.endsWith(".0")
                                                ? fixed.slice(0, -2)
                                                : fixed
                                        } else if (item.evaluator === "certain" && p != null) {
                                            display = p
                                        }
                                        const changed = diffMatrix[bi][ej]
                                        return (
                                            <TableCell
                                                key={ej}
                                                sx={{ backgroundColor: changed ? "rgba(255,235,59,0.3)" : "inherit" }}
                                            >
                                                {display}
                                            </TableCell>
                                        )
                                    })}
                                    <TableCell>
                                        {current!.p && current!.p[b.key] != null
                                            ? `${Math.round(current!.p[b.key]! * 100)}%`
                                            : "–"}
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                                 {basedArr.map((it, ej) => (
                                   <TableCell
                                     key={it.evaluator}
                                     style={{
                                       backgroundColor: dataChanged[ej]
                                         ? "rgba(255,235,59,0.3)"
                                         : undefined
                                     }}
                                   >
                                     {it.data || "–"}
                                   </TableCell>
                                 ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
        </Box>
    )
}

export default TemperatureEvaluationTable