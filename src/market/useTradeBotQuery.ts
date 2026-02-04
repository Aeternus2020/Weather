import { useQuery } from '@tanstack/react-query'
import type {TradeBotLog} from "./typesTradeBot";
import { db } from '../firebase'
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
    type QueryDocumentSnapshot,
} from 'firebase/firestore'

export function useTradeBotQuery(userId: string | null, date: string) {
    return useQuery<TradeBotLog[], Error>({
        queryKey: ['tradeBot', userId, date],
        queryFn: async () => {
            if (!userId) return [];

            const [year, month, day] = date.split('-').map(Number);
            const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
            const endUtc   = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

            const q = query(
                collection(db, 'trade-bot-log'),
                where('timestamp', '>=', startUtc),
                where('timestamp', '<',  endUtc),
                orderBy('timestamp', 'asc'),
            );
            const snap = await getDocs(q);

            return snap.docs.map((doc: QueryDocumentSnapshot) => ({
                id: doc.id,
                ...(doc.data() as Omit<TradeBotLog, 'id'>),
            }));
        },
        enabled: Boolean(userId),
        staleTime: Infinity,
        gcTime:    Infinity,
        refetchOnWindowFocus: true,
        refetchOnMount:       true,
        refetchOnReconnect:   true,
    });
}
