import { useQuery } from '@tanstack/react-query'
import type { TemperatureEvaluation } from './typesTemperatureEvaluation'
import { db } from '../firebase'
import { logQueryError } from '../observations/queryError'
import {
    collection,
    getDocs,
    query,
    type QueryDocumentSnapshot,
    where,
} from 'firebase/firestore'

function mapTemperatureEvaluationDoc(
    doc: QueryDocumentSnapshot,
): TemperatureEvaluation {
    const raw = doc.data()

    return {
        id: doc.id,
        timestamp: raw.timestamp,
        basedOn: raw.basedOn,
        p: raw.p,
        dateInQuestion: raw.dateInQuestion,
        location: raw.location,
    }
}

export function useTemperatureEvaluationQuery(
    date: string,
    location: string,
) {
    return useQuery<TemperatureEvaluation[], Error>({
        queryKey: ['temperature-evaluation', date, location],
        queryFn: async () => {
            try {
                const q = query(
                    collection(db, 'temperature-evaluation-log'),
                    where('dateInQuestion', '==', date),
                    where('location', '==', location),
                )

                const snap = await getDocs(q)

                const data = snap.docs
                    .map(mapTemperatureEvaluationDoc)
                    .sort((left, right) => left.id.localeCompare(right.id))

                return data
            } catch (error) {
                logQueryError('temperature-evaluation', error)
                throw error
            }
        },

        enabled: Boolean(date && location),
        refetchOnReconnect: true,
    })
}
