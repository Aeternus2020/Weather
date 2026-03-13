import {Layer} from "@nivo/line"
import { ScaleLinear } from "d3-scale"
import { useMemo } from "react"

export const cToF = (c: number) => c * 9 / 5 + 32
export const fToC = (f: number) => (f - 32) * 5 / 9

function truncateToWholeC(
    start: number,
    end: number
): [number, number] {
    const ceilInt   = (x: number): number => Math.ceil(x)
    const floorInt  = (x: number): number => Math.floor(x)
    const roundInt  = (x: number): number => Math.round(x)

    const toCRounded = (f: number): number | null => {
        if (f === 999 || f === -999) return f

        const cRounded = roundInt(fToC(f))
        if (roundInt(cToF(cRounded)) !== f) return null
        return cRounded
    }

    if (start === -999) {
        const b = toCRounded(end) ?? floorInt(fToC(end))
        return [-999, b]
    }

    if (end === 999) {
        const a = toCRounded(start) ?? ceilInt(fToC(start))
        return [a, 999]
    }

    const t1 = toCRounded(start) ?? toCRounded(end)
    const t2 = toCRounded(end)   ?? toCRounded(start)

    if (t1 == null || t2 == null) {
        throw new Error("Both bounds are not convertible to whole Celsius values")
    }

    return [t1, t2]
}

export function convertBoundsToC(
    minF: number,
    maxF: number,
    location: string
): [number, number] {
    if (location === "London") return truncateToWholeC(minF, maxF)

    const toC = (f: number): number => {
        if (f === 999 || f === -999) return f
        return Math.round(fToC(f))
    }

    return [toC(minF), toC(maxF)]
}

export function useFahrenheitLinesLayer(
    unit: "C" | "F",
    distributions: Array<Record<string, number>>,
    location: string = "London"
): Layer {

    return useMemo<Layer>(() => {

        type Segment = { minF: number; maxF: number, cMin: number; cMax: number }
        type DistMap = Record<string, number>


        const distMap: DistMap = (distributions?.[0] ?? {}) as DistMap

        const segments: Segment[] = []
        const boundariesC = new Set<number>()
        const boundariesF = new Set<number>()

        for (const key of Object.keys(distMap)) {
            const [minStr, maxStr] = key.split("..")
            const minF = minStr === "-999F" ? -999 : parseFloat(minStr)
            const maxF = maxStr ===  "999F" ?  999 : parseFloat(maxStr)

            if (!Number.isFinite(minF) || !Number.isFinite(maxF)) {
                continue
            }

            const [cMinRaw, cMaxRaw] = convertBoundsToC(minF, maxF, location)
            const cMin = Math.round(cMinRaw)
            const cMax = Math.round(cMaxRaw)

            segments.push({ minF, maxF, cMin, cMax })
            if (cMin !== -999) boundariesC.add(cMin - 0.5)
            if (minF !== -999) boundariesF.add(minF - 0.5)
        }
        const bounds =
            unit === "C"
                ? [...boundariesC].sort((a, b) => a - b)
                : [...boundariesF].sort((a, b) => a - b)

        return ({
                    innerWidth,
                    yScale,
                }: {
            innerWidth: number
            yScale    : ScaleLinear<number, number>
            xScale    : unknown
            series    : unknown
        }) => {

            const [d0, d1] = yScale.domain()
            if (!Number.isFinite(d0) || !Number.isFinite(d1)) return null

            let [minY, maxY] = [d0, d1]
            if (minY > maxY) [minY, maxY] = [maxY, minY]

            const visibleSegments = segments
                .filter(seg => {
                    const lower = unit === "C" ? seg.cMin - 0.5 : seg.minF - 0.5
                    const upper = unit === "C" ? seg.cMax + 0.5 : seg.maxF + 0.5
                    return !(upper < minY || lower > maxY)
                })

                .sort((a, b) => {
                    const aMid = unit === "C"
                        ? (a.cMin + a.cMax) / 2
                        : (a.minF + a.maxF) / 2
                    const bMid = unit === "C"
                        ? (b.cMin + b.cMax) / 2
                        : (b.minF + b.maxF) / 2
                    return aMid - bMid
                })

            return (
                <g>
                    {bounds.map((val, idx) => {
                        if (val < minY || val > maxY) return null
                        const yPix = yScale(val)
                        return (
                            <line
                                key={idx}
                                x1={-5}
                                x2={innerWidth}
                                y1={yPix}
                                y2={yPix}
                                stroke="rgba(221,0,0,0.5)"
                                strokeDasharray="10 3"
                                strokeWidth={1}
                            />
                        )
                    })}

                    {visibleSegments.map((seg, idx) => {
                        const lower = unit === "C"
                            ? seg.cMin - 0.5
                            : seg.minF - 0.5
                        const upper = unit === "C"
                            ? seg.cMax + 0.5
                            : seg.maxF + 0.5

                        const rawYMid = (yScale(lower) + yScale(upper)) / 2

                        const label = unit === "C"
                            ? `${seg.cMin}…${seg.cMax} °C`
                            : `${seg.minF}…${seg.maxF} °F`

                        return (
                            <text
                                key={idx}
                                x={8}
                                y={rawYMid}
                                dy={unit === 'C' && seg.cMax - seg.cMin === 1 ? '2.5em' : '0.35em'}
                                fontSize={15}
                                fill="rgba(221,0,0,0.3)"
                                textAnchor="start"
                            >
                                {label}
                            </text>
                        )
                    })}
                </g>
            )
        }
    }, [distributions, unit, location])
}
