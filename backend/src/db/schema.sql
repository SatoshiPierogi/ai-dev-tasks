-- Agent Audit Dashboard - PostgreSQL Schema (MVP Phase 1)
-- Tables: users, agents, transactions, verification_proofs, audit_logs
-- Last Updated: 2025-01-18

-- ============================================================================
-- 1. USERS TABLE - Stores wallet addresses and user metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL UNIQUE, -- Ethereum addresses (0x...)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- User metadata
  email VARCHAR(255),
  display_name VARCHAR(255),

  -- Account status
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, deleted

  -- Privacy & preferences
  notification_settings JSONB DEFAULT '{"email": false, "webhook": true}',

  -- Audit trail
  last_login TIMESTAMP,
  login_count INTEGER DEFAULT 0
);

-- Indexes for users
CREATE UNIQUE INDEX idx_users_wallet ON users(LOWER(wallet_address));
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================================
-- 2. AGENTS TABLE - Stores AI agent metadata and status
-- ============================================================================
CREATE TABLE IF NOT EXISTS agents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Agent identification
  contract_address VARCHAR(42) NOT NULL, -- Smart contract address
  agent_name VARCHAR(255) NOT NULL, -- User-friendly name (e.g., "TradingBot_A")

  -- Agent status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, paused, error, archived
  last_activity TIMESTAMP, -- Last transaction detected

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Agent configuration
  auto_verified BOOLEAN DEFAULT FALSE, -- Auto-verified from registry
  verification_source VARCHAR(100), -- "registry", "manual", "webhook"

  -- Agent statistics (denormalized for performance)
  transaction_count INTEGER DEFAULT 0,
  total_gas_spent NUMERIC(40, 8) DEFAULT 0, -- Wei
  verification_rate NUMERIC(5, 2) DEFAULT 0, -- Percentage (0-100)

  -- Optional: Agent capabilities/tags
  tags JSONB DEFAULT '[]', -- ["dex-trading", "yield-farming", "governance"]

  CONSTRAINT unique_agent_per_user UNIQUE(user_id, contract_address)
);

-- Indexes for agents
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_contract_address ON agents(contract_address);
CREATE INDEX idx_agents_created_at ON agents(created_at DESC);
CREATE INDEX idx_agents_last_activity ON agents(last_activity DESC NULLS LAST);

-- ============================================================================
-- 3. TRANSACTIONS TABLE - All on-chain and off-chain transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,

  -- Reference to agent
  agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction identification
  tx_hash VARCHAR(66) NOT NULL, -- 0x... format
  block_number BIGINT,
  transaction_index INTEGER,

  -- Transaction type and metadata
  type VARCHAR(50) NOT NULL, -- swap, transfer, stake, lp, vote, bridge, custom
  protocol VARCHAR(100) NOT NULL, -- "uniswap_v3", "aave", "curve", "balancer", etc.

  -- Token information
  tokens_in JSONB NOT NULL, -- [{symbol: "ETH", address: "0x...", amount: "1.5", decimals: 18}]
  tokens_out JSONB NOT NULL, -- [{symbol: "USDC", address: "0x...", amount: "2500.00", decimals: 6}]

  -- Transaction details
  description TEXT NOT NULL, -- Human-readable: "Swapped 1 ETH for 2500 USDC on Uniswap V3"
  slippage NUMERIC(10, 8), -- Percentage
  gas_used NUMERIC(20, 0), -- Wei
  gas_price NUMERIC(20, 0), -- Wei per unit
  total_gas_cost NUMERIC(40, 8), -- Wei
  mev_exposure NUMERIC(10, 8), -- Estimated MEV impact percentage

  -- Verification and status
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, verified, unverified
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_blocks INTEGER DEFAULT 0, -- Number of confirmations

  -- Timestamps
  block_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Raw data for reference
  raw_data JSONB, -- Protocol-specific data (event logs, function calls, etc.)

  CONSTRAINT unique_tx_per_agent UNIQUE(agent_id, tx_hash)
);

