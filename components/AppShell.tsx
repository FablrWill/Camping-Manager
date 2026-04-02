'use client'

import { useEffect } from 'react'
import ThemeProvider from './ThemeProvider'
import TopHeader from './TopHeader'
import BottomNav from './BottomNav'
import ServiceWorkerRegistration from './ServiceWorkerRegistration'
import OfflineBanner from './OfflineBanner'
import InstallBanner from './InstallBanner'
import { useOnlineStatus } from '@/lib/use-online-status'
import { getPendingWrites, removeWrite } from '@/lib/offline-write-queue'

function WriteQueueSync() {
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (!isOnline) return
    let cancelled = false
    async function syncQueue() {
      const pending = await getPendingWrites()
      for (const write of pending) {
        if (cancelled) break
        try {
          await fetch(`/api/departure-checklist/${write.checklistId}/check`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: write.itemId, checked: write.checked }),
          })
          await removeWrite(write.id)
        } catch {
          // Leave in queue — will retry on next reconnect
        }
      }
    }
    syncQueue()
    return () => { cancelled = true }
  }, [isOnline])

  return null
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ServiceWorkerRegistration />
      <WriteQueueSync />
      <TopHeader />
      <OfflineBanner />
      <InstallBanner />
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </ThemeProvider>
  )
}
