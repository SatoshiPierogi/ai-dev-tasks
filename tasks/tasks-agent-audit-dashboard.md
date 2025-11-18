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

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout branch: `git checkout -b claude/agent-audit-dashboard-mvp-<sessionid>`
  - [x] 0.2 Verify branch is based on main/master

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
    - [ ] 3.1.1 Install Jest, ts-jest, @types/jest, jest-extended
    - [ ] 3.1.2 Create jest.config.js with TypeScript support
    - [ ] 3.1.3 Set up coverage thresholds (80% for functions/lines)
    - [ ] 3.1.4 Configure test environment (node)
    - [ ] 3.1.5 Create test setup file for global mocks
  - [ ] 3.2 Configure test database (isolated PostgreSQL instance for tests)
    - [ ] 3.2.1 Use Docker container or test database for Jest runs
    - [ ] 3.2.2 Create setup/teardown scripts for test database
    - [ ] 3.2.3 Create seed script to populate test data
  - [ ] 3.3 Create test fixtures directory with seed data:
    - [ ] 3.3.1 `backend/test/fixtures/wallets.json` - Mock wallet addresses
    - [ ] 3.3.2 `backend/test/fixtures/agents.json` - Mock agent contracts
    - [ ] 3.3.3 `backend/test/fixtures/transactions.json` - 100+ realistic transactions
    - [ ] 3.3.4 Create fixture factory functions for dynamic test data generation
  - [ ] 3.4 Create The Graph response mocks for each protocol:
    - [ ] 3.4.1 `backend/src/mocks/thegraph.uniswap.ts` - Uniswap swap responses
    - [ ] 3.4.2 `backend/src/mocks/thegraph.aave.ts` - Aave deposit/withdraw responses
    - [ ] 3.4.3 `backend/src/mocks/thegraph.curve.ts` - Curve LP responses
    - [ ] 3.4.4 `backend/src/mocks/thegraph.balancer.ts` - Balancer responses
  - [ ] 3.5 Create blockchain/RPC mocks:
    - [ ] 3.5.1 `backend/src/mocks/blockchain.ts` - Transaction receipts, logs
    - [ ] 3.5.2 `backend/src/mocks/rpc.responses.ts` - Realistic RPC responses
    - [ ] 3.5.3 Create mock provider (Ethers.js compatible)
  - [ ] 3.6 Create wallet connection mocks for testing auth flows
    - [ ] 3.6.1 `backend/src/mocks/wallet.ts` - Mock wallet signers
    - [ ] 3.6.2 `backend/test/helpers/signatures.ts` - Helper to generate signatures
  - [ ] 3.7 Set up E2E testing framework (Playwright or Cypress)
    - [ ] 3.7.1 Install playwright/cypress
    - [ ] 3.7.2 Create e2e test configuration
    - [ ] 3.7.3 Create page objects for common dashboard elements
  - [ ] 3.8 Create database reset utilities for test isolation
    - [ ] 3.8.1 `backend/test/helpers/db.ts` - Reset database between tests
    - [ ] 3.8.2 Implement transaction rollback for test isolation
  - [ ] 3.9 Create Jest test helpers and utilities
    - [ ] 3.9.1 `backend/test/helpers/request.ts` - HTTP request helpers
    - [ ] 3.9.2 `backend/test/helpers/matchers.ts` - Custom Jest matchers
    - [ ] 3.9.3 `backend/test/helpers/wait.ts` - Async test utilities
  - [ ] 3.10 Document test setup in docs/SETUP.md
  - [ ] 3.11 Create `backend/test/jest.setup.ts` for global test configuration
  - [ ] 3.12 Create CI/CD test script in package.json

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
  - [ ] 4.9 Jest Unit Tests - Authentication Service
    - [ ] 4.9.1 `backend/src/services/auth.test.ts` - Test signature verification
    - [ ] 4.9.2 Test JWT token generation and validation
    - [ ] 4.9.3 Test challenge message generation
    - [ ] 4.9.4 Test token refresh logic
    - [ ] 4.9.5 Test invalid signature rejection
    - [ ] 4.9.6 Aim for 90%+ coverage of auth service
  - [ ] 4.10 Jest Unit Tests - Auth Middleware
    - [ ] 4.10.1 `backend/src/middleware/auth.test.ts` - Test middleware validation
    - [ ] 4.10.2 Test missing token handling
    - [ ] 4.10.3 Test expired token handling
    - [ ] 4.10.4 Test invalid token handling
    - [ ] 4.10.5 Test context attachment
  - [ ] 4.11 Jest Integration Tests - Auth Flows
    - [ ] 4.11.1 `backend/src/routes/auth.test.ts` - Test full sign-in flow
    - [ ] 4.11.2 Test POST /api/auth/challenge endpoint
    - [ ] 4.11.3 Test POST /api/auth/verify endpoint
    - [ ] 4.11.4 Test JWT token returned correctly
    - [ ] 4.11.5 Test protected endpoints reject unauthenticated requests
  - [ ] 4.12 E2E Tests - Wallet Connection
    - [ ] 4.12.1 Create E2E test for MetaMask wallet connection
    - [ ] 4.12.2 Test signature request and approval flow
    - [ ] 4.12.3 Test session persistence across page reloads
    - [ ] 4.12.4 Test multi-wallet switching scenario
  - [ ] 4.13 Run test suite and verify 85%+ coverage: `npm test -- src/middleware/auth.ts src/services/auth.ts`

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
  - [ ] 5.13 Jest Unit Tests - Protocol Clients
    - [ ] 5.13.1 `backend/src/services/thegraph.uniswap.test.ts` - Test Uniswap query builder
    - [ ] 5.13.2 Test query pagination logic
    - [ ] 5.13.3 `backend/src/services/thegraph.aave.test.ts` - Test Aave transactions parsing
    - [ ] 5.13.4 `backend/src/services/thegraph.curve.test.ts` - Test Curve LP parsing
    - [ ] 5.13.5 Test each protocol client in isolation with mocked responses
  - [ ] 5.14 Jest Unit Tests - Rate Limiting & Error Recovery
    - [ ] 5.14.1 `backend/src/services/thegraph.ts` unit tests for rate limiting
    - [ ] 5.14.2 Test exponential backoff logic with Jest fake timers
    - [ ] 5.14.3 Test fallback behavior when primary fails
    - [ ] 5.14.4 Test error logging and alerting
  - [ ] 5.15 Jest Unit Tests - Data Normalization
    - [ ] 5.15.1 `backend/src/services/normalizer.test.ts` - Test protocol-specific → unified conversion
    - [ ] 5.15.2 Test handling of missing/malformed data
    - [ ] 5.15.3 Test field mapping accuracy
  - [ ] 5.16 Jest Unit Tests - Deduplication
    - [ ] 5.16.1 `backend/src/services/deduplicator.test.ts` - Test duplicate detection
    - [ ] 5.16.2 Test with overlapping transactions from multiple protocols
    - [ ] 5.16.3 Test hash collision handling
  - [ ] 5.17 Jest Integration Tests - The Graph Flow
    - [ ] 5.17.1 `backend/src/jobs/graphSync.test.ts` - Test full The Graph sync job
    - [ ] 5.17.2 Mock The Graph responses using fixtures
    - [ ] 5.17.3 Test database writes after normalization
    - [ ] 5.17.4 Test deduplication against database
  - [ ] 5.18 Run full test suite with coverage: `npm test -- src/services/thegraph*`

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
  - [ ] 6.10 Jest Unit Tests - Error Handling
    - [ ] 6.10.1 `backend/src/middleware/errors.test.ts` - Test error categorization
    - [ ] 6.10.2 Test error response formatting
    - [ ] 6.10.3 Test HTTP status code mapping
    - [ ] 6.10.4 Test error logging
  - [ ] 6.11 Jest Unit Tests - Logging Middleware
    - [ ] 6.11.1 `backend/src/middleware/logging.test.ts` - Test request/response logging
    - [ ] 6.11.2 Test sensitive data masking
    - [ ] 6.11.3 Test performance timing capture
  - [ ] 6.12 Jest Integration Tests - Error Flows
    - [ ] 6.12.1 `backend/src/routes/*.test.ts` - Test error responses from endpoints
    - [ ] 6.12.2 Test 400s for invalid input
    - [ ] 6.12.3 Test 500s for system errors
    - [ ] 6.12.4 Verify error tracking service receives alerts
  - [ ] 6.13 Run error handling test suite: `npm test -- src/middleware/errors.test.ts src/middleware/logging.test.ts`

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
  - [ ] 7.11 Jest Unit Tests - Protocol Parsers
    - [ ] 7.11.1 `backend/src/parsers/uniswap.test.ts` - Test Swap event parsing with real data
    - [ ] 7.11.2 Test amount extraction and decimal handling
    - [ ] 7.11.3 Test slippage calculation
    - [ ] 7.11.4 `backend/src/parsers/aave.test.ts` - Test Deposit/Withdraw/Borrow/Repay parsing
    - [ ] 7.11.5 `backend/src/parsers/curve.test.ts` - Test LP operation parsing
    - [ ] 7.11.6 `backend/src/parsers/balancer.test.ts` - Test Balancer parsing
    - [ ] 7.11.7 Test each parser with 10+ real transaction examples
  - [ ] 7.12 Jest Unit Tests - Token Metadata & Decimals
    - [ ] 7.12.1 `backend/src/utils/tokens.test.ts` - Test decimal conversion
    - [ ] 7.12.2 Test handling of edge cases (18 decimals, 6 decimals, 8 decimals)
    - [ ] 7.12.3 Test token symbol/name resolution
  - [ ] 7.13 Jest Unit Tests - Error Handling in Parsers
    - [ ] 7.13.1 Test malformed event data handling
    - [ ] 7.13.2 Test missing fields in events
    - [ ] 7.13.3 Test invalid amounts
    - [ ] 7.13.4 Verify no parser crashes on bad input
  - [ ] 7.14 Jest Unit Tests - Human-Readable Descriptions
    - [ ] 7.14.1 Test description generation for each transaction type
    - [ ] 7.14.2 Test formatting with token symbols
    - [ ] 7.14.3 Test edge cases (very large amounts, very small amounts)
  - [ ] 7.15 Run parser test suite with coverage: `npm test -- src/parsers/`

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
  - [ ] 8.10 Jest Unit Tests - Verification Service
    - [ ] 8.10.1 `backend/src/services/verification.test.ts` - Test receipt fetching
    - [ ] 8.10.2 Test transaction status validation (success/failed)
    - [ ] 8.10.3 Test block confirmation counting (pending/confirmed)
    - [ ] 8.10.4 Test with mocked RPC responses
  - [ ] 8.11 Jest Unit Tests - Event Log Validation
    - [ ] 8.11.1 `backend/src/services/eventValidator.test.ts` - Test event log parsing
    - [ ] 8.11.2 Test event signature matching
    - [ ] 8.11.3 Test with real Uniswap/Aave/Curve event logs
    - [ ] 8.11.4 Test malformed log handling
  - [ ] 8.12 Jest Unit Tests - Verification State Machine
    - [ ] 8.12.1 Test state transitions (pending → verified/unverified)
    - [ ] 8.12.2 Test reorg handling
    - [ ] 8.12.3 Test re-verification logic
  - [ ] 8.13 Jest Unit Tests - Proof Generation
    - [ ] 8.13.1 `backend/src/services/proofGenerator.test.ts` - Test proof object creation
    - [ ] 8.13.2 Test Etherscan link generation
    - [ ] 8.13.3 Test proof serialization/deserialization
  - [ ] 8.14 Jest Unit Tests - RPC Fallback & Rate Limiting
    - [ ] 8.14.1 Test primary provider failure → fallback success
    - [ ] 8.14.2 Test RPC timeout handling
    - [ ] 8.14.3 Test rate limit detection and queueing
    - [ ] 8.14.4 Use Jest fake timers for timeout tests
  - [ ] 8.15 Jest Integration Tests - Full Verification Flow
    - [ ] 8.15.1 `backend/src/jobs/verify.test.ts` - Test end-to-end verification
    - [ ] 8.15.2 Mock blockchain responses using fixtures
    - [ ] 8.15.3 Test database updates with proof data
  - [ ] 8.16 Run verification test suite: `npm test -- src/services/verification* src/jobs/verify.test.ts`

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
  - [ ] 9.11 Jest Unit Tests - WebSocket Server
    - [ ] 9.11.1 `backend/src/websocket/server.test.ts` - Test connection handling
    - [ ] 9.11.2 Test JWT authentication for WebSocket connections
    - [ ] 9.11.3 Test per-user channel isolation
    - [ ] 9.11.4 Test message broadcasting
    - [ ] 9.11.5 Test graceful disconnection
  - [ ] 9.12 Jest Unit Tests - Connection Management
    - [ ] 9.12.1 `backend/src/websocket/connectionManager.test.ts` - Test reconnection logic
    - [ ] 9.12.2 Test message queueing for offline clients
    - [ ] 9.12.3 Test message replay on reconnection
    - [ ] 9.12.4 Test heartbeat/ping mechanism
  - [ ] 9.13 Jest Unit Tests - Event Emitter Integration
    - [ ] 9.13.1 `backend/src/websocket/emitter.test.ts` - Test transaction_update emission
    - [ ] 9.13.2 Test verification_update emission
    - [ ] 9.13.3 Test agent_status_update emission
  - [ ] 9.14 Jest Integration Tests - Real-Time Flow
    - [ ] 9.14.1 `backend/src/websocket/__tests__/integration.test.ts` - Test WebSocket + data integration
    - [ ] 9.14.2 Emit transaction from The Graph, verify WebSocket message sent
    - [ ] 9.14.3 Test with multiple simultaneous connections
  - [ ] 9.15 Run WebSocket test suite: `npm test -- src/websocket/`

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
  - [ ] 10.8 Jest Unit Tests - Caching & Retention
    - [ ] 10.8.1 `backend/src/services/cache.test.ts` - Test cache warming
    - [ ] 10.8.2 Test cache invalidation on new transactions
    - [ ] 10.8.3 Test TTL-based cache expiry
    - [ ] 10.8.4 Test cache hit/miss scenarios
  - [ ] 10.9 Jest Unit Tests - Archival Job
    - [ ] 10.9.1 `backend/src/jobs/archival.test.ts` - Test transaction archival
    - [ ] 10.9.2 Test age calculation for archival threshold
    - [ ] 10.9.3 Test data compression (if implemented)
  - [ ] 10.10 Jest Integration Tests - Performance
    - [ ] 10.10.1 `backend/test/performance/caching.test.ts` - Test query performance
    - [ ] 10.10.2 Benchmark queries with 50+ agents, 1000s of transactions
    - [ ] 10.10.3 Verify query times < 500ms
  - [ ] 10.11 Run caching test suite: `npm test -- src/services/cache.test.ts src/jobs/archival.test.ts`

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
  - [ ] 12.7 Jest Unit Tests - Detection Heuristics
    - [ ] 12.7.1 `backend/src/services/detection.test.ts` - Test agent contract identification
    - [ ] 12.7.2 Test heuristic scoring (confidence levels)
    - [ ] 12.7.3 Test false positive reduction
    - [ ] 12.7.4 Test with known agent wallet data
  - [ ] 12.8 Jest Unit Tests - Registry Lookup
    - [ ] 12.8.1 `backend/src/services/agentRegistry.test.ts` - Test registry queries
    - [ ] 12.8.2 Mock external registry responses
    - [ ] 12.8.3 Test registry fallback behavior
  - [ ] 12.9 Jest Integration Tests - Full Detection Flow
    - [ ] 12.9.1 `backend/src/jobs/detection.test.ts` - Test end-to-end detection
    - [ ] 12.9.2 Mock wallet transaction history
    - [ ] 12.9.3 Test database updates with detected agents
  - [ ] 12.10 Run detection test suite: `npm test -- src/services/detection.test.ts src/jobs/detection.test.ts`

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
  - [ ] 14.8 Jest Unit Tests - Agent API Endpoints
    - [ ] 14.8.1 `backend/src/routes/agents.test.ts` - Test POST /api/agents endpoint
    - [ ] 14.8.2 Test PATCH /api/agents/:id endpoint
    - [ ] 14.8.3 Test DELETE /api/agents/:id endpoint
    - [ ] 14.8.4 Test GET /api/agents endpoint with filtering
    - [ ] 14.8.5 Test wallet-scoped access (users can only see own agents)
    - [ ] 14.8.6 Test invalid input handling
  - [ ] 14.9 Jest Unit Tests - Agent Models
    - [ ] 14.9.1 `backend/src/models/Agent.test.ts` - Test agent creation/updates
    - [ ] 14.9.2 Test agent validation
    - [ ] 14.9.3 Test status transitions
  - [ ] 14.10 Jest Component Tests - Agent Sidebar
    - [ ] 14.10.1 `frontend/components/AgentList.test.tsx` - Test agent list rendering
    - [ ] 14.10.2 Test agent selection
    - [ ] 14.10.3 Test add/remove agent buttons
    - [ ] 14.10.4 Test status indicator display
  - [ ] 14.11 Jest Component Tests - Agent Detail Modal
    - [ ] 14.11.1 `frontend/components/AgentDetailModal.test.tsx` - Test modal rendering
    - [ ] 14.11.2 Test rename/label editing
    - [ ] 14.11.3 Test form submission
  - [ ] 14.12 E2E Tests - Agent Onboarding
    - [ ] 14.12.1 Test full onboarding: connect wallet → auto-detect agents → confirm selection
    - [ ] 14.12.2 Test manual agent addition by address
    - [ ] 14.12.3 Test agent removal from dashboard
  - [ ] 14.13 Run agent management test suite: `npm test -- src/routes/agents.test.ts frontend/components/AgentList.test.tsx`

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
  - [ ] 15.9 Jest Component Tests - Activity Feed
    - [ ] 15.9.1 `frontend/components/ActivityFeed.test.tsx` - Test transaction list rendering
    - [ ] 15.9.2 Test transaction entry display (agent, action, amounts, timestamp, verification status)
    - [ ] 15.9.3 Test loading state display
    - [ ] 15.9.4 Test empty state display
    - [ ] 15.9.5 Test pagination loading and "load more" button
    - [ ] 15.9.6 Test real-time update integration (WebSocket messages)
  - [ ] 15.10 Jest Component Tests - Feed Filters
    - [ ] 15.10.1 `frontend/components/FeedFilters.test.tsx` - Test filter controls
    - [ ] 15.10.2 Test agent filter dropdown
    - [ ] 15.10.3 Test asset type filter
    - [ ] 15.10.4 Test protocol filter
    - [ ] 15.10.5 Test date range picker
    - [ ] 15.10.6 Test verification status filter buttons
    - [ ] 15.10.7 Test filter state management
  - [ ] 15.11 Jest Hook Tests - useActivityFeed Hook
    - [ ] 15.11.1 `frontend/hooks/useActivityFeed.test.ts` - Test data fetching
    - [ ] 15.11.2 Test TanStack Query integration
    - [ ] 15.11.3 Test filter state management
    - [ ] 15.11.4 Test pagination state
  - [ ] 15.12 Jest Component Tests - Responsive Layout
    - [ ] 15.12.1 Test layout at different breakpoints (mobile, tablet, desktop)
    - [ ] 15.12.2 Test sidebar collapse on mobile
    - [ ] 15.12.3 Test stats panel visibility changes
  - [ ] 15.13 E2E Tests - Activity Feed Interactions
    - [ ] 15.13.1 Test user can view feed after connecting wallet
    - [ ] 15.13.2 Test user can filter transactions by agent
    - [ ] 15.13.3 Test user can click transaction to open detail view
    - [ ] 15.13.4 Test real-time feed updates appear within 30 seconds
  - [ ] 15.14 Run activity feed test suite: `npm test -- frontend/components/ActivityFeed.test.tsx frontend/hooks/useActivityFeed.test.ts`

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
  - [ ] 16.7 Jest Component Tests - Transaction Detail Modal
    - [ ] 16.7.1 `frontend/components/TransactionDetail.test.tsx` - Test modal rendering
    - [ ] 16.7.2 Test transaction breakdown display (inputs, outputs, gas, slippage)
    - [ ] 16.7.3 Test verification proof display
    - [ ] 16.7.4 Test Etherscan link generation and opening
    - [ ] 16.7.5 Test raw event logs display (collapsible)
  - [ ] 16.8 Jest Component Tests - Quick Stats Panel
    - [ ] 16.8.1 `frontend/components/QuickStats.test.tsx` - Test stats panel rendering
    - [ ] 16.8.2 Test total portfolio value calculation
    - [ ] 16.8.3 Test active agents count
    - [ ] 16.8.4 Test verification rate percentage
    - [ ] 16.8.5 Test real-time stats updates
  - [ ] 16.9 Jest Component Tests - Transaction Search
    - [ ] 16.9.1 `frontend/components/TransactionSearch.test.tsx` - Test search input
    - [ ] 16.9.2 Test search suggestions
    - [ ] 16.9.3 Test result filtering
  - [ ] 16.10 E2E Tests - Transaction Detail Interactions
    - [ ] 16.10.1 Test clicking transaction opens detail modal
    - [ ] 16.10.2 Test Etherscan link works
    - [ ] 16.10.3 Test event logs expand/collapse
    - [ ] 16.10.4 Test mobile detail view (full screen)
  - [ ] 16.11 Run detail view test suite: `npm test -- frontend/components/TransactionDetail.test.tsx frontend/components/QuickStats.test.tsx`

