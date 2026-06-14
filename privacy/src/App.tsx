import { useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { createAdapter, PoolStatus } from "./privacy";
import { connectWallet } from "./wallet";

type LogEntry = { t: number; msg: string };

export default function App() {
  const adapter = useMemo(() => createAdapter(), []);
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

  function note(msg: string) {
    setLog((l) => [{ t: Date.now(), msg }, ...l].slice(0, 30));
  }
  async function refresh() {
    setStatus(await adapter.status());
  }
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
      note(`Connected ${acc.slice(0, 6)}…${acc.slice(-4)} (${adapter.kind} adapter)`);
    } catch (e) {
      note(`Connect failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDeposit() {
    try {
      setBusy(true);
      const res = await adapter.deposit(parseEther(depositEth as `${number}`));
      note(`Shielded ${depositEth} ETH — commitment ${res.commitment.slice(0, 10)}…`);
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
      note(
        `Privately disbursed ${formatEther(res.totalWei)} ETH to ${res.notes.length} ` +
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
      note(`Proof of Association generated for ${withdrawAddr.slice(0, 8)}… (verified=${p.verified})`);
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

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>🌊 Levee · Confidential Relief</h1>
          <p className="sub">
            Private, compliant relief disbursement on <b>Privacy Pools v2</b> (Sepolia).
            Recipients stay private; donors &amp; regulators get Proof of Association.
          </p>
        </div>
        <button className="btn" onClick={onConnect} disabled={busy}>
          {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}
        </button>
      </header>

      {adapter.kind === "mock" && (
        <div className="mock">
          ⚠ MOCK MODE — in-memory simulation, no real privacy / no chain. Install the
          0xbow SDK (see <code>INSTALL.md</code>) and set <code>VITE_USE_REAL_SDK=true</code>
          to use real Privacy Pools v2.
        </div>
      )}

      <div className="stat">
        <span>Adapter: <b>{status?.kind ?? "—"}</b></span>
        <span>Chain: <b>Sepolia ({status?.chainId ?? "—"})</b></span>
        <span>Shielded balance: <b>{status ? formatEther(status.privateBalanceWei) : "—"} ETH</b></span>
      </div>

      <div className="grid">
        <section className="card">
          <h2>1 · Shield funds</h2>
          <p className="d">Deposit relief funds into the Privacy Pool.</p>
          <div className="row">
            <input value={depositEth} onChange={(e) => setDepositEth(e.target.value)} />
            <span className="unit">ETH</span>
            <button className="btn" onClick={onDeposit} disabled={busy || !account}>Deposit</button>
          </div>
        </section>

        <section className="card">
          <h2>2 · Private disbursement (split)</h2>
          <p className="d">One line per beneficiary: <code>address, amountETH</code>.</p>
          <textarea rows={5} value={splitText} onChange={(e) => setSplitText(e.target.value)} />
          <div className="row between">
            <span className="muted">Total: {formatEther(splitTotal)} ETH</span>
            <button className="btn" onClick={onDisburse} disabled={busy || !account}>Disburse privately</button>
          </div>
        </section>

        <section className="card">
          <h2>3 · Proof of Association</h2>
          <p className="d">Prove a withdrawal address holds clean funds — without revealing identity.</p>
          <div className="row">
            <input
              placeholder="0x… withdrawal address"
              value={withdrawAddr}
              onChange={(e) => setWithdrawAddr(e.target.value)}
            />
            <button className="btn" onClick={onProve} disabled={busy || !withdrawAddr}>Prove</button>
          </div>
          {proof && <pre className="proof">{proof}</pre>}
        </section>

        <section className="card">
          <h2>Activity</h2>
          {log.length === 0 && <p className="muted">No activity yet.</p>}
          <ul className="log">
            {log.map((l, i) => (
              <li key={i}>
                <span className="ts">{new Date(l.t).toLocaleTimeString()}</span> {l.msg}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="foot">
        Levee Confidential Relief · the privacy &amp; compliance layer for autonomous
        disaster relief · 0xbow Privacy Pools v2
      </footer>
    </div>
  );
}
