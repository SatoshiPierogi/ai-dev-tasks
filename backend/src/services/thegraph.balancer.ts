/**
 * Balancer V2 The Graph Client
 * Queries Balancer V2 subgraph for swap and liquidity operations
 */

import { TheGraphClient, ProtocolType, QueryResult } from './thegraph';

// ============================================================================
// TYPES
// ============================================================================

export interface BalancerSwapEvent {
  id: string;
  tx: string;
  timestamp: string;
  tokenIn: {
    id: string;
    symbol: string;
    decimals: string;
  };
  tokenOut: {
    id: string;
    symbol: string;
    decimals: string;
  };
  tokenAmountIn: string;
  tokenAmountOut: string;
  pool: {
    id: string;
    name: string;
  };
  userAddress: {
    id: string;
  };
}

export interface BalancerJoinEvent {
  id: string;
  tx: string;
  timestamp: string;
  pool: {
    id: string;
    name: string;
  };
  user: string;
  amounts: string[];
  poolAmountOut: string;
  poolSharesBefore: string;
  poolSharesAfter: string;
}

export interface BalancerExitEvent {
  id: string;
  tx: string;
  timestamp: string;
  pool: {
    id: string;
    name: string;
  };
  user: string;
  amounts: string[];
  poolAmountIn: string;
  poolSharesBefore: string;
  poolSharesAfter: string;
}

// ============================================================================
// QUERIES
// ============================================================================

const SWAPS_QUERY = `
  query getSwaps($userAddress: String!, $first: Int!, $skip: Int!) {
    swaps(
      where: { userAddress: $userAddress }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      tx
      timestamp
      tokenIn {
        id
        symbol
        decimals
      }
      tokenOut {
        id
        symbol
        decimals
      }
      tokenAmountIn
      tokenAmountOut
      pool {
        id
        name
      }
      userAddress {
        id
      }
    }
  }
`;

const JOINS_QUERY = `
  query getJoins($user: String!, $first: Int!, $skip: Int!) {
    joins(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      tx
      timestamp
      pool {
        id
        name
      }
      user
      amounts
      poolAmountOut
      poolSharesBefore
      poolSharesAfter
    }
  }
`;

const EXITS_QUERY = `
  query getExits($user: String!, $first: Int!, $skip: Int!) {
    exits(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      tx
      timestamp
      pool {
        id
        name
      }
      user
      amounts
      poolAmountIn
      poolSharesBefore
      poolSharesAfter
    }
  }
`;

// ============================================================================
// BALANCER CLIENT
// ============================================================================

export class BalancerClient {
  private client: TheGraphClient;

  constructor(theGraphClient: TheGraphClient) {
    this.client = theGraphClient;
  }

  /**
   * Get swap events for a user
   */
  async getSwaps(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ swaps: BalancerSwapEvent[] }>> {
    return this.client.query<{ swaps: BalancerSwapEvent[] }>(
      ProtocolType.BALANCER,
      SWAPS_QUERY,
      {
        userAddress: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Get join (add liquidity) events for a user
   */
  async getJoins(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ joins: BalancerJoinEvent[] }>> {
    return this.client.query<{ joins: BalancerJoinEvent[] }>(
      ProtocolType.BALANCER,
      JOINS_QUERY,
      {
        user: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Get exit (remove liquidity) events for a user
   */
  async getExits(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ exits: BalancerExitEvent[] }>> {
    return this.client.query<{ exits: BalancerExitEvent[] }>(
      ProtocolType.BALANCER,
      EXITS_QUERY,
      {
        user: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Build a swap record in unified format
   */
  static buildSwapRecord(swap: BalancerSwapEvent) {
    return {
      tx_hash: swap.tx,
      protocol: 'balancer_v2',
      action_type: 'swap',
      agent_address: swap.userAddress.id,
      timestamp: new Date(parseInt(swap.timestamp) * 1000).toISOString(),
      tokens_in: [
        {
          address: swap.tokenIn.id,
          symbol: swap.tokenIn.symbol,
          amount: swap.tokenAmountIn,
          decimals: parseInt(swap.tokenIn.decimals),
        },
      ],
      tokens_out: [
        {
          address: swap.tokenOut.id,
          symbol: swap.tokenOut.symbol,
          amount: swap.tokenAmountOut,
          decimals: parseInt(swap.tokenOut.decimals),
        },
      ],
      metadata: {
        pool_id: swap.pool.id,
        pool_name: swap.pool.name,
      },
    };
  }

  /**
   * Build a join (add liquidity) record in unified format
   */
  static buildJoinRecord(join: BalancerJoinEvent) {
    return {
      tx_hash: join.tx,
      protocol: 'balancer_v2',
      action_type: 'lp',
      agent_address: join.user,
      timestamp: new Date(parseInt(join.timestamp) * 1000).toISOString(),
      tokens_in: join.amounts.map((amount, index) => ({
        amount,
        symbol: `token_${index}`,
        decimals: 18,
      })),
      tokens_out: [
        {
          symbol: 'BPT',
          amount: join.poolAmountOut,
          decimals: 18,
        },
      ],
      metadata: {
        pool_id: join.pool.id,
        pool_name: join.pool.name,
        operation: 'join',
        pool_shares_before: join.poolSharesBefore,
        pool_shares_after: join.poolSharesAfter,
      },
    };
  }

  /**
   * Build an exit (remove liquidity) record in unified format
   */
  static buildExitRecord(exit: BalancerExitEvent) {
    return {
      tx_hash: exit.tx,
      protocol: 'balancer_v2',
      action_type: 'lp',
      agent_address: exit.user,
      timestamp: new Date(parseInt(exit.timestamp) * 1000).toISOString(),
      tokens_in: [
        {
          symbol: 'BPT',
          amount: exit.poolAmountIn,
          decimals: 18,
        },
      ],
      tokens_out: exit.amounts.map((amount, index) => ({
        amount,
        symbol: `token_${index}`,
        decimals: 18,
      })),
      metadata: {
        pool_id: exit.pool.id,
        pool_name: exit.pool.name,
        operation: 'exit',
        pool_shares_before: exit.poolSharesBefore,
        pool_shares_after: exit.poolSharesAfter,
      },
    };
  }
}
