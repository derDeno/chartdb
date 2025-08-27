FROM node:22-alpine AS builder

ARG VITE_OPENAI_API_KEY
ARG VITE_OPENAI_API_ENDPOINT
ARG VITE_LLM_MODEL_NAME
ARG VITE_HIDE_CHARTDB_CLOUD
ARG VITE_DISABLE_ANALYTICS
ARG VITE_USE_VOLUME_STORAGE

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN echo "VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY}" > .env && \
    echo "VITE_OPENAI_API_ENDPOINT=${VITE_OPENAI_API_ENDPOINT}" >> .env && \
    echo "VITE_LLM_MODEL_NAME=${VITE_LLM_MODEL_NAME}" >> .env && \
    echo "VITE_HIDE_CHARTDB_CLOUD=${VITE_HIDE_CHARTDB_CLOUD}" >> .env && \
    echo "VITE_DISABLE_ANALYTICS=${VITE_DISABLE_ANALYTICS}" >> .env && \
    echo "VITE_USE_VOLUME_STORAGE=${VITE_USE_VOLUME_STORAGE}" >> .env

RUN npm run build

FROM node:22-alpine AS production

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV DIAGRAMS_PATH=/data

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json /usr/src/app/package-lock.json ./
COPY server.js ./

RUN npm ci --omit=dev

VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
