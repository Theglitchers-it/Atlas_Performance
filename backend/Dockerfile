# =============================================================================
# Atlas Backend — Production Dockerfile (Multi-stage)
# =============================================================================
# Build context: root del progetto (per accesso a database/)
# Usage: docker build -f backend/Dockerfile .
# =============================================================================

# Stage 1: Build — installa dipendenze con build tools per sharp
FROM node:22-alpine AS builder

RUN apk add --no-cache vips-dev python3 make g++

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm install -g pm2

# Stage 2: Runtime — immagine finale pulita
FROM node:22-alpine

# Solo libreria runtime vips (no headers/dev files)
RUN apk add --no-cache vips

WORKDIR /app

# Copia node_modules e pm2 dal builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /usr/local/lib/node_modules/pm2 /usr/local/lib/node_modules/pm2
COPY --from=builder /usr/local/bin/pm2 /usr/local/bin/pm2
COPY --from=builder /usr/local/bin/pm2-runtime /usr/local/bin/pm2-runtime

# Copia sorgenti backend
COPY backend/src/ ./src/
COPY backend/database/ ./database/
COPY backend/pm2.config.js ./

# Copia schema database (migrate.js usa path.resolve(__dirname, '../../database/schema.sql'))
COPY database/ /database/

# Crea directory per upload e logs, utente non-root
RUN mkdir -p /app/uploads /app/logs \
    && addgroup -S atlas && adduser -S atlas -G atlas \
    && chown -R atlas:atlas /app /database

USER atlas

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["pm2-runtime", "pm2.config.js", "--env", "production"]
