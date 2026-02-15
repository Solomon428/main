#!/bin/bash
# Migrate database for development

echo "Running Prisma migrations for development..."

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev "$@"

echo "Migrations complete!"
