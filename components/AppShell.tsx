'use client'

import ThemeProvider from './ThemeProvider'
import TopHeader from './TopHeader'
import BottomNav from './BottomNav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TopHeader />
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </ThemeProvider>
  )
}
