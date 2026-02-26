import React, { useState, useRef } from 'react'

const EXAMPLES = ['Stripe', 'Notion', 'Figma', 'Ramp', 'Airtable']

export default function InputForm({ onSubmit, isRunning, onAbort }) {
  const [company, setCompany] = useState('')
  const inputRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (company.trim() && !isRunning) {
      onSubmit({ company: company.trim(), stage: '', exit_type: '' })
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="6.5" cy="6.5" r="5.5"/>
              <path d="m13 13-2.5-2.5"/>
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Enter a company name..."
            disabled={isRunning}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600
                       focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          />
        </div>

        {/* Action button */}
        {isRunning ? (
          <button
            type="button"
            onClick={onAbort}
            className="px-4 py-3 rounded-xl text-sm font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-colors whitespace-nowrap"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!company.trim()}
            className="px-5 py-3 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500
                       disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed
                       transition-colors whitespace-nowrap"
          >
            Analyze
          </button>
        )}
      </form>

      {/* Example pills — only when idle */}
      {!isRunning && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-700">Try:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setCompany(ex)
                inputRef.current?.focus()
              }}
              className="text-xs text-gray-600 hover:text-gray-300 px-2 py-1 rounded-lg bg-gray-900 border border-gray-800/60 hover:border-gray-700 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
