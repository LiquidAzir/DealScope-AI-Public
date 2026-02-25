import React, { useState } from 'react'

export default function CompsTable({ comps }) {
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc')

  if (!comps || comps.length === 0) return (
    <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
      M&A comparable transactions will appear here.
    </div>
  )

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...comps].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const SortBtn = ({ k, label }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-1 hover:text-white transition-colors"
    >
      {label}
      <span className="text-xs opacity-60">
        {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-xs text-gray-400 uppercase tracking-wide">
            <th className="px-4 py-3 text-left"><SortBtn k="target" label="Target" /></th>
            <th className="px-4 py-3 text-left"><SortBtn k="acquirer" label="Acquirer" /></th>
            <th className="px-4 py-3 text-left"><SortBtn k="year" label="Year" /></th>
            <th className="px-4 py-3 text-left"><SortBtn k="deal_size" label="Deal Size" /></th>
            <th className="px-4 py-3 text-left"><SortBtn k="implied_multiple" label="Multiple" /></th>
            <th className="px-4 py-3 text-left">Rationale</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sorted.map((comp, i) => (
            <tr key={i} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 font-medium text-white">{comp.target || '—'}</td>
              <td className="px-4 py-3 text-indigo-300">{comp.acquirer || '—'}</td>
              <td className="px-4 py-3 text-gray-300">{comp.year || '—'}</td>
              <td className="px-4 py-3 text-emerald-400 font-mono">{comp.deal_size || '—'}</td>
              <td className="px-4 py-3 text-amber-400 font-mono">{comp.implied_multiple || '—'}</td>
              <td className="px-4 py-3 text-gray-400 max-w-xs truncate" title={comp.strategic_rationale}>
                {comp.strategic_rationale || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
