# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS client-builder
WORKDIR /app/client
COPY client/package.json client/yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile
COPY client/ ./
RUN yarn build

FROM python:3.11-slim AS data-builder
WORKDIR /app
ENV PIP_NO_CACHE_DIR=1
COPY scripts/ ./scripts/
COPY data/*.pdf ./data/
RUN pip install --no-cache-dir pdfplumber \
  && python scripts/extract.py \
  && python scripts/extract_float.py

FROM golang:1.25.5-bookworm AS server-builder
WORKDIR /app
COPY server/go.mod server/go.sum ./server/
RUN cd server && go mod download
COPY server/ ./server/
RUN cd server && CGO_ENABLED=1 GOOS=linux go build -o /app/server .

FROM debian:bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=server-builder /app/server /app/server
COPY --from=client-builder /app/client/dist /app/client/dist
COPY --from=data-builder /app/data/ownership.db /app/data/ownership.db
EXPOSE 8080
CMD ["/app/server", "-addr", ":8080", "-db", "/app/data/ownership.db", "-client", "/app/client/dist"]
