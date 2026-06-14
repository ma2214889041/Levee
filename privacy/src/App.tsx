import { useEffect, useMemo, useRef, useState } from "react";
import { formatEther, parseEther } from "viem";
import { createAdapter, PoolStatus } from "./privacy";
import { connectWallet } from "./wallet";
import { drawHeroTerrain } from "./topo";

type LogEntry = { t: number; msg: string };
type Payout = { reg: string; amt: string; sig: string };

const SEED_TICKER: Payout[] = [
  { reg: "Sarno, Campania", amt: "4,500 USDC", sig: "7xKQ…f2aE" },
  { reg: "Quindici, Avellino", amt: "3,200 USDC", sig: "Hn4R…91dQ" },
  { reg: "Nocera Inferiore", amt: "2,750 USDC", sig: "Bz7T…4kPm" },
  { reg: "Cervinara, Avellino", amt: "1,980 USDC", sig: "Qd2X…8wLs" },
  { reg: "Bracigliano", amt: "3,600 USDC", sig: "Mn9F…2vRa" },
];

const short = (s: string, head = 6, tail = 4) =>
  s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;

/** Trim trailing zeros from a formatted ether string. */
const fmtEth = (wei: bigint) => {
  const s = formatEther(wei);
  return s.includes(".") ? s.replace(/\.?0+$/, "") || "0" : s;
};

