#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${KAMIKAZES_NEON_LOG_DIR:-$REPO_ROOT/var/log}"
ENV_FILE="${KAMIKAZES_DATABASE_BACKUP_ENV_FILE:-$HOME/.config/kamikazes/neon-backup.env}"
SCHEDULE="${KAMIKAZES_NEON_BACKUP_CRON_SCHEDULE:-0 */6 * * *}"
BEGIN_MARKER="# BEGIN Kamikazes Neon backup"
END_MARKER="# END Kamikazes Neon backup"
NODE_DIR="$(dirname "$(command -v node)")"
PG_BIN="$(dirname "$(command -v pg_dump)")"
SYSTEM_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
CRON_PATH="${KAMIKAZES_NEON_BACKUP_CRON_PATH:-$NODE_DIR:$PG_BIN:$SYSTEM_PATH}"
TEMP_CRON="$(mktemp)"

if [[ ! -r "$ENV_FILE" ]]; then
  printf "No se instala el cron: falta el fichero privado %s\n" "$ENV_FILE" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"
{
  crontab -l 2>/dev/null | sed "/$BEGIN_MARKER/,/$END_MARKER/d" || true
  printf "%s\n" "$BEGIN_MARKER"
  printf "PATH=%s\n" "$CRON_PATH"
  printf "%s %s\n" "$SCHEDULE" "KAMIKAZES_DATABASE_BACKUP_ENV_FILE=$ENV_FILE $REPO_ROOT/scripts/backup-neon.sh >> $LOG_DIR/neon-backup.log 2>&1"
  printf "%s\n" "$END_MARKER"
} > "$TEMP_CRON"

crontab "$TEMP_CRON"
rm -f "$TEMP_CRON"
printf "Installed Kamikazes Neon backup cron: %s\n" "$SCHEDULE"
