'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, Settings as SettingsIcon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Outland OS',
  '/gear': 'Gear',
  '/vehicle': 'Vehicle',
  '/spots': 'Spots',
  '/trips': 'Trips',
  '/chat': 'Chat',
  '/settings': 'Settings',
}

export default function TopHeader() {
  const pathname = usePathname()
  const { resolvedTheme, toggleTheme } = useTheme()

  const title = PAGE_TITLES[pathname] || 'Outland OS'

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-stone-950/80 backdrop-blur-lg border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
          {title}
        </h1>
        <Link
          href="/settings"
          className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-stone-800 transition-colors"
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-stone-800 transition-colors"
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  )
}
