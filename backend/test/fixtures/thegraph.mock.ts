/**
 * The Graph Mock Responses
 * Realistic mock data for The Graph subgraph queries
 */

import { createMockTransaction, COMMON_TOKENS } from './factories';

// ============================================================================
// UNISWAP V3 MOCK RESPONSES
// ============================================================================

export const MOCK_UNISWAP_SWAPS = {
  data: {
    swaps: [
      {
        id: '0x123-1',
        transaction: {
          id: '0x123',
          blockNumber: '19000000',
          timestamp: Math.floor(Date.now() / 1000).toString(),
        },
        token0: {
          id: COMMON_TOKENS.USDC.address,
          symbol: 'USDC',
          decimals: '6',
        },
        token1: {
          id: COMMON_TOKENS.ETH.address,
          symbol: 'ETH',
          decimals: '18',
        },
        amount0: '2500000000', // 2500 USDC
        amount1: '1500000000000000000', // 1.5 ETH
        amountUSD: '3750',
        sqrtPriceX96: '2400000000000000000000000000',
        tick: '192000',
        logIndex: '123',
      },
      {
        id: '0x456-1',
        transaction: {
          id: '0x456',
          blockNumber: '19000001',
          timestamp: Math.floor(Date.now() / 1000 - 3600).toString(),
        },
        token0: {
          id: COMMON_TOKENS.ETH.address,
          symbol: 'ETH',
          decimals: '18',
        },
        token1: {
          id: COMMON_TOKENS.USDT.address,
          symbol: 'USDT',
          decimals: '6',
        },
        amount0: '1000000000000000000', // 1 ETH
        amount1: '2400000000', // 2400 USDT
        amountUSD: '2400',
        sqrtPriceX96: '2400000000000000000000000000',
        tick: '192000',
        logIndex: '456',
      },
    ],
  },
};

// ============================================================================
// AAVE MOCK RESPONSES
// ============================================================================

export const MOCK_AAVE_TRANSACTIONS = {
  data: {
    deposits: [
      {
        id: '0x789-deposit',
        user: {
          id: '0xuser123',
        },
        reserve: {
          id: COMMON_TOKENS.USDC.address,
          symbol: 'USDC',
          decimals: '6',
          name: 'USD Coin',
        },
        amount: '10000000000', // 10000 USDC
        timestamp: Math.floor(Date.now() / 1000 - 7200).toString(),
        blockNumber: '19000002',
        transaction: {
          id: '0x789',
        },
      },
    ],
    withdrawals: [
      {
        id: '0xabc-withdrawal',
        user: {
          id: '0xuser123',
        },
        reserve: {
          id: COMMON_TOKENS.DAI.address,
          symbol: 'DAI',
          decimals: '18',
          name: 'Dai Stablecoin',
        },
        amount: '5000000000000000000', // 5000 DAI
        timestamp: Math.floor(Date.now() / 1000 - 10800).toString(),
        blockNumber: '19000003',
        transaction: {
          id: '0xabc',
        },
      },
    ],
    borrows: [
      {
        id: '0xdef-borrow',
        user: {
          id: '0xuser123',
        },
        reserve: {
          id: COMMON_TOKENS.USDT.address,
          symbol: 'USDT',
          decimals: '6',
          name: 'Tether USD',
        },
        amount: '20000000000', // 20000 USDT
        borrowRateMode: '2', // Stable
        timestamp: Math.floor(Date.now() / 1000 - 14400).toString(),
        blockNumber: '19000004',
        transaction: {
          id: '0xdef',
        },
      },
    ],
    repays: [
      {
        id: '0xghi-repay',
        user: {
          id: '0xuser123',
        },
        reserve: {
          id: COMMON_TOKENS.USDC.address,
          symbol: 'USDC',
          decimals: '6',
          name: 'USD Coin',
        },
        amount: '5000000000', // 5000 USDC
        timestamp: Math.floor(Date.now() / 1000 - 18000).toString(),
        blockNumber: '19000005',
        transaction: {
          id: '0xghi',
        },
      },
    ],
  },
};

