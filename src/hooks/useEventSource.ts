import { useEffect, useRef, useState } from 'react'

interface EventSourceOptions<T> {
  endpoint: string
  parse?: (data: string) => T
  onOpen?: () => void
  onError?: (error: Event) => void
  autoReconnect?: boolean
  reconnectIntervalMs?: number
}

interface EventSourceState<T> {
  data: T[]
  connected: boolean
  error: string | null
}

const DEFAULT_RECONNECT_INTERVAL = 5000

export function useEventSource<T = any>({
  endpoint,
  parse,
  onOpen,
  onError,
  autoReconnect = true,
  reconnectIntervalMs = DEFAULT_RECONNECT_INTERVAL,
}: EventSourceOptions<T>) {
  const [state, setState] = useState<EventSourceState<T>>({
    data: [],
    connected: false,
    error: null,
  })
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const es = new EventSource(endpoint, { withCredentials: true })
      eventSourceRef.current = es

      es.onopen = () => {
        setState(prev => ({ ...prev, connected: true, error: null }))
        onOpen?.()
      }

      es.onerror = (event) => {
        setState(prev => ({ ...prev, connected: false, error: 'Connection lost' }))
        onError?.(event)
        es.close()
        if (autoReconnect && !reconnectRef.current) {
          reconnectRef.current = setTimeout(() => {
            reconnectRef.current = null
            connect()
          }, reconnectIntervalMs)
        }
      }

      es.onmessage = (event) => {
        let payload: T | null = null

        if (parse) {
          try {
            payload = parse(event.data)
          } catch (error) {
            console.error('Failed to parse SSE data', error)
          }
        } else {
          try {
            payload = JSON.parse(event.data) as T
          } catch {
            payload = event.data as unknown as T
          }
        }

        if (payload) {
          setState(prev => ({
            ...prev,
            data: [...prev.data, payload!],
          }))
        }
      }
    }

    connect()

    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [endpoint, parse, autoReconnect, reconnectIntervalMs, onOpen, onError])

  const clear = () => setState(prev => ({ ...prev, data: [] }))

  return {
    data: state.data,
    connected: state.connected,
    error: state.error,
    clear,
  }
}
