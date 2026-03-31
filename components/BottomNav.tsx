'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Backpack, MapPin, Tent, MessageCircle } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/gear', label: 'Gear', icon: Backpack },
  { href: '/spots', label: 'Spots', icon: MapPin },
  { href: '/trips', label: 'Trips', icon: Tent },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-stone-800 dark:bg-stone-900 border-t border-stone-700 safe-bottom">
      <div className="max-w-lg mx-auto flex items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

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
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
