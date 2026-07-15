import { useEffect, useRef, useState } from 'react';
import { DASHBOARD_HTML } from './dashboard.markup.js';
import { bootstrapDashboard } from './lib/bootstrap.js';

// Skeleton shown while the dataset loads from the backend (the /api/data fetch can be several MB).
// It roughly mirrors the dashboard layout — header, KPI row, charts, and a table — with a shimmer.
function DashboardSkeleton() {
  return (
    <div id="appSkeleton" aria-hidden="true">
      <div className="sk sk-title" />
      <div className="sk sk-subtitle" />
      <div className="sk-kpis">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="sk sk-kpi" key={i} />
        ))}
      </div>
      <div className="sk-charts">
        <div className="sk sk-chart-lg" />
        <div className="sk sk-chart-sm" />
        <div className="sk sk-chart-sm" />
      </div>
      <div className="sk sk-tablebar" />
      <div className="sk-table">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="sk sk-trow" key={i} />
        ))}
      </div>
      <div className="sk-note">Loading your data from the database…</div>
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
