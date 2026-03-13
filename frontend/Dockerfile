# =============================================================================
# Atlas Frontend — Multi-stage Production Dockerfile
# =============================================================================

# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Build args per configurazione API URLs
ARG VITE_API_URL
ARG VITE_SOCKET_URL

RUN npm run build

# Stage 2: Serve con nginx
FROM nginx:1.27-alpine

# Rimuovi config default
RUN rm /etc/nginx/conf.d/default.conf

# Copia config nginx per Docker
COPY nginx/docker.conf /etc/nginx/conf.d/atlas.conf

# Copia build output
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
