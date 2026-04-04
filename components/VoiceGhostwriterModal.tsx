'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, X, BookOpen } from 'lucide-react'
import Button from '@/components/ui/Button'

interface VoiceGhostwriterModalProps {
  tripId: string
  tripName: string
  onClose: () => void
  onSaved: (journalEntry: string) => void
}

type ModalState = 'idle' | 'recording' | 'transcribing' | 'writing' | 'review' | 'saving' | 'error'

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

export default function VoiceGhostwriterModal({
  tripId,
  tripName,
  onClose,
  onSaved,
}: VoiceGhostwriterModalProps) {
  const [state, setState] = useState<ModalState>('idle')
  const [timerDisplay, setTimerDisplay] = useState('0:00')
  const [processingText, setProcessingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [journalEntry, setJournalEntry] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerSecondsRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
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
        setError('Microphone access is required. Enable it in Settings.')
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
      await runPipeline(blob, mimeType || 'audio/webm')
    }

    recorder.start(250)
    setState('recording')

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
      streamRef.current.getTracks().forEach((track) => track.stop())
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
    setState('transcribing')
    setProcessingText('Transcribing your recording...')

    let transcription: string
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('mimeType', mimeType)
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Transcription failed')
      const data = await res.json() as { transcription: string }
      transcription = data.transcription
    } catch {
      setError('Transcription failed. Check your connection and try again.')
      setState('error')
      return
    }

    // Step 2: Ghostwrite
    setState('writing')
    setProcessingText('Claude is writing your journal entry...')

    try {
      const res = await fetch('/api/voice/ghostwrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, transcription }),
      })
      if (!res.ok) throw new Error('Ghostwrite failed')
      const data = await res.json() as { journalEntry: string }
      setJournalEntry(data.journalEntry)
      setState('review')
    } catch {
      setError('Failed to generate journal entry. Try again.')
      setState('error')
    }
  }

  async function handleSave() {
    setState('saving')
    try {
      const res = await fetch('/api/voice/ghostwrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, transcription: journalEntry, _saveOnly: true }),
      })
      // If the edited entry needs saving separately, persist it directly
      const saveRes = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntry }),
      })
      if (!saveRes.ok && !res.ok) throw new Error('Save failed')
      onSaved(journalEntry)
      onClose()
    } catch {
      setError('Failed to save journal entry.')
      setState('review')
    }
  }

  // Review state
  if (state === 'review' || state === 'saving') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={state === 'saving' ? undefined : onClose} />
        <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl p-6 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Journal Entry</h2>
            </div>
            {state !== 'saving' && (
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
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-4 font-medium uppercase tracking-wider shrink-0">
            {tripName}
          </p>

          {error && (
            <p className="mb-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 shrink-0">
              {error}
            </p>
          )}

          {/* Journal text — editable */}
          <div className="flex-1 overflow-y-auto mb-4 min-h-0">
            {isEditing ? (
              <textarea
                className="w-full h-full min-h-[200px] text-sm text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 rounded-lg p-3 resize-none border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
              />
            ) : (
              <div className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap bg-stone-50 dark:bg-stone-800 rounded-lg p-3">
                {journalEntry}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <Button
              variant="ghost"
              size="md"
              className="flex-1"
              onClick={() => setIsEditing(!isEditing)}
              disabled={state === 'saving'}
            >
              {isEditing ? 'Preview' : 'Edit'}
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={handleSave}
              disabled={state === 'saving' || !journalEntry.trim()}
            >
              {state === 'saving' ? 'Saving...' : 'Save to trip'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        .pulse-ring { animation: pulse-ring 1s ease-in-out infinite; }
      `}</style>

      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={state === 'idle' ? onClose : undefined}
        />

        <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Write Journal</h2>
            </div>
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
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
            Talk about your trip. Claude writes the entry.
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-6 font-medium uppercase tracking-wider">
            {tripName}
          </p>

          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Idle + recording */}
          {(state === 'idle' || state === 'recording') && (
            <div className="flex flex-col items-center gap-4 pb-4">
              {state === 'recording' && (
                <>
                  <div aria-live="polite" className="sr-only">Recording: {timerDisplay}</div>
                  <p className="text-xl tabular-nums font-mono text-stone-900 dark:text-stone-50">
                    {timerDisplay}
                  </p>
                </>
              )}

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

              {state === 'idle' ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">Tap to start recording</p>
              ) : (
                <Button variant="ghost" size="sm" onClick={cancelRecording}>
                  Cancel recording
                </Button>
              )}
            </div>
          )}

          {/* Processing states */}
          {(state === 'transcribing' || state === 'writing') && (
            <div className="flex flex-col items-center gap-4 py-6">
              <svg className="animate-spin w-8 h-8 text-stone-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-stone-500 dark:text-stone-400">{processingText}</p>
            </div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <div className="flex flex-col gap-3 pb-4">
              <Button variant="primary" size="md" className="w-full" onClick={() => { setError(null); setState('idle') }}>
                Try again
              </Button>
              <Button variant="ghost" size="md" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
