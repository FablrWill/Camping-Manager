'use client'

import { useState, useEffect } from 'react'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    function handleOnline() {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setIsOnline(true), 300)
    }

    function handleOffline() {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setIsOnline(false), 300)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
