#!/usr/bin/env bash
# Levee — natural-language early-warning brief via a LOCAL agent CLI.
#
# Pulls live risk from the deployed edge risk-model and asks a locally-running
# agent CLI to reason over it: a grid-operator early-warning brief plus an
# autonomous-relief decision rationale. Uses the local CLI's own login, so it
# needs NO API key and nothing is embedded in the deployed app.
#
# Usage:  ./scripts/ai-brief.sh
#   LEVEE_API   override the model API base (default: the live edge endpoint)
#   AGENT_CLI   the local reasoning CLI to invoke (default: claude)
set -euo pipefail

API="${LEVEE_API:-https://levee-600.pages.dev/api}"
AGENT_CLI="${AGENT_CLI:-claude}"

echo "▸ Fetching live risk from ${API}/alerts ..." >&2
ALERTS="$(curl -fsSL "${API}/alerts")"

PROMPT="You are Levee's relief-operations analyst. Using ONLY the live risk JSON below, produce:

1) EARLY-WARNING BRIEF (for National-Transmission-Grid operators): one line per region — alert level, risk %, and the single most-exposed transmission asset.
2) AUTONOMOUS-RELIEF DECISION: one short paragraph — which regions cross the on-chain threshold and would trigger a USDC relief payout, which do not, and the reasoning. Note that only the on-chain threshold authorizes a payout.

Plain text. No preamble, no markdown headers beyond the two section titles.

LIVE RISK JSON:
${ALERTS}"

echo "▸ Reasoning with local agent CLI (${AGENT_CLI}) — keyless, uses local login ..." >&2
echo
"${AGENT_CLI}" -p "${PROMPT}"
