# Installing the Privacy Pools V2 SDK (Levee Confidential Relief)

`@0xbow-io/privacy-pools-v2-sdk` is a **private** package on GitHub Packages.
These steps install it as a normal npm dependency — you do not need access to the
source repo.

> 🔒 The access token is **read-only and short-lived**. If installs fail with
> `401 Unauthorized`, the token has expired or been revoked — get a fresh one
> from the 0xbow maintainer. **Never commit the token.**

## 1. Configure npm auth

> ⚠️ **Workspace caveat (important).** `privacy/` is an npm **workspace** of the
> repo root, and npm **ignores `.npmrc` files inside a workspace sub-folder**
> (you'll see `npm warn config ignoring workspace config at …/privacy/.npmrc`).
> So for a workspace install the auth file must live at the **repo root**, not in
> `privacy/`. Both locations are git-ignored (`.npmrc` is in `.gitignore`).

**Recommended — repo root (works with workspaces):**

```bash
# from the repo root
cat > .npmrc <<'EOF'
@0xbow-io:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_READONLY_TOKEN_HERE
EOF
```

**Alternative — standalone (only if you install `privacy/` on its own, outside
the workspace):** copy the template and edit it:

```bash
cd privacy && cp .npmrc.example .npmrc   # then paste your token
```

`.npmrc` is git-ignored (`!.npmrc.example` keeps the template) so the token
never lands in the repo. **Never commit a real token.**

## 2. Install

```bash
# from the repo root, install into the privacy workspace:
npm install @0xbow-io/privacy-pools-v2-sdk@beta -w @levee/privacy
# pin a version instead:
# npm install @0xbow-io/privacy-pools-v2-sdk@0.1.0-beta.0 -w @levee/privacy
```

If you get `401 Unauthorized`, the token has expired/been revoked or lacks
`read:packages` access — get a fresh one from the 0xbow maintainer (the
hackathon token expires ~2026-06-18). With no valid token the UI still runs in
**mock mode** (`npm run dev`), which demos the full UX without the SDK.

## 3. Activate the real adapter

```bash
echo "VITE_USE_REAL_SDK=true" >> .env.local
npm run dev
```

The UI talks only to `PrivacyPoolAdapter` (`src/privacy/adapter.ts`). With the
flag off it uses the in-memory **mock**; with it on it uses
`src/privacy/realAdapter.ts`, which calls:

```typescript
import { DEFAULT_CIRCUIT_MANIFEST, PoolSessionBuilder } from "@0xbow-io/privacy-pools-v2-sdk";
const session = await PoolSessionBuilder.create({
  chainId: 11155111, // Sepolia
  circuitManifest: DEFAULT_CIRCUIT_MANIFEST,
  // ...see the SDK README for the full configuration (wallet client / signer)
});
```

Finish the `TODO`s in `realAdapter.ts` (deposit / disburse / proveAssociation)
against the SDK README once the package is installed.

## Troubleshooting

| Error | Cause / fix |
|---|---|
| `401 Unauthorized` | Token expired/revoked or mistyped — re-check `_authToken` in `.npmrc`. |
| `403 Forbidden` | Token lacks package access — ask the maintainer to re-grant. |
| `404 Not Found` | The `@0xbow-io:registry` line is missing/misspelled in `.npmrc`. |

**Requirements:** Node.js ≥ 18. Works with npm, pnpm, and yarn.
