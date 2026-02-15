# Backup and Restore Procedures

## Database Backup

### Automated Backups

```bash
# Daily backup (configure in crontab)
0 2 * * * /path/to/creditorflow/scripts/prisma/backup.sh
```

### Manual Backup

```bash
# Create backup
pg_dump -h localhost -U postgres -d creditorflow > backup_$(date +%Y%m%d).sql

# With compression
pg_dump -h localhost -U postgres -d creditorflow | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Docker Backup

```bash
# Backup from Docker container
docker exec creditorflow-postgres pg_dump -U postgres creditorflow > backup.sql
```

## Database Restore

### From SQL File

```bash
# Drop and recreate database
dropdb creditorflow
createdb creditorflow

# Restore from backup
psql -h localhost -U postgres -d creditorflow < backup_20240101.sql
```

### From Compressed Backup

```bash
# Decompress and restore
gunzip < backup_20240101.sql.gz | psql -h localhost -U postgres -d creditorflow
```

### Docker Restore

```bash
# Copy backup to container
docker cp backup.sql creditorflow-postgres:/tmp/

# Restore
docker exec creditorflow-postgres psql -U postgres -d creditorflow -f /tmp/backup.sql
```

## File Storage Backup

### Local Storage

```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz ./uploads
```

### S3/Cloud Storage

```bash
# Sync to backup bucket
aws s3 sync s3://creditorflow-uploads s3://creditorflow-backups/uploads
```

## Disaster Recovery

### Full System Restore

1. **Restore Database**
   ```bash
   # Stop application
   pm2 stop creditorflow

   # Restore database
   dropdb creditorflow && createdb creditorflow
   psql -h localhost -U postgres -d creditorflow < backup.sql

   # Run pending migrations
   npx prisma migrate deploy
   ```

2. **Restore Files**
   ```bash
   # Extract uploads backup
   tar -xzf uploads_backup_20240101.tar.gz
   ```

3. **Restart Application**
   ```bash
   pm2 start creditorflow
   ```

## Backup Retention

| Backup Type | Frequency | Retention |
|------------|-----------|-----------|
| Full Database | Daily | 30 days |
| Weekly Archive | Weekly | 90 days |
| Monthly Archive | Monthly | 1 year |
| Yearly Archive | Yearly | 7 years |

## Verification

```bash
# Verify backup integrity
pg_restore --list backup.sql

# Test restore to temporary database
createdb test_restore
pg_restore -d test_restore backup.sql
```
