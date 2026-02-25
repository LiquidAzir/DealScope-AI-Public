import React, { useState } from 'react'

export default function InputForm({ onSubmit, isRunning, onAbort }) {
  const [company, setCompany] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (company.trim()) {
      onSubmit({ company: company.trim(), stage: '', exit_type: '' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
      <div className="flex gap-3">
        <input
          type="text"
          value={company}
          onChange={e => setCompany(e.target.value)}
          placeholder="Enter a company name — e.g. Ramp, Stripe, Figma..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
          disabled={isRunning}
          autoFocus
        />
        {!isRunning ? (
          <button
            type="submit"
            disabled={!company.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-6 py-3 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            Run Analysis
            <span>→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onAbort}
            className="bg-red-700 hover:bg-red-600 text-white font-semibold rounded-lg px-6 py-3 transition-colors whitespace-nowrap"
          >
            Stop
          </button>
        )}
      </div>
    </form>
  )
}
