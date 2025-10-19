import { useEffect, useRef, useState } from 'react'

interface EventSourceOptions<T> {
  endpoint?: string | null
  mapItem?: (value: unknown) => T | null
  mapSnapshot?: (value: unknown) => T[]
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
  mapItem,
  mapSnapshot,
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
    if (!endpoint) {
      return () => undefined
    }

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const url = endpoint.startsWith('http') ? endpoint : `${window.location.origin}${endpoint}`
      const es = new EventSource(url, { withCredentials: true })
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

      const handleMessage = (event: MessageEvent) => {
        let payload: any
        try {
          payload = JSON.parse(event.data)
        } catch (error) {
          console.error('Failed to parse SSE event', error)
          return
        }

        const type = payload?.type
        if (type === 'heartbeat') {
          return
        }

        if (type === 'snapshot') {
          const snapshotData = payload?.data
          let items: T[] = []
          if (mapSnapshot) {
            try {
              items = mapSnapshot(snapshotData)
            } catch (error) {
              console.error('Failed to map snapshot payload', error)
              return
            }
          } else if (Array.isArray(snapshotData)) {
            items = snapshotData as T[]
          }
          setState(prev => ({ ...prev, data: items }))
          return
        }

        if (type === 'update') {
          const itemData = payload?.data
          let item: T | null = null
          if (mapItem) {
            try {
              item = mapItem(itemData)
            } catch (error) {
              console.error('Failed to map update payload', error)
              return
            }
          } else {
            item = itemData as T
          }

          if (item) {
            setState(prev => ({
              ...prev,
              data: [...prev.data, item!],
            }))
          }
        }
      }

      es.addEventListener('message', handleMessage as EventListener)
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
  }, [endpoint, mapItem, mapSnapshot, autoReconnect, reconnectIntervalMs, onOpen, onError])

  const clear = () => setState(prev => ({ ...prev, data: [] }))

  return {
    data: state.data,
    connected: state.connected,
    error: state.error,
    clear,
  }
}
