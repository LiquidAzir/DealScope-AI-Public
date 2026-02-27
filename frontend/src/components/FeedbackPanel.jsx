import React, { useState, useEffect } from 'react'

const MAX_CHARS = 400

export default function FeedbackPanel({ preferences, onSave }) {
  const [text, setText] = useState(preferences || '')
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Sync if parent preferences load after mount
  useEffect(() => {
    setText(preferences || '')
    setDirty(false)
  }, [preferences])

  function handleChange(e) {
    setText(e.target.value.slice(0, MAX_CHARS))
    setDirty(true)
    setSaved(false)
  }

  async function handleSave() {
    await onSave(text)
    setSaved(true)
    setDirty(false)
  }

  const remaining = MAX_CHARS - text.length
  const hasContent = text.trim().length > 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center shrink-0">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#818cf8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 1v2M6 9v2M1 6h2M9 6h2"/>
              <circle cx="6" cy="6" r="2.25"/>
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-300 tracking-tight">Memo Preferences</span>
          <span className="text-xs text-gray-600">· applied to every new analysis</span>
        </div>

        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6l3 3 5-5"/>
            </svg>
            Saved
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={handleChange}
        placeholder={
          'e.g. "Always highlight technical moat strength. Focus on customer concentration risk. ' +
          'Include named founder backgrounds. Be more conservative on IPO probability."'
        }
        rows={3}
        className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-600/60 focus:ring-1 focus:ring-indigo-600/30 leading-relaxed transition-colors"
      />

      {/* Footer: char count + save */}
      <div className="flex items-center justify-between">
        <span className={`text-xs tabular-nums ${remaining < 50 ? 'text-amber-500' : 'text-gray-600'}`}>
          {remaining} chars remaining
        </span>

        <div className="flex items-center gap-3">
          {hasContent && !dirty && (
            <span className="text-xs text-indigo-400/70 flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 6c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z"/>
                <path d="M6 4v2.5l1.5 1"/>
              </svg>
              Active
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty && saved}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 hover:bg-indigo-600/30 transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
