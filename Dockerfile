# Builds the client and runs the Express server (which serves the built client).
FROM node:20-alpine

WORKDIR /app

# Install server deps
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=optional

# Install client deps + build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install
COPY client ./client
RUN cd client && npm run build

# Copy server source (includes seed/dataset.json)
COPY server ./server

ENV PORT=4000
EXPOSE 4000

# MONGODB_URI is provided by docker-compose (the mongo service).
CMD ["node", "server/index.js"]
