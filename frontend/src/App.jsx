import React, { useState, useEffect, useRef } from 'react'
import InputForm from './components/InputForm.jsx'
import ProgressStream from './components/ProgressStream.jsx'
import MemoView from './components/MemoView.jsx'
import GraphView from './components/GraphView.jsx'
import CompsTable from './components/CompsTable.jsx'
import RedFlags from './components/RedFlags.jsx'
import AcquirerRank from './components/AcquirerRank.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import { useSSE } from './hooks/useSSE.js'

// ── Tab definitions with inline SVG icons ──────────────────────────────────────

const TABS = [
  {
    id: 'memo',
    label: 'Memo',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="1" width="10" height="12" rx="1.5"/>
        <path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3"/>
      </svg>
    ),
  },
  {
    id: 'graph',
    label: 'Graph',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="7" cy="7" r="1.75"/>
        <circle cx="2" cy="3" r="1.25"/>
        <circle cx="12" cy="3" r="1.25"/>
        <circle cx="7" cy="12.5" r="1.25"/>
        <path d="M3.1 3.9L5.4 5.7M10.9 3.9L8.6 5.7M7 8.75V11.2"/>
      </svg>
    ),
  },
  {
    id: 'comps',
    label: 'Comps',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M1.5 12h11M3.5 12V8M7 12V4M10.5 12V9.5"/>
      </svg>
    ),
  },
  {
    id: 'risks',
    label: 'Risks',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1.5L13 12H1L7 1.5z"/>
        <path d="M7 5.5v3.5"/>
        <circle cx="7" cy="10.5" r="0.6" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    id: 'acquirers',
    label: 'Acquirers',
    icon: (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="6"/>
        <circle cx="7" cy="7" r="3"/>
        <circle cx="7" cy="7" r="0.75" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
]

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('memo')
  const [query, setQuery] = useState(null)
  const [history, setHistory] = useState([])
  const savedRef = useRef(false)
  const { run, steps, result, error, isRunning, abort, reset } = useSSE()

  // Restored result from history (bypasses useSSE)
  const [restoredResult, setRestoredResult] = useState(null)
  const displayResult = restoredResult || result

  const [showHistory, setShowHistory] = useState(false)

  // Load history on mount
  useEffect(() => {
    fetch('/analyses')
      .then(r => r.ok ? r.json() : [])
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Save result when pipeline completes
  useEffect(() => {
    if (!result || savedRef.current) return
    savedRef.current = true
    const company_name = query?.company || result?.company_info?.name || ''
    const sector = result?.company_info?.sector || ''
    fetch('/analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name, sector, result }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(saved => {
        if (saved?.id) {
          setHistory(prev => [
            { id: saved.id, company_name, sector, created_at: saved.created_at },
            ...prev,
          ])
        }
      })
      .catch(() => {})
  }, [result])

  function handleGoHome() {
    reset()
    setRestoredResult(null)
    setQuery(null)
    setShowHistory(false)
  }

  function handleSubmit(params) {
    savedRef.current = false
    setRestoredResult(null)
    setShowHistory(false)
    setQuery(params)
    setActiveTab('memo')
    run(params)
  }

  async function handleLoadHistory(entry) {
    try {
      const r = await fetch(`/analyses/${entry.id}`)
      if (!r.ok) return
      const data = await r.json()
      setQuery({ company: data.company_name })
      setActiveTab('memo')
      setRestoredResult(data.result)
      setShowHistory(false)
    } catch (_) {}
  }

  function handleDeleteHistory(id) {
    fetch(`/analyses/${id}`, { method: 'DELETE' })
      .then(r => {
        if (r.ok) setHistory(prev => prev.filter(e => e.id !== id))
      })
      .catch(() => {})
  }

  const neoConfig = {
    serverUrl:      import.meta.env.VITE_NEO4J_URI || '',
    serverUser:     import.meta.env.VITE_NEO4J_USER || 'neo4j',
    serverPassword: import.meta.env.VITE_NEO4J_PASSWORD || '',
  }

  const badgeCounts = {
    comps:     displayResult?.comps_table?.length     || 0,
    risks:     displayResult?.red_flags?.length        || 0,
    acquirers: displayResult?.likely_acquirers?.length || 0,
  }

  const isIdle = !displayResult && !isRunning && steps.length === 0 && !error

  return (
    <div className="min-h-screen bg-gray-950">

      {/* ── Header ── */}
      <header className="border-b border-gray-800/70 bg-gray-950/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 h-12 flex items-center gap-3">
          {/* Logo — click to go home */}
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 6h9M6 1.5L10.5 6 6 10.5"/>
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white tracking-tight">DealScope</span>
              <span className="text-sm font-semibold text-indigo-400 tracking-tight">AI</span>
            </div>
          </button>

          <div className="h-3.5 w-px bg-gray-800 mx-0.5" />
          <span className="text-xs text-gray-600">VC & M&A Diligence</span>

          {/* Recent analyses button */}
          {history.length > 0 && !isRunning && (
            <button
              onClick={() => setShowHistory(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors
                ${showHistory
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/30'
                  : 'bg-gray-800/60 text-gray-400 border-gray-700/50 hover:text-gray-300'
                }`}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="5"/>
                <path d="M6 3.5v2.75l1.75 1.75"/>
              </svg>
              Recent
              <span className="tabular-nums text-gray-500">{history.length}</span>
            </button>
          )}

          {displayResult && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500 tabular-nums">
                {displayResult.total_elapsed ? `${displayResult.total_elapsed}s` : 'Complete'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-5 py-7 space-y-4">

        {/* Search */}
        <InputForm onSubmit={handleSubmit} isRunning={isRunning} onAbort={abort} />

        {/* Pipeline progress */}
        {(isRunning || steps.length > 0 || error) && (
          <ProgressStream steps={steps} isRunning={isRunning} error={error} />
        )}

        {/* Company info banner */}
        {displayResult?.company_info && (
          <CompanyBanner info={displayResult.company_info} market={displayResult.market_info} />
        )}

        {/* Results panel */}
        {(displayResult || isRunning) && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-gray-800 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                    ${activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                  <span className={activeTab === tab.id ? 'text-indigo-400' : 'text-gray-600'}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {badgeCounts[tab.id] > 0 && (
                    <span className={`text-xs rounded px-1.5 py-0.5 tabular-nums font-medium
                      ${activeTab === tab.id
                        ? 'bg-indigo-600/70 text-indigo-100'
                        : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      {badgeCounts[tab.id]}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-indigo-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5">
              {activeTab === 'memo' && (
                <MemoView
                  memo={displayResult?.memo}
                  companyName={displayResult?.company_info?.name || query?.company || ''}
                />
              )}
              {activeTab === 'graph' && (
                <GraphView
                  neoConfig={neoConfig}
                  graphStats={displayResult?.graph_stats}
                  investorOverlaps={displayResult?.investor_overlaps}
                  companyName={query?.company}
                  comps={displayResult?.comps_table}
                  acquirers={displayResult?.likely_acquirers}
                  companyInfo={displayResult?.company_info}
                />
              )}
              {activeTab === 'comps' && <CompsTable comps={displayResult?.comps_table} />}
              {activeTab === 'risks' && <RedFlags flags={displayResult?.red_flags} />}
              {activeTab === 'acquirers' && (
                <AcquirerRank
                  acquirers={displayResult?.likely_acquirers}
                  exitScores={displayResult?.exit_scores}
                />
              )}
            </div>
          </div>
        )}

        {/* History — shown in idle state or when toggled via Recent button */}
        {!isRunning && history.length > 0 && (isIdle || showHistory) && (
          <HistoryPanel
            history={history}
            onLoad={handleLoadHistory}
            onDelete={handleDeleteHistory}
          />
        )}

        {/* Empty state */}
        {isIdle && <EmptyState />}
      </main>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CompanyBanner({ info, market }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
            {info.name}
          </h2>
          {info.description && (
            <p className="text-sm text-gray-400 mt-1.5 leading-relaxed max-w-2xl">
              {info.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0 mt-0.5">
          {info.sector && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20">
              {info.sector}
            </span>
          )}
          {info.hq_location && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 border border-gray-700">
              {info.hq_location}
            </span>
          )}
        </div>
      </div>

      {market?.tam && (
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-start gap-3">
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mt-0.5 shrink-0">
            TAM
          </span>
          <p className="text-sm text-gray-300 leading-relaxed">{market.tam}</p>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const examples = ['Stripe', 'Notion', 'Render', 'Ramp', 'Airtable', 'Anthropic', 'Tavily']
  return (
    <div className="text-center py-20 px-4">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600/10 border border-indigo-600/20 mb-6">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#6366f1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="m14.5 14.5-2.5-2.5"/>
        </svg>
      </div>
      <h2 className="text-base font-semibold text-gray-200 mb-2 tracking-tight">
        Autonomous investment diligence
      </h2>
      <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed mb-7">
        Enter a company name to generate a full VC-style analysis — web research, entity extraction,
        relationship graph, and investment memo in ~60 seconds.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map(ex => (
          <span key={ex} className="text-xs text-gray-500 px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
            {ex}
          </span>
        ))}
      </div>
    </div>
  )
}
