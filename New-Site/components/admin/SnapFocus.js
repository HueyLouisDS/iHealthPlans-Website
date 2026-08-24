'use client'
import { useEffect, useRef } from 'react'

export default function SnapFocus({ targetId, value }) {
  const lastValue = useRef(null)

  useEffect(() => {
    if (window.location.hash !== `#${targetId}`) return
    if (lastValue.current === value) return
    lastValue.current = value
    document.getElementById(targetId)?.focus({ preventScroll: true })
  }, [targetId, value])

  return null
}
