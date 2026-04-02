'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export default function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('outland_install_dismissed') === 'true') return

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    // Batch both state updates outside the synchronous effect body
    queueMicrotask(() => {
      setIsIOS(ios)
      setShowBanner(true)
    })
  }, [])

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setInstallPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function handleDismiss() {
    localStorage.setItem('outland_install_dismissed', 'true')
    setShowBanner(false)
  }

  async function handleInstall() {
    if (!installPromptEvent) return
    await installPromptEvent.prompt()
    const { outcome } = await installPromptEvent.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
  }

  if (!showBanner) return null

  if (isIOS) {
    return (
      <div className="bg-stone-800 px-3 py-2 border-b border-stone-700 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-200">Add to Home Screen for offline access</p>
          <p className="text-xs text-stone-400">Tap the Share button, then &quot;Add to Home Screen&quot;</p>
        </div>
        <button onClick={handleDismiss} className="p-1 text-stone-400 hover:text-stone-200" aria-label="Dismiss install banner">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-stone-800 px-3 py-2 border-b border-stone-700 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-stone-200">Add Outland OS to your home screen</p>
        <p className="text-xs text-stone-400">Access your trip data offline</p>
      </div>
      <div className="flex items-center gap-2">
        {installPromptEvent && (
          <button onClick={handleInstall} className="px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-500">
            Install App
          </button>
        )}
        <button onClick={handleDismiss} className="p-1 text-stone-400 hover:text-stone-200" aria-label="Dismiss install banner">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
