import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MemoView({ memo }) {
  if (!memo) return (
    <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
      Investment memo will appear here after analysis completes.
    </div>
  )

  return (
    <div className="memo-content prose max-w-none px-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {memo}
      </ReactMarkdown>
    </div>
  )
}
