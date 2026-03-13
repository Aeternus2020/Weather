export interface QueryErrorInfo {
    summary: string
    details?: string
}

type ErrorWithCode = Error & {
    code?: string
}

function getErrorWithCode(error: unknown): ErrorWithCode | null {
    if (!(error instanceof Error)) {
        return null
    }

    return error as ErrorWithCode
}

export function getQueryErrorInfo(error?: Error | null): QueryErrorInfo {
    const message = error?.message?.trim()

    if (!message) {
        return {
            summary: 'Data is temporarily unavailable.',
            details: 'Please try again in a moment.',
        }
    }

    if (/requires an index/i.test(message)) {
        return {
            summary: 'Weather data is temporarily unavailable.',
            details: 'Please try again in a few minutes.',
        }
    }

    if (/network request failed|failed to fetch|network error|offline/i.test(message)) {
        return {
            summary: 'Unable to connect right now.',
            details: 'Check your internet connection and try again.',
        }
    }

    return {
        summary: 'Something went wrong while loading data.',
        details: 'Please try again in a moment.',
    }
}

export function logQueryError(scope: string, error: unknown) {
    if (!import.meta.env.DEV) {
        return
    }

    const resolved = getErrorWithCode(error)

    console.error(`[${scope}] Query failed`, {
        code: resolved?.code,
        name: resolved?.name,
        message: resolved?.message,
    })
}
