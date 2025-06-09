-- PostgreSQL initialization script for AkemisFlow
-- This script runs when the container is first created

-- Ensure UTF-8 encoding
SET client_encoding = 'UTF8';

-- Create extensions that we might need
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create additional databases if needed
-- CREATE DATABASE akemisflow_test;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE akemisflow_dev TO akemisflow;

-- Log successful initialization
SELECT 'AkemisFlow PostgreSQL database initialized successfully' AS status;