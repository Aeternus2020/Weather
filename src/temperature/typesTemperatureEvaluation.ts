export interface BasedOnItem {
    evaluator: string
    data: string
    timestamp: object
    p?: Record<string, number>
}

export interface TemperatureEvaluation {
    id: string
    timestamp?: object
    basedOn?: BasedOnItem[]
    p?: Record<string, number>
    dateInQuestion: string
    location: string
}