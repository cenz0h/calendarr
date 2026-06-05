# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /app
# better-sqlite3 builds a native addon during npm ci.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app

# OCI metadata (shows on Docker Hub, `docker inspect`, etc.)
LABEL org.opencontainers.image.title="Calendarr" \
      org.opencontainers.image.description="Publish Sonarr and Radarr calendars to Discord on a schedule or on demand." \
      org.opencontainers.image.licenses="MIT"

# Unraid Docker manager: populates the "WebUI" entry in the container action menu.
# [IP] and [PORT:3000] are substituted by Unraid using the container's host port mapping.
# Add net.unraid.docker.icon="<url-to-png-or-svg>" alongside this if you want a custom icon.
LABEL net.unraid.docker.webui="http://[IP]:[PORT:3000]/"

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TZ=Australia/Melbourne \
    CALENDARR_DB_PATH=/config/calendarr.db
RUN mkdir -p /config && chown node:node /config
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "build"]
