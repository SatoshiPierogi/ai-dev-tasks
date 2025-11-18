-- Migration: 001_initial_schema
-- Description: Create initial database schema for Agent Audit Dashboard MVP
-- Date: 2025-01-18
-- Author: Claude Code AI

-- This migration should be run by reading the schema.sql file
-- In a production environment, use a migration tool like Flyway or db-migrate

-- For MVP: Run this entire migration as a single transaction
BEGIN TRANSACTION;

-- Import the main schema
-- Note: In actual implementation, you would run:
-- psql -h localhost -U postgres agent_audit_dashboard < backend/src/db/schema.sql

-- For testing purposes, create a simple initialization:
-- The schema.sql file contains all the table definitions
-- Run it with: psql -f backend/src/db/schema.sql

COMMIT;
