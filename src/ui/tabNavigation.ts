import { Dispatch, SetStateAction, useEffect, useState } from "react"

export const TAB_HEIGHT = 48

export const scrollbarSx = {
    overflowY: 'auto',
    "&::-webkit-scrollbar": {
        width: 12,
    },
    "&::-webkit-scrollbar-track": {
        backgroundColor: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
        backgroundColor: "grey.400",
        borderRadius: 3,
    },
    "&::-webkit-scrollbar-thumb:hover": {
        backgroundColor: "primary.main",
    },
}

export function useLocalStorageActive(
    storageKey: string,
    date: string,
    location: string
): [number, Dispatch<SetStateAction<number>>] {
    type Saved = { date: string; location: string; active: number }

    const read = (): Saved | null => {
        try {
            const obj = JSON.parse(localStorage.getItem(storageKey) || "null")
            if (
                obj &&
                typeof obj.date === "string" &&
                typeof obj.location === "string" &&
                typeof obj.active === "number"
            ) {
                return obj as Saved
            }
        } catch {
            return null
        }

        return null
    }

    const chooseInitial = (): number => {
        const saved = read()

        return saved && saved.date === date && saved.location === location
            ? saved.active
            : 0
    }

    const [active, setActive] = useState<number>(chooseInitial)

    useEffect(() => {
        const saved = read()

        setActive(
            saved && saved.date === date && saved.location === location
                ? saved.active
                : 0
        )
    }, [date, location])

    useEffect(() => {
        localStorage.setItem(
            storageKey,
            JSON.stringify({ date, location, active })
        )
    }, [date, location, active])

    return [active, setActive]
}
