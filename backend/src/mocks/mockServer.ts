/**
 * Mock Server for Frontend Development
 * Simulates backend API responses without needing full backend implementation
 * Can be run independently for frontend development
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentDetail,
  TransactionSummary,
  VerificationProofResponse,
  AuthResponse,
} from '../types/api';

const app: Express = express();

app.use(express.json());

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

function generateMockToken(): string {
  // Simple mock JWT-like token (not real JWT, just for testing)
  return `mock_token_${uuidv4()}`;
}

function generateMockAgent(userId: number, id: number): AgentDetail {
  return {
    id,
    contract_address: `0x${Math.random().toString(16).slice(2).padStart(40, '0')}`,
    agent_name: `TestAgent_${id}`,
    status: ['active', 'paused', 'error'][Math.floor(Math.random() * 3)] as any,
    last_activity: new Date(Date.now() - Math.random() * 86400000),
    created_at: new Date(Date.now() - Math.random() * 2592000000),
    transaction_count: Math.floor(Math.random() * 1000),
    total_gas_spent: String(Math.floor(Math.random() * 1e18)),
    verification_rate: Math.random() * 100,
    tags: ['dex-trading', 'yield-farming'].slice(0, Math.random() > 0.5 ? 1 : 2),
  };
}

function generateMockTransaction(agentId: number, id: number): TransactionSummary {
  const types = ['swap', 'transfer', 'stake', 'lp', 'vote'];
  const protocols = ['uniswap_v3', 'aave', 'curve', 'balancer'];

  return {
    id,
    tx_hash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    type: types[Math.floor(Math.random() * types.length)] as any,
    protocol: protocols[Math.floor(Math.random() * protocols.length)],
    description: 'Swapped 1 ETH for 2500 USDC on Uniswap V3',
    tokens_in: [
      {
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        amount: '1.5',
        decimals: 18,
      },
    ],
    tokens_out: [
      {
        symbol: 'USDC',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: '2500',
        decimals: 6,
      },
    ],
    verification_status: ['pending', 'verified', 'unverified'][
      Math.floor(Math.random() * 3)
    ] as any,
    block_timestamp: new Date(Date.now() - Math.random() * 3600000),
    agent_id: agentId,
  };
}

function generateMockVerificationProof(txHash: string): VerificationProofResponse {
  return {
    tx_hash: txHash,
    verification_status: 'verified',
    verification_method: 'on_chain',
    verified_at: new Date(),
    block_explorer_url: `https://etherscan.io/tx/${txHash}`,
    proof_data: {
      transaction_hash: txHash,
      block_hash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
      block_number: Math.floor(Math.random() * 20000000),
      status: 1,
      confirmations: Math.floor(Math.random() * 100) + 12,
    },
    event_logs: [],
    signatures: [],
  };
}

// ============================================================================
// MOCK DATA STORE
// ============================================================================

const mockUsers: { [key: string]: any } = {};
const mockAgents: { [key: string]: AgentDetail[] } = {};
const mockTransactions: { [key: string]: TransactionSummary[] } = {};

// Initialize with sample data
const sampleUserId = 'user_1';
const sampleToken = generateMockToken();
mockUsers[sampleToken] = { id: 1, wallet_address: '0x123456...', created_at: new Date() };
mockAgents[sampleToken] = [1, 2, 3].map((i) => generateMockAgent(1, i));
mockTransactions[sampleToken] = [
  ...Array(10)
    .fill(null)
    .flatMap((_, i) => [
      ...Array(5)
        .fill(null)
        .map((_, j) => generateMockTransaction(i + 1, i * 5 + j)),
    ]),
];

// ============================================================================
// MIDDLEWARE
// ============================================================================

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token', code: 'NO_AUTH' });
  }

  if (!mockUsers[token]) {
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }

  (req as any).token = token;
  (req as any).user = mockUsers[token];
  next();
}

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

app.post('/auth/challenge', (req: Request, res: Response) => {
  const { wallet_address } = req.body;

  if (!wallet_address || !wallet_address.match(/^0x[0-9a-fA-F]{40}$/)) {
    return res.status(400).json({
      error: 'Invalid wallet address',
      code: 'INVALID_ADDRESS',
    });
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  res.json({
    challenge: `Sign this message to prove wallet ownership: ${Date.now()}`,
    expires_at: expiresAt,
  });
});

app.post('/auth/verify', (req: Request, res: Response) => {
  const { wallet_address, signature, challenge } = req.body;

  if (!wallet_address || !signature || !challenge) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: 'MISSING_FIELDS',
    });
  }

  // Mock verification (in real implementation, verify actual signature)
  const token = generateMockToken();

  // Create mock user if doesn't exist
  if (!mockUsers[token]) {
    mockUsers[token] = {
      id: Object.keys(mockUsers).length + 1,
      wallet_address,
      created_at: new Date(),
    };
    mockAgents[token] = [1, 2, 3].map((i) => generateMockAgent(mockUsers[token].id, i));
    mockTransactions[token] = [
      ...Array(10)
        .fill(null)
        .flatMap((_, i) => [
          ...Array(5)
            .fill(null)
            .map((_, j) => generateMockTransaction(i + 1, i * 5 + j)),
        ]),
    ];
  }

  const response: AuthResponse = {
    access_token: token,
    token_type: 'Bearer',
    expires_in: 86400,
    user: {
      id: mockUsers[token].id,
      wallet_address,
      created_at: mockUsers[token].created_at,
    },
  };

  res.json(response);
});

// ============================================================================
// AGENT ENDPOINTS
// ============================================================================

app.get('/agents', authenticateToken, (req: Request, res: Response) => {
  const token = (req as any).token;
  const agents = mockAgents[token] || [];
  const skip = parseInt((req.query.skip as string) || '0');
  const limit = parseInt((req.query.limit as string) || '20');

  res.json({
    data: agents.slice(skip, skip + limit),
    pagination: {
      skip,
      limit,
      has_more: skip + limit < agents.length,
    },
    total: agents.length,
  });
});

app.post('/agents', authenticateToken, (req: Request, res: Response) => {
  const { contract_address, agent_name, tags } = req.body;
  const token = (req as any).token;

  if (!contract_address || !agent_name) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: 'MISSING_FIELDS',
    });
  }

  const newAgent = generateMockAgent((req as any).user.id, mockAgents[token].length + 1);
  newAgent.contract_address = contract_address;
  newAgent.agent_name = agent_name;
  newAgent.tags = tags || [];

  mockAgents[token].push(newAgent);

  res.status(201).json(newAgent);
});

app.get('/agents/:agentId', authenticateToken, (req: Request, res: Response) => {
  const { agentId } = req.params;
  const token = (req as any).token;
  const agents = mockAgents[token] || [];
  const agent = agents.find((a) => a.id === parseInt(agentId));

  if (!agent) {
    return res.status(404).json({
      error: 'Agent not found',
      code: 'AGENT_NOT_FOUND',
    });
  }

  res.json(agent);
});

app.patch('/agents/:agentId', authenticateToken, (req: Request, res: Response) => {
  const { agentId } = req.params;
  const { agent_name, status, tags } = req.body;
  const token = (req as any).token;
  const agents = mockAgents[token] || [];
  const agent = agents.find((a) => a.id === parseInt(agentId));

  if (!agent) {
    return res.status(404).json({
      error: 'Agent not found',
      code: 'AGENT_NOT_FOUND',
    });
  }

  if (agent_name) agent.agent_name = agent_name;
  if (status) agent.status = status;
  if (tags) agent.tags = tags;

  res.json(agent);
});

app.delete('/agents/:agentId', authenticateToken, (req: Request, res: Response) => {
  const { agentId } = req.params;
  const token = (req as any).token;
  const agents = mockAgents[token] || [];
  const index = agents.findIndex((a) => a.id === parseInt(agentId));

  if (index === -1) {
    return res.status(404).json({
      error: 'Agent not found',
      code: 'AGENT_NOT_FOUND',
    });
  }

  agents.splice(index, 1);
  res.status(204).send();
});

app.get('/agents/:agentId/stats', authenticateToken, (req: Request, res: Response) => {
  const { agentId } = req.params;
  const token = (req as any).token;
  const agents = mockAgents[token] || [];
  const agent = agents.find((a) => a.id === parseInt(agentId));

  if (!agent) {
    return res.status(404).json({
      error: 'Agent not found',
      code: 'AGENT_NOT_FOUND',
    });
  }

  res.json({
    agent_id: agent.id,
    total_transactions: agent.transaction_count,
    verified_transactions: Math.floor(agent.transaction_count * (agent.verification_rate / 100)),
    verification_rate: agent.verification_rate,
    total_gas_spent: agent.total_gas_spent,
    protocols_used: 3,
    last_activity: agent.last_activity,
    first_activity: new Date(Date.now() - 30 * 86400000),
    daily_transactions: Array(7)
      .fill(null)
      .map((_, i) => ({
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50),
      })),
  });
});

// ============================================================================
// TRANSACTION ENDPOINTS
// ============================================================================

app.get('/transactions', authenticateToken, (req: Request, res: Response) => {
  const token = (req as any).token;
  const transactions = mockTransactions[token] || [];
  const skip = parseInt((req.query.skip as string) || '0');
  const limit = parseInt((req.query.limit as string) || '50');

  res.json({
    data: transactions.slice(skip, skip + limit),
    pagination: {
      skip,
      limit,
      has_more: skip + limit < transactions.length,
    },
    total: transactions.length,
  });
});

app.get('/transactions/:txHash', authenticateToken, (req: Request, res: Response) => {
  const { txHash } = req.params;
  const token = (req as any).token;
  const transactions = mockTransactions[token] || [];
  const transaction = transactions.find((t) => t.tx_hash === txHash);

  if (!transaction) {
    return res.status(404).json({
      error: 'Transaction not found',
      code: 'TX_NOT_FOUND',
    });
  }

  res.json({
    ...transaction,
    gas_used: String(Math.floor(Math.random() * 300000)),
    gas_price: String(Math.floor(Math.random() * 100) * 1e9),
    total_gas_cost: String(Math.floor(Math.random() * 1e17)),
    slippage: Math.random() * 5,
    mev_exposure: Math.random() * 2,
    confirmation_blocks: Math.floor(Math.random() * 100) + 12,
    verification_proof: generateMockVerificationProof(txHash),
  });
});

app.get('/agents/:agentId/transactions', authenticateToken, (req: Request, res: Response) => {
  const { agentId } = req.params;
  const token = (req as any).token;
  const transactions = (mockTransactions[token] || []).filter(
    (t) => t.agent_id === parseInt(agentId)
  );
  const skip = parseInt((req.query.skip as string) || '0');
  const limit = parseInt((req.query.limit as string) || '50');

  res.json({
    data: transactions.slice(skip, skip + limit),
    pagination: {
      skip,
      limit,
      has_more: skip + limit < transactions.length,
    },
    total: transactions.length,
  });
});

// ============================================================================
// VERIFICATION ENDPOINTS
// ============================================================================

app.get('/verify/:txHash', authenticateToken, (req: Request, res: Response) => {
  const { txHash } = req.params;

  res.json(generateMockVerificationProof(txHash));
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╭─────────────────────────────────────╮
│   Mock Server Running on Port ${PORT}   │
╰─────────────────────────────────────╯

Test Authentication:
  POST http://localhost:${PORT}/api/auth/challenge
  Body: { "wallet_address": "0x1234567890123456789012345678901234567890" }

  POST http://localhost:${PORT}/api/auth/verify
  Body: {
    "wallet_address": "0x1234567890123456789012345678901234567890",
    "signature": "0x...",
    "challenge": "Sign this message..."
  }

Note: Use the token from /auth/verify in Authorization header:
  Authorization: Bearer <token>

Available Endpoints:
  GET /agents
  POST /agents
  GET /agents/:id
  PATCH /agents/:id
  DELETE /agents/:id
  GET /agents/:id/stats
  GET /agents/:id/transactions
  GET /transactions
  GET /transactions/:txHash
  GET /verify/:txHash
  `);
});

export default app;