- [ ] 17.0 Testing, Security & Launch
  - [ ] 17.1 Conduct code review (peer review of all tasks)
  - [ ] 17.2 Run security audit:
    - [ ] 17.2.1 Check for common vulnerabilities (OWASP top 10)
    - [ ] 17.2.2 Review wallet handling (no private keys stored)
    - [ ] 17.2.3 Review API authentication (JWT validation)
    - [ ] 17.2.4 Check data access controls
  - [ ] 17.3 Jest Coverage Analysis & Gap Filling
    - [ ] 17.3.1 Run full test coverage report: `npm test -- --coverage`
    - [ ] 17.3.2 Verify backend service coverage >90%
    - [ ] 17.3.3 Verify frontend component coverage >85%
    - [ ] 17.3.4 Identify uncovered branches and add tests
    - [ ] 17.3.5 Generate coverage report for CI/CD
  - [ ] 17.4 Jest Error Path Testing
    - [ ] 17.4.1 Test error handling for all major services
    - [ ] 17.4.2 Test API error responses for all endpoints
    - [ ] 17.4.3 Test error boundary components (React)
    - [ ] 17.4.4 Test graceful degradation when services fail
  - [ ] 17.5 Jest Performance Testing
    - [ ] 17.5.1 `backend/test/performance/api.test.ts` - Load test API endpoints
    - [ ] 17.5.2 Test API response times with 50+ agents, 1000+ transactions
    - [ ] 17.5.3 Measure feed update latency (target <30s)
    - [ ] 17.5.4 Measure dashboard load time (target <3s initial load)
    - [ ] 17.5.5 Test WebSocket throughput with multiple clients
  - [ ] 17.6 Jest Security Testing
    - [ ] 17.6.1 Test authentication bypass attempts (invalid JWTs, missing tokens)
    - [ ] 17.6.2 Test authorization (users can't access other users' agents)
    - [ ] 17.6.3 Test input validation (SQL injection, XSS prevention)
    - [ ] 17.6.4 Test rate limiting on sensitive endpoints
  - [ ] 17.7 Integration Test Suite - Full User Workflows
    - [ ] 17.7.1 `backend/test/integration/workflows.test.ts` - Test complete user journeys
    - [ ] 17.7.2 Test: Connect wallet → detect agents → view feed → click transaction
    - [ ] 17.7.3 Test: Add agent manually → receive real-time update
    - [ ] 17.7.4 Test: Multi-agent portfolio view with filtering
    - [ ] 17.7.5 Test: Agent removal and cleanup
  - [ ] 17.8 E2E Test Suite - Staging Deployment
    - [ ] 17.8.1 Deploy application to staging environment
    - [ ] 17.8.2 Run full E2E test suite on staging (Playwright/Cypress)
    - [ ] 17.8.3 Test user registration and wallet connection (real MetaMask)
    - [ ] 17.8.4 Test agent detection with real contracts
    - [ ] 17.8.5 Test real-time updates with live WebSocket
    - [ ] 17.8.6 Verify all performance targets met on staging
  - [ ] 17.9 Accessibility & Mobile Testing
    - [ ] 17.9.1 Run axe accessibility audit on all pages
    - [ ] 17.9.2 Test WCAG 2.1 AA compliance
    - [ ] 17.9.3 Test mobile responsiveness (iPhone, Android, tablets)
    - [ ] 17.9.4 Test keyboard navigation
    - [ ] 17.9.5 Test screen reader compatibility
  - [ ] 17.10 Create Comprehensive Test Report
    - [ ] 17.10.1 Document test coverage (unit, integration, E2E)
    - [ ] 17.10.2 Document performance test results
    - [ ] 17.10.3 List all known issues and mitigations
    - [ ] 17.10.4 Create test status dashboard/report
  - [ ] 17.11 Create beta testing plan:
    - [ ] 17.11.1 Define beta user criteria (10+ users across different profiles)
    - [ ] 17.11.2 Create feedback collection process
    - [ ] 17.11.3 Set up monitoring for beta environment (error tracking, analytics)
    - [ ] 17.11.4 Create beta user support guide
  - [ ] 17.12 Deploy to production
    - [ ] 17.12.1 Run pre-deployment checklist
    - [ ] 17.12.2 Execute production deployment
    - [ ] 17.12.3 Run smoke tests (critical path)
    - [ ] 17.12.4 Monitor initial metrics
  - [ ] 17.13 Post-Launch Monitoring
    - [ ] 17.13.1 Monitor uptime (target 99%+)
    - [ ] 17.13.2 Monitor error rates (track in Sentry)
    - [ ] 17.13.3 Monitor user activity (DAU, connected agents, transactions viewed)
    - [ ] 17.13.4 Monitor API latency and WebSocket health
  - [ ] 17.14 Create post-launch runbook for incident response

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

