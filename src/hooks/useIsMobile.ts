import { useEffect, useState } from 'react'

export const useIsMobile = (): boolean => {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false
        return window.matchMedia?.('(max-width: 1023px)')?.matches ?? (window.innerWidth < 1024)
    })

    useEffect(() => {
        const mql = window.matchMedia?.('(max-width: 1023px)')
        const checkMobile = () => setIsMobile(mql ? mql.matches : (window.innerWidth < 1024))

        checkMobile()

        // Prefer media-query change; fallback to resize for older browsers.
        if (mql?.addEventListener) mql.addEventListener('change', checkMobile)
        window.addEventListener('resize', checkMobile)

        return () => {
            if (mql?.removeEventListener) mql.removeEventListener('change', checkMobile)
            window.removeEventListener('resize', checkMobile)
        }
    }, [])

    return isMobile
}
