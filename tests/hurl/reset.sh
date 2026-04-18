#!/usr/bin/env bash
# Fast per-spec reset for Hurl E2E tests.
# Truncates writable tables and re-applies seed.sql. Target: <200ms.
# For schema/migration changes, use `supabase db reset` instead (~13s).
# Runs psql inside the Supabase postgres container so no host psql install needed.
set -euo pipefail

PROJECT_ID="${SUPABASE_PROJECT_ID:-fundid}"
CONTAINER="supabase_db_${PROJECT_ID}"
SEED_PATH="supabase/seed.sql"

if ! docker exec "$CONTAINER" true 2>/dev/null; then
  echo "error: postgres container '$CONTAINER' not running. Run 'supabase start' first." >&2
  exit 1
fi

docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
truncate
  public.items,
  public.contact_messages,
  public.resolve_attempts,
  public.pet_details,
  public.item_photos,
  public.sightings
restart identity cascade;
SQL

docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SEED_PATH" >/dev/null
