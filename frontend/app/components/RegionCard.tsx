import { Decision, RegionState } from "../types";

const USDC = 1e6;
const fmtUsdc = (base: string) => (Number(base) / USDC).toLocaleString();
const fmtTime = (ts: number) =>
  ts > 0 ? new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 19) + "Z" : "—";

type Status = "trigger" | "cooldown" | "monitor" | "nodata";

function computeStatus(s: RegionState): { status: Status; label: string } {
  const { risk, onchain } = s;
  if (!risk && !onchain) return { status: "nodata", label: "NO DATA" };
  const thresholdBps = onchain?.thresholdBps ?? s.def.threshold_bps;
  if (!risk) return { status: "nodata", label: "AWAITING RISK" };
  const over = risk.risk_bps >= thresholdBps;
  if (!over) return { status: "monitor", label: "MONITORING" };
  const now = Math.floor(Date.now() / 1000);
  if (onchain && now < onchain.lastTriggeredAt + onchain.cooldownSeconds) {
    return { status: "cooldown", label: "COOLDOWN" };
  }
  return { status: "trigger", label: "TRIGGER CONDITION MET" };
}

function DecisionsTable({ decisions, scale }: { decisions: Decision[]; scale: number }) {
  if (decisions.length === 0)
    return <p className="warn">No on-chain decisions yet for this region.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>When</th>
          <th>Risk</th>
          <th>Triggered</th>
          <th className="amt">Payout (USDC)</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {decisions.map((d) => (
          <tr key={d.sequence}>
            <td>{d.sequence}</td>
            <td className="mono">{fmtTime(d.evaluatedAt)}</td>
            <td>
              {(d.riskBps / scale * 100).toFixed(1)}% / {(d.thresholdBps / scale * 100).toFixed(0)}%
            </td>
            <td>
              <span className={`pill ${d.triggered ? "yes" : "no"}`}>
                {d.triggered ? "YES" : "no"}
              </span>
            </td>
            <td className="amt">{fmtUsdc(d.payoutTotal)}</td>
            <td className="mono">{d.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function RegionCard({ s, scale }: { s: RegionState; scale: number }) {
  const { def, risk, onchain, beneficiaries } = s;
  const { status, label } = computeStatus(s);
  const thresholdBps = onchain?.thresholdBps ?? def.threshold_bps;
  const riskPct = risk ? (risk.risk_bps / scale) * 100 : 0;
  const threshPct = (thresholdBps / scale) * 100;
  const fillColor =
    status === "trigger" ? "var(--red)" : status === "cooldown" ? "var(--amber)" : "var(--green)";

  const capTotal = onchain ? Number(onchain.cap) / USDC : def.cap_usdc;
  const capUsed = onchain ? Number(onchain.totalPaidOut) / USDC : 0;

  const maxFactor =
    risk && risk.contributing_factors.length
      ? Math.max(...risk.contributing_factors.map((f) => Math.abs(f.contribution)), 0.0001)
      : 1;

  return (
    <div className="card">
      <div className="row">
        <h2>{def.name}</h2>
        <span className={`status ${status}`}>{label}</span>
      </div>
      <p className="desc">{def.description}</p>

      <div className="row">
        <span className="kv-k" style={{ color: "var(--muted)", fontSize: 12 }}>
          Risk {risk ? `${riskPct.toFixed(1)}%` : "—"} · threshold {threshPct.toFixed(0)}%
        </span>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          model: {risk?.model ?? "offline"}
        </span>
      </div>
      <div className="gauge">
        <div className="fill" style={{ width: `${Math.min(riskPct, 100)}%`, background: fillColor }} />
        <div className="thresh" style={{ left: `${Math.min(threshPct, 100)}%` }} />
      </div>

      {risk && risk.contributing_factors.length > 0 && (
        <div className="factors">
          {risk.contributing_factors.slice(0, 3).map((f) => (
            <div className="factor" key={f.name}>
              <span style={{ width: 130 }}>{f.label}</span>
              <span
                className="fbar"
                style={{ width: `${(Math.abs(f.contribution) / maxFactor) * 120}px` }}
              />
              <span>{(f.contribution * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="kv">
        <div>
          <div className="k">Threshold {onchain?.thresholdLocked ? "🔒 (on-chain)" : "(config)"}</div>
          <div className="v">{threshPct.toFixed(0)}%</div>
        </div>
        <div>
          <div className="k">Payout / beneficiary</div>
          <div className="v">
            {onchain ? fmtUsdc(onchain.payoutAmount) : def.payout_amount_usdc} USDC
          </div>
        </div>
        <div>
          <div className="k">Beneficiaries</div>
          <div className="v">{beneficiaries ?? "—"}</div>
        </div>
        <div>
          <div className="k">Cap used</div>
          <div className="v">
            {capUsed.toLocaleString()} / {capTotal.toLocaleString()} USDC
          </div>
        </div>
        <div>
          <div className="k">Cooldown</div>
          <div className="v">{((onchain?.cooldownSeconds ?? def.cooldown_seconds) / 3600).toFixed(0)}h</div>
        </div>
        <div>
          <div className="k">Last triggered</div>
          <div className="v mono" style={{ fontSize: 12 }}>
            {fmtTime(onchain?.lastTriggeredAt ?? 0)}
          </div>
        </div>
      </div>

      {!onchain && (
        <p className="warn">⚠ Region not found on-chain (program not deployed / region not initialized). Showing config defaults + live model risk.</p>
      )}

      <DecisionsTable decisions={s.decisions} scale={scale} />
    </div>
  );
}
