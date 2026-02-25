import React, { useState, useEffect } from 'react'

const PHASES = [
  { step: 1, name: 'Web Research',        detail: 'Searching news, funding, and market sources' },
  { step: 2, name: 'Entity Extraction',   detail: 'AI extracting founders, investors, competitors' },
  { step: 3, name: 'Market Intelligence', detail: 'M&A comps, risk signals, exit indicators' },
  { step: 4, name: 'Knowledge Graph',     detail: 'Building Neo4j relationship graph' },
  { step: 5, name: 'Investment Analysis', detail: 'Red flags, exit scores, acquirer ranking' },
  { step: 6, name: 'Investment Memo',     detail: 'Writing full diligence memo' },
]

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function ElapsedTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500)
    return () => clearInterval(id)
  }, [startTime])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span>{m > 0 ? `${m}m ` : ''}{s}s</span>
}

export default function ProgressStream({ steps, isRunning, error }) {
  const [startTime] = useState(() => Date.now())

  if (!isRunning && steps.length === 0 && !error) return null

  // Build a map: step number → { done, message, elapsed, subMessages }
  const stepMap = {}
  for (const s of steps) {
    const key = s.step
    if (!key) continue
    if (!stepMap[key]) {
      stepMap[key] = { done: false, messages: [], elapsed: null }
    }
    stepMap[key].messages.push(s.message)
    if (s.done) {
      stepMap[key].done = true
      if (s.elapsed) stepMap[key].elapsed = s.elapsed
    }
  }

  // Determine active step (last step with a pending entry)
  const activeStep = steps.length > 0
    ? (steps.find(s => s.step && !s.done)?.step ?? null)
    : null

  // How many phases fully done
  const doneCount = PHASES.filter(p => stepMap[p.step]?.done).length
  const progressPct = Math.round((doneCount / PHASES.length) * 100)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Pipeline Progress
        </h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{doneCount} / {PHASES.length} phases</span>
          {isRunning && (
            <span className="text-indigo-400 font-mono">
              <ElapsedTimer startTime={startTime} />
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Phase list */}
      <div className="space-y-1">
        {PHASES.map((phase) => {
          const info = stepMap[phase.step]
          const isDone = info?.done ?? false
          const isActive = phase.step === activeStep
          const isPending = !isDone && !isActive
          const latestMsg = info?.messages?.at(-1)

          return (
            <div
              key={phase.step}
              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors
                ${isActive ? 'bg-indigo-950/60 border border-indigo-800/40' : ''}
                ${isDone ? 'opacity-70' : ''}
              `}
            >
              {/* Step indicator */}
              <div className="mt-0.5 shrink-0 w-5 flex justify-center">
                {isDone && <span className="text-emerald-400 text-sm">✓</span>}
                {isActive && <Spinner />}
                {isPending && (
                  <span className="text-gray-600 text-sm font-mono">{phase.step}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    isDone ? 'text-gray-400' : isActive ? 'text-white' : 'text-gray-600'
                  }`}>
                    {phase.name}
                  </span>
                  {isDone && info?.elapsed && (
                    <span className="text-xs text-gray-600">{info.elapsed}s</span>
                  )}
                  {isActive && (
                    <span className="text-xs text-indigo-400 animate-pulse">running</span>
                  )}
                </div>

                {/* Latest message or default detail */}
                <p className={`text-xs mt-0.5 ${
                  isActive ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {isActive && latestMsg ? latestMsg : phase.detail}
                  {isDone && latestMsg && (
                    <span className="text-gray-500"> — {latestMsg}</span>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-800 rounded-xl p-3">
          <span className="text-red-400 shrink-0">✗</span>
          <div>
            <p className="text-sm font-medium text-red-300">Pipeline error</p>
            <p className="text-xs text-red-400 mt-0.5 break-all">{error}</p>
          </div>
        </div>
      )}

      {/* Running footer */}
      {isRunning && !error && (
        <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
          <div className="flex gap-1">
            {[0, 0.15, 0.3].map((d, i) => (
              <div
                key={i}
                className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            Analysis running — this takes ~3–4 minutes with the reasoning model
          </span>
        </div>
      )}
    </div>
  )
}
