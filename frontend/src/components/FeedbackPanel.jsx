import React, { useState, useEffect } from 'react'

const MAX_CHARS = 400

export default function FeedbackPanel({ preferences, onSave }) {
  const [text, setText] = useState(preferences || '')
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

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
    <div className="relative rounded-xl overflow-hidden border border-indigo-500/25 bg-gray-900">
      {/* Subtle indigo gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-transparent pointer-events-none" />

      <div className="relative p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#818cf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2a5 5 0 015 5c0 1.8-.9 3.3-2.3 4.3L11 13H7l-.7-1.7A5 5 0 019 2z"/>
                <path d="M7 13v1.5A1.5 1.5 0 008.5 16h1A1.5 1.5 0 0011 14.5V13"/>
                <path d="M6.5 7.5h5M7.5 10h3"/>
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white tracking-tight">Agent Memory</span>

                {hasContent && !dirty ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                    Not configured
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-md">
                Tell the agent how to write memos for you. These preferences are stored and
                applied automatically to every future analysis — the agent continuously adapts.
              </p>
            </div>
          </div>

          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
          placeholder='e.g. "Always highlight technical moat. Focus on customer concentration risk. Include named founder backgrounds. Be more conservative on IPO probability scores."'
          rows={3}
          className="w-full bg-gray-800/70 border border-gray-700/80 rounded-lg px-3.5 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 leading-relaxed transition-colors"
        />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className={`text-xs tabular-nums ${remaining < 60 ? 'text-amber-500' : 'text-gray-600'}`}>
            {remaining} / {MAX_CHARS} chars
          </span>

          <button
            onClick={handleSave}
            disabled={!dirty}
            className="text-xs font-semibold px-4 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-default disabled:bg-indigo-600"
          >
            Save Preferences
          </button>
        </div>

      </div>
    </div>
  )
}
