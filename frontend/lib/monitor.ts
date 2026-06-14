/**
 * Optional server-side Sentry monitoring for the dashboard's API routes.
 * Active only when SENTRY_DSN is set; otherwise a no-op.
 */
let _enabled = false;
let Sentry: typeof import("@sentry/node") | null = null;

function ensureInit(): void {
  if (_enabled || Sentry !== null) return;
  const dsn = (process.env.SENTRY_DSN || "").trim();
  if (!dsn) {
    Sentry = null;
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require("@sentry/node");
    Sentry!.init({
      dsn,
      environment: process.env.SENTRY_ENV || "devnet",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    });
    _enabled = true;
  } catch {
    Sentry = null;
  }
}

export function captureException(err: unknown): void {
  ensureInit();
  if (_enabled && Sentry) Sentry.captureException(err);
}
