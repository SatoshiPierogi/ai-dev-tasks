# Troubleshooting Guide

Common issues and solutions for Agent Audit Dashboard.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Development Issues](#development-issues)
3. [Database Issues](#database-issues)
4. [API Issues](#api-issues)
5. [Frontend Issues](#frontend-issues)
6. [WebSocket Issues](#websocket-issues)
7. [Performance Issues](#performance-issues)
8. [Deployment Issues](#deployment-issues)
9. [Security Issues](#security-issues)
10. [FAQ](#faq)

---

## Installation Issues

### Node.js Version Mismatch

**Error**: `Node version 16.x.x does not satisfy requirement >=18.0.0`

**Solution**:
```bash
# Install Node 18+
nvm install 18
nvm use 18

# Verify
node --version
```

### npm Install Fails

**Error**: `npm ERR! code ERESOLVE`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Or use legacy peer deps
npm install --legacy-peer-deps
```

### PostgreSQL Connection Fails

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
sudo systemctl start postgresql

# Verify service
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE :::3000`

**Solution**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

---

## Development Issues

### Module Not Found

**Error**: `Cannot find module './components'`

**Solution**:
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules
npm install

# Check path aliases in tsconfig.json
# Restart dev server
```

### TypeScript Errors

**Error**: `Type 'X' is not assignable to type 'Y'`

**Solution**:
```bash
# Type check entire project
npm run type-check

# Fix issues
npm run type-check -- --noEmit

# Or in specific file
# Add type assertion if needed
const x = value as Type;
```

### Hot Module Replacement Not Working

**Error**: Changes don't reflect in browser

**Solution**:
```bash
# Clear browser cache (Cmd+Shift+Delete)

# Restart dev server
npm run dev

# Check Vite config
# Check for HMR settings in vite.config.ts
```

### Environment Variables Not Loaded

**Error**: `Undefined value for process.env.REACT_APP_API_URL`

**Solution**:
```bash
# Verify .env file exists in root
cat .env

# Frontend: Variables must start with VITE_
# Rename: REACT_APP_X → VITE_X

# Restart dev server after .env changes
npm run dev
```

---

## Database Issues

### Migrations Failed

**Error**: `Migration ... failed`

**Solution**:
```bash
# Check migration status
npm run db:status

# Rollback to previous state
npm run db:rollback

# Check migration files
ls backend/src/migrations/

# Run migrations again
npm run db:migrate
```

### Database Schema Out of Sync

**Error**: `Table 'users' doesn't exist`

**Solution**:
```bash
# Reset database (WARNING: Deletes data)
npm run db:reset

# Rerun migrations
npm run db:migrate

# Verify schema
psql agent_audit -c "\dt"
```

### Connection Pool Exhausted

**Error**: `No more connections available in the pool`

**Solution**:
```bash
# Check pool size in config
# Default: 20 connections

# Increase pool size
DATABASE_POOL_SIZE=50

# Kill idle connections
psql agent_audit -c "SELECT pg_terminate_backend(pid) \
  FROM pg_stat_activity \
  WHERE datname='agent_audit' AND state='idle';"

# Restart application
```

### Slow Queries

**Error**: Query takes > 1 second

**Solution**:
```sql
-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check query plan
EXPLAIN ANALYZE SELECT ...;

-- Add missing indexes
CREATE INDEX idx_agents_user_id ON agents(user_id);

-- Reset statistics
SELECT pg_stat_statements_reset();
```

---

## API Issues

### 401 Unauthorized

**Error**: `Error: Unauthorized`

**Solution**:
```bash
# Check token validity
jwt.decode($TOKEN)

# Get new token
POST /api/auth/login

# Check Authorization header
Authorization: Bearer <token>

# Check token expiration
# Request new refresh token if expired
```

### 403 Forbidden

**Error**: `Error: Forbidden - Access Denied`

**Solution**:
```bash
# Check user role
GET /api/auth/me

# Verify user has required permissions
# Admin endpoints require admin role

# Check JWT claims
jwt.decode($TOKEN)
```

### 404 Not Found

**Error**: `404 Not Found`

**Solution**:
```bash
# Verify endpoint exists
# Check route definitions in backend/src/routes/

# Verify resource ID is valid
GET /api/agents/invalid-id

# Check URL spelling
GET /api/transacctions # Wrong!
GET /api/transactions  # Correct
```

### 429 Too Many Requests

**Error**: `Rate limit exceeded`

**Solution**:
```bash
# Check rate limit configuration
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=1000

# Wait for rate limit to reset
# Each IP has separate limit

# Use exponential backoff
retry.delay = base * (2 ^ attempt)
```

### Request Timeout

**Error**: `Error: Request timeout`

**Solution**:
```bash
# Check backend is running
curl http://localhost:3000/health

# Check network connectivity
ping backend-host

# Increase timeout
fetch(url, { timeout: 30000 })

# Check for long-running queries
# See Database Issues section
```

---

## Frontend Issues

### Blank White Screen

**Error**: Empty page, no content

**Solution**:
```bash
# Check browser console for errors
F12 → Console

# Check Network tab for failed requests
F12 → Network

# Clear cache and reload
Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)

# Check if bundle loaded
F12 → Application → Cache Storage
```

### Styling Not Applied

**Error**: No CSS, ugly layout

**Solution**:
```bash
# Check Tailwind CSS is configured
ls frontend/tailwind.config.ts

# Verify CSS import in main.tsx
import './index.css'

# Rebuild CSS
npm run dev

# Check for CSS conflicts
# Use browser DevTools to inspect elements
```

### Component Not Rendering

**Error**: Component missing from page

**Solution**:
```bash
# Check import path
import { Button } from './components'  # Correct
import { Button } from './Button'      # Wrong

# Check component export
export { Button }
export default Button

# Check conditional rendering
{condition && <Component />}

# Check props
<Component required={true} />
```

### Props Not Updating

**Error**: Props change but component doesn't update

**Solution**:
```typescript
// Issue: Missing dependency
useEffect(() => {
  // code
}, []);  // Missing deps!

// Fix: Include all dependencies
useEffect(() => {
  // code
}, [prop1, prop2, dependency]);

// Or use useCallback
const callback = useCallback(() => {
  // code
}, [dependencies]);
```

---

## WebSocket Issues

### Connection Fails

**Error**: `WebSocket connection failed`

**Solution**:
```bash
# Check WebSocket server is running
curl http://localhost:3000/health

# Check firewall allows WebSocket
# Port 3000 open?

# Check CORS is configured
# Check WebSocket URL format
ws://localhost:3000  # Correct
wss://yourdomain.com # Correct (HTTPS)

# Check browser console for errors
```

### Reconnection Loop

**Error**: WebSocket connects/disconnects repeatedly

**Solution**:
```typescript
// Check reconnection config
const { subscribe } = useWebSocket({
  autoReconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000
});

// Check server logs
docker-compose logs backend

// Increase reconnect delays
reconnectDelay: 5000  // 5 seconds

// Check for auth issues
// Token might be expired
```

### Message Not Received

**Error**: Sent message but no response

**Solution**:
```javascript
// Check message format
const message = {
  type: 'SUBSCRIBE',
  timestamp: Date.now(),
  data: { channels: ['agent:123'] }
};

// Check channel name
// Verify subscription succeeded

// Check onmessage handler
ws.onmessage = (event) => {
  console.log(event.data);
};

// Check for firewall/proxy issues
```

---

## Performance Issues

### Slow Page Load

**Error**: Page takes > 3 seconds to load

**Solution**:
```bash
# Check bundle size
npm run build
# Check dist/ size

# Enable code splitting
# Already configured in vite.config.ts

# Check Network tab
F12 → Network → Performance

# Check Time to Interactive (TTI)
F12 → Performance → Record

# Optimize images
# Use WebP format
# Lazy load images

# Check API response time
curl -w "Time: %{time_total}s" $API_URL
```

### Slow API Responses

**Error**: API takes > 200ms

**Solution**:
```bash
# Check database query time
EXPLAIN ANALYZE SELECT ...;

# Add missing indexes
CREATE INDEX idx_name ON table(column);

# Check cache hit rate
GET /api/analytics/metrics

# Review slow query log
SELECT query, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC;

# Optimize N+1 queries
# Use batch loading
# Eager load relationships
```

### High Memory Usage

**Error**: Application uses > 512MB RAM

**Solution**:
```bash
# Check memory usage
free -h

# Check Node process
ps aux | grep node

# Find memory leaks
npm run profile

# Check for circular references
# Check event listener cleanup
// useEffect cleanup
return () => {
  listener.remove();
  subscription.unsubscribe();
};

# Reduce cache size
MAX_CACHE_SIZE=256000000  // 256MB
```

### High CPU Usage

**Error**: CPU constantly at 100%

**Solution**:
```bash
# Check top processes
top

# Find CPU-intensive function
npm run profile

# Check for infinite loops
// While loop?
for (;;) { // Bad!

// Busy waiting?
// Use events instead

# Check for memory thrashing
// OOM leads to high CPU

# Reduce logging level
LOG_LEVEL=warn  # Less logging
```

---

## Deployment Issues

### Docker Build Fails

**Error**: `docker build` fails

**Solution**:
```bash
# Check Dockerfile
docker build --progress=plain

# Clear cache
docker system prune -a

# Check for network issues
# during npm install

# Use build cache
docker build --cache-from <image>
```

### Container Won't Start

**Error**: Container exits immediately

**Solution**:
```bash
# Check logs
docker-compose logs backend

# Check environment variables
docker-compose config

# Check health check
docker-compose ps

# Run interactively
docker run -it <image> bash

# Check file permissions
docker-compose exec backend ls -la
```

### Service Unavailable

**Error**: `503 Service Unavailable`

**Solution**:
```bash
# Check backend status
curl http://localhost:3000/health

# Check Nginx configuration
sudo nginx -t

# Check logs
sudo journalctl -u nginx -f
docker-compose logs backend

# Check database connection
psql $DATABASE_URL

# Check port binding
netstat -tlnp | grep 3000
```

---

## Security Issues

### CORS Error

**Error**: `CORS policy: blocked by CORS`

**Solution**:
```typescript
// Backend CORS setup
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

// Or in Nginx
add_header 'Access-Control-Allow-Origin' '*';
```

### CSRF Token Missing

**Error**: `CSRF token validation failed`

**Solution**:
```javascript
// Include CSRF token in headers
fetch(url, {
  headers: {
    'X-CSRF-Token': csrfToken
  }
});

// Or use SameSite cookies
// Set in response headers
Set-Cookie: token=value; SameSite=Strict
```

### Authentication Failed

**Error**: `Authentication failed`

**Solution**:
```bash
# Check JWT secret matches
JWT_SECRET matches between request/response

# Check token not expired
jwt.verify(token, SECRET)

# Check token format
Authorization: Bearer <token>

# Not:
Authorization: token <token>
```

---

## FAQ

### How do I reset the database?

```bash
npm run db:reset
npm run db:migrate
```

### How do I run migrations manually?

```bash
npm run db:migrate
npm run db:rollback
npm run db:status
```

### How do I debug the backend?

```bash
npm run dev:debug
# Then: chrome://inspect
```

### How do I increase log verbosity?

```bash
LOG_LEVEL=debug npm run dev
```

### How do I profile performance?

```bash
npm run profile
# Analyze in DevTools
```

### Where are logs stored?

```bash
# Development
console output

# Production
/var/log/agent-audit/app.log
docker-compose logs
```

### How do I backup the database?

```bash
pg_dump agent_audit > backup.sql
```

### How do I restore from backup?

```bash
psql agent_audit < backup.sql
```

### How do I scale to multiple instances?

```bash
docker-compose up -d --scale backend=3
```

### How do I monitor system health?

```bash
GET /health
GET /api/analytics/health
```

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/SatoshiPierogi/ai-dev-tasks/issues)
- **Logs**: Check application logs
- **Monitoring**: Check [ANALYTICS.md](ANALYTICS.md)
- **Performance**: Check [PERFORMANCE.md](PERFORMANCE.md)

**Still stuck? Check the documentation in [docs/](docs/) folder.**
