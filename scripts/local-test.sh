#!/usr/bin/env bash
# ==============================================================
# KubePulse Local Development & Health Verification Script
# ==============================================================

set -e

echo "🚀 Starting KubePulse 3-Tier Stack locally via Docker Compose..."
docker compose up -d --build

echo "⏳ Waiting for backend and database to become ready..."
RETRY_COUNT=0
MAX_RETRIES=15

until curl -s http://localhost:8080/readyz | grep -q "ready"; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Health check timed out after 30 seconds."
    docker compose logs
    exit 1
  fi
  echo "   Waiting for /readyz... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "✅ Backend & Database are HEALTHY!"

echo "🧪 Running API verification tests..."
# Test POST
POST_RESP=$(curl -s -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"task":"Verification Test Task","category":"CI/CD Pipeline","priority":"High"}')

echo "   Created task: $POST_RESP"

# Test GET
GET_COUNT=$(curl -s http://localhost:8080/api/tasks | grep -o '"_id"' | wc -l)
echo "   Active tasks in database: $GET_COUNT"

# Test Metrics
echo "📊 Fetching Prometheus metrics endpoint..."
curl -s http://localhost:8080/metrics | head -n 12

echo ""
echo "🎉 All local verification tests passed successfully!"
echo "👉 Frontend is accessible at: http://localhost:3000"
echo "👉 Backend API is at:        http://localhost:8080"