// ============================================================================
// CURVE MOCK RESPONSES
// ============================================================================

export const MOCK_CURVE_EXCHANGES = {
  data: {
    exchangeUnderlying: [
      {
        id: '0xjkl-exchange',
        pool: {
          id: '0xcurvepool123',
          name: 'USDC/USDT/DAI',
        },
        buyer: '0xuser123',
        soldId: '0', // USDC
        tokenSold: {
          symbol: 'USDC',
          decimals: '6',
        },
        tokenBought: {
          symbol: 'USDT',
          decimals: '6',
        },
        boughtId: '1',
        soldAmount: '5000000000', // 5000 USDC
        boughtAmount: '4995000000', // 4995 USDT (small slippage)
        timestamp: Math.floor(Date.now() / 1000 - 21600).toString(),
        blockNumber: '19000006',
        transaction: {
          id: '0xjkl',
        },
      },
    ],
    addLiquidityEvents: [
      {
        id: '0xmno-addliq',
        pool: {
          id: '0xcurvepool123',
          name: 'USDC/USDT/DAI',
        },
        provider: '0xuser123',
        tokenAmounts: ['3000000000', '3000000000', '3000000000'], // 3000 each
        fees: ['0', '0', '0'],
        invariant: '9000000000000000000000',
        lpTokenSupply: '9001000000000000000000',
        lpTokenAmount: '1000000000000000000000', // 1000 LP tokens
        timestamp: Math.floor(Date.now() / 1000 - 25200).toString(),
        blockNumber: '19000007',
        transaction: {
          id: '0xmno',
        },
      },
    ],
  },
};

// ============================================================================
// BALANCER MOCK RESPONSES
// ============================================================================

export const MOCK_BALANCER_SWAPS = {
  data: {
    swaps: [
      {
        id: '0xpqr-swap',
        poolId: {
          id: '0xbalancerpool456',
          tokensList: [COMMON_TOKENS.ETH.address, COMMON_TOKENS.USDC.address],
        },
        caller: '0xuser123',
        tokenIn: {
          id: COMMON_TOKENS.ETH.address,
          symbol: 'ETH',
          decimals: '18',
        },
        tokenOut: {
          id: COMMON_TOKENS.USDC.address,
          symbol: 'USDC',
          decimals: '6',
        },
        tokenAmountIn: '500000000000000000', // 0.5 ETH
        tokenAmountOut: '1250000000', // 1250 USDC
        poolId: '0xbalancerpool456',
        timestamp: Math.floor(Date.now() / 1000 - 28800).toString(),
        blockNumber: '19000008',
        transaction: {
          id: '0xpqr',
        },
      },
    ],
    joinPool: [
      {
        id: '0xstu-join',
        pool: {
          id: '0xbalancerpool456',
          tokensList: [COMMON_TOKENS.ETH.address, COMMON_TOKENS.USDC.address],
        },
        user: '0xuser123',
        amounts: ['1000000000000000000', '2500000000'], // 1 ETH, 2500 USDC
        pool: {
          totalShares: '50000000000000000000000',
        },
        timestamp: Math.floor(Date.now() / 1000 - 32400).toString(),
        blockNumber: '19000009',
        transaction: {
          id: '0xstu',
        },
      },
    ],
  },
};

// ============================================================================
// QUERY HELPER
// ============================================================================

export function getMockTheGraphResponse(protocol: string, queryType: string) {
  switch (protocol.toLowerCase()) {
    case 'uniswap_v3':
    case 'uniswap':
      return MOCK_UNISWAP_SWAPS;
    case 'aave':
      return MOCK_AAVE_TRANSACTIONS;
    case 'curve':
      return MOCK_CURVE_EXCHANGES;
    case 'balancer':
      return MOCK_BALANCER_SWAPS;
    default:
      return { data: { [queryType]: [] } };
  }
}

export const MOCK_SUBGRAPH_URLS = {
  uniswap_v3: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  aave: 'https://api.thegraph.com/subgraphs/name/aave/aave-v2',
  curve: 'https://api.thegraph.com/subgraphs/name/curvefi/curve',
  balancer: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer',
};
