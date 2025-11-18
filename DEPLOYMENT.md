# Deployment Guide

Agent Audit Dashboard MVP - Comprehensive deployment documentation.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Environment Configuration](#environment-configuration)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Staging Deployment](#staging-deployment)
6. [Production Deployment](#production-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Local Development

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd ai-dev-tasks

# Install dependencies
npm run install-all

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development servers
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Mock Server: http://localhost:3002 (optional)

### Development with Docker

```bash
# Build and start containers
docker-compose up -d

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# PgAdmin: http://localhost:5050
# Redis Commander: http://localhost:8081 (use --profile monitoring)

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

### Development Services

#### With Monitoring Tools

```bash
docker-compose --profile monitoring up -d
```

Provides:
- **PgAdmin** (http://localhost:5050) - PostgreSQL management
- **Redis Commander** (http://localhost:8081) - Redis management

#### With Mock Server

```bash
docker-compose --profile testing up -d
```

Provides mock blockchain responses for testing.

---

## Docker Deployment

### Building Images

```bash
# Production backend
docker build -t agent-audit-backend:latest ./backend

# Production frontend
docker build -t agent-audit-frontend:latest ./frontend -f frontend/Dockerfile

# Development versions
docker build -t agent-audit-backend:dev ./backend -f backend/Dockerfile.dev
docker build -t agent-audit-frontend:dev ./frontend -f frontend/Dockerfile.dev
```

### Running Containers

```bash
# Backend
docker run -d \
  --name agent-audit-backend \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e ALCHEMY_API_KEY="..." \
  --restart unless-stopped \
  agent-audit-backend:latest

# Frontend
docker run -d \
  --name agent-audit-frontend \
  -p 80:80 \
  -e REACT_APP_API_URL="https://api.agent-audit.dev" \
  --restart unless-stopped \
  agent-audit-frontend:latest
```

---

## Environment Configuration

### Configuration Files

- `.env` - Runtime environment variables
- `.env.example` - Configuration template
- `config/environment.ts` - TypeScript configuration management

### Environment Variables

Key variables for different environments:

```bash
# Development
NODE_ENV=development
JWT_SECRET=dev_secret_key_not_for_production
CACHE_TTL=1800000

# Staging
NODE_ENV=staging
JWT_SECRET=$(openssl rand -base64 32)
STORAGE_WARNING_GB=10

# Production
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
RATE_LIMIT_MAX_REQUESTS=500
```

### Database Migration

```bash
# In backend directory
npm run db:migrate
npm run db:seed # Optional: seed test data
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

Triggered on push/PR to main, develop, or claude/* branches.

**Jobs:**
- Backend linting (ESLint)
- Backend type checking (TypeScript)
- Backend tests with coverage
- Backend build
- Frontend linting
- Frontend type checking
- Frontend tests with coverage
- Frontend build
- Docker image build
- Test summary

```bash
# Manual trigger
gh workflow run ci.yml
```

#### 2. Deployment Pipeline (`.github/workflows/deploy.yml`)

Automatic deployment after successful CI.

**Targets:**
- Staging: on `develop` branch
- Production: on `main` branch

#### 3. Code Quality (`.github/workflows/quality.yml`)

Security and quality checks.

**Checks:**
- Linting and formatting
- NPM audit
- Snyk security scanning
- Gitleaks secret detection
- Dependency health
- Performance metrics

#### 4. Manual Deployment (`.github/workflows/manual-deploy.yml`)

Manual deployment trigger via GitHub UI.

```bash
# Trigger via CLI
gh workflow run manual-deploy.yml -f environment=staging
```

---

## Staging Deployment

### Prerequisites

1. Staging environment configured (AWS, GCP, Heroku, etc.)
2. Database migrations applied
3. Environment variables set
4. SSL certificate configured

### Deployment Steps

```bash
# Via GitHub Actions
git push origin develop

# Or manual trigger
gh workflow run manual-deploy.yml -f environment=staging
```

### Staging Checklist

- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] No security vulnerabilities (Snyk)
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Smoke tests passed

### Staging Validation

```bash
# Health check
curl https://api-staging.agent-audit.dev/health

# API test
curl -H "Authorization: Bearer $TOKEN" \
  https://api-staging.agent-audit.dev/api/agents

# WebSocket test
wscat -c wss://api-staging.agent-audit.dev/ws
```

---

## Production Deployment

### Prerequisites

1. **Approved deployment** - Code review and approval
2. **Version tagged** - Git tag created (v0.1.0)
3. **Staging validated** - Deployed and tested on staging
4. **Backup created** - Database backup taken
5. **Rollback plan** - Previous version ready to restore

### Deployment Steps

```bash
# Create release tag
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0

# Trigger deployment
git push origin main
# OR manual trigger
gh workflow run manual-deploy.yml -f environment=production -f version=0.1.0
```

### Production Checklist

- [ ] Release notes prepared
- [ ] Database backup confirmed
- [ ] Rollback procedure tested
- [ ] On-call team notified
- [ ] Health monitoring configured
- [ ] Incident runbook ready
- [ ] Slack notifications configured

### Post-Deployment

```bash
# Verify deployment
curl https://api.agent-audit.dev/health

# Check logs
# View in your hosting provider's dashboard

# Monitor metrics
# Check CloudWatch, DataDog, or equivalent

# Gradual rollout (recommended)
# Use blue-green or canary deployment strategy
```

---

## Monitoring & Maintenance

### Monitoring Services

Configure monitoring for:

1. **Application Metrics**
   - Request latency
   - Error rates
   - Database connection pool
   - Cache hit rates

2. **Infrastructure Metrics**
   - CPU usage
   - Memory usage
   - Disk space
   - Network I/O

3. **Business Metrics**
   - Transaction verification success rate
   - User engagement
   - API usage by protocol

### Log Aggregation

```bash
# View backend logs
docker-compose logs -f backend

# View frontend logs (browser console)
# Open http://localhost:3000, open DevTools (F12)

# Centralized logging (production)
# Send logs to CloudWatch, ELK, or Datadog
```

### Alerting

Configure alerts for:

```
- Application errors > 5% error rate
- Database: > 90% connection pool used
- Storage: > warning threshold (10GB)
- WebSocket: > 100 concurrent connections
- Response time: > 5s average
```

### Maintenance Tasks

#### Weekly

- Check log files for errors
- Verify backup completion
- Review performance metrics

#### Monthly

- Database maintenance (VACUUM, ANALYZE)
- Cache cleanup and optimization
- Dependency security updates

#### Quarterly

- Full security audit
- Load testing
- Disaster recovery drill

### Rollback Procedure

```bash
# If deployment fails
git revert <commit-hash>
git push origin main

# Or switch to previous tag
git checkout v0.0.9
npm run build
# Deploy previous version

# Database rollback
npm run db:rollback
```

### Scaling

#### Horizontal Scaling

```bash
# Add more backend instances
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale backend=3

# Use load balancer (nginx, HAProxy)
# Configure in reverse proxy configuration
```

#### Vertical Scaling

Increase resources for:
- Database connection pool
- Cache size (Redis)
- Node.js heap size (--max-old-space-size)

### Performance Optimization

1. **Database**
   - Add indexes on frequently queried columns
   - Archive old transactions
   - Run VACUUM and ANALYZE

2. **Cache**
   - Increase TTL for less frequently changing data
   - Implement cache warming
   - Monitor hit rates

3. **Frontend**
   - Enable code splitting
   - Compress assets
   - CDN configuration

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL status
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Verify connection string
echo $DATABASE_URL
```

#### WebSocket Connection Issues

```bash
# Check WebSocket server
curl http://localhost:3001/health

# Monitor WebSocket connections
docker exec -it agent-audit-backend npm run monitor:ws
```

#### High Memory Usage

```bash
# Check Node.js memory
docker stats agent-audit-backend

# Check heap size
docker exec agent-audit-backend node -e "console.log(require('v8').getHeapStatistics())"

# Increase memory limit if needed
# Or implement cache cleanup
```

---

## Security Considerations

1. **Environment Variables** - Never commit .env file
2. **SSL/TLS** - Always use HTTPS in production
3. **JWT Secrets** - Use strong, randomly generated secrets
4. **Database** - Restrict access, use strong passwords
5. **Docker** - Run containers as non-root user
6. **Dependencies** - Regularly run `npm audit` and update

---

## Support & Documentation

- GitHub Issues: [Report bugs](https://github.com/yourrepo/issues)
- Documentation: [See README.md](./README.md)
- Architecture: [See ARCHITECTURE.md](./ARCHITECTURE.md)
- Development: [See DEV.md](./DEV.md)
