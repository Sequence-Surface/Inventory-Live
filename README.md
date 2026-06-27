# Inventory Intelligence — MERN edition

A faithful MERN (MongoDB · Express · React · Node) conversion of the original
single-file `Inventory_Dashboard.html`. **Every feature and the entire UI are
preserved unchanged.** The dataset that used to be hard-coded inline now lives in
MongoDB, and the Anthropic AI + Google Sheets calls are routed through the
Express backend.

```
inventory-mern/
├── server/          Express API + MongoDB (Mongoose)
│   ├── index.js          app entry, mounts routes, serves built client
│   ├── lib/db.js         Mongo connection
│   ├── models/           Dataset (the original `D`) + State (localStorage mirror)
│   ├── routes/           data · state · ai (Anthropic proxy) · sheets (proxy)
│   └── seed/             dataset.json + seed.js  (loads data into MongoDB)
└── client/          Vite + React frontend
    └── src/
        ├── App.jsx              renders the exact markup, boots the dashboard
        ├── lib/bootstrap.js     loads data from API, mirrors localStorage→Mongo
        ├── dashboard.markup.js  the original <body> markup, verbatim
        ├── dashboard.app.js     the original ~5,000-line JS logic, verbatim*
        └── styles/dashboard.css the original CSS, verbatim
```
\* The only edits to the JS vs. the original: `D` is read from `window.__DATA__`
(fetched from MongoDB) instead of an inline const, and the two `fetch()` calls
(Anthropic, Google Sheets) point at the backend proxy. Nothing else changed.

## Prerequisites

- Node.js 18+ (the AI proxy uses the built-in `fetch`)
- **No database to install** — by default the server starts a zero-setup
  in-memory MongoDB and auto-seeds it. (Set `MONGODB_URI` to use a real,
  persistent MongoDB instead.)

## Quickest way to test it (one command)

From the project root:

```bash
npm run go
```

This installs both apps, builds the client, starts an in-memory MongoDB,
auto-seeds the data, and serves everything from one server. Then open:

**http://localhost:4000**

That's it — no MongoDB install, no `.env`, no seeding step.

## Dev mode (hot reload, two terminals)

```bash
# terminal 1 — API + in-memory Mongo, auto-seeded
cd server && npm install && npm run dev      # http://localhost:4000

# terminal 2 — Vite dev server (proxies /api to :4000)
cd client && npm install && npm run dev      # http://localhost:5173
```

Open http://localhost:5173.

## Using a real (persistent) MongoDB

Set a connection string and the in-memory fallback is skipped:

```bash
cd server
cp .env.example .env          # set MONGODB_URI=mongodb://127.0.0.1:27017/inventory_intelligence
npm run seed                  # optional; the server also auto-seeds on boot
npm start
```

## How the pieces map to the original

| Original | MERN version |
| --- | --- |
| `const D = {…}` inline (1.4 MB) | `Dataset` collection in MongoDB, served by `GET /api/data` |
| `localStorage` edits/overrides | mirrored to the `State` collection (`/api/state`); localStorage still used in-session |
| `fetch('https://api.anthropic.com/…')` | `POST /api/ai/messages` proxy (key still set via the in-app gear, or `ANTHROPIC_API_KEY` in `.env`) |
| Google Sheets `fetch(exportUrl)` | `GET /api/sheets/proxy?url=…` (avoids browser CORS) |
| Chart.js / SheetJS via CDN `<script>` | npm `chart.js` / `xlsx`, exposed as `window.Chart` / `window.XLSX` |

## AI feature note

The original stored the Anthropic key in the browser and called the API
directly. Here the key is still entered via the AI Settings gear and sent with
each request, but the call goes through the backend proxy (so the
`anthropic-dangerous-direct-browser-access` header is no longer needed). You can
alternatively set a server-side `ANTHROPIC_API_KEY` in `server/.env` as a
fallback.
