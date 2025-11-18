/**
 * Verification Service Tests
 * Tests for blockchain verification system
 */

import { VerificationService, getVerificationService, resetVerificationService } from './verification';
import { RpcProviderManager } from './rpc';
import { VerificationStatus, TransactionStatus } from './verification.types';

// ============================================================================
// MOCKS
// ============================================================================

const mockReceipt = {
  hash: '0xabc123',
  blockNumber: 100,
  blockHash: '0xblock123',
  transactionIndex: 5,
  gasUsed: BigInt(50000),
  status: 1,
  from: '0x1234567890123456789012345678901234567890',
  to: '0x0987654321098765432109876543210987654321',
  contractAddress: null,
  logs: [
    {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
      data: '0x0000000000000000000000000000000000000000000000000000000000000001',
      blockNumber: 100,
      transactionHash: '0xabc123',
      transactionIndex: 5,
      blockHash: '0xblock123',
      logIndex: 0,
      removed: false,
    },
  ],
  cumulativeGasUsed: BigInt(500000),
  logsBloom: '0x' + '0'.repeat(512),
  effectiveGasPrice: BigInt(30000000000),
  type: 2,
  confirmations: 12,
};

const mockProvider = {
  getTransactionReceipt: async () => mockReceipt as any,
  getBlockNumber: async () => 112,
  getBlock: async () => ({
    number: 100,
    hash: '0xblock123',
    timestamp: Math.floor(Date.now() / 1000),
    gasLimit: BigInt(30000000),
    gasUsed: BigInt(20000000),
    miner: '0xminer',
  }),
};

const mockProviderManager = {
  getProvider: () => mockProvider as any,
  switchToFallback: () => true,
};

// ============================================================================
// VERIFICATION SERVICE TESTS
// ============================================================================

