export interface TimestampValue {
    seconds: number
    nanoseconds?: number
}

export interface BasedOnItem {
    evaluator: string
    data: string
    timestamp: TimestampValue
    p: Record<string, number>
}

export interface TemperatureEvaluation {
    id: string
    timestamp: TimestampValue
    basedOn: BasedOnItem[]
    p: Record<string, number>
    dateInQuestion: string
    location: string
}
