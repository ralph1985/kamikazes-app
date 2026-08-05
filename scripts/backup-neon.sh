#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${KAMIKAZES_NEON_BACKUP_DIR:-$REPO_ROOT/var/backups/neon}"
LOG_DIR="${KAMIKAZES_NEON_LOG_DIR:-$REPO_ROOT/var/log}"
RETENTION_DAYS="${KAMIKAZES_NEON_BACKUP_RETENTION_DAYS:-14}"
ENV_FILE="${KAMIKAZES_DATABASE_BACKUP_ENV_FILE:-$HOME/.config/kamikazes/neon-backup.env}"

STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
ARCHIVE_NAME="kamikazes-neon-${STAMP}.dump"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"

count_retained_backups() {
  find "$BACKUP_DIR" -type f -name "kamikazes-neon-*.dump" | wc -l | tr -d " "
}

main() {
  mkdir -p "$BACKUP_DIR" "$LOG_DIR"
  if [[ ! -r "$ENV_FILE" ]]; then
    printf "Backup failed at %s: missing private environment file %s\n" "$STARTED_AT" "$ENV_FILE" >&2
    return 1
  fi

  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  local database_url="${POSTGRES_URL_NON_POOLING:-${DATABASE_URL:-}}"
  if [[ -z "$database_url" ]]; then
    printf "Backup failed at %s: POSTGRES_URL_NON_POOLING or DATABASE_URL is missing\n" "$STARTED_AT" >&2
    return 1
  fi

  if pg_dump --format=custom --no-owner --no-privileges --file="$ARCHIVE_PATH.tmp" "$database_url"; then
    mv "$ARCHIVE_PATH.tmp" "$ARCHIVE_PATH"
    find "$BACKUP_DIR" -type f -name "kamikazes-neon-*.dump" -mtime +"$RETENTION_DAYS" -delete
    local size sha256 retained
    size="$(stat -c "%s" "$ARCHIVE_PATH")"
    sha256="$(sha256sum "$ARCHIVE_PATH" | awk '{print $1}')"
    retained="$(count_retained_backups)"
    printf "Backup created: %s size=%s sha256=%s retained=%s\n" "$ARCHIVE_PATH" "$size" "$sha256" "$retained"
    return 0
  fi

  rm -f "$ARCHIVE_PATH.tmp"
  printf "Backup failed at %s: pg_dump failed\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >&2
  return 1
}

main "$@"
