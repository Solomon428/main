# CreditorFlow Deployment Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

## Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd creditorflow
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Configure database**
   ```bash
   # Update DATABASE_URL in .env
   DATABASE_URL="postgresql://user:password@localhost:5432/creditorflow"
   ```

## Docker Deployment

### Development

```bash
# Start infrastructure services
docker-compose -f docker/docker-compose.yml up -d

# Run migrations
./scripts/prisma/migrate-dev.sh

# Start development server
npm run dev
```

### Production

```bash
# Build production image
docker build -f docker/Dockerfile -t creditorflow:latest .

# Run with docker-compose
docker-compose -f docker/docker-compose.yml up -d

# Deploy migrations
./scripts/prisma/migrate-deploy.sh
```

## Manual Deployment

### 1. Database Setup

```bash
# Create database
createdb creditorflow_production

# Run migrations
npx prisma migrate deploy
```

### 2. Build Application

```bash
# Install dependencies
npm ci --production

# Generate Prisma client
npx prisma generate

# Build Next.js app
npm run build
```

### 3. Start Services

```bash
# Start with PM2
pm2 start npm --name "creditorflow" -- start

# Or use Node directly
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| DIRECT_URL | Yes | Direct database URL for migrations |
| NEXTAUTH_SECRET | Yes | Secret for JWT signing |
| NEXTAUTH_URL | Yes | Application URL |
| ENCRYPTION_KEY | Yes | Key for data encryption |
| REDIS_URL | No | Redis connection (default: localhost) |
| SMTP_HOST | No | Email server host |
| STORAGE_PROVIDER | No | File storage (LOCAL/S3/AZURE) |

## Health Checks

```bash
# Check API health
curl http://localhost:3000/api/health

# Database connection
./scripts/ops/healthcheck.sh
```

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Ensure database exists

### Build Failures
- Clear `.next` directory
- Delete `node_modules` and reinstall
- Check TypeScript errors: `npm run typecheck`

### Migration Issues
- Reset database: `npx prisma migrate reset`
- Check migration status: `npx prisma migrate status`
