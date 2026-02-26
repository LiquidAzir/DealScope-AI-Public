import React, { useMemo } from 'react'

// ── Layout constants ──────────────────────────────────────────────────────────
const W = 800          // SVG viewBox width
const CX = W / 2      // center circle X
const CR = 48          // center circle radius
const LEFT_CX = 90    // center X of left node boxes
const LEFT_W  = 140   // width of left node boxes
const LEFT_RX = LEFT_CX + LEFT_W / 2   // right edge of left boxes (connects to circle)
const RIGHT_CX = W - 90
const RIGHT_W  = 158
const RIGHT_LX = RIGHT_CX - RIGHT_W / 2  // left edge of right boxes

const ROW_H = 60      // vertical spacing between nodes
const FONT  = 'Inter, system-ui, sans-serif'

function trunc(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

// Vertical center Y for node i out of n, pivoting around CY
function nodeY(n, i, CY) {
  if (n === 0) return CY
  return CY - ((n - 1) * ROW_H) / 2 + i * ROW_H
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LeftNode({ name, y }) {
  return (
    <g>
      <rect
        x={LEFT_CX - LEFT_W / 2} y={y - 16}
        width={LEFT_W} height={32} rx={5}
        fill="#111827" stroke="#374151" strokeWidth="1"
      />
      <title>{name}</title>
      <text
        x={LEFT_CX} y={y + 4}
        textAnchor="middle" fill="#9ca3af" fontSize="11"
        fontFamily={FONT}
      >
        {trunc(name, 17)}
      </text>
    </g>
  )
}

function RightNode({ name, score, y }) {
  const barTotal = 72
  const barFill  = Math.round(((score || 0) / 10) * barTotal)
  const barX     = RIGHT_CX - barTotal / 2

  return (
    <g>
      <rect
        x={RIGHT_CX - RIGHT_W / 2} y={y - 24}
        width={RIGHT_W} height={48} rx={5}
        fill="#1e1b4b" stroke="#3730a3" strokeWidth="1"
      />
      <title>{name} — Fit score {score}/10</title>
      <text
        x={RIGHT_CX} y={y - 6}
        textAnchor="middle" fill="#c7d2fe" fontSize="11" fontWeight="500"
        fontFamily={FONT}
      >
        {trunc(name, 19)}
      </text>
      {/* Fit score bar */}
      <rect x={barX} y={y + 8} width={barTotal} height={3} rx={1.5} fill="#312e81" />
      <rect x={barX} y={y + 8} width={barFill}  height={3} rx={1.5} fill="#6366f1" />
      <text
        x={barX + barTotal + 5} y={y + 12}
        fill="#6366f1" fontSize="8.5" fontFamily={FONT}
      >
        {score ?? '?'}/10
      </text>
    </g>
  )
}

function EdgeLeft({ lx, ly, cy }) {
  const mx = (lx + CX - CR) / 2
  return (
    <path
      d={`M ${lx} ${ly} C ${mx} ${ly} ${mx} ${cy} ${CX - CR} ${cy}`}
      stroke="#374151" strokeWidth="1.5" strokeDasharray="5 4"
      fill="none" opacity="0.7"
    />
  )
}

function EdgeRight({ rx, ry, cy }) {
  const mx = (CX + CR + rx) / 2
  return (
    <path
      d={`M ${CX + CR} ${cy} C ${mx} ${cy} ${mx} ${ry} ${rx} ${ry}`}
      stroke="#4338ca" strokeWidth="1.5"
      fill="none" opacity="0.85"
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GraphView({
  graphStats, investorOverlaps,
  companyName, comps, acquirers, companyInfo,
  // neoConfig kept for API compatibility — display uses local data only
}) {
  const targetName = companyInfo?.name || companyName || 'Company'
  const sector     = companyInfo?.sector || ''

  // Right side: top 5 likely acquirers by fit score
  const rightNodes = useMemo(() =>
    (acquirers || [])
      .sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0))
      .slice(0, 5),
    [acquirers]
  )

  // Left side: companies that have acquired in this space (from M&A comps),
  // excluding the target and anyone already on the right side
  const leftNodes = useMemo(() => {
    const exclude = new Set([
      targetName.toLowerCase(),
      ...(rightNodes.map(n => (n.name || '').toLowerCase())),
    ])
    return [...new Set(
      (comps || [])
        .map(c => c.acquirer)
        .filter(n => n && !exclude.has(n.toLowerCase()))
    )].slice(0, 5)
  }, [comps, rightNodes, targetName])

  const nLeft  = leftNodes.length
  const nRight = rightNodes.length
  const nMax   = Math.max(nLeft, nRight, 2)
  const H      = Math.max(240, nMax * ROW_H + 100)
  const CY     = H / 2

  const neo4jWorked = graphStats && Object.keys(graphStats).length > 0
  const noData      = nLeft === 0 && nRight === 0

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-200">Relationship Map</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          M&A activity in this space and who is most likely to acquire {targetName}
        </p>
      </div>

      {/* ── SVG diagram ── */}
      {noData ? (
        <div className="bg-gray-950 border border-gray-800 rounded-xl py-14 text-center">
          <p className="text-sm text-gray-600">Relationship data will appear once analysis is complete.</p>
        </div>
      ) : (
        <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">

          {/* Column labels */}
          <div className="grid grid-cols-3 px-4 pt-3 pb-0 text-center">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Active in Space
            </span>
            <span className="text-xs font-semibold text-indigo-500/60 uppercase tracking-wider">
              Target
            </span>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Strategic Fit
            </span>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ display: 'block' }}
          >
            {/* Edges — left nodes to center */}
            {leftNodes.map((_, i) => (
              <EdgeLeft
                key={`le-${i}`}
                lx={LEFT_RX}
                ly={nodeY(nLeft, i, CY)}
                cy={CY}
              />
            ))}

            {/* Edges — center to right nodes */}
            {rightNodes.map((_, i) => (
              <EdgeRight
                key={`re-${i}`}
                rx={RIGHT_LX}
                ry={nodeY(nRight, i, CY)}
                cy={CY}
              />
            ))}

            {/* Left nodes */}
            {leftNodes.map((name, i) => (
              <LeftNode key={`ln-${i}`} name={name} y={nodeY(nLeft, i, CY)} />
            ))}

            {/* Center target node */}
            <circle cx={CX} cy={CY} r={CR} fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" />
            <text
              x={CX} y={sector ? CY - 6 : CY + 5}
              textAnchor="middle" fill="#e0e7ff" fontSize="13" fontWeight="600"
              fontFamily={FONT}
            >
              {trunc(targetName, 12)}
            </text>
            {sector && (
              <text
                x={CX} y={CY + 11}
                textAnchor="middle" fill="#6366f1" fontSize="9"
                fontFamily={FONT}
              >
                {trunc(sector, 16)}
              </text>
            )}

            {/* Right nodes */}
            {rightNodes.map((node, i) => (
              <RightNode
                key={`rn-${i}`}
                name={node.name}
                score={node.fit_score}
                y={nodeY(nRight, i, CY)}
              />
            ))}

            {/* Edge labels */}
            {nLeft > 0 && (
              <text
                x={(LEFT_RX + CX - CR) / 2} y={CY - CR - 8}
                textAnchor="middle" fill="#4b5563" fontSize="8.5"
                fontFamily={FONT}
              >
                acquired in space
              </text>
            )}
            {nRight > 0 && (
              <text
                x={(CX + CR + RIGHT_LX) / 2} y={CY - CR - 8}
                textAnchor="middle" fill="#4338ca" fontSize="8.5"
                fontFamily={FONT}
              >
                may acquire
              </text>
            )}
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-5 flex-wrap px-4 py-2.5 border-t border-gray-800 bg-gray-900/40">
            <LegendItem type="circle"  color="#4f46e5" label="Target company" />
            <LegendItem type="dashed"  color="#4b5563" label="Active acquirer in this market" />
            <LegendItem type="solid"   color="#3730a3" label="Likely acquirer candidate — fit score shown" />
          </div>
        </div>
      )}

      {/* ── Explanation cards ── */}
      {!noData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nLeft > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                Active in Space <span className="ml-1 font-normal normal-case text-gray-700">— M&A comps</span>
              </h4>
              <div className="space-y-1.5">
                {leftNodes.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />
                    <span className="text-gray-400">{name}</span>
                    <span className="ml-auto text-gray-700">acquired in sector</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nRight > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                Strategic Fit <span className="ml-1 font-normal normal-case text-gray-700">— ranked by fit score</span>
              </h4>
              <div className="space-y-1.5">
                {rightNodes.map((node, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`font-bold tabular-nums w-4 text-right shrink-0 ${
                      i === 0 ? 'text-amber-400' : 'text-gray-600'
                    }`}>{i + 1}</span>
                    <span className="text-gray-300 font-medium">{node.name}</span>
                    <span className="ml-auto tabular-nums text-indigo-400 font-medium">{node.fit_score}/10</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Neo4j graph stats (if available) ── */}
      {neo4jWorked && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">Knowledge graph — entities written to Neo4j</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(graphStats).map(([label, count]) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white tabular-nums">{count}</div>
                <div className="text-xs text-gray-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Investor overlaps ── */}
      {investorOverlaps && investorOverlaps.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3">
            Investor Overlap Signal
          </h3>
          <div className="space-y-2">
            {investorOverlaps.map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-amber-600 shrink-0 mt-0.5">⚡</span>
                <span className="text-gray-400 leading-relaxed">
                  <span className="font-medium text-gray-200">{o.investor}</span>
                  {' '}also backs{' '}
                  <span className="text-amber-300">{o.also_backs?.join(', ')}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Legend helper ─────────────────────────────────────────────────────────────

function LegendItem({ type, color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      {type === 'circle' && (
        <div className="w-3 h-3 rounded-full shrink-0"
          style={{ background: `${color}22`, border: `1.5px solid ${color}` }} />
      )}
      {type === 'solid' && (
        <div className="w-4 h-2.5 rounded-sm shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}` }} />
      )}
      {type === 'dashed' && (
        <div className="w-4 h-2.5 rounded-sm shrink-0"
          style={{ borderColor: color, borderWidth: 1, borderStyle: 'dashed' }} />
      )}
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
