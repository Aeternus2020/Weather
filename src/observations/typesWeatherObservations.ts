
export type Time = {
    seconds: number
    nanoseconds?: number
}

export type WeatherObservations = {
    id: string
    date: string
    location: string
    source: string
    temp: number
    time: Time
    timestamp: string
}

export interface ForecastPoint {
    time: {
        seconds: number
    }
    temp: number
    probability: number | null
}

export interface WeatherForecast {
    id: string
    source: string
    location: string
    timestamp: {
        seconds: number
    }
    forecast: ForecastPoint[]
}

export type GraphDataPoint = {
    x: Date
    y: number
    time: string
    source: string
    location: string
    timestamp: string | { seconds: number; nanoseconds?: number }
}

export interface CustomLinesLayerProps {
    series: Array<{ id: string; data: GraphDataPoint[]; color: string }>
    xScale: (d: Date) => number
    yScale: (d: number) => number
    lineGenerator: (pts: { x: number; y: number }[]) => string
}