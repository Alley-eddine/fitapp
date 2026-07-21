# Postgres image with the schema baked in, so the DB initializes without
# depending on a host bind mount (Coolify does not keep repo files at runtime).
# init-db.sql runs automatically on first boot (empty data volume only).
# Build context is the monorepo root: docker build -f services/postgres/Dockerfile .
FROM postgres:16-alpine
COPY scripts/init-db.sql /docker-entrypoint-initdb.d/init-db.sql
