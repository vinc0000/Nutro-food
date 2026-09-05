import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Dynamic import, fired but not awaited — Sentry initializes in the
// background while the app renders immediately. A static import here would
// make every visitor's first paint wait on ~100kb of Sentry+Replay code
// whether or not monitoring is even configured for this deploy.
void import('./lib/sentry.ts').then((m) => m.initSentry());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
