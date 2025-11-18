/**
 * VerificationProof Model
 * Represents cryptographic proof of transaction authenticity
 */

export type VerificationMethod = 'on_chain' | 'tee_attestation' | 'zk_proof';
export type VerificationProofStatus = 'pending' | 'verified' | 'unverified' | 'error';

export interface EventLog {
  index: number;
  address: string; // Contract address
  topics: string[]; // Event signature and indexed parameters
  data: string; // Non-indexed parameters
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
}

export interface Signature {
  eventSignature: string; // Keccak256 hash of event name and types
  isValid: boolean;
  contractAddress: string;
}

export interface ProofData {
  transactionReceipt?: any;
  blockHash?: string;
  blockNumber?: number;
  signatures?: Signature[];
  eventHashes?: string[];
  [key: string]: any; // Verification-method specific data
}

export interface VerificationProof {
  id: number;

  // References
  transaction_id: number;
  tx_hash: string;

  // Verification details
  verification_status: VerificationProofStatus;
  verification_method: VerificationMethod;

  // Proof data
  proof_data: ProofData;
  event_logs?: EventLog[];
  signatures?: Signature[];

  // Timeline
  verification_started_at?: Date;
  verified_at?: Date;

  // RPC provider used
  rpc_provider?: string;
  rpc_error_message?: string;

  // Merkle proof (for batched verification)
  merkle_root?: string;
  merkle_proof?: string[];

  // Block explorer reference
  block_explorer_url?: string;

  // Metadata
  created_at: Date;
  updated_at: Date;
  retry_count: number;
}

// Input/Creation types
export interface CreateVerificationProofInput {
  transaction_id: number;
  tx_hash: string;
  verification_method: VerificationMethod;
  proof_data: ProofData;
  event_logs?: EventLog[];
  signatures?: Signature[];
  rpc_provider?: string;
}

export interface UpdateVerificationProofInput {
  verification_status?: VerificationProofStatus;
  verified_at?: Date;
  verification_started_at?: Date;
  rpc_error_message?: string;
  retry_count?: number;
  merkle_root?: string;
  merkle_proof?: string[];
}

// Proof verification utilities
export interface VerificationResult {
  isValid: boolean;
  status: VerificationProofStatus;
  message: string;
  proof: VerificationProof;
}

export const verifyTransactionReceipt = (
  receipt: any,
  expectedTxHash: string,
  minConfirmations: number = 12
): VerificationResult => {
  if (!receipt) {
    return {
      isValid: false,
      status: 'unverified',
      message: 'Transaction receipt not found',
      proof: {} as VerificationProof,
    };
  }

  // Verify transaction hash
  if (receipt.transactionHash?.toLowerCase() !== expectedTxHash.toLowerCase()) {
    return {
      isValid: false,
      status: 'unverified',
      message: 'Transaction hash mismatch',
      proof: {} as VerificationProof,
    };
  }

  // Verify transaction status
  if (receipt.status === 0) {
    return {
      isValid: false,
      status: 'unverified',
      message: 'Transaction failed on-chain',
      proof: {} as VerificationProof,
    };
  }

  // Verify confirmations (can't check here, requires current block)
  // This would be checked in the verification service

  return {
    isValid: true,
    status: 'verified',
    message: 'Transaction verified on-chain',
    proof: {} as VerificationProof,
  };
};

export const hashEventSignature = (eventName: string, paramTypes: string[]): string => {
  // Keccak256(eventName(param1Type,param2Type,...))
  // Implementation would use ethers.js or web3.js
  const signature = `${eventName}(${paramTypes.join(',')})`;
  // Return keccak256(signature)
  return signature; // Placeholder
};

export const validateEventLog = (
  log: EventLog,
  expectedEventSignature: string
): boolean => {
  if (!log.topics || log.topics.length === 0) {
    return false;
  }

  // First topic is the event signature hash
  // const eventHash = log.topics[0];
  // Compare with expectedEventSignature hash
  return true; // Placeholder
};