---

## Jest Testing Strategy & Best Practices

### Test Structure (by task type)

#### Unit Tests
- **Location:** Alongside source files (`src/services/auth.ts` → `src/services/auth.test.ts`)
- **Coverage target:** 90%+ for backend services, 85%+ for components
- **Scope:** Test single functions/components in isolation with mocked dependencies
- **Command:** `npm test -- [filename].test.ts`

#### Integration Tests
- **Location:** `backend/test/integration/` directory
- **Coverage target:** Critical user workflows and service interactions
- **Scope:** Test multiple services working together with real(ish) data
- **Command:** `npm test -- test/integration/`

#### E2E Tests
- **Location:** `e2e/` directory (Playwright/Cypress)
- **Coverage target:** Complete user journeys from UI
- **Scope:** Test against staging/production environment
- **Command:** `npx playwright test` or `npx cypress run`

### Test Naming Conventions

```
✓ Good: auth.service.test.ts
✓ Good: useActivityFeed.test.ts
✗ Bad: test_auth.ts
✗ Bad: auth_test.ts

✓ Good: describe('AuthService', () => { it('should verify signature', () => {})})
✓ Good: describe('useActivityFeed', () => { it('should fetch transactions', () => {})})
✗ Bad: it('test signature')
```

### Key Testing Patterns for This Project

