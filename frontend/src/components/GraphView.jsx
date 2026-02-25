import React, { useEffect, useRef, useState } from 'react'

export default function GraphView({
  neoConfig, graphStats, investorOverlaps,
  companyName, comps, acquirers, companyInfo,
}) {
  const containerRef = useRef(null)
  const vizRef       = useRef(null)
  const [vizError, setVizError]   = useState(null)
  const [vizLoaded, setVizLoaded] = useState(false)

  // Only attempt NeoVis if creds exist AND Neo4j actually has data
  const neo4jWorked  = graphStats && Object.keys(graphStats).length > 0
  const hasNeoConfig = neoConfig?.serverUrl && neoConfig?.serverPassword
  const showNeoViz   = hasNeoConfig && neo4jWorked

  useEffect(() => {
    if (!showNeoViz || !containerRef.current) return
    let cancelled = false

    async function initViz() {
      try {
        const NeoVis = (await import('neovis.js')).default

        // Convert neo4j+s:// → bolt+s:// to avoid the "encryption configured twice" error
        const rawUrl = neoConfig.serverUrl
        const boltUrl = rawUrl
          .replace(/^neo4j\+s:\/\//, 'bolt+s://')
          .replace(/^neo4j\+ssc:\/\//, 'bolt+ssc://')
          .replace(/^neo4j:\/\//, 'bolt://')

        const config = {
          containerId: containerRef.current.id,
          neo4j: {
            serverUrl:      boltUrl,
            serverUser:     neoConfig.serverUser || 'neo4j',
            serverPassword: neoConfig.serverPassword,
          },
          visConfig: {
            nodes: { font: { color: '#e5e7eb', size: 13 }, borderWidth: 1.5 },
            edges: {
              font: { color: '#9ca3af', size: 11 },
              arrows: { to: { enabled: true, scaleFactor: 0.6 } },
            },
            physics: {
              stabilization: { iterations: 200 },
              barnesHut: { gravitationalConstant: -4000 },
            },
          },
          labels: {
            Company:  { label: 'name', [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { shape: 'dot', size: 16 }, function: { color: n => n.properties?.is_target ? '#ef4444' : '#4f46e5' } } },
            Person:   { label: 'name', [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#10b981', shape: 'diamond', size: 14 } } },
            Investor: { label: 'name', [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#f59e0b', shape: 'triangle', size: 14 } } },
            Market:   { label: 'name', [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#8b5cf6', shape: 'square', size: 14 } } },
          },
          relationships: {
            COMPETES_WITH: { [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#ef4444', dashes: true } } },
            INVESTED_IN:   { [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#f59e0b' } } },
            ACQUIRED:      { [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#8b5cf6', width: 2 } } },
            FOUNDED:       { [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#10b981' } } },
            OPERATES_IN:   { [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#6b7280', dashes: true } } },
            PARTNERS_WITH: { [NeoVis.NEOVIS_ADVANCED_CONFIG]: { static: { color: '#06b6d4' } } },
          },
          initialCypher: `
            MATCH (n)-[r]->(m)
            WHERE n.is_target = true OR m.is_target = true
               OR (n)-[:COMPETES_WITH]-(:Company {is_target: true})
               OR (n)-[:INVESTED_IN]->(:Company {is_target: true})
            RETURN n, r, m LIMIT 80
          `,
        }

        if (!cancelled) {
          vizRef.current = new NeoVis(config)
          vizRef.current.render()
          setVizLoaded(true)
        }
      } catch (err) {
        if (!cancelled) setVizError(err.message)
      }
    }

    initViz()
    return () => { cancelled = true }
  }, [showNeoViz, neoConfig])

  return (
    <div className="space-y-5">

      {/* ── NeoVis canvas (only when Neo4j has data) ── */}
      {showNeoViz && (
        <div className="relative">
          <div
            id="graph-viz"
            ref={containerRef}
            className="w-full rounded-xl border border-gray-700 bg-gray-900"
            style={{ height: 480 }}
          />
          {!vizLoaded && !vizError && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              Loading graph…
            </div>
          )}
          {vizError && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="text-red-400 text-sm text-center">{vizError}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Local-mode banner ── */}
      {!neo4jWorked && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-amber-400 shrink-0 mt-0.5">⚠</span>
          <div className="text-xs text-amber-300">
            <span className="font-semibold">Neo4j unavailable (local mode)</span> — graph couldn't be written.
            Check that your <code className="bg-amber-900/40 px-1 rounded">NEO4J_URI</code> / <code className="bg-amber-900/40 px-1 rounded">NEO4J_PASSWORD</code> credentials are valid.
            Showing analysis-derived relationships below.
          </div>
        </div>
      )}

      {/* ── Graph stats (when Neo4j worked) ── */}
      {neo4jWorked && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Object.entries(graphStats).map(([label, count]) => (
            <div key={label} className="bg-gray-800/60 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-white">{count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Relationship summary (always shown — uses analysis data) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Competitors */}
        {comps && comps.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              M&A Comparable Transactions
            </h3>
            <div className="space-y-2">
              {comps.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-600 mt-0.5 shrink-0">{i + 1}.</span>
                  <div className="min-w-0">
                    <span className="text-white font-medium">{c.target}</span>
                    <span className="text-gray-500"> acquired by </span>
                    <span className="text-indigo-300">{c.acquirer}</span>
                    {c.deal_size && <span className="text-emerald-400 ml-1">· {c.deal_size}</span>}
                    {c.year     && <span className="text-gray-600 ml-1">({c.year})</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acquirers */}
        {acquirers && acquirers.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              Likely Acquirers
            </h3>
            <div className="space-y-2">
              {acquirers.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`font-bold w-5 text-right shrink-0 ${
                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : 'text-gray-600'
                  }`}>{i + 1}</span>
                  <span className="text-white font-medium">{a.name}</span>
                  <span className="ml-auto text-indigo-400 font-semibold shrink-0">{a.fit_score}/10</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Investor overlaps (when Neo4j worked) ── */}
      {investorOverlaps && investorOverlaps.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3">
            Investor Overlap Signal
          </h3>
          <div className="space-y-2">
            {investorOverlaps.map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-amber-500 mt-0.5 shrink-0">⚡</span>
                <span className="text-gray-300">
                  <span className="font-medium text-white">{o.investor}</span>
                  {' '}also backs{' '}
                  <span className="text-amber-300">{o.also_backs?.join(', ')}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {[
          ['#ef4444', 'Target company'],
          ['#4f46e5', 'Competitor'],
          ['#f59e0b', 'Investor'],
          ['#10b981', 'Founder'],
          ['#8b5cf6', 'Market'],
        ].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
