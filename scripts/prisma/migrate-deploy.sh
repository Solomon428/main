#!/bin/bash
# Deploy migrations for production

echo "Deploying Prisma migrations..."

# Generate Prisma client
npx prisma generate

# Deploy migrations (no prompts)
npx prisma migrate deploy

echo "Migrations deployed!"
