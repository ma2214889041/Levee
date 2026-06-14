/**
 * Human-in-the-loop approval gate for large payouts.
 *
 * Fail-safe by design: if a payout total exceeds the configured threshold and
 * no human can approve (non-interactive session and HITL_AUTO_APPROVE not set),
 * approval is DENIED and the agent skips the payout. Better to under-trigger.
 */
import * as readline from "readline";

export async function requestApproval(summary: string): Promise<boolean> {
  if ((process.env.HITL_AUTO_APPROVE || "").toLowerCase() === "true") {
    console.log("  [HITL] auto-approve enabled via HITL_AUTO_APPROVE.");
    return true;
  }
  if (!process.stdin.isTTY) {
    console.log("  [HITL] non-interactive session → DENY (fail-safe).");
    return false;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer: string = await new Promise((resolve) =>
    rl.question(`\n  [HITL] Approve payout?\n  ${summary}\n  Type "yes" to approve: `, resolve)
  );
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}
