import { useEffect, useCallback, useRef } from 'react'

type Direction = 'forward' | 'back' | 'left' | 'right'

const SWIPE_THRESHOLD = 30

export function useTouchControls(
  onMove: (direction: Direction) => void,
  enabled: boolean = true
) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [enabled])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStart.current) return

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    let direction: Direction

    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
      // Tap → forward
      direction = 'forward'
    } else if (absDx > absDy) {
      // Horizontal swipe
      direction = dx > 0 ? 'left' : 'right'
    } else {
      // Vertical swipe
      direction = dy > 0 ? 'back' : 'forward'
    }

    onMove(direction)
    touchStart.current = null
  }, [enabled, onMove])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchEnd])
}
