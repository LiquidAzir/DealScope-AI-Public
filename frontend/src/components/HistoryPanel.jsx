import React, { useState } from 'react'
import { exportMemoAsPDF } from '../utils/exportPDF.js'

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function DownloadButton({ entry }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload(e) {
    e.stopPropagation()
    setLoading(true)
    try {
      const r = await fetch(`/analyses/${entry.id}`)
      if (!r.ok) return
      const data = await r.json()
      exportMemoAsPDF(data.result?.memo, entry.company_name)
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="text-gray-600 hover:text-gray-400 transition-colors shrink-0 p-0.5 disabled:opacity-40"
      aria-label="Download PDF"
      title="Download memo as PDF"
    >
      {loading ? (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="animate-spin">
          <circle cx="7" cy="7" r="5.5" strokeDasharray="22" strokeDashoffset="8"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1v8M4 6l3 3 3-3"/>
          <path d="M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10"/>
        </svg>
      )}
    </button>
  )
}

export default function HistoryPanel({ history, onLoad, onDelete }) {
  if (!history || history.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Recent Analyses
        </span>
        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 tabular-nums">
          {history.length}
        </span>
      </div>

      <div className="grid gap-2">
        {history.map(entry => (
          <div
            key={entry.id}
            className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-200 truncate block">
                {entry.company_name}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {entry.sector && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    {entry.sector}
                  </span>
                )}
                <span className="text-xs text-gray-600 tabular-nums">
                  {relativeTime(entry.created_at)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onLoad(entry)}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 hover:bg-indigo-600/30 transition-colors shrink-0"
            >
              Load
            </button>

            <DownloadButton entry={entry} />

            <button
              onClick={() => onDelete(entry.id)}
              className="text-gray-600 hover:text-gray-400 transition-colors shrink-0 p-0.5"
              aria-label="Delete"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2.5 2.5l9 9M11.5 2.5l-9 9"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
