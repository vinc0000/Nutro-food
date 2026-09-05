import * as Sentry from '@sentry/react';

// Only initializes if VITE_SENTRY_DSN is actually set — every environment
// without it configured (local dev, previews, forks) runs with monitoring
// silently off instead of erroring or needing a dummy DSN.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Free-tier Sentry (Developer plan) caps out at 5,000 events/month shared
    // across everything this DSN captures — sampling performance traces at
    // 10% (not 100%) keeps normal page-load/navigation tracing from quietly
    // eating that whole budget before a single real bug gets captured. Error
    // reports themselves are NOT sampled (always captured at 100%) — this
    // only throttles the lower-value performance-tracing events.
    tracesSampleRate: 0.1,
    // Session Replay only records when an error actually happens, never for
    // ordinary sessions — same reasoning: conserve quota for what's useful.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    ignoreErrors: [
      // Harmless browser/extension noise that isn't an actual app bug —
      // filtering it out here (not in the Sentry dashboard) means it never
      // counts against the monthly event quota in the first place.
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      /chrome-extension:\/\//,
    ],
  });
}
