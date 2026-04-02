'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      async function requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
          await navigator.storage.persist()
        }
      }
      requestPersistentStorage()
    }
  }, [])

  return null
}
