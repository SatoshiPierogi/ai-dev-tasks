/**
 * Uniswap V3 The Graph Client
 * Queries Uniswap V3 subgraph for swap events and liquidity operations
 */

import { TheGraphClient, ProtocolType, QueryResult } from './thegraph';

// ============================================================================
// TYPES
// ============================================================================

export interface UniswapSwap {
  id: string;
  transaction: {
    id: string;
    blockNumber: string;
    timestamp: string;
  };
  pool: {
    id: string;
    token0: {
      id: string;
      symbol: string;
      decimals: string;
    };
    token1: {
      id: string;
      symbol: string;
      decimals: string;
    };
  };
  origin: string; // Wallet address that initiated swap
  amount0: string; // Amount of token0 (signed)
  amount1: string; // Amount of token1 (signed)
  amountUSD: string;
  sqrtPriceX96: string;
  tick: string;
  logIndex: string;
}

export interface UniswapSwapsResult {
  swaps: UniswapSwap[];
}

export interface UniswapLiquidityPosition {
  id: string;
  owner: string;
  pool: {
    id: string;
    token0: {
      id: string;
      symbol: string;
    };
    token1: {
      id: string;
      symbol: string;
    };
  };
  liquidity: string;
  depositedToken0: string;
  depositedToken1: string;
}

export interface UniswapPositionResult {
  positions: UniswapLiquidityPosition[];
}

// ============================================================================
// QUERIES
// ============================================================================

const SWAPS_QUERY = `
  query getSwaps($user: String!, $orderBy: String!, $first: Int!, $skip: Int!) {
    swaps(
      where: { origin: $user }
      orderBy: $orderBy
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      transaction {
        id
        blockNumber
        timestamp
      }
      pool {
        id
        token0 {
          id
          symbol
          decimals
        }
        token1 {
          id
          symbol
          decimals
        }
      }
      origin
      amount0
      amount1
      amountUSD
      sqrtPriceX96
      tick
      logIndex
    }
  }
`;

const POSITIONS_QUERY = `
  query getPositions($owner: String!) {
    positions(where: { owner: $owner }) {
      id
      owner
      pool {
        id
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
      liquidity
      depositedToken0
      depositedToken1
    }
  }
`;

const POOL_QUERY = `
  query getPool($poolId: String!) {
    pools(where: { id: $poolId }) {
      id
      token0 {
        id
        symbol
        decimals
      }
      token1 {
        id
        symbol
        decimals
      }
      feeTier
      liquidity
      sqrtPrice
      tick
    }
  }
`;

// ============================================================================
// UNISWAP CLIENT
// ============================================================================

export class UniswapClient {
  private client: TheGraphClient;

  constructor(theGraphClient: TheGraphClient) {
    this.client = theGraphClient;
  }

  /**
   * Get recent swaps by wallet address
   */
  async getSwaps(
    walletAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<UniswapSwapsResult>> {
    return this.client.query<UniswapSwapsResult>(
      ProtocolType.UNISWAP,
      SWAPS_QUERY,
      {
        user: walletAddress.toLowerCase(),
        orderBy: 'timestamp',
        first: Math.min(limit, 1000), // Cap at 1000
        skip: offset,
      }
    );
  }

  /**
   * Get liquidity positions by wallet address
   */
  async getPositions(walletAddress: string): Promise<QueryResult<UniswapPositionResult>> {
    return this.client.query<UniswapPositionResult>(
      ProtocolType.UNISWAP,
      POSITIONS_QUERY,
      {
        owner: walletAddress.toLowerCase(),
      }
    );
  }

  /**
   * Get pool information
   */
  async getPool(poolId: string): Promise<QueryResult<any>> {
    return this.client.query<any>(
      ProtocolType.UNISWAP,
      POOL_QUERY,
      {
        poolId: poolId.toLowerCase(),
      }
    );
  }

  /**
   * Paginate through all swaps for an address
   * Yields results as they arrive
   */
  async *getAllSwaps(walletAddress: string, pageSize: number = 1000) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getSwaps(walletAddress, pageSize, offset);
      const swaps = result.data.swaps;

      if (swaps.length === 0) {
        hasMore = false;
      } else {
        yield swaps;
        offset += pageSize;

        // Stop if we got less than a full page
        if (swaps.length < pageSize) {
          hasMore = false;
        }
      }
    }
  }

  /**
   * Build a swap record in unified format
   */
  static buildSwapRecord(swap: UniswapSwap) {
    const amount0 = BigInt(swap.amount0);
    const amount1 = BigInt(swap.amount1);

    // Determine tokens_in and tokens_out based on sign of amounts
    const token0In = amount0 > 0n;
    const token0Amount = amount0In ? amount0 : -amount0;
    const token1Amount = amount1 > 0n ? amount1 : -amount1;

    return {
      tx_hash: swap.transaction.id,
      protocol: 'uniswap_v3',
      action_type: 'swap',
      agent_address: swap.origin,
      timestamp: new Date(parseInt(swap.transaction.timestamp) * 1000).toISOString(),
      tokens_in: token0In
        ? [
            {
              address: swap.pool.token0.id,
              symbol: swap.pool.token0.symbol,
              amount: token0Amount.toString(),
              decimals: parseInt(swap.pool.token0.decimals),
            },
          ]
        : [
            {
              address: swap.pool.token1.id,
              symbol: swap.pool.token1.symbol,
              amount: token1Amount.toString(),
              decimals: parseInt(swap.pool.token1.decimals),
            },
          ],
      tokens_out: token0In
        ? [
            {
              address: swap.pool.token1.id,
              symbol: swap.pool.token1.symbol,
              amount: token1Amount.toString(),
              decimals: parseInt(swap.pool.token1.decimals),
            },
          ]
        : [
            {
              address: swap.pool.token0.id,
              symbol: swap.pool.token0.symbol,
              amount: token0Amount.toString(),
              decimals: parseInt(swap.pool.token0.decimals),
            },
          ],
      metadata: {
        pool_id: swap.pool.id,
        sqrt_price_x96: swap.sqrtPriceX96,
        tick: swap.tick,
        log_index: swap.logIndex,
        amount_usd: swap.amountUSD,
      },
    };
  }
}
