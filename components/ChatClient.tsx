'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ChatBubble from './ChatBubble'
import ChatInput from './ChatInput'
import SkeletonBubble from './SkeletonBubble'
import ToolActivityIndicator from './ToolActivityIndicator'
import EmptyState from './ui/EmptyState'
import type { TripSummaryPayload } from '../lib/chat-extract'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatClientProps {
  initialMessages?: Array<{ id: string; role: string; content: string }>
  conversationId?: string | null
  pageContext?: string
  apiEndpoint?: string
  onTripCreated?: (tripId: string) => void
  fullHeight?: boolean
}

export default function ChatClient({
  initialMessages = [],
  conversationId: initialConversationId = null,
  pageContext,
  apiEndpoint = '/api/chat',
  onTripCreated,
  fullHeight = false,
}: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }))
  )
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [skeletonVisible, setSkeletonVisible] = useState(false)
  const [toolActivity, setToolActivity] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tripCreating, setTripCreating] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const streamingTextRef = useRef<string>('')
  const isAtBottomRef = useRef<boolean>(true)

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50
  }, [])

  // Auto-scroll to bottom when near bottom
  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingText, skeletonVisible])

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setSkeletonVisible(true)
    setError(null)
    setToolActivity(null)
    streamingTextRef.current = ''
    setStreamingText('')

    // Force scroll to bottom on send
    setTimeout(scrollToBottom, 0)

    let response: Response
    try {
      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, userMessage: text.trim(), pageContext }),
      })
    } catch {
      setError('Something went wrong. Try sending again.')
      setStreaming(false)
      setSkeletonVisible(false)
      return
    }

    if (!response.ok) {
      setError('Something went wrong. Try sending again.')
      setStreaming(false)
      setSkeletonVisible(false)
      return
    }

    // Read SSE stream with explicit buffer handling (addresses review concern #6)
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += value

        // Process complete SSE events only (delimited by \n\n)
        const events = buffer.split('\n\n')
        // Last element may be incomplete — keep it in buffer
        buffer = events.pop() || ''

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue

          let eventType = 'message'
          let eventData = ''

          for (const line of eventBlock.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7)
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6)
            }
          }

          if (!eventData) continue

          try {
            const payload = JSON.parse(eventData)

            switch (eventType) {
              case 'text_delta':
                setSkeletonVisible(false)
                streamingTextRef.current += payload.delta
                setStreamingText(streamingTextRef.current)
                break
              case 'tool_activity':
                setToolActivity(payload.toolName)
                break
              case 'message_complete':
                setMessages(prev => [...prev, {
                  id: payload.conversationId || Date.now().toString(),
                  role: 'assistant' as const,
                  content: streamingTextRef.current,
                }])
                setStreamingText('')
                streamingTextRef.current = ''
                setToolActivity(null)
                setStreaming(false)
                setSkeletonVisible(false)
                if (payload.conversationId) {
                  setConversationId(payload.conversationId)
                }
                break
              case 'stream_error':
                setError(payload.message || 'Something went wrong. Try sending again.')
                setStreaming(false)
                setSkeletonVisible(false)
                setToolActivity(null)
                break
            }
          } catch {
            // Malformed JSON — skip this event
          }
        }
      }
    } catch {
      setError('Something went wrong. Try sending again.')
      setStreaming(false)
      setSkeletonVisible(false)
      setToolActivity(null)
    }
  }, [conversationId, pageContext, streaming, scrollToBottom, apiEndpoint])

  const handleConfirmDelete = useCallback((itemType: string) => {
    sendMessage(`Yes, go ahead and delete the ${itemType}.`)
  }, [sendMessage])

  const handleCancelDelete = useCallback(() => {
    sendMessage('No, keep it.')
  }, [sendMessage])

  const handleCreateTrip = useCallback(async (payload: TripSummaryPayload) => {
    if (tripCreating) return
    setTripCreating(true)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          startDate: payload.startDate,
          endDate: payload.endDate,
          locationId: payload.locationId ?? null,
          notes: payload.notes ?? null,
          bringingDog: payload.bringingDog,
        }),
      })
      if (!res.ok) throw new Error('Failed to create trip')
      const trip = await res.json()
      if (onTripCreated) {
        onTripCreated(trip.id)
      }
    } catch {
      setError("Couldn't create your trip. Try again.")
    } finally {
      setTripCreating(false)
    }
  }, [onTripCreated, tripCreating])

  return (
    <div className="flex flex-col" style={{ height: fullHeight ? '100%' : 'calc(100dvh - 48px - 80px)' }}>
      {/* Message scroll area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
        aria-label="Conversation"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.length === 0 && !streaming ? (
            <EmptyState
              emoji="🏕️"
              title="Your camping assistant"
              description="Ask anything — gear, spots, trip planning. I know NC camping."
            />
          ) : (
            <>
              {messages.map(msg => (
                <ChatBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  onConfirmDelete={handleConfirmDelete}
                  onCancelDelete={handleCancelDelete}
                  onCreateTrip={handleCreateTrip}
                />
              ))}
              {skeletonVisible && <SkeletonBubble />}
              {toolActivity && <ToolActivityIndicator toolName={toolActivity} />}
              {streamingText && <ChatBubble role="assistant" content={streamingText + '|'} />}
              {error && (
                <div className="mr-auto text-sm text-red-500 dark:text-red-400 px-2">{error}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input bar — sits above BottomNav */}
      <div className={`sticky ${fullHeight ? 'bottom-0' : 'bottom-20'} bg-white dark:bg-stone-950`}>
        <div className="max-w-2xl mx-auto">
          <ChatInput onSend={sendMessage} disabled={streaming} />
        </div>
      </div>
    </div>
  )
}
