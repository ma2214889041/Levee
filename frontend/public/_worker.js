/**
 * Levee risk model — Cloudflare Pages Function (advanced mode, edge runtime).
 *
 * A faithful JS port of the Python risk service (model/app) so the "AI" runs on
 * Cloudflare alongside the static site. It serves the project's calibrated
 * LOGISTIC model (model.py's first-class logreg path) — same physically-motivated
 * coefficients, alert bands (shared/regions.json → warning_levels), grid-asset
 * exposure (grid.py) and shift-to-baseline contributing factors. Region metadata
 * is baked from shared/regions.json; per-region "current conditions" are an
 * illustrative snapshot (no live weather feed on the edge) and overridable via
 * query params, e.g. /api/risk?region_id=1&rain_72h=300&rain_24h=180
 *
 * Routes: /api/health  /api/regions  /api/risk?region_id=N  /api/alerts
 * Everything else falls through to the static assets (the Next export).
 */

const RISK_SCALE = 10000;
const WARN = { watch: 0.4, warning: 0.6, critical: 0.7 };

const FEATURES = ["rain_1h", "rain_3h", "rain_24h", "rain_72h", "rain_intensity", "soil_moisture_proxy", "static_susceptibility"];
const LABELS = {
  rain_1h: "1h rainfall",
  rain_3h: "3h rainfall",
  rain_24h: "24h cumulative rainfall",
  rain_72h: "72h cumulative rainfall",
  rain_intensity: "rainfall intensity",
  soil_moisture_proxy: "soil moisture",
  static_susceptibility: "terrain susceptibility",
};
// Training-median baseline (attribution reference), from the model's synthetic catalogue.
const BASELINE = [7, 11, 30, 58, 8, 0.38, 0.72];

const REGIONS = [
  {
    region_id: 1, name: "Sarno, Campania (IT)", threshold_bps: 7000, static_susceptibility: 0.82,
    grid_assets: [
      { id: "TR-SAR-380-017", name: "Sarno–Salerno 380kV — tower T17", type: "transmission_tower", voltage_kv: 380, criticality: 0.95 },
      { id: "SS-SARNO-150", name: "Sarno primary substation", type: "substation", voltage_kv: 150, criticality: 0.9 },
      { id: "TR-SAR-150-042", name: "Sarno–Nocera 150kV — tower T42", type: "transmission_tower", voltage_kv: 150, criticality: 0.7 },
    ],
  },
  {
    region_id: 2, name: "Quindici, Campania (IT)", threshold_bps: 7200, static_susceptibility: 0.78,
    grid_assets: [
      { id: "TR-QUI-380-088", name: "Quindici–Avellino 380kV — tower T88", type: "transmission_tower", voltage_kv: 380, criticality: 0.88 },
      { id: "LN-QUI-150-A", name: "Quindici–Lauro 150kV — span A", type: "line_segment", voltage_kv: 150, criticality: 0.6 },
    ],
  },
];

// Illustrative current rainfall per region (mm). Override any via query params.
const CONDITIONS = {
  1: { rain_1h: 20, rain_3h: 18, rain_24h: 70, rain_72h: 120, rain_intensity: 30 },
  2: { rain_1h: 15, rain_3h: 14, rain_24h: 58, rain_72h: 95, rain_intensity: 24 },
};

const round = (x, n) => { const f = 10 ** n; return Math.round(x * f) / f; };
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Antecedent-precipitation proxy for soil saturation (features.py).
const soilProxy = (r24, r72) => clamp01(0.6 * (r72 / 150) + 0.4 * (r24 / 80));

// Calibrated logistic model (model.py logreg path; coefficients per the spec).
function predictProba(v) {
  const [, r3, r24, r72, ri, soil, susc] = v;
  const z = -6.5 + 0.022 * r72 + 0.018 * r24 + 0.02 * ri + 2.6 * soil + 2.2 * susc + 0.01 * r3;
  return sigmoid(z);
}

