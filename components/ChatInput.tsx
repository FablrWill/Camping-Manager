'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea based on content, capped at 5 rows
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24 // approx 1.5rem
    const maxHeight = lineHeight * 5
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  // Mobile keyboard: listen for visualViewport resize and scroll to bottom
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let lastHeight = vv.height

    const handleResize = () => {
      if (vv.height < lastHeight) {
        // Keyboard opened — scroll message list to bottom
        const scrollEl = document.querySelector('[role="log"]')
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight
        }
      }
      lastHeight = vv.height
    }

    vv.addEventListener('resize', handleResize)
    return () => vv.removeEventListener('resize', handleResize)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = textareaRef.current?.value.trim() ?? ''
      if (text && !disabled) {
        onSend(text)
        if (textareaRef.current) {
          textareaRef.current.value = ''
          adjustHeight()
        }
      }
    }
  }, [disabled, onSend, adjustHeight])

  const handleSendClick = useCallback(() => {
    const text = textareaRef.current?.value.trim() ?? ''
    if (text && !disabled) {
      onSend(text)
      if (textareaRef.current) {
        textareaRef.current.value = ''
        adjustHeight()
      }
    }
  }, [disabled, onSend, adjustHeight])

  const handleInput = useCallback(() => {
    adjustHeight()
  }, [adjustHeight])

  // Initialize height on mount
  useEffect(() => {
    adjustHeight()
  }, [adjustHeight])

  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Message..."
        aria-label="Message"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        className="w-full resize-none bg-transparent text-base placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none text-stone-900 dark:text-stone-100 leading-6"
        style={{ minHeight: '24px', overflowY: 'hidden' }}
      />
      <button
        onClick={handleSendClick}
        disabled={disabled}
        aria-label="Send message"
        className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-full w-11 h-11 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send size={18} className="text-white dark:text-stone-900" />
      </button>
    </div>
  )
}
