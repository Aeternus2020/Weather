import { useQuery } from '@tanstack/react-query'
import type {WeatherObservations} from './typesWeatherObservations'
import { db } from '../firebase'
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
    Timestamp,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'

export function useWeatherObservationsQuery(
    date: string,
) {
    return useQuery<WeatherObservations[], Error>({
        queryKey: ['weather-observations', date],
        queryFn: async () => {
            const dayStart = Timestamp.fromDate(new Date(`${date}T00:00:00Z`))
            const dayEnd   = Timestamp.fromDate(new Date(`${date}T23:59:59Z`))

            const collRef = collection(db, 'weather-observations')
            const q = query(
                collRef,
                where('time', '>=', dayStart),
                where('time', '<=', dayEnd),
                orderBy('time', 'asc'),
            )

            const snap = await getDocs(q)
            const data = snap.docs.map((doc: QueryDocumentSnapshot) => ({
                id: doc.id,
                ...(doc.data() as Omit<WeatherObservations, 'id'>),
            }))

            return data
        },
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
    })
}
