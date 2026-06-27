import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/dashboard.css';

// NOTE: intentionally NOT wrapped in <React.StrictMode>. StrictMode double-
// invokes effects in development, which would run the imperative dashboard
// bootstrap twice. A single mount keeps behavior identical to the original page.
createRoot(document.getElementById('root')).render(<App />);
