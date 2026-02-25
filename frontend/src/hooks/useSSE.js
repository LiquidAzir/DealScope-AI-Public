import { useState, useCallback, useRef } from 'react'

export function useSSE() {
  const [steps, setSteps]       = useState([])
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [debugLog, setDebugLog] = useState([])
  const abortRef = useRef(null)

  function addLog(msg) {
    const ts = new Date().toLocaleTimeString()
    setDebugLog(prev => [...prev.slice(-80), `[${ts}] ${msg}`])
  }

  const run = useCallback(async ({ company, stage, exit_type }) => {
    setSteps([])
    setResult(null)
    setError(null)
    setDebugLog([])
    setIsRunning(true)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    addLog(`Starting analysis for "${company}"`)

    try {
      addLog('Sending POST /analyze...')
      const response = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ company, stage, exit_type }),
        signal: controller.signal,
      })

      addLog(`Response: ${response.status} ${response.statusText}, type=${response.type}`)

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Server error ${response.status}: ${text}`)
      }

      if (!response.body) {
        throw new Error('Response body is null — streaming not supported in this browser/environment')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = null
      let currentData = null
      let chunkCount = 0

      addLog('Stream open, reading chunks...')

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          addLog('Stream closed by server')
          break
        }

        chunkCount++
        const chunk = decoder.decode(value, { stream: true })
        addLog(`Chunk #${chunkCount} (${chunk.length} bytes): ${chunk.slice(0, 80).replace(/\n/g, '\\n')}`)
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6).trim()
          } else if (line.trim() === '' && currentEvent && currentData) {
            addLog(`Event: "${currentEvent}" data=${currentData.slice(0, 60)}`)
            try {
              const parsed = JSON.parse(currentData)
              handleEvent(currentEvent, parsed)
            } catch (parseErr) {
              addLog(`Parse ERROR for event "${currentEvent}": ${parseErr.message}`)
            }
            currentEvent = null
            currentData = null
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        addLog('Aborted by user')
      } else {
        addLog(`FETCH ERROR: ${err.name}: ${err.message}`)
        setError(err.message)
      }
    } finally {
      addLog('Done')
      setIsRunning(false)
    }

    function handleEvent(eventType, data) {
      if (eventType === 'status') {
        setSteps(prev => {
          const idx = prev.findIndex(s => s.step === data.step && !s.done)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = { ...data, done: data.icon === 'check' }
            return updated
          }
          return [...prev, { ...data, done: data.icon === 'check' }]
        })
      } else if (eventType === 'graph_ready') {
        setSteps(prev => [...prev, {
          message: `Relationship graph ${data.neo4j_available ? 'built in Neo4j' : 'ready (local mode)'}`,
          icon: 'check', done: true,
        }])
      } else if (eventType === 'complete') {
        setResult(data)
      } else if (eventType === 'error') {
        setError(data.message)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abort = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setIsRunning(false)
  }, [])

  return { run, steps, result, error, isRunning, abort, debugLog }
}
