# Multi-stage Docker build for NaviProxy (Navidrome Music Proxy)
# Stage 1: Build binary using official Go compiler
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build tools and SQLite dev libraries
RUN apk add --no-cache git gcc musl-dev

# Copy Go module manifests and download dependencies
COPY go-service/go.mod go-service/go.sum* ./
RUN go mod download

# Copy source tree
COPY go-service/ .

# Build statically linked binary
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o /app/naviproxy ./cmd/server/main.go

# Stage 2: Minimal runtime image with ffmpeg and ca-certificates
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata ffmpeg curl

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/naviproxy /app/naviproxy

# Create directories for configuration, cache and downloaded music
RUN mkdir -p /app/data /music/downloads /music/navidrome_library

# Environment variables
ENV PORT=8080 \
    CONFIG_PATH=/app/data/config \
    DOWNLOAD_FOLDER=/music/downloads \
    GIN_MODE=release

# Expose HTTP port
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/naviproxy"]
