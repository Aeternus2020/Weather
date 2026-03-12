import { useQuery } from '@tanstack/react-query'
import type { TemperatureEvaluation } from './typesTemperatureEvaluation'
import { db } from '../firebase'
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'

export function useTemperatureEvaluationQuery(
    date: string,
) {
    return useQuery<TemperatureEvaluation[], Error>({
        queryKey: ['temperature-evaluation', date],
        queryFn: async () => {
            const q = query(
                collection(db, 'temperature-evaluation-log'),
                where('dateInQuestion', '==', date),
                orderBy('__name__')
            )

            const snap = await getDocs(q)

            const data = snap.docs.map((doc: QueryDocumentSnapshot) => ({
                id: doc.id,
                ...(doc.data() as Omit<TemperatureEvaluation, 'id'>),
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