#### 1. Testing Services with Mocked External APIs
```typescript
// Example: Testing The Graph integration
describe('TheGraphService', () => {
  beforeEach(() => {
    jest.mock('./thegraph.client', () => ({
      query: jest.fn().mockResolvedValue(mockTheGraphResponse)
    }))
  })

  it('should fetch Uniswap swaps', async () => {
    const swaps = await service.getSwaps('0xAddress')
    expect(swaps).toHaveLength(5)
    expect(swaps[0].type).toBe('swap')
  })
})
```

#### 2. Testing Real-Time WebSocket Events
```typescript
// Example: Testing WebSocket message emission
describe('WebSocketServer', () => {
  it('should emit transaction_update on new transaction', (done) => {
    const mockSocket = createMockSocket()
    server.on('connection', (socket) => {
      socket.on('transaction_update', (data) => {
        expect(data.tx_hash).toBeDefined()
        done()
      })
      server.emit('transaction', mockTransaction)
    })
  })
})
```

#### 3. Testing React Components with Real-Time Data
```typescript
// Example: Testing ActivityFeed with mocked WebSocket
import { render, screen, waitFor } from '@testing-library/react'
describe('ActivityFeed', () => {
  it('should display transactions in real-time', async () => {
    render(<ActivityFeed />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Simulate WebSocket message
    mockWebSocket.emit('transaction', mockTransaction)

    await waitFor(() => {
      expect(screen.getByText(mockTransaction.description)).toBeInTheDocument()
    })
  })
})
```

