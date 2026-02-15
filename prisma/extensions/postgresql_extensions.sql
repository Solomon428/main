-- PostgreSQL Extensions for Creditor Flow
-- Run: psql -U postgres -d creditorflow_dev -f prisma/extensions/postgresql_extensions.sql

-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

-- Enable uuid-ossp for UUID generation (alternative to cuid)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

COMMENT ON EXTENSION pg_trgm IS 'Support for similarity of text using trigram matching';
COMMENT ON EXTENSION btree_gist IS 'Support for indexing common datatypes in GiST';
