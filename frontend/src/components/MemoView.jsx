import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { exportMemoAsPDF } from '../utils/exportPDF.js'

export default function MemoView({ memo, companyName }) {
  if (!memo) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-600 text-sm">
        Investment memo will appear here after analysis completes.
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => exportMemoAsPDF(memo, companyName || 'Company')}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200 hover:border-gray-600 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v8M4 6l3 3 3-3"/>
            <path d="M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10"/>
          </svg>
          Download PDF
        </button>
      </div>

      <div className="memo-content max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {memo}
        </ReactMarkdown>
      </div>
    </div>
  )
}
