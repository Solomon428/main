-- Verify PostgreSQL extensions
SELECT * FROM pg_extension WHERE extname IN ('pg_trgm', 'btree_gist');
