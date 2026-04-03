'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Backpack, MapPin, Tent, MessageCircle, Inbox } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/gear', label: 'Gear', icon: Backpack },
  { href: '/spots', label: 'Spots', icon: MapPin },
  { href: '/trips', label: 'Trips', icon: Tent },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetch('/api/inbox?status=pending')
      .then((r) => r.json())
      .then((items: unknown) => {
        setPendingCount(Array.isArray(items) ? items.length : 0)
      })
      .catch(() => {
        // non-fatal — badge just won't show
      })
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-stone-800 dark:bg-stone-900 border-t border-stone-700 safe-bottom">
      <div className="max-w-lg mx-auto flex items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const showBadge = href === '/inbox' && pendingCount > 0

          return (
            <Link
              key={href}
              href={href}
              className={`
                flex-1 flex flex-col items-center justify-center py-2 gap-0.5
                transition-colors
                ${
                  isActive
                    ? 'text-amber-400'
                    : 'text-stone-400 active:text-stone-200'
                }
              `}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
