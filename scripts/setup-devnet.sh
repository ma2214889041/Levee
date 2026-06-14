#!/usr/bin/env bash
# End-to-end DEVNET setup for Levee. Run from the repo root after filling .env.
# Requires: solana CLI, anchor (avm), node, a funded devnet keypair.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Create .env from .env.example first."; exit 1; }
set -a; . ./.env; set +a

echo "==> 1. Devnet airdrop (admin keypair)"
solana airdrop 2 -u devnet -k "${ADMIN_KEYPAIR_PATH}" || true

echo "==> 2. Build + deploy the program"
( cd program && anchor build && anchor keys sync && anchor deploy --provider.cluster devnet )
echo "   Set LEVEE_PROGRAM_ID in .env to the deployed id (anchor keys list)."

echo "==> 3. Install JS workspaces"
npm install

echo "==> 4. Create the Switchboard feed for region 1"
( cd oracle && npx ts-node src/createFeed.ts --region 1 )
echo "   Copy the printed feed pubkey into .env (SWITCHBOARD_FEED_PUBKEY)."

echo "==> 5. Initialize vault + region + registry"
( cd agent && npx ts-node src/admin.ts init-vault )
( cd agent && npx ts-node src/admin.ts init-region 1 )
( cd agent && npx ts-node src/admin.ts init-registry 1 )
echo "   Add beneficiaries: (cd agent && npx ts-node src/admin.ts add-beneficiary 1 <ownerPubkey>)"

echo "==> 6. Fund the vault (after creating + funding a depositor USDC ATA)"
echo "   (cd agent && npx ts-node src/admin.ts deposit 5000 <depositorTokenAccount>)"

echo "Done. Start the model API, push the oracle, then run the agent."
