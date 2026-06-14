# scripts/

Operational helpers for Levee.

| Script             | What it does                                                        |
|--------------------|--------------------------------------------------------------------|
| `setup-devnet.sh`  | Airdrop → build/deploy program → install JS → create Switchboard feed → init vault/region/registry → (prompts) fund vault. |
| `run-demo.sh`      | Start the model API, replay Campania rainfall through it, run one agent pass. |

The on-chain admin actions are also available directly:

```bash
cd agent
npx ts-node src/admin.ts init-vault
npx ts-node src/admin.ts init-region 1 [oracleFeedPubkey]
npx ts-node src/admin.ts init-registry 1
npx ts-node src/admin.ts add-beneficiary 1 <ownerPubkey>
npx ts-node src/admin.ts deposit 5000 <depositorTokenAccount>
```

Make them executable: `chmod +x scripts/*.sh`. Fill `.env` first (see `.env.example`).
