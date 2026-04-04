'use client'

import { useState, useEffect } from 'react'
import { Search, FileText, ExternalLink, Download, Trash2, Plus } from 'lucide-react'

interface GearDocument {
  id: string
  gearItemId: string
  type: string
  url: string
  title: string
  localPath: string | null
  createdAt: string
}

interface FindResultItem {
  type: 'manual_pdf' | 'support_link' | 'warranty' | 'product_page'
  url: string
  title: string
  confidence?: 'high' | 'low'
}

interface GearDocumentsTabProps {
  gearItemId: string
  gearName: string
  gearBrand: string | null
  gearModelNumber: string | null
  gearCategory: string
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  manual_pdf:   { label: 'Manual PDF',    color: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/30' },
  support_link: { label: 'Support',       color: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/30' },
  warranty:     { label: 'Warranty',      color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30' },
  product_page: { label: 'Product Page',  color: 'text-purple-700 bg-purple-50 dark:text-purple-300 dark:bg-purple-950/30' },
}

const DOC_TYPES = [
  { value: 'manual_pdf', label: 'Manual PDF' },
  { value: 'support_link', label: 'Support Link' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'product_page', label: 'Product Page' },
]

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? { label: type, color: 'text-stone-700 bg-stone-50 dark:text-stone-300 dark:bg-stone-800' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
}

export default function GearDocumentsTab({ gearItemId }: GearDocumentsTabProps) {
  const [documents, setDocuments] = useState<GearDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [finding, setFinding] = useState(false)
  const [findResults, setFindResults] = useState<FindResultItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [downloading, setDownloading] = useState<Record<string, boolean>>({})

  // Add form state
  const [addUrl, setAddUrl] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [addType, setAddType] = useState<string>('manual_pdf')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true)
      try {
        const res = await fetch(`/api/gear/${gearItemId}/documents`)
        if (!res.ok) throw new Error('Failed to load documents')
        const data = await res.json()
        setDocuments(data)
      } catch (err) {
        console.error('Failed to load gear documents:', err)
        setError('Could not load documents.')
      } finally {
        setLoading(false)
      }
    }
    loadDocuments()
  }, [gearItemId])

  async function handleFindManual() {
    setFinding(true)
    setError(null)
    setFindResults(null)
    try {
      const res = await fetch(`/api/gear/${gearItemId}/documents/find`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setFindResults(data.documents ?? [])
    } catch (err) {
      console.error('Failed to find gear manuals:', err)
      setError('Manual search failed. Please try again or add a URL manually.')
    } finally {
      setFinding(false)
    }
  }

  async function handleSaveFindResult(result: FindResultItem) {
    setError(null)
    try {
      const res = await fetch(`/api/gear/${gearItemId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url, title: result.title, type: result.type }),
      })
      if (!res.ok) throw new Error('Failed to save document')
      const saved: GearDocument = await res.json()
      setDocuments((prev) => [...prev, saved])
      setFindResults((prev) => prev?.filter((r) => r.url !== result.url) ?? null)
    } catch (err) {
      console.error('Failed to save found document:', err)
      setError('Could not save document. Please try again.')
    }
  }

  async function handleDownload(doc: GearDocument) {
    setDownloading((prev) => ({ ...prev, [doc.id]: true }))
    setError(null)
    try {
      const res = await fetch(`/api/gear/${gearItemId}/documents/${doc.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status === 422) {
        setError('URL did not return a valid PDF')
        return
      }
      if (!res.ok) throw new Error('Download failed')
      const updated: GearDocument = await res.json()
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? updated : d))
      )
    } catch (err) {
      console.error('Failed to download PDF:', err)
      setError('Download failed. Please check the URL and try again.')
    } finally {
      setDownloading((prev) => ({ ...prev, [doc.id]: false }))
    }
  }

  async function handleDelete(docId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/gear/${gearItemId}/documents/${docId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch (err) {
      console.error('Failed to delete gear document:', err)
      setError('Could not delete document. Please try again.')
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!addUrl.trim() || !addTitle.trim()) {
      setAddError('URL and title are required.')
      return
    }
    setAddSaving(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/gear/${gearItemId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addUrl.trim(), title: addTitle.trim(), type: addType }),
      })
      if (!res.ok) throw new Error('Failed to add document')
      const saved: GearDocument = await res.json()
      setDocuments((prev) => [...prev, saved])
      setShowAddForm(false)
      setAddUrl('')
      setAddTitle('')
      setAddType('manual_pdf')
    } catch (err) {
      console.error('Failed to add gear document:', err)
      setAddError('Could not add document. Please try again.')
    } finally {
      setAddSaving(false)
    }
  }

  if (loading) return (
    <div className="py-6 text-center text-stone-400 dark:text-stone-500 text-sm">Loading documents...</div>
  )

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Find Manual button */}
      <button
        onClick={handleFindManual}
        disabled={finding}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium transition-colors disabled:opacity-60"
      >
        <Search className="w-4 h-4" />
        {finding ? 'Searching...' : 'Find Manual'}
      </button>

      {/* Find results confirmation */}
      {findResults !== null && (
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              {findResults.length === 0 ? 'No results found' : `${findResults.length} result${findResults.length !== 1 ? 's' : ''} found`}
            </span>
            <button
              onClick={() => setFindResults(null)}
              className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
          {findResults.map((result, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 p-3 space-y-2"
            >
              <div className="flex items-start gap-2 flex-wrap">
                <TypeBadge type={result.type} />
                {result.confidence === 'low' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30">
                    low confidence
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-50">{result.title}</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{result.url}</p>
              <button
                onClick={() => handleSaveFindResult(result)}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium transition-colors"
              >
                Save
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 && findResults === null ? (
        <div className="py-8 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-400 dark:text-stone-500">
            No documents attached. Use Find Manual to search automatically, or add a URL manually.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={doc.type} />
                  </div>
                  <a
                    href={doc.localPath ? `/docs/${doc.localPath.split('/').pop()}` : doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </a>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.type === 'manual_pdf' && !doc.localPath && (
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloading[doc.id]}
                      title="Download PDF"
                      className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    title="Delete document"
                    className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual add */}
      {showAddForm ? (
        <form
          onSubmit={handleAddSubmit}
          className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-4 space-y-3"
        >
          <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Add Document</h4>
          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {addError}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://..."
              required
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="e.g. Owner's Manual"
              required
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
              Type
            </label>
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 text-sm"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setAddUrl('')
                setAddTitle('')
                setAddType('manual_pdf')
                setAddError(null)
              }}
              className="flex-1 py-2 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addSaving}
              className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium transition-colors disabled:opacity-60 text-sm"
            >
              {addSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      )}
    </div>
  )
}
