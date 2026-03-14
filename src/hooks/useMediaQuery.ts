import { useState, useEffect } from "react"

/**
 * Custom hook that tracks whether a CSS media query matches.
 * Used to switch between desktop and mobile layouts at the given breakpoint.
 *
 * @param breakpoint - The minimum viewport width in pixels (e.g., 768 for tablet/desktop)
 * @returns true if the viewport is at least `breakpoint` pixels wide
 */
export function useMediaQuery(breakpoint: number): boolean {
  const query = `(min-width: ${breakpoint}px)`

  const [matches, setMatches] = useState<boolean>(() => {
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)

    const handleChange = (event: MediaQueryListEvent | { matches: boolean }) => {
      setMatches(event.matches)
    }

    mediaQueryList.addEventListener("change", handleChange)

    return () => {
      mediaQueryList.removeEventListener("change", handleChange)
    }
  }, [query])

  return matches
}
