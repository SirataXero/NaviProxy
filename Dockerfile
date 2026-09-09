# Multi-stage Docker build for NaviProxy (Navidrome Music Proxy)

# Stage 0: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 1: Build binary using official Go compiler
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build tools and certificates
RUN apk add --no-cache git ca-certificates tzdata

# Copy Go module manifest and source tree
COPY go-service/go.mod go-service/go.sum* ./
COPY go-service/ ./

# Generate and verify go.sum checksums inside the container
RUN go mod tidy

# Build statically-linked binary (pure Go, CGO disabled for maximum portability)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/naviproxy ./cmd/server/main.go

# Stage 2: Minimal runtime image with ffmpeg and ca-certificates
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata ffmpeg curl

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/naviproxy /app/naviproxy
# Copy frontend static files from frontend-builder stage
COPY --from=frontend-builder /app/dist /app/public

# Create directories for configuration, cache and downloaded music
RUN mkdir -p /app/data /music/downloads /music/navidrome_library

# Environment variables
ENV PORT=8080 \
    LOG_LEVEL=normal \
    CONFIG_PATH=/app/data/config \
    DOWNLOAD_FOLDER=/music/downloads \
    GIN_MODE=release

# Expose HTTP port
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/naviproxy"]
