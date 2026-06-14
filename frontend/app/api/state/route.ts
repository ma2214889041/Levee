import { NextResponse } from "next/server";
import { PROGRAM_ID, REGIONS, RISK_SCALE, RPC_URL } from "@/lib/config";
import { fetchRisk } from "@/lib/model";
import {
  getOnChainRegion,
  getBeneficiaryCount,
  getDecisions,
  getVaultBalanceUsdc,
} from "@/lib/chain";
import { captureException } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const vaultBalanceUsdc = await getVaultBalanceUsdc();

    const regions = await Promise.all(
      REGIONS.map(async (def) => {
        const [risk, onchain, beneficiaries, decisions] = await Promise.all([
          fetchRisk(def.region_id),
          getOnChainRegion(def.region_id),
          getBeneficiaryCount(def.region_id),
          getDecisions(def.region_id, 8),
        ]);
        return { def, risk, onchain, beneficiaries, decisions };
      })
    );

    return NextResponse.json({
      rpcUrl: RPC_URL,
      programId: PROGRAM_ID,
      riskScale: RISK_SCALE,
      vaultBalanceUsdc,
      regions,
      generatedAt: Math.floor(Date.now() / 1000),
    });
  } catch (e) {
    captureException(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
