import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  anchor: HTMLElement | null      // the card we're hovering
  preferLeft?: boolean            // we already know column L / R
  children: React.ReactNode
}

export const TooltipPortal = ({ anchor, preferLeft, children }: Props) => {
  const [style, setStyle] = useState<React.CSSProperties>({ display: 'none' })

  useLayoutEffect(() => {
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const margin = 8
    const width  = 320         // our w-80
    const height = 9999        // we only care about bottom edge

    // Horizontal flip
    const left = preferLeft
      ? r.left - width - margin
      : r.right + margin

    // Vertical flip if we'd fall off the bottom
    const willOverflowBottom = r.bottom + 120 > window.innerHeight
    const top = willOverflowBottom
      ? r.top - 120             // show above card
      : r.top

    setStyle({
      position: 'fixed',
      top, left,
      zIndex: 1000,
      width,
    })
  }, [anchor, preferLeft])

  return createPortal(
    <div style={style}>{children}</div>,
    document.body
  )
}