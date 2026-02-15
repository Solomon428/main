#!/bin/bash
# Health check script

API_URL="${API_URL:-http://localhost:3000}"

echo "Checking health at $API_URL..."

response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")

if [ "$response" = "200" ]; then
    echo "✅ Health check passed"
    exit 0
else
    echo "❌ Health check failed (HTTP $response)"
    exit 1
fi
