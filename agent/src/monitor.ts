/**
 * Optional Sentry monitoring for the autonomous agent.
 *
 * Enabled only when SENTRY_DSN is set — so local / CI runs need no config. The
 * agent moves money autonomously, so capturing payout failures, oracle errors
 * and cycle exceptions in real time is exactly the kind of production safety net
 * Sentry is for.
 */
let _enabled = false;
// Lazy require so the dependency is optional at runtime.
let Sentry: typeof import("@sentry/node") | null = null;

export function initMonitoring(): boolean {
  const dsn = (process.env.SENTRY_DSN || "").trim();
  if (!dsn) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require("@sentry/node");
    Sentry!.init({
      dsn,
      environment: process.env.SENTRY_ENV || "devnet",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    });
    _enabled = true;
    console.log("Sentry monitoring enabled.");
  } catch (e) {
    console.warn("Sentry init failed (continuing without it):", (e as Error).message);
  }
  return _enabled;
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (_enabled && Sentry) {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (_enabled && Sentry) {
    Sentry.addBreadcrumb({ message, data, level: "info" });
  }
}
