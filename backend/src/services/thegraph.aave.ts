/**
 * Aave V3 The Graph Client
 * Queries Aave V3 subgraph for deposit, withdrawal, borrow, and repay events
 */

import { TheGraphClient, ProtocolType, QueryResult } from './thegraph';

// ============================================================================
// TYPES
// ============================================================================

export interface AaveDepositEvent {
  id: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  user: string;
  reserve: {
    id: string;
    symbol: string;
    decimals: string;
  };
  amount: string;
}

export interface AaveWithdrawEvent {
  id: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  user: string;
  reserve: {
    id: string;
    symbol: string;
    decimals: string;
  };
  amount: string;
  to: string;
}

export interface AaveBorrowEvent {
  id: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  user: string;
  reserve: {
    id: string;
    symbol: string;
    decimals: string;
  };
  amount: string;
  borrowRateMode: string;
  borrowRate: string;
}

export interface AaveRepayEvent {
  id: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  user: string;
  reserve: {
    id: string;
    symbol: string;
    decimals: string;
  };
  amount: string;
  repayer: string;
}

export interface AaveEventsResult {
  deposits?: AaveDepositEvent[];
  withdraws?: AaveWithdrawEvent[];
  borrows?: AaveBorrowEvent[];
  repays?: AaveRepayEvent[];
}

// ============================================================================
// QUERIES
// ============================================================================

const DEPOSITS_QUERY = `
  query getDeposits($user: String!, $first: Int!, $skip: Int!) {
    deposits(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      transactionHash
      blockNumber
      timestamp
      user
      reserve {
        id
        symbol
        decimals
      }
      amount
    }
  }
`;

const WITHDRAWS_QUERY = `
  query getWithdraws($user: String!, $first: Int!, $skip: Int!) {
    withdraws(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      transactionHash
      blockNumber
      timestamp
      user
      reserve {
        id
        symbol
        decimals
      }
      amount
      to
    }
  }
`;

const BORROWS_QUERY = `
  query getBorrows($user: String!, $first: Int!, $skip: Int!) {
    borrows(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      transactionHash
      blockNumber
      timestamp
      user
      reserve {
        id
        symbol
        decimals
      }
      amount
      borrowRateMode
      borrowRate
    }
  }
`;

const REPAYS_QUERY = `
  query getRepays($user: String!, $first: Int!, $skip: Int!) {
    repays(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      transactionHash
      blockNumber
      timestamp
      user
      reserve {
        id
        symbol
        decimals
      }
      amount
      repayer
    }
  }
`;

// ============================================================================
// AAVE CLIENT
// ============================================================================

export class AaveClient {
  private client: TheGraphClient;

  constructor(theGraphClient: TheGraphClient) {
    this.client = theGraphClient;
  }