describe('VerificationService', () => {
  let service: VerificationService;

  beforeEach(() => {
    resetVerificationService();
    service = new VerificationService(mockProviderManager as any);
  });

  afterEach(() => {
    resetVerificationService();
  });

  it('should initialize service', () => {
    expect(service).toBeDefined();
  });

  it('should verify a successful transaction', async () => {
    const result = await service.verify('0xabc123');

    expect(result).toBeDefined();
    expect(result.tx_hash).toBe('0xabc123');
    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(result.proof).toBeDefined();
    expect(result.attempts).toBe(1);
  });

  it('should include proof details', async () => {
    const result = await service.verify('0xabc123');

    expect(result.proof?.block_number).toBe(100);
    expect(result.proof?.confirmations).toBe(12);
    expect(result.proof?.transaction_status).toBe(TransactionStatus.SUCCESS);
    expect(result.proof?.from_address).toBe('0x1234567890123456789012345678901234567890');
  });

  it('should generate Etherscan URL', async () => {
    const result = await service.verify('0xabc123');

    expect(result.proof?.etherscan_url).toBeDefined();
    expect(result.proof?.etherscan_url).toContain('etherscan.io');
    expect(result.proof?.etherscan_url).toContain('0xabc123');
  });

  it('should cache verification results', async () => {
    const result1 = await service.verify('0xabc123');
    const result2 = await service.verify('0xabc123');

    expect(result1).toEqual(result2);
  });

  it('should extract event logs', async () => {
    const result = await service.verify('0xabc123');

    expect(result.proof?.event_logs).toBeDefined();
    expect(result.proof?.event_logs.length).toBeGreaterThan(0);
  });

  it('should match event signatures', async () => {
    const result = await service.verify('0xabc123');

    expect(result.proof?.event_signatures).toBeDefined();
  });

  it('should handle pending transactions', async () => {
    const pendingProvider = {
      getTransactionReceipt: async () => null,
      getBlockNumber: async () => 112,
    };

    const pendingProviderManager = {
      getProvider: () => pendingProvider as any,
      switchToFallback: () => true,
    };

    const pendingService = new VerificationService(pendingProviderManager as any);
    const result = await pendingService.verify('0xpending', { retryDelay: 100 });

    expect(result.status).toBe(VerificationStatus.PENDING);
    expect(result.error?.code).toBe('RECEIPT_NOT_FOUND');
  });

  it('should handle insufficient confirmations', async () => {
    const lowConfirmationProvider = {
      getTransactionReceipt: async () => mockReceipt as any,
      getBlockNumber: async () => 105, // Only 5 confirmations
      getBlock: async () => ({
        timestamp: Math.floor(Date.now() / 1000),
      }),
    };

    const lowConfirmationManager = {
      getProvider: () => lowConfirmationProvider as any,
      switchToFallback: () => true,
    };

    const lowConfService = new VerificationService(lowConfirmationManager as any);
    const result = await lowConfService.verify('0xlow', { requiredConfirmations: 12 });

    expect(result.status).toBe(VerificationStatus.PENDING);
    expect(result.error?.code).toBe('INSUFFICIENT_CONFIRMATIONS');
  });

  it('should emit verification_complete event', async () => {
    const listener = jest.fn();
    service.on('verification_complete', listener);

    await service.verify('0xabc123');

    expect(listener).toHaveBeenCalled();
  });

  it('should get cached result', async () => {
    await service.verify('0xabc123');
    const cached = service.getCachedResult('0xabc123');

    expect(cached).toBeDefined();
    expect(cached?.tx_hash).toBe('0xabc123');
  });

  it('should clear cache entry', async () => {
    await service.verify('0xabc123');
    service.clearCache('0xabc123');

    const cached = service.getCachedResult('0xabc123');
    expect(cached).toBeUndefined();
  });

  it('should get cache stats', async () => {
    await service.verify('0xabc123');
    await service.verify('0xdef456');

    const stats = service.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.transactions).toContain('0xabc123');
    expect(stats.transactions).toContain('0xdef456');
  });

  it('should verify block confirmation separately', async () => {
    const confirmed = await service.verifyBlockConfirmation('0xabc123', 12);
    expect(confirmed).toBe(true);
  });

  it('should return false for unconfirmed transactions', async () => {
    const lowConfProvider = {
      getTransactionReceipt: async () => mockReceipt as any,
      getBlockNumber: async () => 105,
    };

    const lowConfManager = {
      getProvider: () => lowConfProvider as any,
    };

    const lowConfService = new VerificationService(lowConfManager as any);
    const confirmed = await lowConfService.verifyBlockConfirmation('0xlow', 12);

    expect(confirmed).toBe(false);
  });
});

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe('VerificationService Singleton', () => {
  beforeEach(() => {
    resetVerificationService();
  });

  afterEach(() => {
    resetVerificationService();
  });

  it('should return same instance', () => {
    const service1 = getVerificationService();
    const service2 = getVerificationService();

    expect(service1).toBe(service2);
  });

  it('should reset singleton', () => {
    const service1 = getVerificationService();
    resetVerificationService();
    const service2 = getVerificationService();

    expect(service1).not.toBe(service2);
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('Error Handling', () => {
  let service: VerificationService;

  beforeEach(() => {
    resetVerificationService();
  });

  afterEach(() => {
    resetVerificationService();
  });

  it('should handle RPC errors gracefully', async () => {
    const errorProvider = {
      getTransactionReceipt: async () => {
        throw new Error('RPC timeout');
      },
      getBlockNumber: async () => 112,
    };

    const errorManager = {
      getProvider: () => errorProvider as any,
      switchToFallback: () => true,
    };

    const errorService = new VerificationService(errorManager as any);
    const result = await errorService.verify('0xerror');

    expect(result.status).toBe(VerificationStatus.FAILED);
    expect(result.error?.code).toBe('RPC_ERROR');
  });

  it('should handle multiple verification attempts', async () => {
    service = new VerificationService(mockProviderManager as any);

    const result1 = await service.verify('0xabc123', { retryCount: 2 });
    const result2 = await service.verify('0xabc123', { retryCount: 2 });

    expect(result1.attempts).toBe(1);
    expect(result2.attempts).toBe(1); // Uses cached result
  });

  it('should handle failed verification event', async () => {
    const errorProvider = {
      getTransactionReceipt: async () => {
        throw new Error('Network error');
      },
      getBlockNumber: async () => 112,
    };

    const errorManager = {
      getProvider: () => errorProvider as any,
      switchToFallback: () => true,
    };

    service = new VerificationService(errorManager as any);
    const listener = jest.fn();
    service.on('verification_failed', listener);

    await service.verify('0xerror');

    expect(listener).toHaveBeenCalled();
  });
});

// ============================================================================
// TRANSACTION STATUS DETECTION
// ============================================================================

describe('Transaction Status Detection', () => {
  let service: VerificationService;

  beforeEach(() => {
    resetVerificationService();
  });

  afterEach(() => {
    resetVerificationService();
  });

  it('should detect successful transactions', async () => {
    service = new VerificationService(mockProviderManager as any);
    const result = await service.verify('0xabc123');

    expect(result.proof?.transaction_status).toBe(TransactionStatus.SUCCESS);
  });

  it('should detect failed transactions', async () => {
    const failedReceipt = { ...mockReceipt, status: 0 };
    const failedProvider = {
      getTransactionReceipt: async () => failedReceipt as any,
      getBlockNumber: async () => 112,
      getBlock: async () => ({
        timestamp: Math.floor(Date.now() / 1000),
      }),
    };

    const failedManager = {
      getProvider: () => failedProvider as any,
      switchToFallback: () => true,
    };

    service = new VerificationService(failedManager as any);
    const result = await service.verify('0xfailed');

    expect(result.proof?.transaction_status).toBe(TransactionStatus.FAILED);
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Real-world Scenarios', () => {
  let service: VerificationService;

  beforeEach(() => {
    resetVerificationService();
    service = new VerificationService(mockProviderManager as any);
  });

  afterEach(() => {
    resetVerificationService();
  });

  it('should verify DEX swap transaction', async () => {
    const result = await service.verify('0xswap123');

    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(result.proof?.from_address).toBeDefined();
  });

  it('should verify lending protocol transaction', async () => {
    const result = await service.verify('0xlending123');

    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(result.proof?.event_logs.length).toBeGreaterThan(0);
  });

  it('should verify bridge transaction', async () => {
    const result = await service.verify('0xbridge123');

    expect(result.status).toBe(VerificationStatus.VERIFIED);
  });

  it('should verify complex transactions with multiple logs', async () => {
    const multiLogProvider = {
      getTransactionReceipt: async () => ({
        ...mockReceipt,
        logs: [
          ...mockReceipt.logs,
          {
            address: '0xdifferent123',
            topics: ['0xother123'],
            data: '0xdata',
            blockNumber: 100,
            transactionHash: '0xabc123',
            transactionIndex: 5,
            blockHash: '0xblock123',
            logIndex: 1,
            removed: false,
          },
        ],
      }) as any,
      getBlockNumber: async () => 112,
      getBlock: async () => ({
        timestamp: Math.floor(Date.now() / 1000),
      }),
    };

    const multiLogManager = {
      getProvider: () => multiLogProvider as any,
      switchToFallback: () => true,
    };

    const multiService = new VerificationService(multiLogManager as any);
    const result = await multiService.verify('0xmulti');

    expect(result.proof?.event_logs.length).toBe(2);
  });
});
