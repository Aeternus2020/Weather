import type { Timestamp } from "firebase/firestore"

export interface DesiredStateItem {
    amount: number | null
    description: string
    limitPrice: number | null
    outcome: string
    side: string
    size: number | null
    type: string
}

export interface AskBidItem {
    amount: number
    price: number
}

export interface TokenState {
    netPrice: number
    quantity: number
    tokenId: string
    asks: AskBidItem[]
    bids: AskBidItem[]
}

export interface OrderType {
    orderId?: string;
    id?: string;
    side: string;
    size: number;
    limitPrice?: number;
    status?: string;
    tokenId: string;
}

export interface MarketState {
    description: string
    marketId: string
    configId?: string
    minTickSize: number
    closed: boolean
    orders?: OrderType[]
    peerMarketIds: string[]
    yesProbability: number
    noProbability?: number
    yesToken: TokenState
    noToken: TokenState
}

export interface TradeBotLog {
    id: string
    timestamp: Timestamp
    availableCash: number
    desiredState: DesiredStateItem[]
    errors: string[]
    marketState: MarketState
}

