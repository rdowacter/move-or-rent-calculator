import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { Footer } from "@/components/Footer"

describe("Footer", () => {
  const renderFooter = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    )

  it("renders disclaimer text", () => {
    renderFooter()
    expect(
      screen.getByText(/HomeDecision is an educational financial modeling tool/)
    ).toBeInTheDocument()
  })

  it('renders "Full Disclaimer" link pointing to /disclaimer', () => {
    renderFooter()
    const link = screen.getByRole("link", { name: /full disclaimer/i })
    expect(link).toHaveAttribute("href", "/disclaimer")
  })

  it('renders "Terms" link pointing to /terms', () => {
    renderFooter()
    const link = screen.getByRole("link", { name: /terms/i })
    expect(link).toHaveAttribute("href", "/terms")
  })

  it('renders "Privacy" link pointing to /privacy', () => {
    renderFooter()
    const link = screen.getByRole("link", { name: /privacy/i })
    expect(link).toHaveAttribute("href", "/privacy")
  })
})
