import { useEffect, useState } from 'react'

export const useIsMobile = (): boolean => {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false
        const byWidth = window.matchMedia?.('(max-width: 1023px)')?.matches
        const byPointer = window.matchMedia?.('(pointer: coarse)')?.matches
        return (byWidth ?? (window.innerWidth < 1024)) || (byPointer ?? false)
    })

    useEffect(() => {
        const mqlW = window.matchMedia?.('(max-width: 1023px)')
        const mqlP = window.matchMedia?.('(pointer: coarse)')
        const checkMobile = () =>
            setIsMobile(((mqlW ? mqlW.matches : (window.innerWidth < 1024))) || (mqlP ? mqlP.matches : false))

        checkMobile()

        // Prefer media-query change; fallback to resize for older browsers.
        if (mqlW?.addEventListener) mqlW.addEventListener('change', checkMobile)
        if (mqlP?.addEventListener) mqlP.addEventListener('change', checkMobile)
        window.addEventListener('resize', checkMobile)

        return () => {
            if (mqlW?.removeEventListener) mqlW.removeEventListener('change', checkMobile)
            if (mqlP?.removeEventListener) mqlP.removeEventListener('change', checkMobile)
            window.removeEventListener('resize', checkMobile)
        }
    }, [])

    return isMobile
}
