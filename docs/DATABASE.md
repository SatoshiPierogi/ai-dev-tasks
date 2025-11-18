# Agent Audit Dashboard - Database Schema Documentation

## Overview

This document describes the PostgreSQL schema for the Agent Audit Dashboard MVP (Phase 1). The database is designed to:

1. **Store user and agent data** with wallet-based authentication
2. **Track all transactions** from monitored AI agents across protocols
3. **Maintain verification proofs** for transaction authenticity
4. **Support fast queries** on real-time activity feeds
5. **Enable efficient archival** of historical data
6. **Prevent duplicate transactions** from multiple data sources

**Database**: PostgreSQL 13+
**Schema File**: `backend/src/db/schema.sql`
**Size (MVP)**: ~100 MB for 1 month of data from 50 agents

---

## Table Specifications

### 1. USERS Table

Stores wallet addresses and user metadata.

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL UNIQUE, -- 0x...
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  email VARCHAR(255),
  display_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, deleted
  notification_settings JSONB,
  last_login TIMESTAMP,
  login_count INTEGER DEFAULT 0
)
```

**Key Points**:
- `wallet_address`: Ethereum wallet (0x...). Unique per user.
- Case-insensitive via `LOWER()` index
- Multi-wallet support: One user can have multiple wallets (via separate records)
- `notification_settings`: JSON for flexible notification channels (email, webhook, Telegram, Discord)

**Indexes**:
- `idx_users_wallet`: Fast lookup by wallet address
- `idx_users_created_at`: Sorted by creation date
- `idx_users_status`: Filter by account status

**Constraints**:
- Wallet address format: `0x[0-9a-fA-F]{40}`
- Valid statuses: `active`, `suspended`, `deleted`

---

### 2. AGENTS Table

Stores AI agent information and status.

```sql
CREATE TABLE agents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  contract_address VARCHAR(42) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  last_activity TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  auto_verified BOOLEAN DEFAULT FALSE,
  verification_source VARCHAR(100),
  transaction_count INTEGER DEFAULT 0,
  total_gas_spent NUMERIC(40, 8) DEFAULT 0,
  verification_rate NUMERIC(5, 2) DEFAULT 0,
  tags JSONB DEFAULT '[]'
)
```

**Key Points**:
- `contract_address`: The smart contract address of the AI agent
- `status`: Tracks agent state (active, paused, error, archived)
- `last_activity`: Timestamp of most recent transaction (denormalized for performance)
- `verification_rate`: 0-100 percentage of verified transactions (denormalized)
- `tags`: JSON array for categorization (e.g., ["dex-trading", "yield-farming"])
- `UNIQUE(user_id, contract_address)`: One agent per user cannot be added twice

**Denormalized Fields** (Updated periodically):
- `transaction_count`: Sum of transactions for this agent
- `total_gas_spent`: Sum of gas costs (Wei)
- `verification_rate`: Percentage of verified transactions

**Indexes**:
- `idx_agents_user_id`: Filter agents by user
- `idx_agents_status`: Filter by agent status
- `idx_agents_created_at`: Sorted chronologically
- `idx_agents_last_activity`: Show most recent agents first

---

### 3. TRANSACTIONS Table

Stores all on-chain transactions from monitored agents.

```sql
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT NOT NULL REFERENCES agents(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  tx_hash VARCHAR(66) NOT NULL, -- 0x...
  block_number BIGINT,
  transaction_index INTEGER,
  type VARCHAR(50) NOT NULL,
  protocol VARCHAR(100) NOT NULL,
  tokens_in JSONB NOT NULL,
  tokens_out JSONB NOT NULL,
  description TEXT NOT NULL,
  slippage NUMERIC(10, 8),
  gas_used NUMERIC(20, 0),
  gas_price NUMERIC(20, 0),
  total_gas_cost NUMERIC(40, 8),
  mev_exposure NUMERIC(10, 8),
  verification_status VARCHAR(20) DEFAULT 'pending',
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_blocks INTEGER DEFAULT 0,
  block_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  raw_data JSONB,
  UNIQUE(agent_id, tx_hash)
)
```

**Key Points**:
- **Hot Data**: Kept for 7-30 days (via archival job)
- **tx_hash**: Unique identifier per transaction (format: `0x[0-9a-fA-F]{64}`)
- **type**: Transaction type (swap, transfer, stake, lp, vote, bridge, custom)
- **protocol**: DEX/protocol name (uniswap_v3, aave, curve, balancer, etc.)
- **tokens_in/out**: JSON arrays of tokens with symbol, address, amount, decimals
- **verification_status**: pending, verified, or unverified
- **raw_data**: Protocol-specific event logs and function call data

**Example tokens_in**:
```json
[
  {
    "symbol": "ETH",
    "address": "0x0000000000000000000000000000000000000000",
    "amount": "1.5",
    "decimals": 18
  }
]
```

**Indexes** (Critical for Feed Performance):
- `idx_tx_agent_id`: Get all transactions for an agent
- `idx_tx_user_id`: Get all transactions for a user
- `idx_tx_verification_status`: Filter by verification status
- `idx_tx_agent_timestamp`: **Composite** - Agent feed (most common query)
- `idx_tx_user_agent_timestamp`: **Composite** - User's multi-agent feed
- `idx_tx_protocol`: Filter by protocol
- `idx_tx_type`: Filter by transaction type

**Constraints**:
- `tx_hash` format: `0x[0-9a-fA-F]{64}`
- `gas_cost` >= 0
- `UNIQUE(agent_id, tx_hash)`: Prevents duplicate transactions per agent

---

### 4. VERIFICATION_PROOFS Table

Stores cryptographic proofs of transaction authenticity.

```sql
CREATE TABLE verification_proofs (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES transactions(id),
  tx_hash VARCHAR(66) NOT NULL,
  verification_status VARCHAR(20) NOT NULL,
  verification_method VARCHAR(50) NOT NULL,
  proof_data JSONB NOT NULL,
  event_logs JSONB,
  signatures JSONB,
  verification_started_at TIMESTAMP,
  verified_at TIMESTAMP,
  rpc_provider VARCHAR(100),
  rpc_error_message TEXT,
  merkle_root VARCHAR(66),
  merkle_proof JSONB,
  block_explorer_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  UNIQUE(tx_hash)
)
```

**Key Points**:
- **One-to-One** with Transactions (1:1)
- **verification_method**:
  - `on_chain`: RPC verification (MVP)
  - `tee_attestation`: TEE proof (Phase 2)
  - `zk_proof`: Zero-knowledge proof (Phase 2)
- **proof_data**: Method-specific JSON (receipt, signatures, attestation, etc.)
- **event_logs**: Extracted event logs from transaction
- **signatures**: Event signature validation data
- **retry_count**: Number of re-verification attempts

**Example proof_data for on_chain**:
```json
{
  "transactionHash": "0x...",
  "blockHash": "0x...",
  "blockNumber": 19000000,
  "transactionIndex": 42,
  "status": 1,
  "confirmations": 15,
  "gasUsed": "120000"
}
```

**Indexes**:
- `idx_proof_tx_hash`: Find proof for transaction
- `idx_proof_status`: Filter by verification status
- `idx_proof_verified_at`: Track completion time

---

### 5. TRANSACTION_SOURCES Table

Tracks which data sources reported each transaction (for deduplication).

```sql
CREATE TABLE transaction_sources (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES transactions(id),
  tx_hash VARCHAR(66) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_name VARCHAR(100),
  detected_at TIMESTAMP NOT NULL,
  source_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Key Points**:
- **source_type**: the_graph, rpc, webhook, api, etc.
- **source_name**: Specific source (e.g., "uniswap_subgraph", "eth_rpc")
- **Multiple sources per transaction**: Same tx_hash reported by different sources
- Used for debugging and verifying data consistency

**Deduplication Logic**:
1. Check if `tx_hash` exists in `transactions` table
2. If exists: Only insert a new row in `transaction_sources` (don't create duplicate transaction)
3. If not exists: Create new transaction + corresponding source record

**Indexes**:
- `idx_source_tx_hash`: Check if transaction already imported
- `idx_source_type`: Analytics on source quality

---

### 6. AUDIT_LOGS Table

Complete audit trail for compliance and debugging.

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT,
  action VARCHAR(50) NOT NULL,
  user_id BIGINT REFERENCES users(id),
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Key Points**:
- Immutable append-only log
- Tracks all CREATE, UPDATE, DELETE operations
- `entity_type`: "user", "agent", "transaction", "verification"
- `action`: "created", "updated", "verified", "deleted", "archived"

**Indexes**:
- `idx_audit_entity`: Query changes for specific entity
- `idx_audit_user`: User's audit trail
- `idx_audit_created_at`: Timeline view

---

## Views for Query Optimization

### recent_transactions View

```sql
CREATE VIEW recent_transactions AS
SELECT *
FROM transactions
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days';
```

Used for fast queries on hot data (within retention period).

### agent_metrics View

```sql
CREATE VIEW agent_metrics AS
SELECT
  a.id, a.user_id, a.contract_address, a.agent_name,
  COUNT(t.id) as total_transactions,
  SUM(CASE WHEN t.verification_status = 'verified' THEN 1 ELSE 0 END) as verified_transactions,
  ROUND((verified_count::numeric / total_count * 100), 2) as verification_rate,
  SUM(t.total_gas_cost) as total_gas_spent,
  COUNT(DISTINCT t.protocol) as protocols_used,
  MAX(t.block_timestamp) as last_activity
FROM agents a
LEFT JOIN transactions t ON a.id = t.agent_id
GROUP BY a.id, a.user_id, a.contract_address, a.agent_name;
```

Used for agent summary cards and leaderboards.

---

## Data Retention & Archival Strategy

### Hot Data (Active)
- **Duration**: Last 7-30 days
- **Storage**: PostgreSQL
- **Query Performance**: <500ms
- **Use**: Activity feed, real-time monitoring

### Cold Data (Archive)
- **Duration**: >30 days
- **Storage**: Arweave (Phase 2), S3, or delete based on policy
- **Query Performance**: Not required (slow OK)
- **Use**: Compliance reports, historical analysis

### Archival Process
1. **Daily job** (via `archive_old_transactions()` function):
   - Check for transactions older than retention period
   - Copy to cold storage (Arweave/S3)
   - Delete from hot storage
2. **Before archival**: Compute and store final statistics
3. **Merkle tree**: Create Merkle proof for batch verification

### Estimated Storage

| Scenario | Transactions/Day | Storage/30 Days | Notes |
|----------|-----------------|-----------------|-------|
| 10 agents, low activity | 500 | 50 MB | Light use |
| 50 agents, medium activity | 5,000 | 500 MB | Typical MVP |
| 100 agents, high activity | 20,000 | 2 GB | Heavy use |

---

## Deduplication Strategy

### Problem
The Graph, RPC, and agent webhooks might report the same transaction multiple times.

### Solution
1. **tx_hash as unique identifier**:
   - Check `UNIQUE(agent_id, tx_hash)` constraint
   - Prevents exact duplicates

2. **transaction_sources table**:
   - Record every source that reported the transaction
   - Multiple sources point to same transaction

3. **Ingestion logic**:
```
IF tx_hash + agent_id exists in transactions:
  INSERT INTO transaction_sources (transaction_id, source, ...)
ELSE:
  INSERT INTO transactions (...)
  INSERT INTO transaction_sources (transaction_id, source, ...)
```

4. **Validation**:
   - Check gas costs match across sources
   - Flag discrepancies in event logs

---

## Indexing Strategy

### Query Patterns & Indexes

| Query Pattern | Index | Type |
|---------------|-------|------|
| "Show me transactions for this agent" | `(agent_id, block_timestamp DESC)` | Composite |
| "Filter by verification status" | `(verification_status)` | Single |
| "User's activity feed" | `(user_id, agent_id, block_timestamp DESC)` | Composite |
| "Gas cost per protocol" | `(protocol, total_gas_cost)` | Composite |
| "Recent activity" | `(created_at DESC)` | Single |
| "Find by tx_hash" | `(tx_hash)` | Single |

### Index Maintenance

- **ANALYZE** daily (auto-vacuum should handle)
- **REINDEX** monthly or on plan changes
- **Monitor unused indexes** via `pg_stat_user_indexes`

---

## Constraints & Business Rules

| Constraint | SQL | Purpose |
|-----------|-----|---------|
| Valid wallet | `wallet_address ~ '^0x[0-9a-fA-F]{40}$'` | Ethereum address format |
| Valid contract | `contract_address ~ '^0x[0-9a-fA-F]{40}$'` | Smart contract format |
| Valid tx_hash | `tx_hash ~ '^0x[0-9a-fA-F]{64}$'` | Transaction hash format |
| Non-negative gas | `total_gas_cost >= 0` | No negative values |
| Verification rate | `verification_rate >= 0 AND <= 100` | 0-100% range |
| Agent uniqueness | `UNIQUE(user_id, contract_address)` | No duplicate agents per user |
| Transaction uniqueness | `UNIQUE(agent_id, tx_hash)` | No duplicate tx per agent |

---

## How to Run the Schema

### Initial Setup

```bash
# 1. Create database
createdb agent_audit_dashboard

# 2. Run schema
psql -h localhost -U postgres agent_audit_dashboard < backend/src/db/schema.sql

# 3. Verify tables created
psql -h localhost -U postgres agent_audit_dashboard -c "\dt"
```

### Running Migrations

For MVP: Use the schema.sql directly.

For production: Use a migration tool (Flyway, db-migrate, etc.):
```bash
npm run migrate up
```

### Testing the Schema

```bash
# Insert test user
INSERT INTO users (wallet_address) VALUES ('0x1234567890123456789012345678901234567890');

# Insert test agent
INSERT INTO agents (user_id, contract_address, agent_name)
VALUES (1, '0x2345678901234567890123456789012345678901', 'TestAgent');

# Insert test transaction
INSERT INTO transactions (agent_id, user_id, tx_hash, type, protocol, ...)
VALUES (1, 1, '0x3456...', 'swap', 'uniswap_v3', ...);
```

---

## Performance Considerations

### Query Performance Targets
- **Activity feed** (50 transactions): <500ms
- **Agent list with stats**: <1000ms
- **Verification update**: <100ms

### Optimization Tips
1. Use composite indexes for multi-column WHERE/ORDER BY
2. Denormalize `verification_rate`, `last_activity` on agents
3. Archive old transactions regularly
4. Use `EXPLAIN ANALYZE` to verify query plans
5. Monitor slow queries with `pg_stat_statements`

### Connection Pooling
- Use PgBouncer or node-postgres pooling
- Pool size: 20-50 connections (adjust based on load)
- Idle timeout: 5 minutes

---

## Security Considerations

1. **SQL Injection**: Use parameterized queries (prepared statements)
2. **Row-Level Security**: Enforce `user_id` in all queries (middleware responsibility)
3. **Sensitive Data**: No private keys stored (only wallet addresses)
4. **Audit Trail**: All changes logged in `audit_logs`
5. **Data Encryption**: Consider PgCrypto for sensitive columns (Phase 2)

---

## Related Files

- `backend/src/models/User.ts` - TypeScript user model
- `backend/src/models/Agent.ts` - TypeScript agent model
- `backend/src/models/Transaction.ts` - TypeScript transaction model
- `backend/src/models/VerificationProof.ts` - TypeScript proof model
- `backend/src/db/migrations/001_initial_schema.sql` - Migration file

---

**Last Updated**: 2025-01-18
**Version**: MVP Phase 1
**Status**: Design Complete - Ready for Implementation
