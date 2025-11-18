# Task List: Agent Audit Dashboard MVP

## Overview

This task list implements the Agent Audit Dashboard MVP in two phases:
1. **Foundation Phase (Tasks 1-12):** Build critical pairing tasks and infrastructure
2. **Feature Phase (Tasks 13-20):** Build user-facing features on top of foundation

Tasks are organized by dependency tier to enable parallel work streams. Start tasks in Tier 1, then unlock Tier 2 dependencies, etc.

---

## Relevant Files

### Backend Setup
- `backend/package.json` - Node.js dependencies (Express, Postgres, The Graph client, etc.)
- `backend/tsconfig.json` - TypeScript configuration
- `backend/src/index.ts` - Main server entry point
- `backend/src/middleware/auth.ts` - Wallet authentication middleware
- `backend/src/middleware/errors.ts` - Error handling middleware

### Database
- `backend/src/db/schema.sql` - PostgreSQL schema definition
- `backend/src/db/migrations/` - Migration files directory
- `backend/src/models/Transaction.ts` - Transaction model (ORM)
- `backend/src/models/Agent.ts` - Agent model (ORM)
- `backend/src/models/User.ts` - User/wallet model (ORM)

### API & Integration
- `backend/src/services/thegraph.ts` - The Graph API client
- `backend/src/services/blockchain.ts` - RPC/verification service
- `backend/src/services/parser.ts` - Transaction parsing & normalization
- `backend/src/routes/api.ts` - Main API routes
- `backend/src/websocket/server.ts` - WebSocket server setup
- `backend/src/jobs/verification.ts` - Blockchain verification job
- `backend/src/jobs/agentDetection.ts` - Auto-detection job

### Testing & Infrastructure
- `backend/src/mocks/thegraph.mock.ts` - The Graph response mocks
- `backend/src/mocks/blockchain.mock.ts` - Blockchain/RPC mocks
- `backend/test/fixtures/transactions.json` - Mock transaction data
- `backend/test/fixtures/agents.json` - Mock agent data
- `.github/workflows/ci.yml` - CI/CD pipeline
- `docker-compose.yml` - Local development environment

### Frontend
- `frontend/app/layout.tsx` - Root layout (Next.js)
- `frontend/app/dashboard/page.tsx` - Main dashboard page
- `frontend/components/ActivityFeed.tsx` - Activity feed component
- `frontend/components/AgentList.tsx` - Agent list sidebar
- `frontend/components/TransactionDetail.tsx` - Detail view modal
- `frontend/hooks/useWallet.ts` - Wallet connection hook
- `frontend/hooks/useActivityFeed.ts` - Activity feed data hook
- `frontend/services/api.ts` - Frontend API client
- `frontend/lib/types.ts` - Shared TypeScript types
- `frontend/styles/globals.css` - Global styles

### Documentation
- `docs/API.md` - REST/WebSocket API specification
- `docs/ARCHITECTURE.md` - System architecture overview
- `docs/SETUP.md` - Developer setup guide
- `docs/DATABASE.md` - Database schema documentation
- `docs/WEBHOOK.md` - Agent webhook specification

---

## Tasks

### TIER 1: Foundation - Week 1-2

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout branch: `git checkout -b claude/agent-audit-dashboard-mvp-<sessionid>`
  - [ ] 0.2 Verify branch is based on main/master

- [ ] 1.0 Database Schema & Data Model Design
  - [ ] 1.1 Design PostgreSQL schema with tables: users (wallets), agents, transactions, verification_proofs
  - [ ] 1.2 Define transaction table with columns for: agent_id, user_id, tx_hash, type (swap/transfer/stake/lp/vote/bridge), protocol, tokens in/out, amounts, timestamp, verification_status
  - [ ] 1.3 Define agent table with columns for: agent_id, user_id, contract_address, name, status, created_at, last_activity
  - [ ] 1.4 Define verification_proofs table with columns for: tx_hash, status (pending/verified/unverified), proof_data (JSON), verified_at
  - [ ] 1.5 Plan indexing strategy: idx_user_id_timestamp, idx_agent_id_timestamp, idx_verification_status, idx_protocol
  - [ ] 1.6 Design deduplication strategy for transactions from multiple data sources
  - [ ] 1.7 Define data retention policy: keep 7-30 days hot, archive older transactions
  - [ ] 1.8 Create initial schema.sql file with all table definitions
  - [ ] 1.9 Document schema with comments explaining each table and field
  - [ ] 1.10 Create schema review checkpoint - share for feedback before migration setup

