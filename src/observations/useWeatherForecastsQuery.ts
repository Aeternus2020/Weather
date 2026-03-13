import { useQuery } from '@tanstack/react-query'
import type { ForecastPoint, WeatherForecast } from './typesWeatherObservations'
import { db } from '../firebase'
import { logQueryError } from './queryError'
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
    Timestamp,
} from 'firebase/firestore'

function normalizeForecastPoints(value: unknown): ForecastPoint[] {
    if (!Array.isArray(value)) {
        return []
    }

    return value.flatMap((candidate) => {
        if (!isRecord(candidate) || !isRecord(candidate.time)) {
            return []
        }

        const seconds = candidate.time.seconds
        const temp = candidate.temp
        const probability = candidate.probability as ForecastPoint['probability'] | undefined

        if (!isFiniteNumber(seconds) || !isFiniteNumber(temp)) {
            return []
        }

        return [{
            time: { seconds },
            temp,
            probability: probability ?? null,
        }]
    })
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

export function useWeatherForecastsQuery(
    date: string,
    location: string,
) {
    return useQuery<WeatherForecast[], Error>({
        queryKey: ['weather-forecasts', date, location],
        queryFn: async () => {
            try {
                const dayStart = Timestamp.fromDate(new Date(`${date}T00:00:00Z`))
                const dayEnd   = Timestamp.fromDate(new Date(`${date}T23:59:59Z`))

                const collRef = collection(db, 'weather-forecasts')
                const q = query(
                    collRef,
                    where('location',  '==', location),
                    where('timestamp', '>=', dayStart),
                    where('timestamp', '<',  dayEnd),
                    orderBy('timestamp', 'asc'),
                )

                const snap = await getDocs(q)
                const data = snap.docs.map((doc) => {
                    const raw = doc.data()
                    const forecast: WeatherForecast = {
                        id: doc.id,
                        source: raw.source,
                        location: raw.location,
                        timestamp: raw.timestamp,
                        forecast: normalizeForecastPoints(raw.forecast),
                    }

                    return forecast
                })
                    .filter((forecast) => forecast.forecast.length > 0)

                return data
            } catch (error) {
                logQueryError('weather-forecasts', error)
                throw error
            }
        },
        enabled: Boolean(date && location),
        refetchOnReconnect: true,
    })
}
