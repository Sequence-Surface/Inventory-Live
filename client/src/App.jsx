import { useEffect, useRef, useState } from 'react';
import { DASHBOARD_HTML } from './dashboard.markup.js';
import { bootstrapDashboard } from './lib/bootstrap.js';

export default function App() {
  const mountedRef = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Guard against a second invocation (e.g. fast refresh / re-mounts).
    if (mountedRef.current) return;
    mountedRef.current = true;

    bootstrapDashboard().catch((err) => {
      console.error('[App] dashboard bootstrap failed', err);
      setError(err.message || String(err));
    });
  }, []);

  return (
    <>
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
