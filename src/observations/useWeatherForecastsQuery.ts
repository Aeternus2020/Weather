import { useQuery } from '@tanstack/react-query'
import type {WeatherForecast} from './typesWeatherObservations'
import { db } from '../firebase'
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
    Timestamp,
} from 'firebase/firestore'

export function useWeatherForecastsQuery(
    userId: string | null,
    date: string,
    location: string,
) {
    return useQuery<WeatherForecast[], Error>({
        queryKey: ['weather-forecasts', userId, date, location],
        queryFn: async () => {
            if (!userId) return []

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
                return {
                    id: doc.id,
                    source: raw.source,
                    location: raw.location,
                    timestamp: raw.timestamp,
                    forecast: raw.forecast ?? [],
                } as WeatherForecast
            })
                .filter(f => Array.isArray(f.forecast) && f.forecast.length > 0)

            return data
        },
        enabled: !!userId,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
    })
}
