'use client'

import { useState, useCallback } from 'react'
import { Inbox, Link2, ImageIcon, Type, Check, X, Clock, Package, MapPin, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface InboxItem {
  id: string
  sourceType: string
  triageType: string | null
  summary: string | null
  confidence: string | null
  createdAt: string
  status: string
}

interface InboxClientProps {
  initialItems: InboxItem[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function SourceIcon({ sourceType }: { sourceType: string }) {
  if (sourceType === 'url') return <Link2 size={14} className="text-blue-400" />
  if (sourceType === 'image') return <ImageIcon size={14} className="text-purple-400" />
  return <Type size={14} className="text-stone-400" />
}

function TriageIcon({ triageType }: { triageType: string | null }) {
  if (triageType === 'gear') return <Package size={14} className="text-amber-400" />
  if (triageType === 'location') return <MapPin size={14} className="text-green-400" />
  return <BookOpen size={14} className="text-sky-400" />
}

export default function InboxClient({ initialItems }: InboxClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [intakeText, setIntakeText] = useState('')
  const [intakeUrl, setIntakeUrl] = useState('')
  const [intakeFile, setIntakeFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const pendingItems = items.filter((i) => i.status === 'pending')

  const handleSubmit = useCallback(async () => {
    if (!intakeText && !intakeUrl && !intakeFile) {
      setSubmitError('Enter text, a URL, or choose a file')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const fd = new FormData()
      if (intakeText) fd.append('text', intakeText)
      if (intakeUrl) fd.append('url', intakeUrl)
      if (intakeFile) fd.append('file', intakeFile)

      const res = await fetch('/api/intake', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json()
        setSubmitError((data as { error?: string }).error ?? 'Intake failed')
        return
      }
      const newItem = await res.json() as InboxItem
      setItems((prev) => [newItem, ...prev])
      setIntakeText('')
      setIntakeUrl('')
      setIntakeFile(null)
    } catch {
      setSubmitError('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }, [intakeText, intakeUrl, intakeFile])

  const handleAccept = useCallback(async (item: InboxItem) => {
    setActionLoading(item.id)
    setActionError(null)
    try {
      const res = await fetch(`/api/inbox/${item.id}/accept`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setActionError((data as { error?: string }).error ?? 'Accept failed')
        return
      }
      const body = await res.json() as { triageType: string; suggestion: Record<string, unknown> }
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'accepted' } : i))

      const encoded = encodeURIComponent(JSON.stringify(body.suggestion))
      if (body.triageType === 'gear') {
        router.push(`/gear?intake=${encoded}`)
      } else if (body.triageType === 'location') {
        router.push(`/spots?intake=${encoded}`)
      } else {
        setSuccessMsg('Content noted — review in Chat or Knowledge base')
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch {
      setActionError('Network error — try again')
    } finally {
      setActionLoading(null)
    }
  }, [router])

  const handleReject = useCallback(async (itemId: string) => {
    setActionLoading(itemId)
    setActionError(null)
    try {
      const res = await fetch(`/api/inbox/${itemId}/reject`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setActionError((data as { error?: string }).error ?? 'Reject failed')
        return
      }
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, status: 'rejected' } : i))
    } catch {
      setActionError('Network error — try again')
    } finally {
      setActionLoading(null)
    }
  }, [])

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto">
      <div className="py-4 flex items-center gap-2">
        <Inbox size={20} className="text-amber-400" />
        <h1 className="text-lg font-semibold text-stone-100">Inbox</h1>
        {pendingItems.length > 0 && (
          <span className="ml-1 bg-amber-500 text-stone-900 text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingItems.length}
          </span>
        )}
      </div>

      {/* Intake form */}
      <div className="bg-stone-800 rounded-xl p-4 mb-4 space-y-3">
        <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Add to Inbox</p>
        <textarea
          value={intakeText}
          onChange={(e) => setIntakeText(e.target.value)}
          placeholder="Paste text, tip, or note..."
          rows={2}
          className="w-full bg-stone-900 text-stone-100 rounded-lg px-3 py-2 text-sm placeholder-stone-500 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <input
          type="url"
          value={intakeUrl}
          onChange={(e) => setIntakeUrl(e.target.value)}
          placeholder="Paste a URL (Amazon, REI, article...)"
          className="w-full bg-stone-900 text-stone-100 rounded-lg px-3 py-2 text-sm placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm px-3 py-2 rounded-lg transition-colors">
            <ImageIcon size={14} />
            {intakeFile ? intakeFile.name : 'Choose photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setIntakeFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {submitting ? 'Processing...' : 'Add'}
          </button>
        </div>
        {submitError && <p className="text-red-400 text-xs">{submitError}</p>}
      </div>

      {successMsg && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 text-sm px-4 py-2 rounded-lg mb-4">
          {successMsg}
        </div>
      )}

      {actionError && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-2 rounded-lg mb-4">
          {actionError}
        </div>
      )}

      {/* Inbox cards */}
      {pendingItems.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <Inbox size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No pending items</p>
          <p className="text-xs mt-1">Share a link, photo, or text above to add one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingItems.map((item) => (
            <div key={item.id} className="bg-stone-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-1.5 mt-0.5">
                  <SourceIcon sourceType={item.sourceType} />
                  <TriageIcon triageType={item.triageType} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-stone-100 text-sm font-medium leading-snug">
                    {item.summary ?? 'Processing...'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.triageType && (
                      <span className="text-xs text-stone-400 capitalize">{item.triageType}</span>
                    )}
                    {item.confidence && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.confidence === 'high' ? 'bg-green-900/50 text-green-400' :
                        item.confidence === 'medium' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-stone-700 text-stone-400'
                      }`}>
                        {item.confidence}
                      </span>
                    )}
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAccept(item)}
                  disabled={actionLoading === item.id}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  disabled={actionLoading === item.id}
                  className="flex items-center justify-center gap-1.5 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-300 text-sm px-3 py-2 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
