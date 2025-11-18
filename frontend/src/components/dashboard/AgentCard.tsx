import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StatusIndicator } from '../ui/StatusIndicator';

export interface Agent {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive' | 'error';
  transactionCount: number;
  verifiedCount: number;
  failedCount: number;
  totalValue: string;
  lastUpdate: Date;
}

export interface AgentCardProps {
  agent: Agent;
  onClick?: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick }) => {
  const verificationRate = useMemo(
    () => agent.transactionCount > 0 ? ((agent.verifiedCount / agent.transactionCount) * 100).toFixed(1) : '0',
    [agent.verifiedCount, agent.transactionCount]
  );

  const statusVariant = {
    active: 'success',
    inactive: 'warning',
    error: 'destructive',
  }[agent.status] as 'success' | 'warning' | 'destructive' | 'default' | 'primary' | 'secondary';

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onClick?.(agent.id)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <CardDescription className="text-xs text-slate-500">{agent.address}</CardDescription>
          </div>
          <Badge variant={statusVariant}>{agent.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500">Transactions</p>
            <p className="text-2xl font-bold text-slate-900">{agent.transactionCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Verified</p>
            <p className="text-2xl font-bold text-green-600">{agent.verifiedCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{agent.failedCount}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500 mb-1">Verification Rate</p>
          <div className="flex items-center justify-between">
            <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${verificationRate}%` }}
              />
            </div>
            <span className="ml-2 text-sm font-semibold text-slate-700">{verificationRate}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <StatusIndicator status={agent.status} pulse={agent.status === 'active'} />
          <p className="text-xs text-slate-500">
            Updated {new Date(agent.lastUpdate).toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export { AgentCard };
