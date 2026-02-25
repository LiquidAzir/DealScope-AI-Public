import React, { useState } from 'react'
import InputForm from './components/InputForm.jsx'
import ProgressStream from './components/ProgressStream.jsx'
import MemoView from './components/MemoView.jsx'
import GraphView from './components/GraphView.jsx'
import CompsTable from './components/CompsTable.jsx'
import RedFlags from './components/RedFlags.jsx'
import AcquirerRank from './components/AcquirerRank.jsx'
import { useSSE } from './hooks/useSSE.js'

const TABS = [
  { id: 'memo',      label: 'Memo',      icon: '📝' },
  { id: 'graph',     label: 'Graph',     icon: '🕸️' },
  { id: 'comps',     label: 'Comps',     icon: '📊' },
  { id: 'risks',     label: 'Risks',     icon: '🚨' },
  { id: 'acquirers', label: 'Acquirers', icon: '🎯' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('memo')
  const [query, setQuery] = useState(null)
  const { run, steps, result, error, isRunning, abort, debugLog } = useSSE()

  function handleSubmit(params) {
    setQuery(params)
    setActiveTab('memo')
    run(params)
  }

  // Read Neo4j config from environment (injected at build time via Vite)
  const neoConfig = {
    serverUrl: import.meta.env.VITE_NEO4J_URI || '',
    serverUser: import.meta.env.VITE_NEO4J_USER || 'neo4j',
    serverPassword: import.meta.env.VITE_NEO4J_PASSWORD || '',
  }

  // Badge counts for tabs
  const badgeCounts = {
    comps:     result?.comps_table?.length || 0,
    risks:     result?.red_flags?.length || 0,
    acquirers: result?.likely_acquirers?.length || 0,
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              DealScope <span className="text-indigo-400">AI</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Autonomous VC & M&A Diligence Agent</p>
          </div>
          {result && (
            <div className="text-xs text-gray-500 text-right">
              <div className="text-emerald-400 font-medium">Analysis complete</div>
              {result.total_elapsed && <div>{result.total_elapsed}s total</div>}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Input form */}
        <InputForm onSubmit={handleSubmit} isRunning={isRunning} onAbort={abort} />

        {/* Progress stream — show as soon as analysis starts */}
        {(isRunning || steps.length > 0 || error) && (
          <ProgressStream steps={steps} isRunning={isRunning} error={error} />
        )}

        {/* Debug log — always visible while running or if something went wrong */}
        {(isRunning || error || debugLog.length > 0) && (
          <DebugPanel log={debugLog} isRunning={isRunning} />
        )}

        {/* Company info banner (once we have data) */}
        {result?.company_info && (
          <CompanyBanner info={result.company_info} market={result.market_info} />
        )}

        {/* Results tabs */}
        {(result || isRunning) && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Tab bar */}
            <div className="flex border-b border-gray-800 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors relative
                    ${activeTab === tab.id
                      ? 'text-white border-b-2 border-indigo-500 bg-gray-800/50'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {badgeCounts[tab.id] > 0 && (
                    <span className="ml-0.5 bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                      {badgeCounts[tab.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5">
              {activeTab === 'memo' && <MemoView memo={result?.memo} />}
              {activeTab === 'graph' && (
                <GraphView
                  neoConfig={neoConfig}
                  graphStats={result?.graph_stats}
                  investorOverlaps={result?.investor_overlaps}
                  companyName={query?.company}
                  comps={result?.comps_table}
                  acquirers={result?.likely_acquirers}
                  companyInfo={result?.company_info}
                />
              )}
              {activeTab === 'comps' && <CompsTable comps={result?.comps_table} />}
              {activeTab === 'risks' && <RedFlags flags={result?.red_flags} />}
              {activeTab === 'acquirers' && (
                <AcquirerRank
                  acquirers={result?.likely_acquirers}
                  exitScores={result?.exit_scores}
                />
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !isRunning && steps.length === 0 && !error && (
          <EmptyState />
        )}
      </main>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CompanyBanner({ info, market }) {
  return (
    <div className="bg-gradient-to-r from-indigo-950/50 to-gray-900 border border-indigo-800/30 rounded-2xl p-5">
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white">{info.name}</h2>
          {info.description && (
            <p className="text-sm text-gray-300 mt-1 leading-relaxed max-w-2xl">{info.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {info.sector && <Chip label={info.sector} color="purple" />}
          {info.hq_location && <Chip label={info.hq_location} color="gray" />}
          {market?.tam && <Chip label={`TAM: ${market.tam}`} color="emerald" />}
        </div>
      </div>
    </div>
  )
}

function Chip({ label, color }) {
  const colors = {
    indigo:  'bg-indigo-900/50 text-indigo-300 border-indigo-700/50',
    purple:  'bg-purple-900/50 text-purple-300 border-purple-700/50',
    emerald: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    gray:    'bg-gray-800 text-gray-300 border-gray-700',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colors[color] || colors.gray}`}>
      {label}
    </span>
  )
}

function DebugPanel({ log, isRunning }) {
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-900">
        <span className="text-xs font-mono font-semibold text-gray-400">
          Stream Debug Log {isRunning && <span className="text-indigo-400 animate-pulse ml-1">● live</span>}
        </span>
        <span className="text-xs text-gray-600">{log.length} lines</span>
      </div>
      <div className="h-48 overflow-y-auto p-3 space-y-0.5 font-mono text-xs">
        {log.length === 0 ? (
          <p className="text-gray-600">Waiting for events...</p>
        ) : (
          log.map((line, i) => (
            <div key={i} className={`leading-relaxed break-all ${
              line.includes('ERROR') || line.includes('error') ? 'text-red-400' :
              line.includes('Event:') ? 'text-emerald-400' :
              line.includes('Chunk') ? 'text-blue-400' :
              'text-gray-500'
            }`}>{line}</div>
          ))
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const examples = ['Ramp', 'Figma', 'Notion', 'Stripe', 'Airtable']
  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-lg font-semibold text-gray-300 mb-2">
        Enter a company to begin autonomous diligence
      </h2>
      <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
        DealScope researches across 60+ sources, extracts entities, builds a relationship graph,
        and generates a full investment memo in ~60 seconds.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map(ex => (
          <span key={ex} className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full border border-gray-700">
            {ex}
          </span>
        ))}
      </div>
    </div>
  )
}
