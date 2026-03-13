import { Dispatch, SetStateAction, useEffect, useState } from "react"

export const TAB_HEIGHT = 48

type SavedTabState = {
  date: string
  location: string
  active: number
}

function sanitizeActive(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0
}

function readSavedTabState(storageKey: string): SavedTabState | null {
  try {
    const obj = JSON.parse(localStorage.getItem(storageKey) || "null")
    if (
      obj &&
      typeof obj.date === "string" &&
      typeof obj.location === "string" &&
      typeof obj.active === "number"
    ) {
      return {
        date: obj.date,
        location: obj.location,
        active: sanitizeActive(obj.active),
      }
    }
  } catch {
    // ignore invalid localStorage payloads
  }

  return null
}

function chooseInitialActive(
  storageKey: string,
  date: string,
  location: string
): number {
  const saved = readSavedTabState(storageKey)

  return saved && saved.date === date && saved.location === location
    ? saved.active
    : 0
}

export function useLocalStorageActive(
  storageKey: string,
  date: string,
  location: string
): [number, Dispatch<SetStateAction<number>>] {
  const [active, setActive] = useState<number>(() =>
    chooseInitialActive(storageKey, date, location)
  )

  useEffect(() => {
    const saved = readSavedTabState(storageKey)

    setActive(
      saved && saved.date === date && saved.location === location
        ? saved.active
        : 0
    )
  }, [date, location, storageKey])

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ date, location, active: sanitizeActive(active) })
    )
  }, [active, date, location, storageKey])

  return [active, setActive]
}
