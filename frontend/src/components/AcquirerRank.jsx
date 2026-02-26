import React from 'react'

// ── Exit Score Card ───────────────────────────────────────────────────────────

function ExitScoreCard({ label, score, reasoning, color }) {
  const pct = Math.round(((score || 0) / 10) * 100)
  const styles = {
    indigo: { bar: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/8' },
    violet: { bar: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/8' },
  }
  const s = styles[color] || styles.indigo

  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className={`text-xl font-bold tabular-nums leading-none ${s.text}`}>
          {score ?? '—'}
          <span className="text-xs font-normal text-gray-700 ml-0.5">/10</span>
        </span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full mb-3">
        <div className={`h-full rounded-full transition-all ${s.bar}`} style={{ width: `${pct}%` }} />
      </div>
      {reasoning && (
        <p className="text-xs text-gray-500 leading-relaxed">{reasoning}</p>
      )}
    </div>
  )
}

// ── Acquirer Card ─────────────────────────────────────────────────────────────

function AcquirerCard({ acquirer, rank }) {
  const score = acquirer.fit_score || 0
  const pct   = (score / 10) * 100
  const rankStyle =
    rank === 1 ? 'text-amber-400' :
    rank === 2 ? 'text-gray-400'  :
    rank === 3 ? 'text-amber-700' :
                 'text-gray-600'

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3.5">

        {/* Rank */}
        <span className={`text-base font-bold tabular-nums w-5 text-right shrink-0 mt-0.5 ${rankStyle}`}>
          {rank}
        </span>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Name + score */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="font-semibold text-gray-100 text-sm">{acquirer.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="font-medium text-xs tabular-nums text-indigo-400 w-7 text-right">
                {score}/10
              </span>
            </div>
          </div>

          {/* Prior acquisitions */}
          {acquirer.prior_acquisitions > 0 && (
            <p className="text-xs text-gray-600 mb-2">
              {acquirer.prior_acquisitions} prior acquisition{acquirer.prior_acquisitions !== 1 ? 's' : ''} in sector
            </p>
          )}

          {/* Rationale */}
          {acquirer.rationale && (
            <p className="text-xs text-gray-400 leading-relaxed mb-2">{acquirer.rationale}</p>
          )}

          {/* History tags */}
          {acquirer.acquisition_history?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {acquirer.acquisition_history.slice(0, 5).map((h, i) => (
                <span key={i} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded border border-gray-700/60">
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AcquirerRank({ acquirers, exitScores }) {
  if (!acquirers || acquirers.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-600 text-sm">
        Likely acquirers will be ranked here after analysis.
      </div>
    )
  }

  const sorted = [...acquirers].sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0))

  return (
    <div className="space-y-5">

      {/* Exit probability */}
      {exitScores && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ExitScoreCard
              label="Acquisition"
              score={exitScores.acquisition_score}
              reasoning={exitScores.acquisition_reasoning}
              color="indigo"
            />
            <ExitScoreCard
              label="IPO"
              score={exitScores.ipo_score}
              reasoning={exitScores.ipo_reasoning}
              color="violet"
            />
          </div>
          {exitScores.timeline && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-lg">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0">Timeline</span>
              <span className="text-sm text-gray-300">{exitScores.timeline}</span>
            </div>
          )}
        </div>
      )}

      {/* Ranked list */}
      <div className="space-y-2">
        {sorted.map((acq, i) => (
          <AcquirerCard key={i} acquirer={acq} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}
