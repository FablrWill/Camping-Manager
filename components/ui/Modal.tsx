'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />

      {/* Sheet */}
      <div
        className={`
          relative bg-white dark:bg-stone-900
          rounded-t-2xl sm:rounded-2xl
          w-full ${sizeStyles[size]}
          max-h-[90vh] overflow-y-auto
          shadow-xl animate-slide-up
        `}
      >
        {/* Header */}
        {title && (
          <div className="sticky top-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

/** Confirmation dialog — simpler than a full modal */
interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmColor =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-amber-600 hover:bg-amber-700 text-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />
      <div className="relative bg-white dark:bg-stone-900 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-slide-up">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50 mb-2">
          {title}
        </h3>
        <p className="text-stone-500 dark:text-stone-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors ${confirmColor}`}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
