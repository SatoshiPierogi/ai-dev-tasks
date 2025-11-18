import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { AgentCard, type Agent } from './AgentCard';
import { TransactionCard, type Transaction } from './TransactionCard';
import { useWebSocket } from '../../hooks/useWebSocket';

export interface AgentDashboardProps {
  refreshInterval?: number;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ refreshInterval = 5000 }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalTransactions: 0,
    verificationRate: 0,
  });

  const ws = useWebSocket();

  // Subscribe to real-time updates
  useEffect(() => {
    if (ws.isConnected) {
      ws.subscribe('agent_updates');
      ws.subscribe('transaction_updates');
    }

    return () => {
      if (ws.isConnected) {
        ws.unsubscribe('agent_updates');
        ws.unsubscribe('transaction_updates');
      }
    };
  }, [ws.isConnected]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleAgentUpdate = (data: any) => {
      setAgents((prev) => {
        const existing = prev.find((a) => a.id === data.id);
        if (existing) {
          return prev.map((a) => (a.id === data.id ? { ...a, ...data } : a));
        }
        return [...prev, data];
      });
    };

    const handleTransactionUpdate = (data: any) => {
      setTransactions((prev) => {
        const existing = prev.find((t) => t.id === data.id);
        if (existing) {
          return prev.map((t) => (t.id === data.id ? { ...t, ...data } : t));
        }
        return [data, ...prev.slice(0, 99)]; // Keep latest 100
      });
    };

    // In a real app, you'd listen to specific WebSocket event types
    // For now, mock the message handling
    const unsubscribe = ws.onMessage(() => {
      // Handle message type based on ws.lastMessage.type
    });

    return () => unsubscribe?.();
  }, [ws]);

  // Calculate statistics
  useEffect(() => {
    const verifiedCount = transactions.filter((t) => t.status === 'verified').length;
    const verificationRate = transactions.length > 0 ? (verifiedCount / transactions.length) * 100 : 0;

    setStats({
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === 'active').length,
      totalTransactions: transactions.length,
      verificationRate: Math.round(verificationRate),
    });

    setLoading(false);
  }, [agents, transactions]);

  // Filter transactions for selected agent
  const filteredTransactions = useMemo(
    () =>
      selectedAgent
        ? transactions.filter((t) => t.agentAddress === selectedAgent)
        : transactions.slice(0, 10),
    [selectedAgent, transactions]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats.totalAgents}</p>
            <p className="text-xs text-slate-500 mt-1">{stats.activeAgents} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats.totalTransactions}</p>
            <p className="text-xs text-slate-500 mt-1">Real-time tracking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Verification Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.verificationRate}%</p>
            <div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${stats.verificationRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusIndicator
              status={ws.isConnected ? 'success' : ws.isConnecting ? 'pending' : 'error'}
              label={ws.isConnected ? 'Connected' : ws.isConnecting ? 'Connecting...' : 'Disconnected'}
              pulse
            />
          </CardContent>
        </Card>
      </div>

      {/* Agents Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Monitored Agents</CardTitle>
          <CardDescription>
            {agents.length === 0
              ? 'No agents configured yet'
              : `${agents.length} agent${agents.length !== 1 ? 's' : ''} monitored`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">No agents configured</p>
              <Button>Add Agent</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={(id) => setSelectedAgent(id === selectedAgent ? null : id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {selectedAgent ? 'Agent Transactions' : 'Recent Transactions'}
              </CardTitle>
              <CardDescription>
                {selectedAgent
                  ? `Showing transactions for selected agent`
                  : `Latest ${filteredTransactions.length} transactions`}
              </CardDescription>
            </div>
            {selectedAgent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAgent(null)}
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { AgentDashboard };
