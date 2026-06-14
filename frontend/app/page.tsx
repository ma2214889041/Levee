"use client";

import { useEffect, useState } from "react";
import { DashboardState } from "./types";
import RegionCard from "./components/RegionCard";

export default function Home() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState(await res.json());
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>🌊 Levee</h1>
        <span className="tag">Solana · devnet</span>
        <span className="tag">autonomous AI relief agent</span>
      </div>
      <p className="subtitle">
        Levee monitors landslide risk in real time. When risk crosses a threshold
        committed on-chain, an autonomous agent disburses USDC relief to registered
        community wallets — every decision and payout written on-chain and publicly
        auditable.
      </p>

      <div className="bar">
        <div className="stat">
          <div className="label">Vault balance</div>
          <div className="value">
            {state?.vaultBalanceUsdc != null
              ? `${state.vaultBalanceUsdc.toLocaleString()} USDC`
              : "—"}
          </div>
        </div>
        <div className="stat">
          <div className="label">Monitored regions</div>
          <div className="value">{state?.regions.length ?? "—"}</div>
        </div>
        <div className="stat">
          <div className="label">Program</div>
          <div className="value mono" style={{ fontSize: 13 }}>
            {state ? `${state.programId.slice(0, 4)}…${state.programId.slice(-4)}` : "—"}
          </div>
        </div>
        <div className="stat">
          <div className="label">Last update</div>
          <div className="value mono" style={{ fontSize: 13 }}>
            {state ? new Date(state.generatedAt * 1000).toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

      {err && <p className="warn">Failed to load /api/state: {err}</p>}

      <div className="grid">
        {state?.regions.map((r) => (
          <RegionCard key={r.def.region_id} s={r} scale={state.riskScale} />
        ))}
      </div>

      <p className="footer">
        Risk from the Levee model API · policy &amp; payouts from the Levee Solana
        program · refreshes every 15s. Hard rule: only the on-chain threshold can
        authorize a payout — stale or missing data never triggers one.
      </p>
    </div>
  );
}
