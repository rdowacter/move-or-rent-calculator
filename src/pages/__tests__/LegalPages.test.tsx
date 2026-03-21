import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TermsOfService } from '../TermsOfService'
import { PrivacyPolicy } from '../PrivacyPolicy'
import { Disclaimer } from '../Disclaimer'

describe('TermsOfService', () => {
  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Terms of Service')
  })

  it('contains key legal content', () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    )
    expect(screen.getByText(/HomeDecision is not financial advice/)).toBeInTheDocument()
  })

  it('has a "Back to Calculator" link pointing to /', () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    )
    const link = screen.getByText(/Back to Calculator/)
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })
})

describe('PrivacyPolicy', () => {
  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy Policy')
  })

  it('contains key privacy content', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    )
    expect(screen.getByText(/We do not collect, store, or share your personal financial information/)).toBeInTheDocument()
  })

  it('has a "Back to Calculator" link pointing to /', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    )
    const link = screen.getByText(/Back to Calculator/)
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })
})

describe('Disclaimer', () => {
  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <Disclaimer />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Disclaimer')
  })

  it('contains key disclaimer content', () => {
    render(
      <MemoryRouter>
        <Disclaimer />
      </MemoryRouter>
    )
    expect(screen.getByText(/No fiduciary, advisory, or professional-client relationship/)).toBeInTheDocument()
  })

  it('has a "Back to Calculator" link pointing to /', () => {
    render(
      <MemoryRouter>
        <Disclaimer />
      </MemoryRouter>
    )
    const link = screen.getByText(/Back to Calculator/)
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })
})
