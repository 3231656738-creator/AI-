import { useEffect, useRef, useCallback } from 'react'

interface UseTimerOptions {
  onTick?: (remaining: number) => void
  onWarning?: (type: '30s' | '10s') => void
  onTimeout?: () => void
}

export function useTimer(
  isRunning: boolean,
  timeRemaining: number,
  tick: () => number,
  options: UseTimerOptions = {}
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warned30 = useRef(false)
  const warned10 = useRef(false)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    // Reset warnings when time changes significantly (new stage)
    if (timeRemaining > 30) {
      warned30.current = false
      warned10.current = false
    }
  }, [timeRemaining > 60]) // only reset when we get a new big timer

  useEffect(() => {
    if (!isRunning) {
      clearTimer()
      return
    }

    intervalRef.current = setInterval(() => {
      const remaining = tick()
      options.onTick?.(remaining)

      if (remaining <= 30 && remaining > 10 && !warned30.current) {
        warned30.current = true
        options.onWarning?.('30s')
      }
      if (remaining <= 10 && remaining > 0 && !warned10.current) {
        warned10.current = true
        options.onWarning?.('10s')
      }
      if (remaining <= 0) {
        clearTimer()
        options.onTimeout?.()
      }
    }, 1000)

    return clearTimer
  }, [isRunning, clearTimer])

  return { clearTimer }
}
