import { useEffect, useRef, useState } from 'react';
import { DASHBOARD_HTML } from './dashboard.markup.js';
import { bootstrapDashboard } from './lib/bootstrap.js';

// Branded loader shown while the dataset loads from the backend (after sign-in).
// Theme-aware: it uses the same tokens as the app, so it matches the chosen look.
function DashboardSkeleton() {
  return (
    <div id="appLoader" aria-hidden="true">
      <div className="loader-logo">&#9672;</div>
      <div className="loader-name">
        Inventory <em>Intelligence</em>
      </div>
      <div className="loader-bar" />
      <div className="loader-text">Loading your data…</div>
    </div>
  );
}

export default function App() {
  const mountedRef = useRef(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard against a second invocation (e.g. fast refresh / re-mounts).
    if (mountedRef.current) return;
    mountedRef.current = true;

    bootstrapDashboard()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error('[App] dashboard bootstrap failed', err);
        setError(err.message || String(err));
        setLoading(false);
      });
  }, []);

  return (
    <>
      {loading && !error && <DashboardSkeleton />}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: '#ff4a5c',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: 13,
            padding: '10px 16px',
          }}
        >
          Failed to load dashboard: {error}. Is the API server running and the
          dataset seeded? (cd server &amp;&amp; npm run seed &amp;&amp; npm start)
        </div>
      )}
      {/* Exact original markup; the ported logic drives it via getElementById. */}
      <div dangerouslySetInnerHTML={{ __html: DASHBOARD_HTML }} />
    </>
  );
}
