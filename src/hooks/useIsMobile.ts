import { useEffect, useState } from 'react'

export const useIsMobile = (): boolean => {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false
        return window.innerWidth < 1024
    })

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return isMobile
}
