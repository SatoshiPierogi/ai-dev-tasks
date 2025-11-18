# Getting Started Guide

Complete setup and quick start guide for Agent Audit Dashboard development and deployment.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Local Development Setup](#local-development-setup)
3. [Docker Setup](#docker-setup)
4. [First Steps](#first-steps)
5. [Common Tasks](#common-tasks)
6. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements

- **Node.js**: 18.x or later
- **npm**: 9.x or yarn 1.22.x
- **PostgreSQL**: 14.x or later
- **RAM**: 4 GB minimum
- **Disk**: 5 GB for development

### Optional

- **Docker**: 20.x or later (for containerized setup)
- **Git**: 2.30.x or later
- **VS Code**: For development

---

## Local Development Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/SatoshiPierogi/ai-dev-tasks.git
cd ai-dev-tasks

# Or if you have SSH keys configured
git clone git@github.com:SatoshiPierogi/ai-dev-tasks.git
cd ai-dev-tasks
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### 3. Setup Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Key variables to configure:
# - DATABASE_URL: PostgreSQL connection string
# - REACT_APP_API_URL: Backend API URL
# - REACT_APP_WS_URL: WebSocket URL
# - NODE_ENV: development or production
```

Example `.env`:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/agent_audit
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
JWT_SECRET=your-secret-key-here
```

### 4. Setup PostgreSQL

```bash
# Create database
createdb agent_audit

# Or with PostgreSQL running in Docker
docker run -d \
  --name postgres-agent-audit \
  -e POSTGRES_DB=agent_audit \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:14
```

### 5. Initialize Database

```bash
# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 6. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or separately:
# Terminal 1 - Frontend (port 5173)
cd frontend && npm run dev

# Terminal 2 - Backend (port 3000)
cd backend && npm run dev
```

### 7. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

---

## Docker Setup

### Quick Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services started:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Nginx**: http://localhost:80

### Manual Docker Commands

```bash
# Build images
docker-compose build

# Start services in background
docker-compose up -d

# Scale backend services
docker-compose up -d --scale backend=3

# View logs for specific service
docker-compose logs backend

# Execute command in container
docker-compose exec backend npm test

# Stop all services
docker-compose down

# Clean up volumes
docker-compose down -v
```

---

## First Steps

### 1. Create User Account

```
1. Visit http://localhost:5173
2. Click "Register" or "Sign Up"
3. Enter email and password
4. Verify email (if configured)
5. Login with credentials
```

### 2. Create AI Agent

```
1. Login to dashboard
2. Go to "Agents" page
3. Click "Add Agent"
4. Fill in agent details:
   - Name: Your agent name
   - Type: arbitrage, lending, liquidity, etc.
   - Description: What the agent does
5. Click "Create"
```

### 3. Monitor Transactions

```
1. Go to "Dashboard" page
2. View real-time agent activity
3. Click agent to see transaction history
4. Click transaction to view details
```

### 4. Access Admin Panel

```
1. Login with admin account (if available)
2. Go to "Admin" page
3. View system statistics
4. Manage agents and users
5. Configure settings
```

### 5. View Analytics

```
1. Go to "Settings" page
2. Click "Analytics" tab
3. View user behavior and metrics
4. Check system health
```

---

## Common Tasks

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/components/Button.test.tsx

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# E2E tests only
npm run test:e2e
```

### Code Formatting

```bash
# Format all code
npm run format

# Format specific file
npx prettier --write src/App.tsx

# Check format without changes
npx prettier --check src/
```

### Type Checking

```bash
# Check TypeScript
npm run type-check

# Watch mode
npm run type-check -- --watch
```

### Linting

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Database Management

```bash
# Create migration
npm run db:create-migration create_users_table

# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Reset database
npm run db:reset

# View migration status
npm run db:status
```

### Building for Production

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && npm run build

# Run production build
npm run start
```

---

## Environment Variables Reference

### Frontend (.env in frontend/)

```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_ENVIRONMENT=development
```

### Backend (.env in backend/)

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/agent_audit
JWT_SECRET=your-secret-key
LOG_LEVEL=info
CACHE_TTL=3600
```

### Root (.env)

```
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/agent_audit
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

---

## Project Structure for Development

```
agent-audit-dashboard/
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── hooks/           # Custom hooks
│   │   ├── App.tsx          # Root component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Middleware
│   │   └── main.ts          # Server entry
│   └── package.json
├── docker/                  # Docker config
└── docs/                    # Documentation
```

---

## Debugging

### Frontend Debugging

```bash
# Start with debugger
npm run dev

# In browser DevTools:
# 1. Open DevTools (F12)
# 2. Go to Sources tab
# 3. Set breakpoints in code
# 4. Inspect variables
```

### Backend Debugging

```bash
# Start with debugger
node --inspect-brk ./node_modules/.bin/ts-node src/main.ts

# In Chrome:
# 1. Visit chrome://inspect
# 2. Click "inspect" under Node process
# 3. Set breakpoints and debug
```

### Database Debugging

```bash
# Connect to database
psql agent_audit

# View tables
\dt

# View users
SELECT * FROM users;

# View agents
SELECT * FROM agents;

# Query transactions
SELECT * FROM transactions LIMIT 10;
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Database Connection Error

```bash
# Check PostgreSQL is running
psql --version

# Verify connection string in .env
# Format: postgresql://user:password@localhost:5432/database

# Test connection
psql $DATABASE_URL
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
npm install
```

### TypeScript Errors

```bash
# Type check project
npm run type-check

# Find and fix type errors
npm run type-check -- --noEmit
```

### Test Failures

```bash
# Clear test cache
npm test -- --clearCache

# Run specific test
npm test -- MyComponent.test.tsx

# Run with verbose output
npm test -- --verbose
```

---

## VS Code Setup

### Recommended Extensions

- ES7+ React/Redux/React-Native snippets
- TypeScript Vue Plugin (Volar)
- Prettier - Code formatter
- ESLint
- PostgreSQL
- Thunder Client (for API testing)

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsserver.experimental.enableProjectDiagnostics": true
}
```

### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Debug",
      "program": "${workspaceFolder}/backend/src/main.ts",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"]
    }
  ]
}
```

---

## Performance Tips

### Development Performance

1. Use `npm run dev` instead of rebuilding
2. Keep DevTools closed during development
3. Use Chrome DevTools Performance tab to profile
4. Clear browser cache periodically
5. Use `.gitignore` to exclude node_modules

### Testing Performance

1. Run tests in watch mode: `npm test -- --watch`
2. Run specific test file instead of all
3. Use `--onlyChanged` flag: `npm test -- --onlyChanged`
4. Clear Jest cache: `npm test -- --clearCache`

---

## Next Steps

1. **Read Documentation**: Check [docs/](docs/) folder
2. **Explore Components**: Look at [frontend/src/components/](frontend/src/components/)
3. **Review API**: Check [API.md](API.md)
4. **Run Tests**: Execute `npm test`
5. **Start Development**: Make your changes!

---

## Getting Help

- **Documentation**: See [docs/](docs/) folder
- **Issues**: [GitHub Issues](https://github.com/SatoshiPierogi/ai-dev-tasks/issues)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Performance**: [PERFORMANCE.md](PERFORMANCE.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Happy Coding! 🚀**
