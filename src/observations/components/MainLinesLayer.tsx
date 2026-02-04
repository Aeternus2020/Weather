import {CustomLinesLayerProps} from "../typesWeatherObservations"
import React from "react"

const TARGET_IDS = [
    'tgftp.nws.noaa.gov - London',
    'tgftp.nws.noaa.gov - NY',
]

export const MainLinesLayer = (props: CustomLinesLayerProps) => {
    const { series, xScale, yScale, lineGenerator } = props

    return (
        <>
            {series.map((serie: any) => {
                const { id, data, color } = serie
                const isTarget = TARGET_IDS.includes(id)

                const path = lineGenerator(
                    data.map((pt: any) => ({
                        x: xScale(pt.data.x),
                        y: yScale(pt.data.y),
                    }))
                )

                return (
                    <g key={id}>
                        <path
                            d={path}
                            fill="none"
                            stroke={isTarget ? '#000000' : color}
                            strokeOpacity={isTarget ? 1 : 0.4}
                            vectorEffect="non-scaling-stroke"
                            strokeWidth={isTarget ? 4 : 2}
                            strokeDasharray={isTarget ? '15,4' : undefined}
                        />

                        {isTarget &&
                            data.map((pt: any, idx: number) => (
                                <circle
                                    key={idx}
                                    cx={xScale(pt.data.x)}
                                    cy={yScale(pt.data.y)}
                                    r={4}
                                    fill="#ffffff"
                                    stroke={color}
                                    strokeWidth={1}
                                    vectorEffect="non-scaling-stroke"
                                />
                            ))}
                    </g>
                )
            })}
        </>
    )
}
