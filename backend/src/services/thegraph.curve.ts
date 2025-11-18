/**
 * Curve The Graph Client
 * Queries Curve subgraph for liquidity pool operations
 */

import { TheGraphClient, ProtocolType, QueryResult } from './thegraph';

// ============================================================================
// TYPES
// ============================================================================

export interface CurveSwapEvent {
  id: string;
  transaction: {
    id: string;
    blockNumber: string;
    timestamp: string;
  };
  pool: {
    id: string;
    name: string;
  };
  buyer: string;
  soldId: string;
  tokenSold: {
    id: string;
    symbol: string;
    decimals: string;
  };
  boughtId: string;
  tokenBought: {
    id: string;
    symbol: string;
    decimals: string;
  };
  tokensSold: string;
  tokensBought: string;
}

export interface CurveAddLiquidityEvent {
  id: string;
  transaction: {
    id: string;
    blockNumber: string;
    timestamp: string;
  };
  pool: {
    id: string;
    name: string;
  };
  provider: string;
  tokenAmounts: string[];
  fees: string[];
  invariant: string;
  lpTokenSupply: string;
  lpTokenAmount: string;
}

export interface CurveRemoveLiquidityEvent {
  id: string;
  transaction: {
    id: string;
    blockNumber: string;
    timestamp: string;
  };
  pool: {
    id: string;
    name: string;
  };
  provider: string;
  tokenAmounts: string[];
  fees: string[];
  invariant: string;
  lpTokenSupply: string;
  lpTokenAmount: string;
}

// ============================================================================
// QUERIES
// ============================================================================

const SWAPS_QUERY = `
  query getSwaps($buyer: String!, $first: Int!, $skip: Int!) {
    exchangeUnderlyings(
      where: { buyer: $buyer }
      orderBy: timestamp
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
        name
      }
      buyer
      soldId
      tokenSold {
        id
        symbol
        decimals
      }
      boughtId
      tokenBought {
        id
        symbol
        decimals
      }
      tokensSold
      tokensBought
    }
  }
`;

const ADD_LIQUIDITY_QUERY = `
  query getAddLiquidity($provider: String!, $first: Int!, $skip: Int!) {
    addLiquidities(
      where: { provider: $provider }
      orderBy: timestamp
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
        name
      }
      provider
      tokenAmounts
      fees
      invariant
      lpTokenSupply
      lpTokenAmount
    }
  }
`;

const REMOVE_LIQUIDITY_QUERY = `
  query getRemoveLiquidity($provider: String!, $first: Int!, $skip: Int!) {
    removeLiquidities(
      where: { provider: $provider }
      orderBy: timestamp
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
        name
      }
      provider
      tokenAmounts
      fees
      invariant
      lpTokenSupply
      lpTokenAmount
    }
  }
`;

// ============================================================================
// CURVE CLIENT
// ============================================================================

export class CurveClient {
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
  ): Promise<QueryResult<{ exchangeUnderlyings: CurveSwapEvent[] }>> {
    return this.client.query<{ exchangeUnderlyings: CurveSwapEvent[] }>(
      ProtocolType.CURVE,
      SWAPS_QUERY,
      {
        buyer: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Get add liquidity events for a user
   */
  async getAddLiquidity(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ addLiquidities: CurveAddLiquidityEvent[] }>> {
    return this.client.query<{ addLiquidities: CurveAddLiquidityEvent[] }>(
      ProtocolType.CURVE,
      ADD_LIQUIDITY_QUERY,
      {
        provider: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Get remove liquidity events for a user
   */
  async getRemoveLiquidity(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ removeLiquidities: CurveRemoveLiquidityEvent[] }>> {
    return this.client.query<{ removeLiquidities: CurveRemoveLiquidityEvent[] }>(
      ProtocolType.CURVE,
      REMOVE_LIQUIDITY_QUERY,
      {
        provider: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Build a swap record in unified format
   */
  static buildSwapRecord(swap: CurveSwapEvent) {
    return {
      tx_hash: swap.transaction.id,
      protocol: 'curve',
      action_type: 'swap',
      agent_address: swap.buyer,
      timestamp: new Date(parseInt(swap.transaction.timestamp) * 1000).toISOString(),
      tokens_in: [
        {
          address: swap.tokenSold.id,
          symbol: swap.tokenSold.symbol,
          amount: swap.tokensSold,
          decimals: parseInt(swap.tokenSold.decimals),
        },
      ],
      tokens_out: [
        {
          address: swap.tokenBought.id,
          symbol: swap.tokenBought.symbol,
          amount: swap.tokensBought,
          decimals: parseInt(swap.tokenBought.decimals),
        },
      ],
      metadata: {
        pool_id: swap.pool.id,
        pool_name: swap.pool.name,
      },
    };
  }

  /**
   * Build an add liquidity record in unified format
   */
  static buildAddLiquidityRecord(event: CurveAddLiquidityEvent) {
    return {
      tx_hash: event.transaction.id,
      protocol: 'curve',
      action_type: 'lp',
      agent_address: event.provider,
      timestamp: new Date(parseInt(event.transaction.timestamp) * 1000).toISOString(),
      tokens_in: event.tokenAmounts.map((amount, index) => ({
        amount,
        // In production, would map proper token info
        symbol: `token_${index}`,
        decimals: 18,
      })),
      tokens_out: [
        {
          symbol: 'LP_TOKEN',
          amount: event.lpTokenAmount,
          decimals: 18,
        },
      ],
      metadata: {
        pool_id: event.pool.id,
        pool_name: event.pool.name,
        operation: 'add_liquidity',
        invariant: event.invariant,
        lp_token_supply: event.lpTokenSupply,
      },
    };
  }

  /**
   * Build a remove liquidity record in unified format
   */
  static buildRemoveLiquidityRecord(event: CurveRemoveLiquidityEvent) {
    return {
      tx_hash: event.transaction.id,
      protocol: 'curve',
      action_type: 'lp',
      agent_address: event.provider,
      timestamp: new Date(parseInt(event.transaction.timestamp) * 1000).toISOString(),
      tokens_in: [
        {
          symbol: 'LP_TOKEN',
          amount: event.lpTokenAmount,
          decimals: 18,
        },
      ],
      tokens_out: event.tokenAmounts.map((amount, index) => ({
        amount,
        symbol: `token_${index}`,
        decimals: 18,
      })),
      metadata: {
        pool_id: event.pool.id,
        pool_name: event.pool.name,
        operation: 'remove_liquidity',
        invariant: event.invariant,
        lp_token_supply: event.lpTokenSupply,
      },
    };
  }
}
