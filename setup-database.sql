-- CreditorFlow Database Setup Script
-- File: setup-database.sql

-- Create user
CREATE USER creditorflow WITH 
  PASSWORD 'creditorflow123'
  CREATEDB
  LOGIN;

-- Create database
CREATE DATABASE creditorflow 
  WITH OWNER = creditorflow
       ENCODING = 'UTF8'
       LC_COLLATE = 'en_US.UTF-8'
       LC_CTYPE = 'en_US.UTF-8'
       TABLESPACE = pg_default
       CONNECTION LIMIT = -1;

-- Connect to database
\\c creditorflow

-- Grant privileges
GRANT ALL ON SCHEMA public TO creditorflow;
GRANT ALL ON ALL TABLES IN SCHEMA public TO creditorflow;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO creditorflow;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO creditorflow;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Verify setup
SELECT current_database() AS database, current_user AS user, version() AS pg_version;
