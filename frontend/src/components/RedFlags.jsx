import React from 'react'

const SEVERITY_CONFIG = {
  HIGH:   { bg: 'bg-red-950',    border: 'border-red-700',    badge: 'bg-red-700 text-red-100',    dot: 'bg-red-500' },
  MEDIUM: { bg: 'bg-amber-950',  border: 'border-amber-700',  badge: 'bg-amber-700 text-amber-100', dot: 'bg-amber-500' },
  LOW:    { bg: 'bg-blue-950',   border: 'border-blue-800',   badge: 'bg-blue-800 text-blue-200',   dot: 'bg-blue-500' },
}

function RedFlagCard({ flag }) {
  const sev = (flag.severity || 'MEDIUM').toUpperCase()
  const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.MEDIUM

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-4`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-white text-sm leading-snug flex-1">{flag.signal}</h3>
        <span className={`${cfg.badge} text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap`}>
          {sev}
        </span>
      </div>
      {flag.evidence && (
        <p className="text-xs text-gray-400 mb-1">
          <span className="text-gray-500 font-medium">Evidence: </span>{flag.evidence}
        </p>
      )}
      {flag.implication && (
        <p className="text-xs text-gray-400">
          <span className="text-gray-500 font-medium">Why it matters: </span>{flag.implication}
        </p>
      )}
    </div>
  )
}

export default function RedFlags({ flags }) {
  if (!flags || flags.length === 0) return (
    <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
      Risk signals will appear here after analysis completes.
    </div>
  )

  const high   = flags.filter(f => (f.severity || '').toUpperCase() === 'HIGH')
  const medium = flags.filter(f => (f.severity || '').toUpperCase() === 'MEDIUM')
  const low    = flags.filter(f => (f.severity || '').toUpperCase() === 'LOW')

  const summary = [
    { label: 'High', count: high.length, color: 'text-red-400' },
    { label: 'Medium', count: medium.length, color: 'text-amber-400' },
    { label: 'Low', count: low.length, color: 'text-blue-400' },
  ]

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex gap-6 bg-gray-800/50 rounded-xl px-5 py-3">
        {summary.map(s => (
          <div key={s.label} className="text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
        <div className="text-center ml-auto">
          <div className="text-2xl font-bold text-white">{flags.length}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>

      {/* Cards grouped by severity */}
      {[...high, ...medium, ...low].map((flag, i) => (
        <RedFlagCard key={i} flag={flag} />
      ))}
    </div>
  )
}