export default function App() {
  const adapter = useMemo(() => createAdapter(), []);
  const topoRef = useRef<HTMLCanvasElement>(null);

  const [account, setAccount] = useState<string>();
  const [status, setStatus] = useState<PoolStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const [depositEth, setDepositEth] = useState("1.0");
  const [splitText, setSplitText] = useState(
    "0x1111111111111111111111111111111111111111, 0.25\n0x2222222222222222222222222222222222222222, 0.25"
  );
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [proof, setProof] = useState<string>("");

  // local accounting for the live card / stat strip (the adapter is the source
  // of truth for the shielded balance; these track flow for the UI only).
  const [depositedWei, setDepositedWei] = useState(0n);
  const [disbursedWei, setDisbursedWei] = useState(0n);
  const [beneficiaries, setBeneficiaries] = useState(0);
  const [lastPayout, setLastPayout] = useState<{
    totalWei: bigint;
    count: number;
    txHash?: string;
    t: number;
  } | null>(null);
  const [feed, setFeed] = useState<Payout[]>([]);

  function note(msg: string) {
    setLog((l) => [{ t: Date.now(), msg }, ...l].slice(0, 30));
  }
  async function refresh() {
    setStatus(await adapter.status());
  }

  // Render the signature contour terrain once mounted, and on resize.
  useEffect(() => {
    const draw = () => {
      if (topoRef.current) drawHeroTerrain(topoRef.current);
    };
    draw();
    let rt: number | undefined;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(draw, 180);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onConnect() {
    try {
      setBusy(true);
      const acc = await connectWallet();
      await adapter.connect(acc);
      setAccount(acc);
      await refresh();
      note(`Connected ${short(acc)} (${adapter.kind} adapter)`);
    } catch (e) {
      note(`Connect failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDeposit() {
    try {
      setBusy(true);
      const wei = parseEther(depositEth as `${number}`);
      const res = await adapter.deposit(wei);
      setDepositedWei((d) => d + wei);
      note(`Shielded ${depositEth} ETH — commitment ${short(res.commitment, 10, 0)}…`);
      await refresh();
    } catch (e) {
      note(`Deposit failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function parseSplits() {
    return splitText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [addr, amt] = l.split(",").map((s) => s.trim());
        return { address: addr, amountWei: parseEther((amt || "0") as `${number}`) };
      });
  }

  async function onDisburse() {
    try {
      setBusy(true);
      const splits = parseSplits();
      const res = await adapter.disburse(splits);
      setDisbursedWei((d) => d + res.totalWei);
      setBeneficiaries((b) => b + res.notes.length);
      setLastPayout({
        totalWei: res.totalWei,
        count: res.notes.length,
        txHash: res.txHash,
        t: Date.now(),
      });
      setFeed((f) =>
        [
          ...res.notes.map((n) => ({
            reg: short(n.address),
            amt: `${fmtEth(n.amountWei)} ETH`,
            sig: short(n.noteId, 6, 4),
          })),
          ...f,
        ].slice(0, 12)
      );
      note(
        `Privately disbursed ${fmtEth(res.totalWei)} ETH to ${res.notes.length} ` +
          `beneficiaries (${res.notes.length} private notes issued)`
      );
      await refresh();
    } catch (e) {
      note(`Disburse failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onProve() {
    try {
      setBusy(true);
      const p = await adapter.proveAssociation(withdrawAddr);
      setProof(JSON.stringify(p, null, 2));
      note(`Proof of Association generated for ${short(withdrawAddr, 8, 0)}… (verified=${p.verified})`);
    } catch (e) {
      note(`Proof failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const splitTotal = (() => {
    try {
      return parseSplits().reduce((a, s) => a + s.amountWei, 0n);
    } catch {
      return 0n;
    }
  })();

  // gauge: share of shielded funds that have been disbursed as aid (cyan → amber).
  const disbursedPct =
    depositedWei > 0n ? Math.min(100, Number((disbursedWei * 10000n) / depositedWei) / 100) : 0;
  const C = 2 * Math.PI * 50; // gauge circumference
  const dashOffset = C * (1 - disbursedPct / 100);

  const ticker = feed.length ? feed : SEED_TICKER;
  const isMock = adapter.kind === "mock";

  return (
    <>
      <div className="aurora">
        <b className="a1" />
        <b className="a2" />
        <b className="a3" />
      </div>
      <canvas id="topo" ref={topoRef} />
      <div className="grain" />

      <div className="shell">
        {/* NAV */}
        <nav>
          <div className="wrap">
            <div className="brand">
              <svg className="mk" viewBox="0 0 42 42" aria-hidden>
                <rect x="2" y="29" width="38" height="6" rx="1.5" fill="#2DE5C6" />
                <rect x="8" y="20" width="26" height="6" rx="1.5" fill="#1FB89F" />
                <rect x="14" y="11" width="14" height="6" rx="1.5" fill="#7A6CFF" />
              </svg>
              <span className="wm">Levee</span>
              <span className="chip">Confidential Relief</span>
            </div>
            <div className="navlinks">
              <a href="#shield">Shield</a>
              <a href="#disburse">Disburse</a>
              <a href="#prove">Proof</a>
              <a href="#activity">Activity</a>
            </div>
            <div className="navright">
              <span className={`wallet ${account ? "" : "off"}`}>
                <span className="dot" />
                {account ? short(account) : "Not connected"}
              </span>
              <button className="btn btn-glow" onClick={onConnect} disabled={busy}>
                {account ? "Connected" : "Connect wallet"}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </nav>

        <div className="wrap">
          {/* HERO */}
          <section className="hero">
            <div className="herogrid">
              <div className="hcol-left">
                <div className="pill">
                  <span className="pulse" />
                  Privacy Pools v2 · Sepolia
                </div>
                <h1>
                  Relief that arrives <span className="grad">privately.</span>
                </h1>
                <p className="lede">
                  Levee privately splits relief to many beneficiaries on{" "}
                  <b style={{ color: "var(--text-hi)" }}>0xbow Privacy Pools v2</b> — recipients
                  stay unlinkable, while each can produce a Proof of Association that the funds are
                  clean. Privacy for people, compliance for donors and regulators.
                </p>
                <p className="lede cn">
                  在 0xbow Privacy Pools v2 上向众多受益人私密拆分救助款：收款人保持不可关联，
                  同时每人都能生成"资金清白"的归属证明 —— 为受灾者保护隐私，为捐助方与监管方保留合规。
                </p>
              </div>

              <div className="hcol-right">
                <div className="livecard">
                  <div className="lc-top">
                    <div className="reg">
                      Relief pool
                      <small>{account ? short(account) : "wallet not connected"}</small>
                    </div>
                    <span className={`tag ${isMock ? "tag-mock" : "tag-live"}`}>
                      {isMock ? "Mock" : "Live"}
                    </span>
                  </div>
                  <div className="gaugewrap">
                    <div className="gauge">
                      <svg viewBox="0 0 120 120" width="120" height="120">
                        <defs>
                          <linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#2DE5C6" />
                            <stop offset="1" stopColor="#FFB54A" />
                          </linearGradient>
                          <filter id="gl">
                            <feGaussianBlur stdDeviation="2.4" result="b" />
                            <feMerge>
                              <feMergeNode in="b" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="rgba(255,255,255,.08)"
                          strokeWidth="9"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="url(#gg)"
                          strokeWidth="9"
                          strokeLinecap="round"
                          filter="url(#gl)"
                          strokeDasharray={C}
                          strokeDashoffset={dashOffset}
                          transform="rotate(-90 60 60)"
                          style={{ transition: "stroke-dashoffset .6s var(--ease)" }}
                        />
                      </svg>
                      <div className="gv">
                        <b>{disbursedPct.toFixed(0)}%</b>
                        <span>Disbursed</span>
                      </div>
                    </div>
                    <div className="ginfo">
                      <div className="r">
                        <span>Shielded</span>
                        <b style={{ color: "var(--cyan)" }}>
                          {status ? fmtEth(status.privateBalanceWei) : "—"} ETH
                        </b>
                      </div>
                      <div className="r">
                        <span>Beneficiaries</span>
                        <b>{beneficiaries.toLocaleString()}</b>
                      </div>
                      <div className="r">
                        <span>Disbursed</span>
                        <b style={{ color: "var(--amber)" }}>{fmtEth(disbursedWei)} ETH</b>
                      </div>
                    </div>
                  </div>
                  {lastPayout && (
                    <div className="payout-toast">
                      <div className="ic">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </div>
                      <div className="pt">
                        <b>
                          {fmtEth(lastPayout.totalWei)} ETH released · {lastPayout.count} notes
                        </b>
                        <span>
                          {lastPayout.txHash ? `tx ${short(lastPayout.txHash, 6, 4)} · ` : ""}
                          {new Date(lastPayout.t).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* MOCK BANNER */}
          {isMock && (
            <div className="mock">
              <span className="ic">⚠</span>
              <div>
                <b>Mock mode</b> — in-memory simulation, no real privacy and no chain. Install the
                0xbow SDK (see <code>INSTALL.md</code>) and set <code>VITE_USE_REAL_SDK=true</code>{" "}
                to switch to real Privacy Pools v2 on Sepolia.
              </div>
            </div>
          )}

          {/* STAT STRIP */}
          <div className="stats">
            <div className="stat">
              <div className="v">{status?.kind ?? "—"}</div>
              <div className="k">Adapter</div>
            </div>
            <div className="stat">
              <div className="v">
                Sepolia<span className="u"> · {status?.chainId ?? "—"}</span>
              </div>
              <div className="k">Network</div>
            </div>
            <div className="stat">
              <div className="v">
                {status ? fmtEth(status.privateBalanceWei) : "—"}
                <span className="u"> ETH</span>
              </div>
              <div className="k">Shielded balance</div>
            </div>
            <div className="stat">
              <div className="v warm">
                {fmtEth(disbursedWei)}
                <span className="u"> ETH</span>
              </div>
              <div className="k">Privately disbursed</div>
            </div>
          </div>

          {/* ACTION CARDS */}
          <div className="grid">
            <section className="card" id="shield">
              <h2>
                <span className="step">1</span>Shield funds
              </h2>
              <p className="d">Deposit relief funds into the Privacy Pool to shield them.</p>
              <div className="row">
                <input value={depositEth} onChange={(e) => setDepositEth(e.target.value)} />
                <span className="unit">ETH</span>
                <button className="btn btn-glow" onClick={onDeposit} disabled={busy || !account}>
                  Deposit
                </button>
              </div>
            </section>

            <section className="card" id="disburse">
              <h2>
                <span className="step">2</span>Private split
              </h2>
              <p className="d">
                One line per beneficiary: <code>address, amountETH</code>. Payroll / tx-splitter
                pattern — recipients stay unlinkable.
              </p>
              <textarea rows={4} value={splitText} onChange={(e) => setSplitText(e.target.value)} />
              <div className="row between">
                <span className="muted">
                  Total: <b>{fmtEth(splitTotal)} ETH</b>
                </span>
                <button className="btn btn-amber" onClick={onDisburse} disabled={busy || !account}>
                  Disburse privately
                </button>
              </div>
            </section>

            <section className="card" id="prove">
              <h2>
                <span className="step">3</span>Proof of Association
              </h2>
              <p className="d">
                Prove a withdrawal address holds clean funds — without revealing identity.
              </p>
              <div className="row">
                <input
                  placeholder="0x… withdrawal address"
                  value={withdrawAddr}
                  onChange={(e) => setWithdrawAddr(e.target.value)}
                />
                <button className="btn btn-ghost" onClick={onProve} disabled={busy || !withdrawAddr}>
                  Prove
                </button>
              </div>
              {proof && (
                <>
                  <div className="proof-ok">
                    <span className="d" />
                    Proof generated &amp; verified against the association-set root
                  </div>
                  <pre className="proof">{proof}</pre>
                </>
              )}
            </section>

            <section className="card span-2" id="activity">
              <h2>Activity</h2>
              {log.length === 0 ? (
                <p className="muted">No activity yet — connect a wallet and shield some funds.</p>
              ) : (
                <ul className="log">
                  {log.map((l, i) => (
                    <li key={i}>
                      <span className="ts">{new Date(l.t).toLocaleTimeString()}</span>
                      <span>{l.msg}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* TICKER */}
        <div className="ticker">
          <span className="lbl">
            <span className="d" />
            {feed.length ? "Private notes" : "Recent relief"}
          </span>
          <div className="ticker-track">
            {[...ticker, ...ticker].map((r, i) => (
              <span className="tk" key={i}>
                <span className="d" />
                {feed.length ? "Private note · " : "Auto-payout · "}
                <span className="reg">{r.reg}</span>
                <span className="amt">{r.amt}</span> → <span className="sig">{r.sig}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="wrap">
          <footer className="foot">
            <b>Levee Confidential Relief</b> · the privacy &amp; compliance layer for autonomous
            disaster relief · built on 0xbow Privacy Pools v2
          </footer>
        </div>
      </div>
    </>
  );
}
