import { useQuery } from '@tanstack/react-query'
import type { TemperatureEvaluation } from './typesTemperatureEvaluation'
import type { User } from 'firebase/auth'
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
    user: User | null,
    date: string,
) {
    return useQuery<TemperatureEvaluation[], Error>({
        queryKey: ['temperature-evaluation', user?.uid, date],
        queryFn: async () => {
            if (!user) return []

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

        enabled: Boolean(user),
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
    })
}
