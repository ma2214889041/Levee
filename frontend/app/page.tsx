import Link from "next/link";

const FLOWS = [
  { k: "1 · Sense", t: "Risk model", d: "Calibrated LightGBM turns rainfall, soil saturation and terrain into a landslide probability with explainable factors." },
  { k: "2 · Attest", t: "Oracle", d: "A Switchboard On-Demand feed carries the probability on-chain, with staleness and sample guards." },
  { k: "3 · Decide", t: "Solana program", d: "An immutable, on-chain threshold — not an LLM — authorizes relief. Cap & cooldown enforced; every decision logged." },
  { k: "4 · Act", t: "Autonomous agent", d: "Pays USDC only to registered community wallets, with human-in-the-loop for large amounts. Fails closed on stale data." },
];

const PILLARS = [
  { t: "Early warning for the grid", d: "Maps risk onto National-Transmission-Grid assets (towers, substations, lines) and raises WATCH / WARNING / CRITICAL alerts before damage." },
  { t: "Trust by construction", d: "The payout rule is on-chain and public. Anyone can re-compute it. No discretionary human in the money path, no black-box model deciding funds." },
  { t: "Relief at machine speed", d: "When the on-chain threshold is crossed, pre-funded USDC reaches affected communities in one transaction — no claims, no committees." },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="lp-nav">
        <span className="lp-logo">🌊 Levee</span>
        <nav>
          <a href="#how">How it works</a>
          <a href="#why">Why</a>
          <a href="https://github.com/ma2214889041/Levee" target="_blank" rel="noreferrer">GitHub</a>
          <Link href="/dashboard" className="lp-cta-sm">Launch dashboard →</Link>
        </nav>
      </header>

      <section className="lp-hero">
        <span className="lp-kicker">AI × Web3 · Solana · autonomous agent</span>
        <h1>
          Disaster relief that <span className="grad">decides, pays, and proves</span> itself.
        </h1>
        <p className="lp-sub">
          Levee is an autonomous agent on Solana that watches landslide risk in real
          time. When risk crosses a threshold <strong>committed on-chain</strong>, it
          releases USDC relief to registered communities — every decision and every
          payout public and auditable. The brain is a calibrated risk model and
          on-chain rules, never a discretionary human or a black box.
        </p>
        <div className="lp-actions">
          <Link href="/dashboard" className="lp-cta">Launch live dashboard</Link>
          <a className="lp-ghost" href="#how">See how it works</a>
        </div>
        <div className="lp-stats">
          <div><b>4</b><span>on-chain safety invariants</span></div>
          <div><b>3-tier</b><span>early warning</span></div>
          <div><b>100%</b><span>auditable payouts</span></div>
        </div>
      </section>

      <section className="lp-band">
        <p>
          <b>The problem.</b> Heavy rain on fragile slopes — like the 1998 Sarno
          (Campania) debris flows — destroys homes and critical infrastructure in
          minutes. Relief arrives in weeks, through opaque channels. Risk models exist,
          but the path from a forecast to money on the ground is slow and untrusted.
        </p>
      </section>

      <section id="how" className="lp-section">
        <h2>How it works</h2>
        <p className="lp-lead">Four stages, each independently verifiable.</p>
        <div className="lp-flow">
          {FLOWS.map((f) => (
            <div className="lp-step" key={f.k}>
              <span className="lp-step-k">{f.k}</span>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="why" className="lp-section">
        <h2>Why it matters</h2>
        <div className="lp-pillars">
          {PILLARS.map((p) => (
            <div className="lp-pillar" key={p.t}>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>Built on</h2>
        <div className="lp-stack">
          {["Solana", "Anchor / Rust", "Solana Agent Kit V2", "Switchboard On-Demand", "USDC", "Privy", "LightGBM", "FastAPI", "Next.js"].map((s) => (
            <span className="chip" key={s}>{s}</span>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2>Ship the shift.</h2>
        <p>Autonomous, bounded, transparent relief — built for the next decade of AI × Web3.</p>
        <Link href="/dashboard" className="lp-cta">Open the dashboard</Link>
      </section>

      <footer className="lp-foot">
        Levee · autonomous landslide-relief agent on Solana (devnet) · for ctrl/shift Hackathon 2026
      </footer>
    </div>
  );
}
