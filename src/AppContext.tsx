import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react"
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    type AuthError,
    type User,
} from "firebase/auth"
import { auth, provider } from "./firebase"

export interface AppContextType {
    user: User | null
    authLoading: boolean
    login: () => Promise<void>
    logout: () => Promise<void>
    authError: AuthError | null
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [authError, setAuthError] = useState<AuthError | null>(null)

    useEffect(() => {
        const unsub = onAuthStateChanged(
            auth,
            (u) => {
                setUser(u)
                setAuthLoading(false)
            },
            (err) => {
                setAuthError(err as AuthError)
                setAuthLoading(false)
            }
        )
        return () => unsub()
    }, [])

    const login = async () => {
        try {
            await signInWithPopup(auth, provider)
        } catch (err) {
            setAuthError(err as AuthError)
        }
    }

    const logout = async () => {
        try {
            await signOut(auth)
        } catch (err) {
            setAuthError(err as AuthError)
        }
    }

    return (
        <AppContext.Provider
            value={{
                user,
                authLoading,
                login,
                logout,
                authError,
            }}
        >
            {children}
        </AppContext.Provider>
    )
}

export function useAppContext(): AppContextType {
    const ctx = useContext(AppContext)
    if (!ctx) {
        throw new Error("useAppContext must be used within <AppProvider>")
    }
    return ctx
}
