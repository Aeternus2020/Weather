import { useQuery } from '@tanstack/react-query'
import type {WeatherObservations} from './typesWeatherObservations'
import { db } from '../firebase'
import { logQueryError } from './queryError'
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
    Timestamp,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'

function mapWeatherObservationDoc(doc: QueryDocumentSnapshot): WeatherObservations {
    const raw = doc.data()

    return {
        id: doc.id,
        date: raw.date,
        location: raw.location,
        source: raw.source,
        temp: raw.temp,
        time: raw.time,
        timestamp: raw.timestamp,
    }
}

export function useWeatherObservationsQuery(
    date: string,
    location: string,
) {
    return useQuery<WeatherObservations[], Error>({
        queryKey: ['weather-observations', date, location],
        queryFn: async () => {
            try {
                const dayStart = Timestamp.fromDate(new Date(`${date}T00:00:00Z`))
                const dayEnd   = Timestamp.fromDate(new Date(`${date}T23:59:59Z`))

                const collRef = collection(db, 'weather-observations')
                const q = query(
                    collRef,
                    where('location', '==', location),
                    where('time', '>=', dayStart),
                    where('time', '<=', dayEnd),
                    orderBy('time', 'asc'),
                )

                const snap = await getDocs(q)
                const data = snap.docs.map(mapWeatherObservationDoc)

                return data
            } catch (error) {
                logQueryError('weather-observations', error)
                throw error
            }
        },
        enabled: Boolean(date && location),
        refetchOnReconnect: true,
    })
}
