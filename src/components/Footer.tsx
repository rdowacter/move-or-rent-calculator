import { Link } from "react-router-dom"

export function Footer() {
  return (
    <footer className="border-t py-4 px-4 text-xs text-muted-foreground">
      <p>
        HomeDecision is an educational financial modeling tool. It does not
        provide financial, tax, investment, or legal advice. All projections are
        estimates — not guarantees. Consult qualified professionals before making
        financial decisions.
      </p>
      <nav className="mt-2">
        <Link to="/disclaimer">Full Disclaimer</Link>
        {" · "}
        <Link to="/terms">Terms</Link>
        {" · "}
        <Link to="/privacy">Privacy</Link>
      </nav>
    </footer>
  )
}
