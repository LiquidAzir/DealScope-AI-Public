import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MemoView({ memo }) {
  if (!memo) {
    return (
      <div className="flex items-center justify-center h-36 text-gray-600 text-sm">
        Investment memo will appear here after analysis completes.
      </div>
    )
  }

  return (
    <div className="memo-content max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {memo}
      </ReactMarkdown>
    </div>
  )
}
