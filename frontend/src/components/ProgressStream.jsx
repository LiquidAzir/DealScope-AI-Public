import React, { useState, useEffect } from 'react'

const PHASES = [
  { step: 1, name: 'Web Research',        detail: 'Searching news, funding, and market sources' },
  { step: 2, name: 'Entity Extraction',   detail: 'AI extracting founders, investors, competitors' },
  { step: 3, name: 'Market Intelligence', detail: 'M&A comps, risk signals, exit indicators' },
  { step: 4, name: 'Knowledge Graph',     detail: 'Building Neo4j relationship graph' },
  { step: 5, name: 'Investment Analysis', detail: 'Red flags, exit scores, acquirer ranking' },
  { step: 6, name: 'Investment Memo',     detail: 'Writing full diligence memo' },
]

function ElapsedTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500)
    return () => clearInterval(id)
  }, [startTime])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span className="tabular-nums">{m > 0 ? `${m}m ` : ''}{s}s</span>
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1.5 5L4 7.5 8.5 2.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Spinner() {
  return (
    <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
  )
}

export default function ProgressStream({ steps, isRunning, error }) {
  const [startTime] = useState(() => Date.now())

  if (!isRunning && steps.length === 0 && !error) return null

  // Build a map: step number → { done, messages, elapsed }
  const stepMap = {}
  for (const s of steps) {
    const key = s.step
    if (!key) continue
    if (!stepMap[key]) stepMap[key] = { done: false, messages: [], elapsed: null }
    stepMap[key].messages.push(s.message)
    if (s.done) {
      stepMap[key].done = true
      if (s.elapsed) stepMap[key].elapsed = s.elapsed
    }
  }

  const activeStep = steps.length > 0
    ? (steps.find(s => s.step && !s.done)?.step ?? null)
    : null

  const doneCount = PHASES.filter(p => stepMap[p.step]?.done).length
  const progressPct = Math.round((doneCount / PHASES.length) * 100)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isRunning ? (
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          ) : error ? (
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
          <span className="text-xs font-medium text-gray-400">
            {isRunning
              ? 'Running analysis'
              : error
              ? 'Pipeline failed'
              : 'Analysis complete'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="tabular-nums">{doneCount} / {PHASES.length}</span>
          {isRunning && (
            <span className="text-indigo-400 font-medium">
              <ElapsedTimer startTime={startTime} />
            </span>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-px bg-gray-800">
        <div
          className="h-full bg-indigo-500 transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ── Step list ── */}
      <div className="py-1">
        {PHASES.map((phase, idx) => {
          const info      = stepMap[phase.step]
          const isDone    = info?.done ?? false
          const isActive  = phase.step === activeStep
          const isPending = !isDone && !isActive
          const latestMsg = info?.messages?.at(-1)
          const isLast    = idx === PHASES.length - 1

          return (
            <div
              key={phase.step}
              className={`relative flex items-start gap-0 transition-colors
                ${isActive ? 'bg-indigo-950/30' : ''}`}
            >
              {/* Left accent border */}
              <div className={`w-0.5 self-stretch shrink-0 ${
                isDone    ? 'bg-emerald-800/60' :
                isActive  ? 'bg-indigo-500'     :
                            'bg-gray-800'
              }`} />

              {/* Vertical connector line between dots (sits behind dot) */}
              {!isLast && (
                <div className="absolute left-[1.1875rem] top-9 bottom-0 w-px bg-gray-800 z-0" />
              )}

              {/* Step indicator */}
              <div className="relative z-10 flex items-center justify-center w-5 h-5 mx-3 mt-3.5 shrink-0">
                {isDone && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                    <CheckIcon />
                  </div>
                )}
                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/50 flex items-center justify-center">
                    <Spinner />
                  </div>
                )}
                {isPending && (
                  <div className="w-5 h-5 rounded-full border border-gray-700 flex items-center justify-center">
                    <span className="text-gray-700 text-xs font-medium tabular-nums leading-none">{phase.step}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 py-3 pr-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-medium ${
                    isDone    ? 'text-gray-400' :
                    isActive  ? 'text-white'    :
                                'text-gray-600'
                  }`}>
                    {phase.name}
                  </span>
                  {isDone && info?.elapsed && (
                    <span className="text-xs text-gray-500 tabular-nums shrink-0">{info.elapsed}s</span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed ${
                  isActive  ? 'text-gray-400' :
                  isDone    ? 'text-gray-600' :
                              'text-gray-700'
                }`}>
                  {isActive && latestMsg ? latestMsg : phase.detail}
                  {isDone && latestMsg ? ` — ${latestMsg}` : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Running footer ── */}
      {isRunning && !error && (
        <div className="px-4 py-2.5 border-t border-gray-800 flex items-center gap-2.5">
          <div className="flex gap-1">
            {[0, 0.15, 0.3].map((d, i) => (
              <div
                key={i}
                className="w-1 h-1 bg-indigo-500/70 rounded-full animate-bounce"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">
            Analysis running — typically 1–4 minutes
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mx-4 mb-4 mt-1 px-3 py-2.5 bg-red-500/8 border border-red-500/20 rounded-lg flex items-start gap-2">
          <svg className="text-red-500 shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.5 3a.5.5 0 011 0v2.5a.5.5 0 01-1 0V4zm.5 5a.75.75 0 110-1.5A.75.75 0 016 9z"/>
          </svg>
          <p className="text-xs text-red-400 leading-relaxed break-all">{error}</p>
        </div>
      )}
    </div>
  )
}
