#!/usr/bin/env bash
# Clickfield Radar - Automated Database Backup Script (Linux/Docker)
# Backs up Postgres (or SQLite) into ./backups with 14-day retention.

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == *"postgres"* ]]; then
    BACKUP_FILE="$BACKUP_DIR/postgres_backup_${TIMESTAMP}.sql"
    echo "[+] Running pg_dump to $BACKUP_FILE"
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
elif [ -f "backend/radar.db" ]; then
    BACKUP_FILE="$BACKUP_DIR/radar_sqlite_${TIMESTAMP}.db"
    cp "backend/radar.db" "$BACKUP_FILE"
    echo "[+] SQLite snapshot created at $BACKUP_FILE"
fi

# 14-day retention cleanup
echo "[+] Pruning backups older than 14 days"
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +14 -delete || true
find "$BACKUP_DIR" -type f -name "*.db" -mtime +14 -delete || true
echo "[+] Backup cycle complete."
