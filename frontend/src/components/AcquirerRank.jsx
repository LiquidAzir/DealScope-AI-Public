import React from 'react'

function ScoreBar({ score }) {
  const pct = (score / 10) * 100
  const color = score >= 7 ? 'bg-emerald-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-white w-8 text-right">{score}/10</span>
    </div>
  )
}

function AcquirerCard({ acquirer, rank }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center">
              {rank}
            </span>
            <h3 className="font-bold text-white text-base">{acquirer.name}</h3>
          </div>
          {acquirer.prior_acquisitions > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 ml-8">
              {acquirer.prior_acquisitions} prior acquisition{acquirer.prior_acquisitions !== 1 ? 's' : ''} in sector
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-500 mb-1">Strategic Fit</div>
          <ScoreBar score={acquirer.fit_score || 0} />
        </div>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">{acquirer.rationale}</p>

      {acquirer.acquisition_history && acquirer.acquisition_history.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {acquirer.acquisition_history.map((h, i) => (
            <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AcquirerRank({ acquirers, exitScores }) {
  if (!acquirers || acquirers.length === 0) return (
    <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
      Likely acquirers will be ranked here after analysis.
    </div>
  )

  const sorted = [...acquirers].sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0))

  return (
    <div className="space-y-4">
      {/* Exit probability summary */}
      {exitScores && (
        <div className="grid grid-cols-2 gap-4 bg-gray-800/40 rounded-xl p-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">IPO Probability</div>
            <ScoreBar score={exitScores.ipo_score || 0} />
            {exitScores.ipo_reasoning && (
              <p className="text-xs text-gray-500 mt-1 leading-snug">{exitScores.ipo_reasoning}</p>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Acquisition Probability</div>
            <ScoreBar score={exitScores.acquisition_score || 0} />
            {exitScores.acquisition_reasoning && (
              <p className="text-xs text-gray-500 mt-1 leading-snug">{exitScores.acquisition_reasoning}</p>
            )}
          </div>
          {exitScores.timeline && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Timeline: </span>
              <span className="text-xs text-indigo-300 font-medium">{exitScores.timeline}</span>
            </div>
          )}
        </div>
      )}

      {/* Ranked acquirer cards */}
      {sorted.map((acq, i) => (
        <AcquirerCard key={i} acquirer={acq} rank={i + 1} />
      ))}
    </div>
  )
}
