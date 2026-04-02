'use client'

import ThemeProvider from './ThemeProvider'
import TopHeader from './TopHeader'
import BottomNav from './BottomNav'
import ServiceWorkerRegistration from './ServiceWorkerRegistration'
import OfflineBanner from './OfflineBanner'
import InstallBanner from './InstallBanner'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ServiceWorkerRegistration />
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
