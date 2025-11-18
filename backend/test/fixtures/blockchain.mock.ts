/**
 * Blockchain/RPC Mock Responses
 * Realistic Ethereum transaction data
 */

// ============================================================================
// TRANSACTION RECEIPT MOCKS
// ============================================================================

export function createMockTransactionReceipt(txHash: string, status: 0 | 1 = 1) {
  return {
    transactionHash: txHash,
    blockHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    blockNumber: Math.floor(Math.random() * 20000000),
    transactionIndex: Math.floor(Math.random() * 200),
    contractAddress: null,
    cumulativeGasUsed: '5000000',
    gasUsed: '120000',
    status: status, // 1 = success, 0 = failed
    logs: [
      {
        address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // Uniswap address
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000000000000000000000000000002',
        ],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        blockNumber: Math.floor(Math.random() * 20000000),
        transactionHash: txHash,
        transactionIndex: Math.floor(Math.random() * 200),
        blockHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
        logIndex: 0,
        removed: false,
      },
    ],
    type: 2,
    effectiveGasPrice: '50000000000',
  };
}

export const MOCK_SUCCESSFUL_RECEIPT = createMockTransactionReceipt(
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  1
);

export const MOCK_FAILED_RECEIPT = createMockTransactionReceipt(
  '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
  0
);

// ============================================================================
// EVENT LOG MOCKS
// ============================================================================

export const MOCK_UNISWAP_SWAP_LOG = {
  address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  topics: [
    '0xd78ad95fa46c994b6551d0da85fc275fe1e33ac5cf86f1876cc1ee1870da57fb', // Swap event
    '0x0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba72',
    '0x0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba72',
  ],
  data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000ffffffffffffffffffffffffffffffffffffffffffffffffff21f494c58000000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000243ba722ebc00000',
  blockNumber: 19000000,
  transactionHash:
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  transactionIndex: 123,
  blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  logIndex: 456,
  removed: false,
};

export const MOCK_AAVE_DEPOSIT_LOG = {
  address: '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9',
  topics: [
    '0xe5eed830cce0206f96ac5ffd8f0c73ef8f8c27f24b2eba4b2eb67668a9e5f6f6', // Deposit event
    '0x000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0x0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba72',
  ],
  data: '0x0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba720000000000000000000000000000000000000000000000000000000023c34600',
  blockNumber: 19000002,
  transactionHash:
    '0x789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456',
  transactionIndex: 234,
  blockHash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
  logIndex: 567,
  removed: false,
};

// ============================================================================
// BLOCK DATA MOCKS
// ============================================================================

export function createMockBlock(blockNumber: number) {
  return {
    hash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    parentHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    miner: '0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c',
    stateRoot: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    transactionsRoot: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    receiptsRoot: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
    number: blockNumber,
    gasUsed: '29000000',
    gasLimit: '30000000',
    timestamp: Math.floor(Date.now() / 1000) - (Math.random() * 100000),
    difficulty: '5000000000000',
    totalDifficulty: '100000000000000000000000',
    size: '31245',
    baseFeePerGas: '50000000000',
  };
}

export const MOCK_CURRENT_BLOCK = createMockBlock(19000100);
export const MOCK_SAFE_BLOCK = createMockBlock(19000050);
export const MOCK_FINALIZED_BLOCK = createMockBlock(18999900);

// ============================================================================
// CONTRACT ABI MOCKS
// ============================================================================

export const MOCK_ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
];

// ============================================================================
// RPC ERROR MOCKS
// ============================================================================

export const MOCK_RPC_ERRORS = {
  invalidRequest: {
    code: -32600,
    message: 'Invalid Request',
  },
  methodNotFound: {
    code: -32601,
    message: 'The method does not exist / is not available',
  },
  invalidParams: {
    code: -32602,
    message: 'Invalid method parameter(s)',
  },
  internalError: {
    code: -32603,
    message: 'Internal error',
  },
  parseError: {
    code: -32700,
    message: 'Parse error',
  },
  rateLimitExceeded: {
    code: 429,
    message: 'Rate limit exceeded',
  },
  timeout: {
    code: -32000,
    message: 'Timeout error',
  },
};

// ============================================================================
// GAS DATA MOCKS
// ============================================================================

export const MOCK_GAS_PRICE = {
  safe: '20000000000', // 20 gwei
  standard: '50000000000', // 50 gwei
  fast: '80000000000', // 80 gwei
};

export function createMockGasEstimate(baseGas: number = 120000) {
  return {
    safe: (baseGas * 1.1).toFixed(0),
    standard: (baseGas * 1.2).toFixed(0),
    fast: (baseGas * 1.5).toFixed(0),
  };
}

// ============================================================================
// ACCOUNT DATA MOCKS
// ============================================================================

export function createMockAccountData(address: string) {
  return {
    address,
    balance: '1000000000000000000', // 1 ETH
    nonce: 42,
    codeHash:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    storageHash:
      '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
  };
}

// ============================================================================
// HELPER FUNCTION
// ============================================================================

export function getMockBlockNumber(): number {
  return Math.floor(Math.random() * 20000000) + 15000000;
}

export function getMockConfirmationCount(targetBlock: number): number {
  const currentBlock = getMockBlockNumber();
  return Math.max(0, currentBlock - targetBlock);
}
