#!/usr/bin/env bash
# Local demo: start the risk model, replay the Campania (Sarno 1998) rainfall,
# and run one agent evaluation pass. Use after setup-devnet.sh (or with
# AGENT_DRY_RUN=true to preview without a deployed program).
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

echo "==> Starting risk model API (model/) on :8000"
(
  cd model
  [ -d .venv ] || python3 -m venv .venv
  . .venv/bin/activate
  pip install -q -r requirements.txt
  uvicorn app.main:app --host 127.0.0.1 --port 8000 &
  echo $! > /tmp/levee-model.pid
)
sleep 5

echo "==> Replaying Campania rainfall against the live API (feeds /ingest)"
( cd model && . .venv/bin/activate && python scripts/replay_campania.py --region 1 --api-url http://127.0.0.1:8000 --every 6 )

echo "==> One agent evaluation pass (dry-run unless AGENT_DRY_RUN=false)"
( cd agent && npx ts-node src/index.ts --once ) || true

echo "==> Open the dashboard: (cd frontend && npm run dev) → http://localhost:3000"
echo "Stop the model API: kill \$(cat /tmp/levee-model.pid)"
