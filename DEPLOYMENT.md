# Deployment Guide

Complete guide for deploying Agent Audit Dashboard to production environments.

## Quick Start

```bash
# Build production image
docker build -t agent-audit:1.0.0 .

# Start production
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
curl https://yourdomain.com/health
```

## Pre-Deployment Checklist

- [ ] All tests pass: `npm test`
- [ ] Type checking passes: `npm run type-check`
- [ ] Code coverage > 85%
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificate obtained
- [ ] Backup strategy in place
- [ ] Monitoring configured

## Server Requirements

### Minimum
- **CPU**: 2 cores (4+ recommended)
- **RAM**: 4 GB (8+ GB recommended)
- **Storage**: 50 GB SSD
- **Bandwidth**: 10 Mbps+

### Software
- Node.js 18+
- PostgreSQL 14+
- Docker 20+ (optional)
- Nginx (for reverse proxy)

## Installation Steps

### 1. Provision Server

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y curl git

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Docker (optional)
sudo apt-get install -y docker.io docker-compose
```

### 2. Setup Database

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE USER agent_audit WITH PASSWORD 'strong-password';
CREATE DATABASE agent_audit OWNER agent_audit;
ALTER DATABASE agent_audit SET timezone='UTC';