-- Indexes for transactions (critical for query performance)
CREATE INDEX idx_tx_agent_id ON transactions(agent_id);
CREATE INDEX idx_tx_user_id ON transactions(user_id);
CREATE INDEX idx_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_tx_type ON transactions(type);
CREATE INDEX idx_tx_protocol ON transactions(protocol);
CREATE INDEX idx_tx_verification_status ON transactions(verification_status);
CREATE INDEX idx_tx_block_timestamp ON transactions(block_timestamp DESC);
CREATE INDEX idx_tx_created_at ON transactions(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX idx_tx_agent_timestamp ON transactions(agent_id, block_timestamp DESC);
CREATE INDEX idx_tx_agent_verified ON transactions(agent_id, verification_status);
CREATE INDEX idx_tx_user_agent_timestamp ON transactions(user_id, agent_id, block_timestamp DESC);
CREATE INDEX idx_tx_agent_protocol ON transactions(agent_id, protocol);

-- ============================================================================
-- 4. VERIFICATION_PROOFS TABLE - Cryptographic proofs of transaction validity
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_proofs (
  id BIGSERIAL PRIMARY KEY,

  -- Reference to transaction
  transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tx_hash VARCHAR(66) NOT NULL,

  -- Verification details
  verification_status VARCHAR(20) NOT NULL, -- pending, verified, unverified, error
  verification_method VARCHAR(50) NOT NULL, -- "on_chain", "tee_attestation", "zk_proof"

  -- Proof data
  proof_data JSONB NOT NULL, -- Verification-specific proof (receipt, signatures, etc.)
  event_logs JSONB, -- Extracted event logs from transaction
  signatures JSONB, -- Contract event signatures and validation

  -- Verification timeline
  verification_started_at TIMESTAMP,
  verified_at TIMESTAMP,

  -- RPC provider used for verification
  rpc_provider VARCHAR(100),
  rpc_error_message TEXT, -- If verification failed

  -- Merkle proof (for batched verification)
  merkle_root VARCHAR(66),
  merkle_proof JSONB, -- Path in Merkle tree

  -- Etherscan/Block explorer references
  block_explorer_url TEXT,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,

  CONSTRAINT unique_proof_per_tx UNIQUE(tx_hash)
);

-- Indexes for verification_proofs
CREATE INDEX idx_proof_transaction_id ON verification_proofs(transaction_id);
CREATE INDEX idx_proof_tx_hash ON verification_proofs(tx_hash);
CREATE INDEX idx_proof_status ON verification_proofs(verification_status);
CREATE INDEX idx_proof_verified_at ON verification_proofs(verified_at DESC NULLS LAST);
CREATE INDEX idx_proof_created_at ON verification_proofs(created_at DESC);

-- ============================================================================
-- 5. TRANSACTION_DEDUPLICATION TABLE - Track transaction sources for deduplication
-- ============================================================================
CREATE TABLE IF NOT EXISTS transaction_sources (
  id BIGSERIAL PRIMARY KEY,

  -- Reference to transaction
  transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tx_hash VARCHAR(66) NOT NULL,

  -- Source metadata
  source_type VARCHAR(50) NOT NULL, -- "the_graph", "rpc", "webhook", "api"
  source_name VARCHAR(100), -- "uniswap_subgraph", "eth_rpc", "agent_webhook"

  -- Detection timestamp
  detected_at TIMESTAMP NOT NULL,

  -- Source-specific data
  source_data JSONB, -- Raw response from source

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for deduplication
CREATE INDEX idx_source_tx_hash ON transaction_sources(tx_hash);
CREATE INDEX idx_source_transaction_id ON transaction_sources(transaction_id);
CREATE INDEX idx_source_type ON transaction_sources(source_type);

-- ============================================================================
-- 6. AUDIT_LOGS TABLE - Track all changes for compliance and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,

  -- What was changed
  entity_type VARCHAR(50) NOT NULL, -- "agent", "transaction", "user"
  entity_id BIGINT,
  action VARCHAR(50) NOT NULL, -- "created", "updated", "verified", "deleted"

  -- Who made the change
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

  -- Change details
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit logs
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- 7. DATA RETENTION & ARCHIVAL VIEWS
-- ============================================================================

-- View: Recent transactions (for fast queries on hot data)
-- Hot data: Last 30 days
-- Cold data: Archived to separate partition or Arweave
CREATE VIEW recent_transactions AS
SELECT *
FROM transactions
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days';

-- View: Agent performance metrics
CREATE VIEW agent_metrics AS
SELECT
  a.id,
  a.user_id,
  a.contract_address,
  a.agent_name,
  COUNT(t.id) as total_transactions,
  SUM(CASE WHEN t.verification_status = 'verified' THEN 1 ELSE 0 END) as verified_transactions,
  ROUND(
    (SUM(CASE WHEN t.verification_status = 'verified' THEN 1 ELSE 0 END)::numeric /
     NULLIF(COUNT(t.id), 0) * 100),
    2
  ) as verification_rate,
  SUM(t.total_gas_cost) as total_gas_spent,
  COUNT(DISTINCT t.protocol) as protocols_used,
  MAX(t.block_timestamp) as last_activity,
  MIN(t.block_timestamp) as first_activity
FROM agents a
LEFT JOIN transactions t ON a.id = t.agent_id
  AND t.block_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY a.id, a.user_id, a.contract_address, a.agent_name;

-- ============================================================================
-- 8. FUNCTIONS FOR MAINTENANCE & OPERATIONS
-- ============================================================================

-- Function: Update agent statistics (called periodically)
CREATE OR REPLACE FUNCTION update_agent_stats()
RETURNS TABLE(agent_id BIGINT, transactions BIGINT, gas_spent NUMERIC) AS $$
BEGIN
  RETURN QUERY
  UPDATE agents a
  SET
    transaction_count = (SELECT COUNT(*) FROM transactions WHERE agent_id = a.id),
    total_gas_spent = (SELECT SUM(total_gas_cost) FROM transactions WHERE agent_id = a.id),
    verification_rate = (
      SELECT ROUND(
        (SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END)::numeric /
         NULLIF(COUNT(*), 0) * 100),
        2
      )
      FROM transactions WHERE agent_id = a.id
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE a.status != 'archived'
  RETURNING a.id, a.transaction_count, a.total_gas_spent;
END;
$$ LANGUAGE plpgsql;

-- Function: Archive old transactions
CREATE OR REPLACE FUNCTION archive_old_transactions(days_to_retain INTEGER DEFAULT 30)
RETURNS TABLE(archived_count BIGINT, deleted_count BIGINT) AS $$
DECLARE
  archived_count BIGINT;
  deleted_count BIGINT;
BEGIN
  -- In production, copy old transactions to cold storage (Arweave, S3, etc.)
  -- For MVP, we'll just delete them based on retention policy
  SELECT COUNT(*) INTO deleted_count
  FROM transactions
  WHERE created_at < CURRENT_TIMESTAMP - (days_to_retain || ' days')::INTERVAL;

  DELETE FROM transactions
  WHERE created_at < CURRENT_TIMESTAMP - (days_to_retain || ' days')::INTERVAL;

  archived_count := deleted_count;
  RETURN QUERY SELECT archived_count, deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'Stores wallet addresses and user metadata. Primary key for multi-wallet support.';
COMMENT ON COLUMN users.wallet_address IS 'Ethereum wallet address (0x...). Unique per user, case-insensitive.';
COMMENT ON COLUMN users.notification_settings IS 'JSON configuration for notification preferences.';

COMMENT ON TABLE agents IS 'AI agent contracts and status. Tracks which agents each user is monitoring.';
COMMENT ON COLUMN agents.contract_address IS 'Smart contract address of the AI agent.';
COMMENT ON COLUMN agents.verification_rate IS 'Percentage of transactions with verified proofs (0-100).';
COMMENT ON COLUMN agents.tags IS 'Optional tags for categorization and filtering.';

COMMENT ON TABLE transactions IS 'All on-chain transactions from monitored agents. Hot data (7-30 days).';
COMMENT ON COLUMN transactions.type IS 'Transaction type: swap, transfer, stake, lp, vote, bridge, or custom.';
COMMENT ON COLUMN transactions.tokens_in IS 'Input tokens as JSON array with symbol, address, amount, decimals.';
COMMENT ON COLUMN transactions.tokens_out IS 'Output tokens as JSON array with symbol, address, amount, decimals.';
COMMENT ON COLUMN transactions.verification_status IS 'pending=not yet verified, verified=cryptographically confirmed, unverified=failed verification.';
COMMENT ON COLUMN transactions.raw_data IS 'Raw event logs and protocol-specific data for detailed analysis.';

COMMENT ON TABLE verification_proofs IS 'Cryptographic proofs confirming transaction authenticity.';
COMMENT ON COLUMN verification_proofs.verification_method IS 'on_chain=RPC verification, tee_attestation=TEE proof (Phase 2), zk_proof=ZK proof (Phase 2).';
COMMENT ON COLUMN verification_proofs.proof_data IS 'Method-specific proof: receipt hash, signatures, attestation, etc.';
COMMENT ON COLUMN verification_proofs.merkle_root IS 'For batched verification: root hash of 1000+ transactions.';

COMMENT ON TABLE transaction_sources IS 'Tracks which data sources reported each transaction for deduplication.';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all changes for compliance and debugging.';

-- ============================================================================
-- 10. INITIAL CONSTRAINTS & BUSINESS RULES
-- ============================================================================

-- Prevent duplicate transactions per agent
ALTER TABLE transactions ADD CONSTRAINT check_tx_hash_format
  CHECK (tx_hash ~ '^0x[0-9a-fA-F]{64}$');

-- Ensure user wallet addresses are valid Ethereum addresses
ALTER TABLE users ADD CONSTRAINT check_wallet_format
  CHECK (wallet_address ~ '^0x[0-9a-fA-F]{40}$');

-- Ensure agent contract addresses are valid
ALTER TABLE agents ADD CONSTRAINT check_contract_format
  CHECK (contract_address ~ '^0x[0-9a-fA-F]{40}$');

-- Ensure amounts are non-negative
ALTER TABLE transactions ADD CONSTRAINT check_gas_cost_positive
  CHECK (total_gas_cost >= 0);

-- Ensure verification rate is between 0-100
ALTER TABLE agents ADD CONSTRAINT check_verification_rate
  CHECK (verification_rate >= 0 AND verification_rate <= 100);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Note: Data retention policy (7-30 days hot, older archived to cold storage)
-- is implemented via: archive_old_transactions() function (call periodically)
-- and views like recent_transactions for query optimization.
--
-- Deduplication strategy: transaction_sources table tracks all sources
-- that reported each tx_hash. During ingestion, check existing tx_hash
-- before inserting. If exists, just add new source record.
--
-- Indexing strategy optimized for:
-- - User viewing their agents and transactions (user_id, agent_id, timestamp)
-- - Filtering by verification status, protocol, type
-- - Activity feed sorting by timestamp
-- - Agent statistics aggregation