- [ ] 2.0 API Contract Definitions & Documentation
  - [ ] 2.1 Define REST API endpoints in OpenAPI 3.0 format:
    - [ ] 2.1.1 GET /api/transactions?agent_id=&skip=&limit=&filters=
    - [ ] 2.1.2 GET /api/agents (list user's agents)
    - [ ] 2.1.3 POST /api/agents (manual add by address)
    - [ ] 2.1.4 PATCH /api/agents/:id (rename/label)
    - [ ] 2.1.5 DELETE /api/agents/:id (remove from dashboard)
    - [ ] 2.1.6 GET /api/agents/:id (agent details)
    - [ ] 2.1.7 GET /api/agents/:id/transactions (agent-specific feed)
    - [ ] 2.1.8 GET /api/agents/:id/stats (agent summary: total value, recent activity, verification rate)
    - [ ] 2.1.9 GET /api/verify/:txHash (verification proof details)
  - [ ] 2.2 Define WebSocket message schemas (JSON):
    - [ ] 2.2.1 transaction_update: {type, agent_id, tx_hash, action, assets, amount, timestamp, verification_status}
    - [ ] 2.2.2 verification_update: {tx_hash, status, proof_data}
    - [ ] 2.2.3 agent_status_update: {agent_id, status, last_activity}
  - [ ] 2.3 Define webhook payload format for agents reporting off-chain actions:
    - [ ] 2.3.1 POST /api/webhooks/action - {agent_id, user_id, action_type, metadata, signature}
    - [ ] 2.3.2 Include authentication header requirements
  - [ ] 2.4 Define verification proof object structure: {tx_hash, chain, block_number, event_logs, signatures}
  - [ ] 2.5 Document error response format: {error: string, code: string, details?: object}
  - [ ] 2.6 Create OpenAPI/Swagger spec file (docs/API.md)
  - [ ] 2.7 Set up Swagger UI for API docs at /api/docs
  - [ ] 2.8 Create mock server for frontend development (json-server or similar)

- [ ] 3.0 Testing Infrastructure & Mock Data
  - [ ] 3.1 Set up Jest testing framework for Node.js backend
  - [ ] 3.2 Configure test database (isolated PostgreSQL instance for tests)
  - [ ] 3.3 Create test fixtures directory with seed data:
    - [ ] 3.3.1 Mock wallet addresses (user1, user2, agent1, agent2, etc.)
    - [ ] 3.3.2 Mock agent contracts (Uniswap, Aave, Curve interactions)
    - [ ] 3.3.3 Mock transaction data (100+ realistic transactions across protocols)
  - [ ] 3.4 Create The Graph response mocks for each protocol:
    - [ ] 3.4.1 Mock Uniswap swap queries (Swap events)
    - [ ] 3.4.2 Mock Aave transaction queries (Deposit, Withdraw, Borrow, Repay)
    - [ ] 3.4.3 Mock Curve LP queries (AddLiquidity, RemoveLiquidity)
    - [ ] 3.4.4 Mock Balancer queries
  - [ ] 3.5 Create blockchain/RPC mocks:
    - [ ] 3.5.1 Mock transaction receipts
    - [ ] 3.5.2 Mock event logs for verification
    - [ ] 3.5.3 Mock contract ABI responses
  - [ ] 3.6 Create wallet connection mocks for testing auth flows
  - [ ] 3.7 Set up E2E testing framework (Playwright or Cypress)
  - [ ] 3.8 Create database reset utilities for test isolation
  - [ ] 3.9 Document test setup in docs/SETUP.md

---

### TIER 2: Core Infrastructure - Week 2-3

- [ ] 4.0 Wallet Authentication & Session Management
  - [ ] 4.1 Install and configure Wagmi/Viem libraries
  - [ ] 4.2 Create wallet connection context (React) with MetaMask, WalletConnect, Coinbase support
  - [ ] 4.3 Implement signature-based authentication flow:
    - [ ] 4.3.1 Generate challenge message on backend
    - [ ] 4.3.2 Sign challenge with wallet (frontend)
    - [ ] 4.3.3 Verify signature on backend
    - [ ] 4.3.4 Issue JWT session token
  - [ ] 4.4 Create authentication middleware for Express:
    - [ ] 4.4.1 Validate JWT tokens
    - [ ] 4.4.2 Extract wallet address from token
    - [ ] 4.4.3 Attach user context to request
  - [ ] 4.5 Create wallet-scoped data access middleware:
    - [ ] 4.5.1 Ensure users can only access data from their own agents
    - [ ] 4.5.2 Validate agent ownership before returning data
  - [ ] 4.6 Implement multi-wallet support:
    - [ ] 4.6.1 Allow users to add multiple wallets
    - [ ] 4.6.2 Sync agents across all wallets
    - [ ] 4.6.3 Switch between wallets in dashboard
  - [ ] 4.7 Create session token refresh logic (JWT expiry, silent refresh)
  - [ ] 4.8 Implement logout functionality (token revocation/blacklist)
  - [ ] 4.9 Write unit tests for auth flows (signature verification, token validation)
  - [ ] 4.10 Write E2E tests for wallet connection and multi-wallet switching

- [ ] 5.0 The Graph Integration Architecture
  - [ ] 5.1 Set up The Graph Apollo client
  - [ ] 5.2 Design query abstraction layer for protocol-agnostic queries
  - [ ] 5.3 Create Uniswap subgraph client:
    - [ ] 5.3.1 Query recent swaps by user/agent
    - [ ] 5.3.2 Handle pagination for large result sets
  - [ ] 5.4 Create Aave subgraph client:
    - [ ] 5.4.1 Query deposits, withdrawals, borrows, repays
  - [ ] 5.5 Create Curve subgraph client:
    - [ ] 5.5.1 Query LP add/remove events
  - [ ] 5.6 Create Balancer subgraph client
  - [ ] 5.7 Implement rate limiting (handle 429 responses):
    - [ ] 5.7.1 Queue failed requests
    - [ ] 5.7.2 Exponential backoff retry logic
    - [ ] 5.7.3 Monitor rate limit status
  - [ ] 5.8 Implement error recovery:
    - [ ] 5.8.1 Fallback to previous successful query
    - [ ] 5.8.2 Log integration failures
    - [ ] 5.8.3 Alert on persistent failures
  - [ ] 5.9 Create data normalization layer (convert protocol-specific events to unified schema)
  - [ ] 5.10 Implement deduplication logic (prevent duplicate transactions from multiple subgraph queries)
  - [ ] 5.11 Create background job to periodically fetch latest transactions
  - [ ] 5.12 Implement indexing lag monitoring (track how far behind real-time we are)
  - [ ] 5.13 Write unit tests for each protocol client
  - [ ] 5.14 Write integration tests with real The Graph queries (use mock responses)

- [ ] 6.0 Error Handling & Logging Infrastructure
  - [ ] 6.1 Set up structured logging library (Winston or Pino)
  - [ ] 6.2 Create logging middleware for Express (log all HTTP requests/responses)
  - [ ] 6.3 Define error categories:
    - [ ] 6.3.1 User errors (400s)
    - [ ] 6.3.2 Integration errors (The Graph timeouts, RPC failures)
    - [ ] 6.3.3 System errors (500s, database errors)
  - [ ] 6.4 Create standardized error response format
  - [ ] 6.5 Set up error tracking service (Sentry or similar)
  - [ ] 6.6 Create error boundary component (React) for frontend
  - [ ] 6.7 Implement alert rules for critical failures:
    - [ ] 6.7.1 The Graph API unavailable
    - [ ] 6.7.2 Database connection failure
    - [ ] 6.7.3 RPC provider timeout
  - [ ] 6.8 Create log aggregation and viewing interface
  - [ ] 6.9 Implement performance monitoring (API latency, database query times)
  - [ ] 6.10 Write tests for error handling (invalid inputs, service failures)

---

### TIER 3: Feature Enablers - Week 3-4

- [ ] 7.0 Transaction Parsing & Normalization Library
  - [ ] 7.1 Design unified transaction model with fields: type, protocol, tokens_in, tokens_out, amounts, timestamp, tx_hash, description
  - [ ] 7.2 Create Uniswap parser:
    - [ ] 7.2.1 Parse Swap events to extract token pairs, amounts, slippage
    - [ ] 7.2.2 Generate human-readable description ("Swapped 1 ETH for 2500 USDC on Uniswap V3")
  - [ ] 7.3 Create Aave parser:
    - [ ] 7.3.1 Parse Deposit/Withdraw/Borrow/Repay events
    - [ ] 7.3.2 Handle different asset types (ERC20, aTokens)
  - [ ] 7.4 Create Curve parser:
    - [ ] 7.4.1 Parse AddLiquidity/RemoveLiquidity events
  - [ ] 7.5 Create Balancer parser
  - [ ] 7.6 Create bridge transaction parser (for cross-chain transactions)
  - [ ] 7.7 Create governance vote parser
  - [ ] 7.8 Implement token metadata resolution (symbol, decimals, name from contract)
  - [ ] 7.9 Create decimal conversion utilities (handle different decimal places across tokens)
  - [ ] 7.10 Implement safe error handling for malformed events
  - [ ] 7.11 Write unit tests for each parser with real transaction data
  - [ ] 7.12 Create parser registry for easy protocol addition in Phase 2

- [ ] 8.0 Blockchain Verification System
  - [ ] 8.1 Set up Ethers.js for RPC interactions
  - [ ] 8.2 Configure RPC provider selection (primary + fallback providers)
  - [ ] 8.3 Create transaction verification service:
    - [ ] 8.3.1 Fetch transaction receipt from RPC
    - [ ] 8.3.2 Verify transaction status (success/failed)
    - [ ] 8.3.3 Verify block confirmation (at least 12 blocks)
  - [ ] 8.4 Implement event log validation:
    - [ ] 8.4.1 Fetch logs for transaction
    - [ ] 8.4.2 Parse event signatures
    - [ ] 8.4.3 Validate log matches expected event schema
  - [ ] 8.5 Create verification status state machine:
    - [ ] 8.5.1 pending → verified or unverified
    - [ ] 8.5.2 Handle reorg scenarios (re-verify after N blocks)
  - [ ] 8.6 Implement cryptographic proof generation:
    - [ ] 8.6.1 Create proof object with tx hash, block number, event logs
    - [ ] 8.6.2 Generate link to transaction on Etherscan
    - [ ] 8.6.3 Include contract event signatures in proof
  - [ ] 8.7 Create re-verification job for failed verifications
  - [ ] 8.8 Implement RPC fallback logic (retry on timeout)
  - [ ] 8.9 Create rate limiting for RPC calls
  - [ ] 8.10 Write unit tests for verification logic
  - [ ] 8.11 Write integration tests with real blockchain data (testnet)

- [ ] 9.0 Real-Time Update Infrastructure
  - [ ] 9.1 Install WebSocket library (ws or Socket.io)
  - [ ] 9.2 Create WebSocket server setup and initialization
  - [ ] 9.3 Implement connection management:
    - [ ] 9.3.1 Authenticate WebSocket connections with JWT
    - [ ] 9.3.2 Create per-user channels (only receive their own agent data)
    - [ ] 9.3.3 Handle reconnection logic
  - [ ] 9.4 Implement graceful disconnection handling
  - [ ] 9.5 Create message queueing for offline clients:
    - [ ] 9.5.1 Buffer messages while disconnected
    - [ ] 9.5.2 Replay buffered messages on reconnection
  - [ ] 9.6 Create event emitter for transaction updates
  - [ ] 9.7 Integrate WebSocket with transaction ingestion pipeline:
    - [ ] 9.7.1 Emit transaction_update when new transaction detected from The Graph
    - [ ] 9.7.2 Emit verification_update when verification completes
    - [ ] 9.7.3 Emit agent_status_update when agent status changes
  - [ ] 9.8 Implement broadcast logic for multi-client scenarios
  - [ ] 9.9 Create heartbeat/ping mechanism to detect dead connections
  - [ ] 9.10 Implement frontend WebSocket client hook (useWebSocket)
  - [ ] 9.11 Write unit tests for WebSocket server
  - [ ] 9.12 Write E2E tests for real-time message delivery

---

### TIER 4: Production Readiness - Week 4-5

- [ ] 10.0 Caching & Data Retention Strategy
  - [ ] 10.1 Define retention policy decision:
    - [ ] 10.1.1 Decide between 7-day and 30-day hot storage
    - [ ] 10.1.2 Document archival process for older transactions
  - [ ] 10.2 Create archival job:
    - [ ] 10.2.1 Move transactions older than policy to archive table
    - [ ] 10.2.2 Compress archived data (optional)
  - [ ] 10.3 Optimize query performance for filtered transactions
    - [ ] 10.3.1 Create composite indexes (agent_id, timestamp, verification_status)
    - [ ] 10.3.2 Test query performance with 50+ agents
  - [ ] 10.4 Implement cache warming for active agents:
    - [ ] 10.4.1 Pre-load recent transactions for frequently accessed agents
    - [ ] 10.4.2 Use Redis or in-memory cache
  - [ ] 10.5 Create cache invalidation strategy:
    - [ ] 10.5.1 Invalidate on new transaction
    - [ ] 10.5.2 TTL-based expiry
  - [ ] 10.6 Implement storage monitoring:
    - [ ] 10.6.1 Track database size
    - [ ] 10.6.2 Alert if nearing retention limit
  - [ ] 10.7 Create cleanup automation for old cache entries
  - [ ] 10.8 Write tests for cache performance and invalidation

- [ ] 11.0 DevOps & Deployment Pipeline
  - [ ] 11.1 Set up GitHub Actions CI/CD:
    - [ ] 11.1.1 Lint checks (ESLint, Prettier)
    - [ ] 11.1.2 Type checking (TypeScript)
    - [ ] 11.1.3 Unit tests (Jest)
    - [ ] 11.1.4 Integration tests
  - [ ] 11.2 Create Docker Compose for local development:
    - [ ] 11.2.1 PostgreSQL container
    - [ ] 11.2.2 Redis container (optional, for caching)
  - [ ] 11.3 Set up environment configuration (dev/staging/prod):
    - [ ] 11.3.1 .env files with proper examples
    - [ ] 11.3.2 Environment validation on startup
  - [ ] 11.4 Create secrets management (environment variables, API keys)
  - [ ] 11.5 Set up database provisioning:
    - [ ] 11.5.1 Create database instances for staging/prod
    - [ ] 11.5.2 Automated backup strategy
  - [ ] 11.6 Configure deployment automation:
    - [ ] 11.6.1 Next.js frontend deployment (Vercel or similar)
    - [ ] 11.6.2 Backend deployment (AWS/Heroku/VPS)
  - [ ] 11.7 Create monitoring dashboard (uptime, errors, response times)
  - [ ] 11.8 Set up alerting for critical issues
  - [ ] 11.9 Create runbook for common operational tasks
  - [ ] 11.10 Document disaster recovery process

- [ ] 12.0 Agent Auto-Detection Algorithm
  - [ ] 12.1 Research agent detection heuristics:
    - [ ] 12.1.1 Identify contract patterns for AI agents
    - [ ] 12.1.2 Analyze transaction patterns from agent wallets
  - [ ] 12.2 Check for known agent registry (if available):
    - [ ] 12.2.1 Uniswap V3 bot registry
    - [ ] 12.2.2 Other public registries
  - [ ] 12.3 Create agent detection service:
    - [ ] 12.3.1 Fetch wallet transaction history
    - [ ] 12.3.2 Identify agent contracts by heuristics
    - [ ] 12.3.3 Score confidence of detection
  - [ ] 12.4 Implement registry lookup:
    - [ ] 12.4.1 Query known agent sources
    - [ ] 12.4.2 Display registry status in UI
  - [ ] 12.5 Create user confirmation flow:
    - [ ] 12.5.1 Show detected agents
    - [ ] 12.5.2 Allow user to accept/reject/add manually
    - [ ] 12.5.3 Save confirmed agents to dashboard
  - [ ] 12.6 Implement backend detection job:
    - [ ] 12.6.1 Run detection for newly connected wallets
    - [ ] 12.6.2 Re-run periodically to catch new agents
  - [ ] 12.7 Write unit tests for detection heuristics
  - [ ] 12.8 Write E2E tests with known agent wallets

---

### TIER 5: Feature Implementation - Week 3+ (parallel with Tier 3)

- [ ] 13.0 Project Setup & Infrastructure
  - [ ] 13.1 Initialize Next.js 14 project with TypeScript
  - [ ] 13.2 Install core dependencies (React, TanStack Query, Zustand, Wagmi, Viem)
  - [ ] 13.3 Set up Express backend server
  - [ ] 13.4 Configure TypeScript for both frontend and backend
  - [ ] 13.5 Set up Prettier and ESLint for code formatting
  - [ ] 13.6 Create project folder structure:
    - [ ] 13.6.1 /frontend (Next.js app)
    - [ ] 13.6.2 /backend (Express server)
    - [ ] 13.6.3 /shared (types, constants)
  - [ ] 13.7 Create development README and setup guide
  - [ ] 13.8 Configure hot reload for development

- [ ] 14.0 Agent Management System
  - [ ] 14.1 Create User/Agent data models in database
  - [ ] 14.2 Implement API endpoints for agent management:
    - [ ] 14.2.1 POST /api/agents (manual add)
    - [ ] 14.2.2 PATCH /api/agents/:id (rename/label)
    - [ ] 14.2.3 DELETE /api/agents/:id (remove)
    - [ ] 14.2.4 GET /api/agents (list all user agents)
  - [ ] 14.3 Create agent auto-detection flow (uses Task 12.0)
  - [ ] 14.4 Implement agent status tracking:
    - [ ] 14.4.1 active/idle/error states
    - [ ] 14.4.2 last_activity timestamp
  - [ ] 14.5 Create agent list sidebar component (React)
  - [ ] 14.6 Implement agent selection and filtering
  - [ ] 14.7 Create agent detail modal/panel
  - [ ] 14.8 Write tests for agent CRUD operations
  - [ ] 14.9 Write E2E tests for agent onboarding flow

- [ ] 15.0 Activity Feed UI & Real-time Updates
  - [ ] 15.1 Create transaction data fetching hook (TanStack Query)
  - [ ] 15.2 Create ActivityFeed component with:
    - [ ] 15.2.1 Chronological transaction list
    - [ ] 15.2.2 Agent icon/name per transaction
    - [ ] 15.2.3 Action description (human-readable)
    - [ ] 15.2.4 Verification status badge (✓/⚠/✗)
    - [ ] 15.2.5 Timestamp display
  - [ ] 15.3 Implement feed filtering:
    - [ ] 15.3.1 Filter by agent
    - [ ] 15.3.2 Filter by asset type
    - [ ] 15.3.3 Filter by protocol
    - [ ] 15.3.4 Filter by date range
    - [ ] 15.3.5 Filter by verification status
  - [ ] 15.4 Integrate WebSocket real-time updates (uses Task 9.0)
  - [ ] 15.5 Implement transaction pagination
  - [ ] 15.6 Create responsive layout:
    - [ ] 15.6.1 Desktop (3-column: sidebar, feed, stats)
    - [ ] 15.6.2 Tablet (2-column: sidebar, feed+stats)
    - [ ] 15.6.3 Mobile (full width feed)
  - [ ] 15.7 Implement loading states and skeleton screens
  - [ ] 15.8 Create empty state messaging
  - [ ] 15.9 Write component tests for feed rendering
  - [ ] 15.10 Write E2E tests for feed interactions

- [ ] 16.0 Transaction Detail View & Analytics
  - [ ] 16.1 Create transaction detail modal component
  - [ ] 16.2 Display transaction breakdown:
    - [ ] 16.2.1 Input tokens/amounts
    - [ ] 16.2.2 Output tokens/amounts
    - [ ] 16.2.3 Gas cost
    - [ ] 16.2.4 Slippage
    - [ ] 16.2.5 MEV exposure (if applicable)
  - [ ] 16.3 Display verification proof:
    - [ ] 16.3.1 Verification status details
    - [ ] 16.3.2 Link to Etherscan
    - [ ] 16.3.3 Raw event logs (collapsible)
  - [ ] 16.4 Create quick stats panel with:
    - [ ] 16.4.1 Total portfolio value
    - [ ] 16.4.2 Active agents count
    - [ ] 16.4.3 Overall verification rate
    - [ ] 16.4.4 Recent activity indicator
  - [ ] 16.5 Implement transaction search/filter
  - [ ] 16.6 Create responsive detail view
  - [ ] 16.7 Write component tests
  - [ ] 16.8 Write E2E tests for detail interactions

- [ ] 17.0 Testing, Security & Launch
  - [ ] 17.1 Conduct code review (peer review of all tasks)
  - [ ] 17.2 Run security audit:
    - [ ] 17.2.1 Check for common vulnerabilities (OWASP top 10)
    - [ ] 17.2.2 Review wallet handling (no private keys stored)
    - [ ] 17.2.3 Review API authentication (JWT validation)
    - [ ] 17.2.4 Check data access controls
  - [ ] 17.3 Write comprehensive unit test suite (>80% coverage)
  - [ ] 17.4 Write integration test suite
  - [ ] 17.5 Run E2E tests on staging environment
  - [ ] 17.6 Performance testing:
    - [ ] 17.6.1 Load test with 50+ agents
    - [ ] 17.6.2 Test feed update latency (target <30s)
    - [ ] 17.6.3 Measure dashboard load time (target <3s)
  - [ ] 17.7 Accessibility testing (WCAG 2.1 AA)
  - [ ] 17.8 Mobile responsiveness testing
  - [ ] 17.9 Create beta testing plan:
    - [ ] 17.9.1 Define beta user criteria
    - [ ] 17.9.2 Create feedback collection process
    - [ ] 17.9.3 Set up monitoring for beta environment
  - [ ] 17.10 Deploy to production
  - [ ] 17.11 Monitor key metrics (uptime, error rates, user activity)
  - [ ] 17.12 Create post-launch runbook

---

## Notes

### Task Dependencies & Parallel Work
- **Tier 1 tasks (1-3)** must complete before other work
- **Tier 2 tasks (4-6)** can start after Tier 1; some can run in parallel
- **Tier 3 tasks (7-9)** enable feature work; can overlap with Tier 2
- **Tier 4 tasks (10-12)** can run in parallel with feature work
- **Tier 5 tasks (13-17)** can start after tasks 1-3 and 13.0, then progress as foundations complete
- Frontend and backend can work in parallel after API contracts (Task 2.0) are defined

### Critical Path
Database Schema (1.0) → API Contracts (2.0) → Testing Setup (3.0) → [Tier 2 & Feature Work in parallel]

### Recommended Work Schedule (8-week MVP)
- **Week 1-2:** Tasks 1.0, 2.0, 3.0, 13.0 (foundation + project setup)
- **Week 2-3:** Tasks 4.0, 5.0, 6.0, 14.0 (auth + integration + agent management)
- **Week 3-4:** Tasks 7.0, 8.0, 9.0, 15.0 (parsing + verification + feed UI)
- **Week 4-5:** Tasks 10.0, 11.0, 12.0, 16.0 (caching + devops + detail view)
- **Week 5-7:** Task 17.0 (testing, security, optimization)
- **Week 8:** Launch and monitoring

### Instructions for Completing Tasks
As you complete each sub-task, mark it as done by changing `- [ ]` to `- [x]`. Update the file frequently to track progress.

Example:
- Before: `- [ ] 1.1 Design PostgreSQL schema...`
- After: `- [x] 1.1 Design PostgreSQL schema...`
