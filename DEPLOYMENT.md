# Deployment guide (for the developer)

This is a **MERN** app (MongoDB · Express · React · Node). The Express server
serves both the JSON API and the built React client, so in production you run a
**single Node process on one port** (default `4000`) behind a reverse proxy.

> Handed off by the client. UI + features are a faithful port of an existing
> single-file dashboard; please don't change behavior. Everything below is about
> hosting, not code changes.

---

## 1. What's in the box

```
inventory-mern/
├── server/            Express API + Mongoose models
│   ├── index.js           entry; connects Mongo, auto-seeds, serves client/dist
│   ├── routes/            data · state · ai (Anthropic proxy) · sheets (proxy)
│   ├── models/            Dataset (the inventory data) + State (UI persistence)
│   ├── seed/dataset.json  the inventory dataset (~1.8 MB) → loaded into MongoDB
│   └── lib/               db connect + seed helper
├── client/            Vite + React frontend (build output → client/dist)
├── Dockerfile         optional containerized build
├── docker-compose.yml optional: app + MongoDB in one command
└── README.md          local dev instructions
```

## 2. Requirements

- **Node.js 18+** (uses global `fetch`)
- **A MongoDB database.** Use **MongoDB Atlas** (free M0 tier is fine) or any
  reachable MongoDB. *Do not rely on the in-memory dev database* — that's only a
  local convenience and requires downloading a `mongod` binary at runtime.

## 3. Environment variables

Create `server/.env` (copy from `server/.env.example`):

```
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/inventory_intelligence
PORT=4000
# Optional: only needed if you want the in-app AI chat to work without each user
# pasting their own Anthropic key. Leave blank otherwise.
ANTHROPIC_API_KEY=
```

When `MONGODB_URI` is set, the in-memory fallback is skipped. On first boot the
server **auto-seeds** the dataset into the database if it's empty (you can also
run `npm run seed` explicitly).

## 4. Build & run (generic, any Node host)

```bash
# from the project root
cd client && npm install && npm run build      # produces client/dist
cd ../server && npm install --omit=optional     # skip the dev-only in-memory DB
npm start                                        # serves API + client on :PORT
```

Open `http://SERVER_IP:4000` to verify. The React app is served by Express, and
its `/api/*` calls hit the same origin — no separate frontend host needed.

## 5. Hosting on Hostinger

MERN needs a **Node.js runtime**, so use a **Hostinger VPS** (or their Node.js
app hosting). Plain shared/static hosting will not run the server.

### a. Database

Create a free **MongoDB Atlas** cluster, add a database user, and under *Network
Access* allow the VPS IP (or `0.0.0.0/0` to start). Copy the connection string
into `MONGODB_URI`.

### b. Get the code on the VPS

Upload this folder (SFTP) or `git clone` it, then:

```bash
cd inventory-mern
cd client && npm install && npm run build
cd ../server && npm install --omit=optional
# create server/.env with MONGODB_URI, PORT=4000, (optional ANTHROPIC_API_KEY)
```

### c. Keep it running with PM2

```bash
npm install -g pm2
pm2 start index.js --name inventory --cwd /path/to/inventory-mern/server
pm2 save && pm2 startup        # restart on reboot
```

### d. Put it behind the domain (Nginx reverse proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then issue HTTPS with `certbot --nginx -d your-domain.com`.

## 6. Hosting with Docker (alternative, any VPS)

A `Dockerfile` and `docker-compose.yml` are included. To run app + MongoDB
together:

```bash
docker compose up -d --build
```

This serves the app on port `4000` and stores Mongo data in a named volume. To
use Atlas instead of the bundled Mongo, set `MONGODB_URI` in the `app` service
and remove the `mongo` service.

## 7. Notes / gotchas

- **One port.** The server serves `client/dist`; there's no separate React dev
  server in production. Rebuild the client (`npm run build`) whenever frontend
  code changes.
- **Seeding.** Auto-seeds on first boot if the DB is empty. Safe to re-run
  `npm run seed` (it upserts).
- **AI & Google Sheets.** These features call out through the backend:
  Anthropic via `/api/ai/messages` (needs an API key — per-user via the in-app
  gear, or the server-wide `ANTHROPIC_API_KEY`), and Google Sheets via
  `/api/sheets/proxy`. Outbound HTTPS must be allowed from the server.
- **CORS.** Same-origin in production (one server), so no CORS config needed.
- **`node_modules` / `dist` are intentionally not shipped** — run `npm install`
  and `npm run build` on the host.
```
