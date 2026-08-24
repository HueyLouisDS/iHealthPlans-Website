'use client'

/**
 * Moves the keyboard caret to whatever the page just snapped to.
 *
 * A fragment in a link scrolls the page, and on a full document load the
 * browser also focuses the target. Client side navigation only does the
 * scrolling, so without this a keyboard user is moved visually and then tabs
 * from wherever they were, which is the control they just left.
 *
 * Renders nothing. It exists purely for the effect, which is why it is the
 * only client component on an otherwise server rendered dashboard.
 */

import { useEffect, useRef } from 'react'

/**
 * @param targetId the element to focus, which must carry tabIndex={-1}
 * @param value    changes when a new snap happens, so re-renders that are not
 *                 a navigation do not yank focus back
 */
export default function SnapFocus({ targetId, value }) {
  const lastValue = useRef(null)

  useEffect(() => {
    /*
     Only when the url actually asked to be snapped. Loading a bookmarked
     ?stage= url with no fragment should leave focus where the browser put
     it rather than dropping the reader into the middle of the page.
    */
    if (window.location.hash !== `#${targetId}`) return
    if (lastValue.current === value) return
    lastValue.current = value

    /*
     preventScroll because the fragment has already positioned the page, and
     it did so respecting scroll-mt. Letting focus scroll again would undo it.
    */
    document.getElementById(targetId)?.focus({ preventScroll: true })
  }, [targetId, value])

  return null
}
