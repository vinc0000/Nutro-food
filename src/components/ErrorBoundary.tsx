import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

// This app had NO error boundary anywhere — a single render-time throw in any
// component (a null-check miss, a bad API response shape, a third-party script
// failure) would unmount the whole React tree and leave the customer looking at
// a blank white page with zero explanation and no way back, mid-service, on a
// restaurant's POS or KDS screen. That's the highest-cost failure mode this app
// can have in production, and there was nothing catching it.
//
// Deliberately styled with plain CSS (no ThemeContext/useTheme) so this still
// renders correctly even if the crash happened inside a theme/context provider
// itself — the one piece of UI that must not depend on the thing that might be
// broken.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No error monitoring (Sentry or similar) is wired into this project yet —
    // this is the one place that would send it. Logged to console in the
    // meantime so it's still visible in browser/devtools during support calls.
    console.error('Nutro crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center',
        background: '#0F172A', color: '#F1F5F9', fontFamily: 'system-ui, sans-serif',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Une erreur est survenue</h1>
        <p style={{ color: '#94A3B8', maxWidth: '28rem', margin: 0 }}>
          Nutro a rencontré un problème inattendu. Rechargez la page pour continuer — vos données ne sont pas perdues.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: 700,
            background: '#10B981', color: '#fff', cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          Recharger la page
        </button>
      </div>
    );
  }
}
