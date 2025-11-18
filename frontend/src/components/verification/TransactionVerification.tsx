import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';

export interface VerificationProof {
  blockNumber: number;
  transactionHash: string;
  confirmations: number;
  gasUsed: string;
  gasPrice: string;
  eventLogs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  timestamp: Date;
}

export interface TransactionVerificationProps {
  transactionHash: string;
  proof?: VerificationProof;
  status: 'verified' | 'pending' | 'failed';
  onRetry?: () => void;
  loading?: boolean;
}

const TransactionVerification: React.FC<TransactionVerificationProps> = ({
  transactionHash,
  proof,
  status,
  onRetry,
  loading = false,
}) => {
  const [expandedLogs, setExpandedLogs] = useState<number | null>(null);

  const statusVariant = {
    verified: 'success',
    pending: 'warning',
    failed: 'destructive',
  }[status] as 'success' | 'warning' | 'destructive';

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction Verification</CardTitle>
              <CardDescription className="text-xs font-mono mt-1">{transactionHash}</CardDescription>
            </div>
            <Badge variant={statusVariant}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <StatusIndicator status={status === 'verified' ? 'success' : status === 'pending' ? 'pending' : 'error'} />
            <div>
              <p className="font-semibold text-slate-900">
                {status === 'verified'
                  ? 'Transaction verified on blockchain'
                  : status === 'pending'
                  ? 'Waiting for confirmations'
                  : 'Verification failed'}
              </p>
              <p className="text-sm text-slate-500">
                {status === 'verified' && proof
                  ? `${proof.confirmations} confirmations`
                  : status === 'pending'
                  ? 'Acquiring confirmations...'
                  : 'Review error and retry'}
              </p>
            </div>

            {status === 'failed' && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} loading={loading}>
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Proof Details */}
      {proof && (
        <Card>
          <CardHeader>
            <CardTitle>Proof Details</CardTitle>
            <CardDescription>On-chain verification information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-600">Block Number</p>
                <p className="text-lg font-bold text-slate-900">{proof.blockNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Confirmations</p>
                <p className="text-lg font-bold text-green-600">{proof.confirmations}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Gas Used</p>
                <p className="text-lg font-bold text-slate-900">{proof.gasUsed}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Gas Price</p>
                <p className="text-lg font-bold text-slate-900">{proof.gasPrice}</p>
              </div>
            </div>

            {/* Timestamp */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-600">Transaction Time</p>
              <p className="text-sm text-slate-900">
                {new Date(proof.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Event Logs */}
            {proof.eventLogs.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Event Logs ({proof.eventLogs.length})</h3>
                <div className="space-y-2">
                  {proof.eventLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedLogs(expandedLogs === idx ? null : idx)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-mono text-slate-600">{log.address.slice(0, 16)}...</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Topics: {log.topics.length} | Data: {log.data.length} bytes
                          </p>
                        </div>
                        <svg
                          className={`h-5 w-5 text-slate-400 transition-transform ${
                            expandedLogs === idx ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>

                      {expandedLogs === idx && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                          {log.topics.map((topic, topicIdx) => (
                            <div key={topicIdx}>
                              <p className="text-xs text-slate-600">Topic {topicIdx}</p>
                              <p className="text-xs font-mono bg-slate-50 p-2 rounded break-all">{topic}</p>
                            </div>
                          ))}
                          <div>
                            <p className="text-xs text-slate-600">Data</p>
                            <p className="text-xs font-mono bg-slate-50 p-2 rounded break-all">{log.data}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Etherscan Link */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.open(`https://etherscan.io/tx/${transactionHash}`, '_blank')}
        >
          View on Etherscan
        </Button>
        {onRetry && (
          <Button variant="outline" className="flex-1" onClick={onRetry} loading={loading}>
            Verify Again
          </Button>
        )}
      </div>
    </div>
  );
};

export { TransactionVerification };