  /**
   * Get deposit events for a user
   */
  async getDeposits(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ deposits: AaveDepositEvent[] }>> {
    return this.client.query<{ deposits: AaveDepositEvent[] }>(
      ProtocolType.AAVE,
      DEPOSITS_QUERY,
      {
        user: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Get withdrawal events for a user
   */
  async getWithdraws(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ withdraws: AaveWithdrawEvent[] }>> {
    return this.client.query<{ withdraws: AaveWithdrawEvent[] }>(
      ProtocolType.AAVE,
      WITHDRAWS_QUERY,
      {
        user: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Get borrow events for a user
   */
  async getBorrows(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ borrows: AaveBorrowEvent[] }>> {
    return this.client.query<{ borrows: AaveBorrowEvent[] }>(
      ProtocolType.AAVE,
      BORROWS_QUERY,
      {
        user: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Get repay events for a user
   */
  async getRepays(
    userAddress: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult<{ repays: AaveRepayEvent[] }>> {
    return this.client.query<{ repays: AaveRepayEvent[] }>(
      ProtocolType.AAVE,
      REPAYS_QUERY,
      {
        user: userAddress.toLowerCase(),
        first: Math.min(limit, 1000),
        skip: offset,
      }
    );
  }

  /**
   * Get all events (deposits, withdraws, borrows, repays) for a user
   */
  async getAllEvents(userAddress: string): Promise<AaveEventsResult> {
    const normalizedAddress = userAddress.toLowerCase();

    const [depositsResult, withdrawsResult, borrowsResult, repaysResult] = await Promise.all([
      this.getDeposits(normalizedAddress),
      this.getWithdraws(normalizedAddress),
      this.getBorrows(normalizedAddress),
      this.getRepays(normalizedAddress),
    ]);

    return {
      deposits: depositsResult.data.deposits,
      withdraws: withdrawsResult.data.withdraws,
      borrows: borrowsResult.data.borrows,
      repays: repaysResult.data.repays,
    };
  }

  /**
   * Build a deposit record in unified format
   */
  static buildDepositRecord(deposit: AaveDepositEvent) {
    return {
      tx_hash: deposit.transactionHash,
      protocol: 'aave_v3',
      action_type: 'stake',
      agent_address: deposit.user,
      timestamp: new Date(parseInt(deposit.timestamp) * 1000).toISOString(),
      tokens_in: [
        {
          address: deposit.reserve.id,
          symbol: deposit.reserve.symbol,
          amount: deposit.amount,
          decimals: parseInt(deposit.reserve.decimals),
        },
      ],
      tokens_out: [
        {
          address: deposit.reserve.id,
          symbol: `a${deposit.reserve.symbol}`,
          amount: deposit.amount,
          decimals: parseInt(deposit.reserve.decimals),
        },
      ],
      metadata: {
        action: 'deposit',
        reserve_id: deposit.reserve.id,
      },
    };
  }

  /**
   * Build a withdrawal record in unified format
   */
  static buildWithdrawRecord(withdraw: AaveWithdrawEvent) {
    return {
      tx_hash: withdraw.transactionHash,
      protocol: 'aave_v3',
      action_type: 'stake',
      agent_address: withdraw.user,
      timestamp: new Date(parseInt(withdraw.timestamp) * 1000).toISOString(),
      tokens_in: [
        {
          address: withdraw.reserve.id,
          symbol: `a${withdraw.reserve.symbol}`,
          amount: withdraw.amount,
          decimals: parseInt(withdraw.reserve.decimals),
        },
      ],
      tokens_out: [
        {
          address: withdraw.reserve.id,
          symbol: withdraw.reserve.symbol,
          amount: withdraw.amount,
          decimals: parseInt(withdraw.reserve.decimals),
        },
      ],
      metadata: {
        action: 'withdraw',
        reserve_id: withdraw.reserve.id,
        recipient: withdraw.to,
      },
    };
  }

  /**
   * Build a borrow record in unified format
   */
  static buildBorrowRecord(borrow: AaveBorrowEvent) {
    return {
      tx_hash: borrow.transactionHash,
      protocol: 'aave_v3',
      action_type: 'stake',
      agent_address: borrow.user,
      timestamp: new Date(parseInt(borrow.timestamp) * 1000).toISOString(),
      tokens_in: [],
      tokens_out: [
        {
          address: borrow.reserve.id,
          symbol: borrow.reserve.symbol,
          amount: borrow.amount,
          decimals: parseInt(borrow.reserve.decimals),
        },
      ],
      metadata: {
        action: 'borrow',
        reserve_id: borrow.reserve.id,
        rate_mode: borrow.borrowRateMode,
        borrow_rate: borrow.borrowRate,
      },
    };
  }

  /**
   * Build a repay record in unified format
   */
  static buildRepayRecord(repay: AaveRepayEvent) {
    return {
      tx_hash: repay.transactionHash,
      protocol: 'aave_v3',
      action_type: 'stake',
      agent_address: repay.user,
      timestamp: new Date(parseInt(repay.timestamp) * 1000).toISOString(),
      tokens_in: [
        {
          address: repay.reserve.id,
          symbol: repay.reserve.symbol,
          amount: repay.amount,
          decimals: parseInt(repay.reserve.decimals),
        },
      ],
      tokens_out: [],
      metadata: {
        action: 'repay',
        reserve_id: repay.reserve.id,
        repayer: repay.repayer,
      },
    };
  }
}
