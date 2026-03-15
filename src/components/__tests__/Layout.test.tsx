import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderHook, act } from "@testing-library/react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { DesktopLayout } from "@/components/DesktopLayout"
import { MobileLayout } from "@/components/MobileLayout"

// --- useMediaQuery ---

describe("useMediaQuery", () => {
  let listeners: Array<(e: { matches: boolean }) => void>
  let currentMatches: boolean

  beforeEach(() => {
    listeners = []
    currentMatches = false

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: currentMatches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(
          (_event: string, handler: (e: { matches: boolean }) => void) => {
            listeners.push(handler)
          }
        ),
        removeEventListener: vi.fn(
          (_event: string, handler: (e: { matches: boolean }) => void) => {
            listeners = listeners.filter((l) => l !== handler)
          }
        ),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it("returns true when the media query matches", () => {
    currentMatches = true
    const { result } = renderHook(() => useMediaQuery(768))
    expect(result.current).toBe(true)
  })

  it("returns false when the media query does not match", () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery(768))
    expect(result.current).toBe(false)
  })

  it("updates when the media query match state changes", () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery(768))
    expect(result.current).toBe(false)

    // Simulate a media query change
    act(() => {
      listeners.forEach((listener) => listener({ matches: true }))
    })
    expect(result.current).toBe(true)
  })

  it("cleans up the event listener on unmount", () => {
    currentMatches = false
    const { unmount } = renderHook(() => useMediaQuery(768))
    expect(listeners.length).toBe(1)

    unmount()
    expect(listeners.length).toBe(0)
  })

  it("passes the correct media query string for the breakpoint", () => {
    currentMatches = false
    renderHook(() => useMediaQuery(1024))
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 1024px)")
  })
})

// --- DesktopLayout ---

describe("DesktopLayout", () => {
  it("renders children in a two-column grid", () => {
    render(
      <DesktopLayout
        inputs={<div data-testid="inputs-panel">Inputs Content</div>}
        results={<div data-testid="results-panel">Results Content</div>}
      />
    )

    expect(screen.getByTestId("inputs-panel")).toBeInTheDocument()
    expect(screen.getByTestId("results-panel")).toBeInTheDocument()
    expect(screen.getByText("Inputs Content")).toBeInTheDocument()
    expect(screen.getByText("Results Content")).toBeInTheDocument()
  })

  it("uses a flex layout with two columns", () => {
    const { container } = render(
      <DesktopLayout
        inputs={<div>Inputs</div>}
        results={<div>Results</div>}
      />
    )

    const flexContainer = container.firstElementChild as HTMLElement
    expect(flexContainer).toHaveClass("flex")
  })

  it("makes the results column independently scrollable", () => {
    const { container } = render(
      <DesktopLayout
        inputs={<div>Inputs</div>}
        results={<div>Results</div>}
      />
    )

    const flexContainer = container.firstElementChild as HTMLElement
    const resultsColumn = flexContainer.children[1]

    expect(resultsColumn).toHaveClass("overflow-y-auto")
  })

  it("toggles input panel visibility with collapse button", async () => {
    const user = userEvent.setup()
    const { container, getByRole } = render(
      <DesktopLayout
        inputs={<div>Inputs</div>}
        results={<div>Results</div>}
      />
    )

    const collapseButton = getByRole("button", { name: "Hide inputs" })
    const inputsColumn = container.firstElementChild?.firstElementChild as HTMLElement

    // Initially expanded at 40%
    expect(inputsColumn.style.width).toBe("40%")

    // Click to collapse
    await user.click(collapseButton)
    expect(inputsColumn.style.width).toBe("48px")

    // Button label should update
    const expandButton = getByRole("button", { name: "Show inputs" })
    expect(expandButton).toBeTruthy()

    // Click to expand
    await user.click(expandButton)
    expect(inputsColumn.style.width).toBe("40%")
  })
})

// --- MobileLayout ---

describe("MobileLayout", () => {
  it("renders a tab bar with Inputs and Results tabs", () => {
    render(
      <MobileLayout
        inputs={<div>Inputs Content</div>}
        results={<div>Results Content</div>}
      />
    )

    expect(screen.getByRole("tab", { name: /inputs/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /results/i })).toBeInTheDocument()
  })

  it("shows the Inputs tab by default", () => {
    render(
      <MobileLayout
        inputs={<div>Inputs Content</div>}
        results={<div>Results Content</div>}
      />
    )

    expect(screen.getByText("Inputs Content")).toBeInTheDocument()
  })

  it("switches to Results tab on click", async () => {
    const user = userEvent.setup()

    render(
      <MobileLayout
        inputs={<div>Inputs Content</div>}
        results={<div>Results Content</div>}
      />
    )

    const resultsTab = screen.getByRole("tab", { name: /results/i })
    await user.click(resultsTab)

    expect(screen.getByText("Results Content")).toBeInTheDocument()
  })

  it("renders full-width single column", () => {
    const { container } = render(
      <MobileLayout
        inputs={<div>Inputs</div>}
        results={<div>Results</div>}
      />
    )

    const tabsContainer = container.firstElementChild as HTMLElement
    expect(tabsContainer).toHaveClass("w-full")
  })
})
