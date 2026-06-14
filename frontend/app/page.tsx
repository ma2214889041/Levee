import Link from "next/link";
import TopoBackground from "./TopoBackground";

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

const STACK = ["Solana", "Anchor / Rust", "Solana Agent Kit V2", "Switchboard On-Demand", "USDC", "Privy", "Privacy Pools v2", "LightGBM", "FastAPI", "Next.js"];

const TICKER = [
  { reg: "Sarno, Campania", amt: "4,500 USDC", sig: "7xKQ…f2aE" },
  { reg: "Quindici, Avellino", amt: "3,200 USDC", sig: "Hn4R…91dQ" },
  { reg: "Nocera Inferiore", amt: "2,750 USDC", sig: "Bz7T…4kPm" },
  { reg: "Cervinara, Avellino", amt: "1,980 USDC", sig: "Qd2X…8wLs" },
  { reg: "Bracigliano", amt: "3,600 USDC", sig: "Mn9F…2vRa" },
];

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Landing() {
  return (
    <>
      <div className="lp-bg0" aria-hidden />
      <TopoBackground />

      <div className="shell">
        {/* NAV */}
        <nav className="lp-nav">
          <div className="wrap">
            <div className="lp-brand">
              <svg className="mk" viewBox="0 0 42 42" aria-hidden>
                <rect x="2" y="29" width="38" height="6" rx="1.5" fill="#2DE5C6" />
                <rect x="8" y="20" width="26" height="6" rx="1.5" fill="#1FB89F" />
                <rect x="14" y="11" width="14" height="6" rx="1.5" fill="#7A6CFF" />
              </svg>
              <span className="wm">Levee</span>
            </div>
            <div className="lp-navlinks">
              <a href="#how">How it works</a>
              <a href="#why">Why</a>
              <a href="https://github.com/ma2214889041/Levee" target="_blank" rel="noreferrer">GitHub</a>
            </div>
            <div className="lp-navright">
              <span className="lp-wallet"><span className="dot" />Campania · Live</span>
              <Link href="/dashboard" className="lp-btn lp-btn-glow">
                Launch app <Arrow />
              </Link>
            </div>
          </div>
        </nav>

        <div className="wrap">
          {/* HERO */}
          <section className="lp-hero">
            <div className="lp-herogrid">
              <div className="lp-hcol-left">
                <div className="lp-pill"><span className="pulse" />Autonomous relief · Solana</div>
                <h1>
                  Relief that moves <span className="grad">at the speed of risk.</span>
                </h1>
                <p className="lp-lede">
                  Levee watches landslide risk in real time. The instant an on-chain threshold
                  breaks, USDC streams straight to affected community wallets —{" "}
                  <strong>no committee, no delay, fully auditable.</strong>
                </p>
                <p className="lp-lede cn">
                  实时监测滑坡风险，风险越过链上阈值即自动向受灾社区发放 USDC —— 无需审批、零延迟、全程可审计。
                </p>
                <div className="lp-cta">
                  <Link href="/dashboard" className="lp-btn lp-btn-glow lp-btn-lg">
                    Open live dashboard <Arrow />
                  </Link>
                  <a href="#how" className="lp-btn lp-btn-ghost lp-btn-lg">See how it works</a>
                </div>
              </div>

              <div className="lp-hcol-right">
                <div className="lp-livecard">
                  <div className="lp-lc-top">
                    <div className="reg">Sarno, Campania<small>region · monitored</small></div>
                    <span className="lp-tag-high">High</span>
                  </div>
                  <div className="lp-gaugewrap">
                    <div className="lp-gauge">
                      <svg viewBox="0 0 120 120" width="120" height="120">
                        <defs>
                          <linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#FFB54A" />
                            <stop offset="1" stopColor="#FF5A52" />
                          </linearGradient>
                          <filter id="gl">
                            <feGaussianBlur stdDeviation="2.4" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                          </filter>
                        </defs>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="url(#gg)" strokeWidth="9" strokeLinecap="round"
                          filter="url(#gl)" strokeDasharray="314" strokeDashoffset="56" transform="rotate(-90 60 60)" />
                      </svg>
                      <div className="gv"><b>86.1</b><span>Risk</span></div>
                    </div>
                    <div className="lp-ginfo">
                      <div className="r"><span>Threshold</span><b style={{ color: "var(--cyan)" }}>70.0</b></div>
                      <div className="r"><span>Beneficiaries</span><b>1,284</b></div>
                      <div className="r"><span>Per wallet</span><b style={{ color: "var(--amber)" }}>3.5 USDC</b></div>
                    </div>
                  </div>
                  <div className="lp-payout-toast">
                    <div className="ic">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
                    </div>
                    <div className="pt"><b>4,500 USDC released</b><span>tx 7xKQ…f2aE · 03:42 UTC</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-stats">
              <div className="lp-stat"><div className="v">32<span className="u"> regions</span></div><div className="k">Monitored on-chain</div></div>
              <div className="lp-stat"><div className="v">4<span className="u"> invariants</span></div><div className="k">Enforced on-chain</div></div>
              <div className="lp-stat"><div className="v warm">3-tier</div><div className="k">Grid early warning</div></div>
              <div className="lp-stat"><div className="v">100<span className="u"> %</span></div><div className="k">Auditable payouts</div></div>
            </div>
          </section>
        </div>

        {/* TICKER */}
        <div className="lp-ticker">
          <div className="lp-ticker-track">
            {[...TICKER, ...TICKER].map((r, i) => (
              <span className="lp-tk" key={i}>
                <span className="d" />Auto-payout · <span className="reg">{r.reg}</span>{" "}
                <span className="amt">{r.amt}</span> → <span className="sig">{r.sig}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="wrap">
          <section className="lp-band">
            <p>
              <b>The problem.</b> Heavy rain on fragile slopes — like the 1998 Sarno (Campania)
              debris flows — destroys homes and critical infrastructure in minutes. Relief arrives
              in weeks, through opaque channels. Risk models exist, but the path from a forecast to
              money on the ground is slow and untrusted.
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
              {STACK.map((s) => (
                <span className="lp-chip" key={s}>{s}</span>
              ))}
            </div>
          </section>

          <section className="lp-final">
            <h2>Ship the shift.</h2>
            <p>Autonomous, bounded, transparent relief — built for the next decade of AI × Web3.</p>
            <div className="lp-cta">
              <Link href="/dashboard" className="lp-btn lp-btn-glow lp-btn-lg">
                Open the dashboard <Arrow />
              </Link>
            </div>
          </section>

          <footer className="lp-foot">
            Levee · autonomous landslide-relief agent on Solana (devnet) · for ctrl/shift Hackathon 2026
          </footer>
        </div>
      </div>
    </>
  );
}
