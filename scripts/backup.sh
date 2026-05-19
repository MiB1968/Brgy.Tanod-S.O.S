#!/bin/bash
# =============================================
# Brgy.Tanod-S.O.S Backup Script
# =============================================

BACKUP_DIR="/backups/brgy-tanod/$(date +%Y-%m-%d_%H-%M)"
mkdir -p "$BACKUP_DIR"
LOG_FILE="/var/log/brgy-backup.log"

echo "=== Backup started at $(date) ===" | tee -a $LOG_FILE

# Volumes to backup
VOLUMES=("qwenpaw-data" "qwenpaw-secrets" "qwenpaw-backups")

for VOLUME in "${VOLUMES[@]}"; do
    echo "Backing up $VOLUME..." | tee -a $LOG_FILE
    docker run --rm \
      -v $VOLUME:/source:ro \
      -v $BACKUP_DIR:/backup \
      alpine:latest \
      tar czf "/backup/$VOLUME.tar.gz" -C /source . 2>> $LOG_FILE
    
    if [ $? -eq 0 ]; then
        echo "✅ $VOLUME backed up successfully" | tee -a $LOG_FILE
    else
        echo "❌ Failed to backup $VOLUME" | tee -a $LOG_FILE
    fi
done

# Backup Firebase (optional but recommended)
echo "Backing up important files..." | tee -a $LOG_FILE
cp /path/to/your/project/firebase-service-account.json "$BACKUP_DIR/" 2>/dev/null || true
cp /path/to/your/project/docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true

# Keep only last 14 days of backups
find /backups/brgy-tanod -type d -mtime +14 -exec rm -rf {} + 2>/dev/null || true

echo "=== Backup completed at $(date) ===" | tee -a $LOG_FILE
echo "Backup location: $BACKUP_DIR" | tee -a $LOG_FILE
