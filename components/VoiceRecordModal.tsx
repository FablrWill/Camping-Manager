'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import InsightsReviewSheet from './InsightsReviewSheet'
import type { InsightPayload } from '@/lib/voice/types'

interface VoiceRecordModalProps {
  tripId: string
  tripName: string
  locationId: string | null
  onClose: () => void
}

type ModalState = 'idle' | 'recording' | 'processing' | 'review' | 'extract-error'

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function VoiceRecordModal({ tripId, tripName, locationId, onClose }: VoiceRecordModalProps) {
  const [state, setState] = useState<ModalState>('idle')
  const [timerDisplay, setTimerDisplay] = useState('0:00')
  const [processingText, setProcessingText] = useState('Transcribing...')
  const [error, setError] = useState<string | null>(null)
  const [rawTranscription, setRawTranscription] = useState<string | null>(null)
  const [insights, setInsights] = useState<InsightPayload | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerSecondsRef = useRef(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = (err as Error)?.name
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Microphone access is required to record. Enable it in Settings.')
      } else {
        setError('Could not access microphone. Please check your device settings.')
      }
      return
    }

    streamRef.current = stream
    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stopTimer()
      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
      setState('processing')
      setProcessingText('Transcribing...')
      await runPipeline(blob, mimeType || 'audio/webm')
    }

    recorder.start(250) // collect chunks every 250ms
    setState('recording')

    // Start timer
    timerSecondsRef.current = 0
    setTimerDisplay('0:00')
    timerRef.current = setInterval(() => {
      timerSecondsRef.current += 1
      setTimerDisplay(formatTimer(timerSecondsRef.current))
    }, 1000)
  }, [stopTimer]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    stopTimer()
  }, [stopTimer])

  const cancelRecording = useCallback(() => {
    stopRecording()
    setState('idle')
    setTimerDisplay('0:00')
  }, [stopRecording])

  async function runPipeline(audioBlob: Blob, mimeType: string) {
    // Step 1: Transcribe
    let transcription: string
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('mimeType', mimeType)
      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Transcription failed')
      const data = await res.json()
      transcription = data.transcription
    } catch {
      setError('Transcription failed. Check your connection and try again.')
      setState('idle')
      return
    }

    // Step 2: Extract insights
    setProcessingText('Extracting insights...')
    try {
      const res = await fetch('/api/voice/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription }),
      })
      if (!res.ok) throw new Error('Extraction failed')
      const payload: InsightPayload = await res.json()
      setRawTranscription(transcription)
      setInsights(payload)
      setState('review')
    } catch {
      setRawTranscription(transcription)
      setState('extract-error')
    }
  }

  // Render review sheet
  if (state === 'review' && insights) {
    return (
      <InsightsReviewSheet
        insights={insights}
        tripId={tripId}
        locationId={locationId}
        onClose={onClose}
        transcription={rawTranscription ?? undefined}
      />
    )
  }

  return (
    <>
      {/* Pulse ring keyframe */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        .pulse-ring {
          animation: pulse-ring 1s ease-in-out infinite;
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-fade-in"
          onClick={state === 'idle' ? onClose : undefined}
        />

        {/* Sheet */}
        <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl p-6 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Trip Debrief</h2>
            {state === 'idle' && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:text-stone-500 dark:hover:text-stone-200 dark:hover:bg-stone-800 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
            Record what happened. Claude will extract the notes.
          </p>

          {/* Trip name */}
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-6 font-medium uppercase tracking-wider">
            {tripName}
          </p>

          {/* Error display */}
          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Extract error state */}
          {state === 'extract-error' && rawTranscription && (
            <div className="mb-4 space-y-3">
              <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                Couldn&apos;t extract insights. Your transcription is saved — you can review the raw text below.
              </p>
              <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-stone-600 dark:text-stone-400">{rawTranscription}</p>
              </div>
              <Button variant="ghost" size="md" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {/* Idle and recording states */}
          {(state === 'idle' || state === 'recording') && (
            <div className="flex flex-col items-center gap-4 pb-4">
              {/* Timer (recording state only) */}
              {state === 'recording' && (
                <>
                  <div aria-live="polite" className="sr-only">Recording: {timerDisplay}</div>
                  <p className="text-xl tabular-nums font-mono text-stone-900 dark:text-stone-50">
                    {timerDisplay}
                  </p>
                </>
              )}

              {/* Record button with pulse ring */}
              <div className="relative flex items-center justify-center">
                {state === 'recording' && (
                  <div className="absolute w-20 h-20 border-2 border-red-600 rounded-full pulse-ring" />
                )}
                <button
                  type="button"
                  onClick={state === 'idle' ? startRecording : stopRecording}
                  aria-label={state === 'idle' ? 'Start recording' : 'Stop recording'}
                  className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    state === 'recording'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400'
                  }`}
                >
                  {state === 'recording' ? (
                    <Square size={24} className="text-white" fill="white" />
                  ) : (
                    <Mic size={24} className="text-white" />
                  )}
                </button>
              </div>

              {/* Waveform placeholder (recording only) */}
              {state === 'recording' && (
                <div className="flex items-center gap-1 h-8">
                  {[8, 20, 14, 28, 10, 24, 16, 32, 12, 20, 8].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-stone-400 dark:bg-stone-500 rounded-full"
                      style={{
                        height: `${h}px`,
                        animation: `skeleton-pulse ${0.8 + i * 0.1}s ease-in-out infinite`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Instruction / cancel text */}
              {state === 'idle' ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">Tap to start recording</p>
              ) : (
                <Button variant="ghost" size="sm" onClick={cancelRecording}>
                  Cancel recording
                </Button>
              )}
            </div>
          )}

          {/* Processing state */}
          {state === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <svg className="animate-spin w-8 h-8 text-stone-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-stone-500 dark:text-stone-400">{processingText}</p>
              <Button variant="ghost" size="sm" disabled>
                Please wait...
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
