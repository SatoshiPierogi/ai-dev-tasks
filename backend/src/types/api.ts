/**
 * API Request/Response Types
 * TypeScript interfaces for all API endpoints
 */

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface ChallengeRequest {
  wallet_address: string; // 0x...
}

export interface ChallengeResponse {
  challenge: string; // Message to sign
  expires_at: Date; // Challenge expiration
}

export interface VerifyRequest {
  wallet_address: string;
  signature: string; // Signed message (EIP-191)
  challenge: string; // Original challenge
}

export interface AuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number; // Seconds
  user: UserProfile;
}

export interface UserProfile {
  id: number;
  wallet_address: string;
  email?: string;
  display_name?: string;
  created_at: Date;
}

// ============================================================================
// AGENTS
// ============================================================================

export interface CreateAgentRequest {
  contract_address: string;
  agent_name: string;
  tags?: string[];
}

export interface UpdateAgentRequest {
  agent_name?: string;
  status?: 'active' | 'paused' | 'error' | 'archived';
  tags?: string[];
}

export interface AgentDetail {
  id: number;
  contract_address: string;
  agent_name: string;
  status: 'active' | 'paused' | 'error' | 'archived';
  last_activity?: Date;
  created_at: Date;
  transaction_count: number;
  total_gas_spent: string; // Wei
  verification_rate: number; // 0-100
  tags: string[];
}

export interface AgentListResponse {
  data: AgentDetail[];
  pagination: Pagination;
  total: number;
}

export interface AgentStats {
  agent_id: number;
  total_transactions: number;
  verified_transactions: number;
  verification_rate: number; // 0-100
  total_gas_spent: string; // Wei
  protocols_used: number;
  last_activity?: Date;
  first_activity?: Date;
  daily_transactions: Array<{
    date: string; // YYYY-MM-DD
    count: number;
  }>;
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export interface TokenInfo {
  symbol: string;
  address: string; // Contract address
  amount: string; // String for precision
  decimals: number;
}

export interface TransactionSummary {
  id: number;
  tx_hash: string; // 0x...
  type: 'swap' | 'transfer' | 'stake' | 'lp' | 'vote' | 'bridge' | 'custom';
  protocol: string; // uniswap_v3, aave, curve, etc.
  description: string;
  tokens_in: TokenInfo[];
  tokens_out: TokenInfo[];
  verification_status: 'pending' | 'verified' | 'unverified';
  block_timestamp: Date;
  agent_id: number;
}

export interface TransactionDetail extends TransactionSummary {
  gas_used?: string; // Wei
  gas_price?: string; // Wei per unit
  total_gas_cost?: string; // Wei
  slippage?: number; // Percentage
  mev_exposure?: number; // Percentage
  confirmation_blocks: number;
  block_number?: number;
  transaction_index?: number;
  verification_proof: VerificationProofResponse;
}

export interface TransactionListResponse {
  data: TransactionSummary[];
  pagination: Pagination;
  total: number;
}

export interface TransactionFilter {
  agent_id?: number;
  type?: string;
  protocol?: string;
  verification_status?: string;
  start_date?: Date;
  end_date?: Date;
  skip?: number;
  limit?: number;
}

// ============================================================================
// VERIFICATION
// ============================================================================

export interface VerificationProofResponse {
  tx_hash: string;
  verification_status: 'pending' | 'verified' | 'unverified' | 'error';
  verification_method: 'on_chain' | 'tee_attestation' | 'zk_proof';
  verified_at?: Date;
  block_explorer_url?: string;
  proof_data: {
    transaction_hash?: string;
    block_hash?: string;
    block_number?: number;
    status?: number; // 1 = success, 0 = failed
    confirmations?: number;
    [key: string]: any;
  };
  event_logs?: any[];
  signatures?: any[];
}

// ============================================================================
// PAGINATION
// ============================================================================

export interface Pagination {
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface PaginationQuery {
  skip?: number;
  limit?: number;
}

// ============================================================================
// ERRORS
// ============================================================================

export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export type WebSocketMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'transaction_update'
  | 'verification_update'
  | 'agent_status_update'
  | 'heartbeat'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp?: string; // ISO 8601
  data?: any;
}

export interface SubscribeMessage extends WebSocketMessage {
  type: 'subscribe';
  agents?: number[]; // Optional: specific agents to subscribe to
  channels?: string[]; // Optional: specific channels
}

export interface TransactionUpdateMessage extends WebSocketMessage {
  type: 'transaction_update';
  agent_id: number;
  transaction: TransactionSummary;
}

export interface VerificationUpdateMessage extends WebSocketMessage {
  type: 'verification_update';
  tx_hash: string;
  verification_status: string;
  proof: VerificationProofResponse;
}

export interface AgentStatusUpdateMessage extends WebSocketMessage {
  type: 'agent_status_update';
  agent_id: number;
  status: string;
  last_activity?: Date;
}

// ============================================================================
// WEBHOOKS (Agent → Platform)
// ============================================================================

export interface WebhookActionRequest {
  agent_id: string; // Contract address
  user_id: number;
  action_type: string;
  metadata: {
    tx_hash: string;
    protocol: string;
    tokens_in: TokenInfo[];
    tokens_out: TokenInfo[];
    description: string;
    [key: string]: any;
  };
  timestamp: Date;
  signature: string; // HMAC-SHA256
}

export interface WebhookActionResponse {
  success: boolean;
  transaction_id: number;
}

// ============================================================================
// API QUERY PARAMETERS
// ============================================================================

export interface AgentListQuery extends PaginationQuery {
  status?: string;
}

export interface TransactionListQuery extends PaginationQuery {
  agent_id?: number;
  type?: string;
  protocol?: string;
  verification_status?: string;
  start_date?: string; // ISO 8601
  end_date?: string; // ISO 8601
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const validatePaginationQuery = (query: any): PaginationQuery => {
  const skip = Math.max(0, parseInt(query.skip) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  return { skip, limit };
};

export const validateTransactionFilter = (query: any): TransactionListQuery => {
  const pagination = validatePaginationQuery(query);
  return {
    ...pagination,
    agent_id: query.agent_id ? parseInt(query.agent_id) : undefined,
    type: query.type,
    protocol: query.protocol,
    verification_status: query.verification_status,
    start_date: query.start_date,
    end_date: query.end_date,
  };
};