function alertLevel(p) {
  if (p >= WARN.critical) return "CRITICAL";
  if (p >= WARN.warning) return "WARNING";
  if (p >= WARN.watch) return "WATCH";
  return "NORMAL";
}

function vectorFor(region, overrides) {
  const c = { ...CONDITIONS[region.region_id], ...overrides };
  const soil = soilProxy(c.rain_24h, c.rain_72h);
  return [c.rain_1h, c.rain_3h, c.rain_24h, c.rain_72h, c.rain_intensity, soil, region.static_susceptibility];
}

function contributingFactors(v, topK = 4) {
  const base = predictProba(v);
  const out = FEATURES.map((name, i) => {
    const vs = v.slice();
    vs[i] = BASELINE[i];
    return { name, label: LABELS[name], value: round(v[i], 3), contribution: round(base - predictProba(vs), 4) };
  });
  out.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return out.slice(0, topK);
}

function affectedAssets(region, p) {
  return region.grid_assets
    .map((a) => ({ id: a.id, name: a.name, type: a.type, voltage_kv: a.voltage_kv, criticality: round(a.criticality, 3), asset_risk: round(p * a.criticality, 4) }))
    .sort((x, y) => y.asset_risk - x.asset_risk);
}

function scoreRegion(region, overrides, ts) {
  const v = vectorFor(region, overrides);
  const p = predictProba(v);
  const risk_bps = Math.round(p * RISK_SCALE);
  const assets = affectedAssets(region, p);
  return {
    region_id: region.region_id,
    name: region.name,
    risk_score: round(p, 4),
    risk_bps,
    threshold_bps: region.threshold_bps,
    would_trigger: risk_bps >= region.threshold_bps,
    alert_level: alertLevel(p),
    grid_exposure_score: assets.length ? assets[0].asset_risk : 0,
    affected_assets: assets,
    contributing_factors: contributingFactors(v),
    model: "levee-logreg (edge)",
    timestamp: ts,
  };
}

function overridesFrom(url) {
  const o = {};
  for (const k of ["rain_1h", "rain_3h", "rain_24h", "rain_72h", "rain_intensity"]) {
    const val = url.searchParams.get(k);
    if (val !== null && val !== "" && !Number.isNaN(Number(val))) o[k] = Number(val);
  }
  return o;
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (p === "/api/health") {
      return json({ status: "ok", model: "levee-logreg (edge)", runtime: "cloudflare-pages-function", regions: REGIONS.length });
    }
    if (p === "/api/regions") {
      return json({ risk_scale: RISK_SCALE, warning_levels: WARN, regions: REGIONS });
    }
    if (p === "/api/risk") {
      const id = Number(url.searchParams.get("region_id"));
      const region = REGIONS.find((r) => r.region_id === id);
      if (!region) return json({ error: `Unknown region_id=${url.searchParams.get("region_id")}` }, 404);
      const ts = Math.floor(Date.parse(request.headers.get("date") || "") / 1000) || 0;
      return json(scoreRegion(region, overridesFrom(url), ts));
    }
    if (p === "/api/alerts") {
      const order = { NORMAL: 0, WATCH: 1, WARNING: 2, CRITICAL: 3 };
      const alerts = REGIONS.map((r) => {
        const s = scoreRegion(r, {}, 0);
        const top = s.affected_assets[0] || null;
        return {
          region_id: s.region_id, level: s.alert_level, risk_score: s.risk_score, risk_bps: s.risk_bps,
          headline: `${r.name}: ${s.alert_level === "NORMAL" ? "conditions normal" : "landslide " + s.alert_level}`,
          top_asset: top, asset_count_at_risk: s.affected_assets.filter((a) => a.asset_risk >= 0.4).length,
          actionable: s.alert_level === "WARNING" || s.alert_level === "CRITICAL",
        };
      }).sort((a, b) => order[b.level] - order[a.level] || b.risk_score - a.risk_score);
      return json({ warning_levels: WARN, alerts });
    }

    // Not an API route → serve the static Next export.
    return env.ASSETS.fetch(request);
  },
};
