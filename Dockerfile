# --- Builder ---
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ dos2unix
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
ENV npm_config_loglevel=verbose
RUN npm ci --include=dev

COPY . .
# falls CRLF-Probleme:
RUN find . -type f -not -path "./node_modules/*" -exec dos2unix {} +

# Build (Vite liest VITE_* zur Build-Zeit)
ARG VITE_OPENAI_API_KEY
ARG VITE_OPENAI_API_ENDPOINT
ARG VITE_LLM_MODEL_NAME
ARG VITE_HIDE_CHARTDB_CLOUD
ARG VITE_DISABLE_ANALYTICS
ARG VITE_USE_VOLUME_STORAGE
ENV VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY} \
    VITE_OPENAI_API_ENDPOINT=${VITE_OPENAI_API_ENDPOINT} \
    VITE_LLM_MODEL_NAME=${VITE_LLM_MODEL_NAME} \
    VITE_HIDE_CHARTDB_CLOUD=${VITE_HIDE_CHARTDB_CLOUD} \
    VITE_DISABLE_ANALYTICS=${VITE_DISABLE_ANALYTICS} \
    VITE_USE_VOLUME_STORAGE=${VITE_USE_VOLUME_STORAGE}

ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN npm run build

# Prod-Abhängigkeiten übrig lassen
RUN npm prune --omit=dev

# --- Runtime ---
FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production DIAGRAMS_PATH=/data HUSKY=0

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json /usr/src/app/package-lock.json ./
COPY server.js ./

VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
