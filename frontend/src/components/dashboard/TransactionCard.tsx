import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StatusIndicator } from '../ui/StatusIndicator';

export interface Transaction {
  id: string;
  hash: string;
  agentAddress: string;
  type: 'swap' | 'deposit' | 'withdraw' | 'borrow' | 'repay';
  protocol: string;
  status: 'verified' | 'pending' | 'failed';
  tokenIn?: { symbol: string; amount: string };
  tokenOut?: { symbol: string; amount: string };
  value: string;
  timestamp: Date;
  confirmations: number;
}

export interface TransactionCardProps {
  transaction: Transaction;
  onClick?: (txId: string) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onClick }) => {
  const statusVariant = {
    verified: 'success',
    pending: 'warning',
    failed: 'destructive',
  }[transaction.status] as 'success' | 'warning' | 'destructive';

  const typeLabel = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onClick?.(transaction.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">{typeLabel}</p>
              <Badge variant="secondary">{transaction.protocol}</Badge>
            </div>
            <p className="text-xs font-mono text-slate-500">{transaction.hash.slice(0, 16)}...</p>
          </div>
          <Badge variant={statusVariant}>{transaction.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {transaction.tokenIn && transaction.tokenOut && (
          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
            <div>
              <p className="text-xs text-slate-600">From</p>
              <p className="font-semibold text-slate-900">{transaction.tokenIn.amount} {transaction.tokenIn.symbol}</p>
            </div>
            <div className="text-slate-400">→</div>
            <div>
              <p className="text-xs text-slate-600 text-right">To</p>
              <p className="font-semibold text-slate-900 text-right">{transaction.tokenOut.amount} {transaction.tokenOut.symbol}</p>
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIndicator status={transaction.status === 'verified' ? 'success' : transaction.status === 'pending' ? 'pending' : 'error'} />
            <span className="text-xs text-slate-600">{transaction.confirmations} confirmations</span>
          </div>
          <p className="text-xs text-slate-500">{new Date(transaction.timestamp).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export { TransactionCard };