#### 4. Testing Database Operations in Isolation
```typescript
// Example: Testing with test database
describe('TransactionRepository', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('should save and retrieve transactions', async () => {
    await repo.save(mockTransaction)
    const retrieved = await repo.findById(mockTransaction.id)
    expect(retrieved).toEqual(mockTransaction)
  })
})
```

#### 5. Testing Authentication & Authorization
```typescript
// Example: Testing JWT validation
describe('AuthMiddleware', () => {
  it('should reject request without token', async () => {
    const response = await request(app)
      .get('/api/agents')
      .expect(401)
  })

  it('should reject request with invalid token', async () => {
    const response = await request(app)
      .get('/api/agents')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401)
  })

  it('should reject users accessing other users\' agents', async () => {
    const response = await request(app)
      .get(`/api/agents/${otherUserAgentId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(403)
  })
})
```

### Coverage Requirements by Task

| Task | Service | Target Coverage | Key Test Files |
|------|---------|-----------------|-----------------|
| 4.0 (Auth) | Authentication | 90% | auth.service.test.ts, auth.middleware.test.ts |
| 5.0 (Graph) | The Graph | 85% | thegraph.*.test.ts |
| 7.0 (Parsers) | Transaction Parsers | 90% | parsers/*.test.ts |
| 8.0 (Verification) | Blockchain Verification | 90% | verification.test.ts |
| 9.0 (WebSocket) | Real-Time Updates | 85% | websocket/*.test.ts |
| 14.0 (Agents) | Agent Management | 90% | agents.test.ts, AgentList.test.tsx |
| 15.0 (Feed) | Activity Feed | 85% | ActivityFeed.test.tsx, useActivityFeed.test.ts |
| 16.0 (Detail) | Transaction Detail | 80% | TransactionDetail.test.tsx |

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific file
npm test -- src/services/auth.test.ts

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode (for development)
npm test -- --watch

# Run tests for specific pattern
npm test -- --testNamePattern="should verify signature"

# Run frontend tests only
npm test -- --testPathPattern="frontend"

# Run backend tests only
npm test -- --testPathPattern="backend/src"
```

### Mock Data & Fixtures

- **Location:** `backend/test/fixtures/` for data fixtures
- **Location:** `backend/src/mocks/` for service mocks
- **Pattern:** Use factory functions for dynamic test data
  - `createMockTransaction(overrides?)`
  - `createMockAgent(overrides?)`
  - `createMockWallet(overrides?)`

### Pre-Commit Hook

Add to `package.json` to prevent committing code with failing tests:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --bail --findRelatedTests"
    }
  }
}
```

### CI/CD Integration

All tests must pass before merge:
1. Run lint + type checks
2. Run unit tests (must pass)
3. Run integration tests (must pass)
4. Report coverage (must meet thresholds)
5. Only then allow merge to main

### Debugging Failed Tests

```bash
# Run single test with logging
npm test -- src/services/auth.test.ts --verbose

# Run test in debug mode (requires Node debugger)
node --inspect-brk node_modules/.bin/jest src/services/auth.test.ts

# Use `test.only()` to run single test
it.only('should verify signature', () => { ... })

# Use `test.skip()` to skip test temporarily
it.skip('should verify signature', () => { ... })
```
