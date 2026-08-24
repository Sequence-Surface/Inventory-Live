# Inventory Intelligence — MERN edition

A full-stack inventory dashboard: React (Vite) frontend, Express API, MongoDB
storage. Upload your ERP exports (Product Master, Stock, Sales & Purchase
history) and get reorder planning, ABC classification, demand analysis, vendor
rollups, zone browsing, Excel exports, and an AI analyst.

```
inventory-mern/
├── server/          Express API + MongoDB (Mongoose)
│   ├── index.js          app entry, mounts routes, serves built client
│   ├── lib/db.js         Mongo connection (Atlas or zero-setup in-memory)
│   ├── lib/viewBuilder.js  builds the dashboard dataset view from collections
│   ├── lib/merge.js      upsert merge logic for master / history / stock
│   ├── lib/migrate.js    one-time legacy-blob → collections migration
│   ├── models/           Product · MonthlyHistory · StockSnapshot · Upload · State
│   └── routes/           data · uploads · state · ai (Anthropic proxy) · sheets (proxy)
└── client/          Vite + React frontend
    └── src/
        ├── App.jsx              mounting shell + loading skeleton
        ├── lib/bootstrap.js     loads data, MongoDB-backed localStorage shim
        ├── lib/nav.js           sidebar navigation (hash-routed pages)
        ├── dashboard.markup.js  app shell: sidebar · topbar · pages
        ├── dashboard.app.js     dashboard logic (parsers, analytics, renders)
        └── styles/              dashboard.css + shell.css (sidebar/pages layout)
```

## How data is stored

Everything lives in MongoDB in proper collections — **nothing is ever lost**:

| Collection | Contents |
| --- | --- |
| `products` | One doc per parent product (code, vendor, category, children, launch date, current stock). Products missing from a newer master are **delisted, never deleted**. |
| `monthlyhistories` | One doc per product **per calendar month** (`ym: "2026-01"`), sales and purchases kept independently. **Unbounded** — the dashboard's 24-month window is just a view; older months stay in the DB forever. |
| `stocksnapshots` | Append-only audit trail: every stock upload is timestamped. Products carry the latest values. |
| `uploads` | Audit log of every upload/sync/migration/reset: file, type, source, row counts, months covered. Shown on the **Data & Uploads** page. |
| `states` | UI preferences and edits (theme, reorder edits, zones, AI settings) via the localStorage shim. |

### Monthly workflow

Upload next month's data **either way — both merge safely**:

- **Full re-export**: every (product, month) pair is upserted — matching months
  are updated, everything else is untouched.
- **Only the new month**: the new month is added; all stored history is kept.
  The 24-month window slides forward automatically (it always ends at the
  newest month present in your data).

The window, "Data through" indicator, and all date math derive from your real
uploaded dates — there are no hard-coded report dates.

## API

- `GET /api/data` — the dashboard dataset (24-month window view built from the collections)
- `POST /api/uploads/master|history|stock` — merge parsed upload rows; returns counts + fresh view
- `GET /api/uploads` — upload audit log · `GET /api/uploads/history/:parentCode` — full unbounded series
- `GET /api/uploads/stock-snapshots` — stock audit trail
- `POST /api/data/reset` — wipe all data ("Start fresh")
- `POST /api/ai/messages` — Anthropic API streaming proxy · `GET /api/sheets/proxy` — Google Sheets CORS proxy

## Prerequisites

- Node.js 18+
- **No database to install** — by default the server starts a zero-setup
  in-memory MongoDB. (Set `MONGODB_URI` to use a real, persistent MongoDB.)

## Quickest way to test it (one command)

From the project root:

```bash
npm run go
```

Then open **http://localhost:4000**.

## Dev mode (hot reload, two terminals)

```bash
# terminal 1 — API (+ in-memory Mongo if no MONGODB_URI)
cd server && npm install && npm run dev

# terminal 2 — Vite dev server (proxies /api — port must match server/.env PORT)
cd client && npm install && npm run dev      # http://localhost:5173
```

Note: `client/vite.config.js` proxies `/api` to the port in `server/.env`
(`PORT=4002` by default in dev). Keep the two in sync.

## Using a real (persistent) MongoDB

```bash
cd server
cp .env.example .env          # set MONGODB_URI=mongodb://127.0.0.1:27017/inventory_intelligence
npm start
```

On first boot against a database that still holds the old single-blob dataset,
the server **automatically migrates** it into the new collections (idempotent;
the old blob is kept as a read-only backup).

## AI feature note

The Anthropic key is entered via the AI Settings gear (bottom-right) and sent
with each request through the backend proxy. You can alternatively set a
server-side `ANTHROPIC_API_KEY` in `server/.env` as a fallback.
