import React from 'react'

const SEV = {
  HIGH:   { bar: 'bg-red-500',   badge: 'text-red-400 bg-red-500/10 border-red-500/25',   label: 'High'   },
  MEDIUM: { bar: 'bg-amber-500', badge: 'text-amber-400 bg-amber-500/10 border-amber-500/25', label: 'Medium' },
  LOW:    { bar: 'bg-blue-500',  badge: 'text-blue-400 bg-blue-500/10 border-blue-500/25',  label: 'Low'    },
}

function RedFlagCard({ flag }) {
  const sev = (flag.severity || 'MEDIUM').toUpperCase()
  const s   = SEV[sev] || SEV.MEDIUM

  return (
    <div className="flex bg-gray-950 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      {/* Severity bar */}
      <div className={`w-0.5 shrink-0 ${s.bar}`} />

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <p className="text-sm font-medium text-gray-200 leading-snug">{flag.signal}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border shrink-0 ${s.badge}`}>
            {s.label}
          </span>
        </div>

        <div className="space-y-1.5">
          {flag.evidence && (
            <div className="flex gap-2.5 text-xs">
              <span className="text-gray-600 font-medium shrink-0 w-14 pt-px">Evidence</span>
              <span className="text-gray-400 leading-relaxed">{flag.evidence}</span>
            </div>
          )}
          {flag.implication && (
            <div className="flex gap-2.5 text-xs">
              <span className="text-gray-600 font-medium shrink-0 w-14 pt-px">Impact</span>
              <span className="text-gray-500 leading-relaxed">{flag.implication}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RedFlags({ flags }) {
  if (!flags || flags.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-600 text-sm">
        Risk signals will appear here after analysis completes.
      </div>
    )
  }

  const high   = flags.filter(f => (f.severity || '').toUpperCase() === 'HIGH')
  const medium = flags.filter(f => (f.severity || '').toUpperCase() === 'MEDIUM')
  const low    = flags.filter(f => (f.severity || '').toUpperCase() === 'LOW')

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex items-center gap-1">
        {[
          { label: 'High',   count: high.length,   color: 'text-red-400',   bg: 'bg-red-500/8   border-red-500/20'   },
          { label: 'Medium', count: medium.length, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20' },
          { label: 'Low',    count: low.length,    color: 'text-blue-400',  bg: 'bg-blue-500/8  border-blue-500/20'  },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${bg}`}>
            <span className={`font-bold tabular-nums ${color}`}>{count}</span>
            <span className="text-gray-500">{label}</span>
          </div>
        ))}
        <div className="ml-auto text-xs text-gray-600 tabular-nums">{flags.length} total</div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {[...high, ...medium, ...low].map((flag, i) => (
          <RedFlagCard key={i} flag={flag} />
        ))}
      </div>
    </div>
  )
}
