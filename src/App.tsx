import React, { Suspense, useRef, useEffect } from 'react'
import { Box, Button, Container, CssBaseline, Typography } from '@mui/material'
import {
    QueryClient,
    QueryClientProvider,
    useQueryClient
} from '@tanstack/react-query'
import { AppProvider, useAppContext } from './AppContext'
import TemperatureBotPage from './TemperatureBot'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime:      Infinity,
            gcTime:         Infinity,
            refetchOnWindowFocus: false,
            refetchOnMount:       false,
            refetchOnReconnect:   false,
        },
    },
})


function AppRoutes() {
    const { user, authLoading, login, logout } = useAppContext()
    const qc = useQueryClient()
    const prevUid = useRef<string | null>(null)

    useEffect(() => {
        const prev = prevUid.current
        const curr = user?.uid ?? null
        if (prev !== null && curr !== prev) {
            qc.clear()
        }
        prevUid.current = curr
    }, [user, qc])

    if (authLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Typography>Loading authentication…</Typography>
            </Box>
        )
    }
    if (!user) {
        return (
            <Container sx={{ mt: 8, textAlign: 'center' }}>
                <Typography variant="h5">Please log in to view the page</Typography>
                <Box sx={{ mt: 2 }}>
                    <Button variant="contained" onClick={login}>
                        Login with Google
                    </Button>
                </Box>
            </Container>
        )
    }

    return (
        <Box
            sx={{
                mt: 3,
                mb: 5,
                mx: 'auto',
                maxWidth: 1400,
                px: 2,
            }}>
        <Suspense fallback={<Typography align="center" sx={{ mt: 4 }}>Loading page…</Typography>}>
            <CssBaseline />
            <Box
                component="header"
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}
            >
                <Typography variant="h3" color="primary" sx={{mb: 4, textAlign: "center", fontWeight: 500 }}>
                    Temperature Bot
                </Typography>
                <Button variant="contained" onClick={() => {
                    logout().catch(err => {
                        console.error('Logout error:', err)
                    })
                }}>
                    Log out
                </Button>
            </Box>
            <TemperatureBotPage/>
        </Suspense>
        </Box>
    )
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AppProvider>
                <CssBaseline />
                <AppRoutes />
            </AppProvider>
        </QueryClientProvider>
    )
}
