# Docker Setup for CreditorFlow

## Quick Start

```bash
# Start all services
cd docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |
| minio | 9000/9001 | S3-compatible storage |
| app | 3000 | Next.js application |

## Environment Variables

Copy `.env.docker` to `.env` if running the app separately:

```bash
cp .env.docker ../.env
```

## Database Setup

Run migrations after starting:

```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

## Troubleshooting

### Empty container
Make sure the build was successful first:
```bash
npm run build
docker-compose build app
```

### Connection refused
Check that all services are running:
```bash
docker-compose ps
```
