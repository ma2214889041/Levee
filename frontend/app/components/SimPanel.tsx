"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Interactive run-through of Levee's autonomous loop, client-side so it works on
 * the static export. It replays the rainfall buildup of the May 1998 Sarno event
 * through the SAME calibrated logistic model the edge API serves, and when risk
 * crosses the on-chain threshold it animates the agent pipeline:
 * oracle push → AI news corroboration → bounded payout → on-chain decision log.
 *
 * Clearly labelled a SIMULATION: the model + thresholds are real, the rainfall is
 * a historical replay, and the on-chain steps are illustrated (no live tx here).
 */

// Hourly rainfall (mm) approximating the multi-day buildup before the 5–6 May
// 1998 Sarno debris flows — same series as model/scripts/replay_campania.py.
const SERIES = [
  ...Array(24).fill(1.2),
  ...Array(24).fill(2.0),
  ...Array(18).fill(3.5),
  12, 18, 26, 34, 28, 20,
  8, 5, 3, 2, 1, 1,
];

const THRESHOLD = 0.7; // Sarno on-chain threshold_bps = 7000
const SUSC = 0.82; // Sarno static_susceptibility
const PAYOUT_USDC = 500;
const WALLETS = 1820;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const roll = (i: number, h: number) => {
  let s = 0;
  for (let k = Math.max(0, i - h + 1); k <= i; k++) s += SERIES[k];
  return s;
};
function predict(i: number) {
  const r3 = roll(i, 3);
  const r24 = roll(i, 24);
  const r72 = roll(i, 72);
  const ri = Math.max(...SERIES.slice(Math.max(0, i - 2), i + 1));
  const soil = clamp01(0.6 * (r72 / 150) + 0.4 * (r24 / 80));
  const z = -6.5 + 0.022 * r72 + 0.018 * r24 + 0.02 * ri + 2.6 * soil + 2.2 * SUSC + 0.01 * r3;
  return { p: 1 / (1 + Math.exp(-z)), r24, r72, ri };
}

type Ev = { t: string; msg: string; kind: "info" | "warn" | "crit" | "ai" | "pay" | "chain" };

export default function SimPanel() {
  const [hour, setHour] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [events, setEvents] = useState<Ev[]>([]);
  const firedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cur = predict(hour);
  const pct = cur.p * 100;
  const level =
    cur.p >= 0.7 ? "CRITICAL" : cur.p >= 0.6 ? "WARNING" : cur.p >= 0.4 ? "WATCH" : "NORMAL";
  const lvColor =
    level === "CRITICAL" ? "var(--risk)" : level === "WARNING" ? "var(--amber)" : level === "WATCH" ? "#6ad" : "var(--cyan)";

  const hh = (h: number) => `T+${String(h).padStart(2, "0")}h`;
  const push = (e: Ev) => setEvents((prev) => [...prev, e]);

  function reset() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    firedRef.current = false;
    setRunning(false);
    setDone(false);
    setHour(0);
    setEvents([]);
  }

  function start() {
    reset();
    setRunning(true);
    push({ t: hh(0), msg: "Replaying 1998 Sarno rainfall — agent monitoring risk…", kind: "info" });
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      if (i >= SERIES.length) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setRunning(false);
        setDone(true);
        return;
      }
      setHour(i);
      const { p } = predict(i);

      if (!firedRef.current && p >= THRESHOLD) {
        firedRef.current = true;
        // The autonomous pipeline, staged for legibility.
        push({ t: hh(i), msg: `On-chain threshold crossed — risk ${(p * 100).toFixed(0)}% ≥ 70%`, kind: "crit" });
        setTimeout(() => push({ t: hh(i), msg: "Switchboard oracle pushes verified risk on-chain", kind: "chain" }), 450);
        setTimeout(() => push({ t: hh(i), msg: "AI corroboration — Claude web-checks news/weather → CORROBORATED ✓", kind: "ai" }), 1000);
        setTimeout(() => push({ t: hh(i), msg: `Agent signs execute_payout · ${PAYOUT_USDC} USDC → ${WALLETS.toLocaleString()} registered wallets`, kind: "pay" }), 1600);
        setTimeout(() => push({ t: hh(i), msg: "Shielded via Privacy Pools v2 — recipients stay confidential", kind: "pay" }), 2150);
        setTimeout(() => push({ t: hh(i), msg: "log_decision written on-chain — publicly auditable", kind: "chain" }), 2700);
      }
    }, 110);
  }

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const kindColor: Record<Ev["kind"], string> = {
    info: "var(--muted)",
    warn: "var(--amber)",
    crit: "var(--risk)",
    ai: "var(--violet)",
    pay: "var(--amber)",
    chain: "var(--cyan)",
  };

  return (
    <div className="sim">
      <div className="sim-head">
        <div>
          <div className="sim-title">▶ Live simulation — autonomous relief loop</div>
          <div className="sim-sub">
            1998 Sarno rainfall replay through the real risk model · Sarno threshold 70%
          </div>
        </div>
        <div className="sim-btns">
          {!running && (
            <button className="sim-btn" onClick={start}>
              {done ? "Replay" : "Run simulation"}
            </button>
          )}
          {running && (
            <button className="sim-btn ghost" onClick={reset}>
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="sim-grid">
        <div>
          <div className="sim-row">
            <span className="sim-clock mono">{hh(hour)}</span>
            <span className="sim-lvl mono" style={{ color: lvColor }}>{level}</span>
            <span className="sim-pct mono" style={{ color: lvColor }}>{pct.toFixed(0)}%</span>
          </div>
          <div className="sim-gauge">
            <div className="sim-fill" style={{ width: `${pct}%`, background: lvColor }} />
            <div className="sim-thresh" style={{ left: `${THRESHOLD * 100}%` }} title="on-chain threshold 70%" />
          </div>
          <div className="sim-cond mono">
            24h&nbsp;{cur.r24.toFixed(0)}mm · 72h&nbsp;{cur.r72.toFixed(0)}mm · intensity&nbsp;{cur.ri.toFixed(0)}mm/h
          </div>
        </div>

        <div className="sim-log">
          {events.length === 0 && (
            <div className="sim-ev" style={{ color: "var(--muted)" }}>
              Press <b>Run simulation</b> to watch risk build and the agent act when it crosses the
              on-chain threshold.
            </div>
          )}
          {events.map((e, i) => (
            <div key={i} className="sim-ev">
              <span className="mono sim-ev-t">{e.t}</span>
              <span style={{ color: kindColor[e.kind] }}>{e.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
