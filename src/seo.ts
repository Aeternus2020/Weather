export const publicLocationPaths = {
    London: '/london/',
    NY: '/ny/',
} as const

export type PublicLocation = keyof typeof publicLocationPaths

export function normalizePublicPath(pathname: string): string {
    if (pathname === '' || pathname === '/') {
        return '/'
    }

    if (pathname.endsWith('/')) {
        return pathname
    }

    return pathname.includes('.')
        ? pathname
        : `${pathname}/`
}

export function getLocationFromPathname(pathname: string): PublicLocation | null {
    const normalizedPath = normalizePublicPath(pathname)

    if (normalizedPath === publicLocationPaths.London) {
        return 'London'
    }

    if (normalizedPath === publicLocationPaths.NY) {
        return 'NY'
    }

    return null
}

export function getPageTitle(pathname: string): string {
    const location = getLocationFromPathname(pathname)

    if (location === 'London' || normalizePublicPath(pathname) === '/') {
        return 'London Forecast Comparison | Forecast Atlas'
    }

    if (location === 'NY') {
        return 'New York Forecast Comparison | Forecast Atlas'
    }

    return 'Forecast Atlas | Weather Forecast Comparison Dashboard'
}

export function getPublicPageHref(location: PublicLocation, dateParam: string): string {
    const dateQuery = dateParam === new Date().toISOString().slice(0, 10)
        ? ''
        : `?date=${dateParam}`

    return `${publicLocationPaths[location]}${dateQuery}`
}
