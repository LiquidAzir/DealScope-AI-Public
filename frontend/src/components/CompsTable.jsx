import React, { useState } from 'react'

const COLS = [
  { key: 'target',           label: 'Target',    align: 'left'  },
  { key: 'acquirer',         label: 'Acquirer',   align: 'left'  },
  { key: 'year',             label: 'Year',       align: 'right' },
  { key: 'deal_size',        label: 'Deal Size',  align: 'right' },
  { key: 'implied_multiple', label: 'Multiple',   align: 'right' },
  { key: 'strategic_rationale', label: 'Rationale', align: 'left' },
]

function SortIcon({ active, dir }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
    >
      {active && dir === 'asc'
        ? <path d="M5 2L8.5 7H1.5L5 2z" fill="currentColor"/>
        : <path d="M5 8L1.5 3H8.5L5 8z" fill="currentColor"/>
      }
    </svg>
  )
}

export default function CompsTable({ comps }) {
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc')

  if (!comps || comps.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-600 text-sm">
        M&A comparable transactions will appear here.
      </div>
    )
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...comps].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-800">
            {COLS.map(col => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                <button
                  onClick={() => handleSort(col.key)}
                  className="inline-flex items-center gap-1.5 group hover:text-gray-400 transition-colors"
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {sorted.map((row, i) => (
            <tr key={i} className="hover:bg-gray-800/30 transition-colors group">
              <td className="px-3 py-3 font-medium text-gray-200">{row.target || '—'}</td>
              <td className="px-3 py-3 text-indigo-400">{row.acquirer || '—'}</td>
              <td className="px-3 py-3 text-right tabular-nums text-gray-500 text-xs">{row.year || '—'}</td>
              <td className="px-3 py-3 text-right tabular-nums text-emerald-400 text-xs font-medium">{row.deal_size || '—'}</td>
              <td className="px-3 py-3 text-right tabular-nums text-amber-400 text-xs">{row.implied_multiple || '—'}</td>
              <td className="px-3 py-3 text-gray-500 text-xs leading-relaxed max-w-xs">
                {row.strategic_rationale || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
