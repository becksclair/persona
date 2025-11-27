-- Create test database for automated tests
CREATE DATABASE persona_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE persona_test TO persona;

-- Enable pgvector extension on both databases
\c persona_dev
CREATE EXTENSION IF NOT EXISTS vector;

\c persona_test
CREATE EXTENSION IF NOT EXISTS vector;
