#!/usr/bin/env bash
# Levee — AI news cross-validation (corroboration layer).
#
# A parametric trigger should never fire on a single signal. This script pulls
# the live risk from the deployed edge model, then asks a locally-running agent
# CLI to INDEPENDENTLY search public news / weather reports for each at-risk
# region and judge whether real-world reporting CORROBORATES or CONTRADICTS the
# model's signal — a second, independent confirmation before any payout.
#
# Uses the local CLI's own login + its web-search tool, so it needs NO API key
# and nothing is embedded in the deployed app.
#
# Usage:  ./scripts/ai-verify.sh
#   LEVEE_API   override the model API base (default: the live edge endpoint)
#   AGENT_CLI   the local reasoning CLI to invoke (default: claude)
set -euo pipefail

API="${LEVEE_API:-https://levee-600.pages.dev/api}"
AGENT_CLI="${AGENT_CLI:-claude}"

echo "▸ Fetching live risk from ${API}/alerts ..." >&2
ALERTS="$(curl -fsSL "${API}/alerts")"

PROMPT="You are Levee's independent corroboration analyst. The parametric risk
model below claims certain regions are at landslide risk. Your job is to CROSS-
VALIDATE that signal against the real world before any autonomous payout.

For EACH region in the JSON:
1) Use web search to look for recent public news, civil-protection bulletins, or
   weather reports about that location (and its area) — heavy rainfall, flooding,
   landslide/debris-flow events, evacuations, alerts.
2) Judge the model's signal: CORROBORATED (independent reporting supports it),
   UNCONFIRMED (no relevant reporting found), or CONTRADICTED (reporting suggests
   conditions are calm).
3) State your confidence and cite the sources you found (title + outlet/date).

Then give a one-paragraph RECOMMENDATION: should the autonomous agent proceed
with a payout, or hold for a human review? A payout should proceed only when the
on-chain threshold is crossed AND the signal is corroborated (or, if unconfirmed,
flagged for human-in-the-loop). Never approve a CONTRADICTED region.

Plain text. Section per region, then RECOMMENDATION.

LIVE RISK JSON:
${ALERTS}"

echo "▸ Cross-validating with local agent CLI (${AGENT_CLI}) — keyless, uses local login + web search ..." >&2
echo
"${AGENT_CLI}" -p "${PROMPT}"
