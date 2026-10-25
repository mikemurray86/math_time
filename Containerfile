# ---- build the web client ----
FROM docker.io/library/node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

# ---- runtime: Node runs the TypeScript server directly (type stripping) ----
FROM docker.io/library/node:24-slim
ENV NODE_ENV=production \
    PORT=8080 \
    DB_PATH=/data/math.db
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src/server ./src/server
COPY src/shared ./src/shared
COPY --from=build /app/dist ./dist
# /data is a volume; the NFS export squashes every user to one UID, so never chown at runtime.
RUN mkdir -p /data && chown node:node /data
USER 1000:1000
EXPOSE 8080
VOLUME /data
CMD ["node", "src/server/index.ts"]
