'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Inbox, Car, Settings, X } from 'lucide-react'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
}

interface SheetItem {
  href: string
  label: string
  icon: React.ElementType
  showBadge?: boolean
}

export default function MoreSheet({ open, onClose }: MoreSheetProps) {
  const router = useRouter()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!open) return
    fetch('/api/inbox?status=pending')
      .then((r) => r.json())
      .then((items: unknown) => {
        setPendingCount(Array.isArray(items) ? items.length : 0)
      })
      .catch(() => {
        // non-fatal — badge just won't show
      })
  }, [open])

  const items: SheetItem[] = [
    { href: '/chat', label: 'Chat', icon: MessageCircle },
    { href: '/inbox', label: 'Inbox', icon: Inbox, showBadge: true },
    { href: '/vehicle', label: 'Vehicle', icon: Car },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  function handleNavigate(href: string): void {
    router.push(href)
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More options"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-stone-900 border-t border-stone-700 safe-bottom"
      >
        {/* Handle + close */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="w-10 h-1 rounded-full bg-stone-600 mx-auto" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 text-stone-400 hover:text-stone-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="px-2 pb-4">
          {items.map(({ href, label, icon: Icon, showBadge }) => {
            const hasBadge = showBadge && pendingCount > 0

            return (
              <button
                key={href}
                onClick={() => handleNavigate(href)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-stone-100 hover:bg-stone-800 active:bg-stone-700 transition-colors"
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={2} />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
                <span className="text-base font-medium">{label}</span>
                {hasBadge && (
                  <span className="ml-auto text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
