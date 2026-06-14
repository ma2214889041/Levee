/**
 * Switchboard On-Demand job definition.
 *
 * The job tells the oracle network HOW to produce this feed's value: call the
 * Levee risk API and parse `risk_score` (a probability in [0,1]). The on-chain
 * program scales it to basis points when it reads the feed.
 */
import { OracleJob } from "@switchboard-xyz/common";
import { MODEL_API_URL } from "./config";

/** Build the OracleJob that fetches P(landslide) for a region from /risk. */
export function buildRiskJob(regionId: number, modelApiUrl = MODEL_API_URL): OracleJob {
  return OracleJob.fromObject({
    tasks: [
      {
        httpTask: {
          url: `${modelApiUrl.replace(/\/$/, "")}/risk?region_id=${regionId}`,
          method: OracleJob.HttpTask.Method.METHOD_GET,
        },
      },
      {
        // Extract the probability. Switchboard aggregates this across the oracles
        // that run the job; the program enforces min samples + staleness.
        jsonParseTask: {
          path: "$.risk_score",
        },
      },
    ],
  });
}
