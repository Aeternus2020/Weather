import type { MouseEvent } from 'react'

export function shouldHandleClientNavigation(
    event: MouseEvent<HTMLAnchorElement>,
): boolean {
    return !(
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.altKey
        || event.ctrlKey
        || event.shiftKey
    )
}
