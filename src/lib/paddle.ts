// Thin wrapper around Paddle.js (Paddle Billing v2's client-side overlay
// checkout). Loaded lazily so the ~40kb script never ships to tenants who
// never touch the Paddle checkout flow (e.g. anyone on Flutterwave/Stripe).
//
// Requires VITE_PADDLE_CLIENT_TOKEN to be set (Paddle Dashboard > Developers
// > Authentication > Client-side token — safe to expose in frontend code,
// unlike the server-side PADDLE_API_KEY used by the paddle-pay edge
// function). Until it's set, openPaddleCheckout rejects with a clear error
// instead of silently doing nothing.

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; eventCallback?: (event: { name: string }) => void }) => void;
      Checkout: { open: (opts: Record<string, unknown>) => void };
      Environment?: { set: (env: 'sandbox' | 'production') => void };
    };
  }
}

let loadPromise: Promise<void> | null = null;

function loadPaddleScript(): Promise<void> {
  if (window.Paddle) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export async function openPaddleCheckout(
  transactionId: string,
  onComplete: () => void
): Promise<void> {
  const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined;
  if (!clientToken) {
    throw new Error('Paddle client-side token is not configured (VITE_PADDLE_CLIENT_TOKEN).');
  }

  await loadPaddleScript();
  if (!window.Paddle) throw new Error('Paddle.js did not load correctly.');

  if (import.meta.env.VITE_PADDLE_ENV !== 'live') {
    window.Paddle.Environment?.set('sandbox');
  }

  window.Paddle.Initialize({
    token: clientToken,
    eventCallback: (event) => {
      // checkout.completed fires once Paddle confirms the payment in the
      // overlay itself — the actual plan activation still happens via the
      // 'verify' call (which re-checks server-side) or the webhook, this
      // callback only triggers that re-check so the UI updates promptly.
      if (event.name === 'checkout.completed') onComplete();
    },
  });

  window.Paddle.Checkout.open({ transactionId });
}
