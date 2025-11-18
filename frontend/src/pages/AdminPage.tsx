import React, { useState } from 'react';
import { AdminPanel, type ManagedAgent, Card, CardContent, CardHeader, CardTitle } from '../components';

const AdminPage: React.FC = () => {
  const [agents, setAgents] = useState<ManagedAgent[]>([
    {
      id: 'agent-1',
      name: 'AI Arbitrage Bot',
      address: '0x1234567890123456789012345678901234567890',
      status: 'active',
      createdAt: new Date('2025-01-15'),
      lastActivity: new Date(),
      transactionCount: 456,
      owner: '0xowner1111111111111111111111111111111111',
    },
    {
      id: 'agent-2',
      name: 'Lending Protocol Manager',
      address: '0x0987654321098765432109876543210987654321',
      status: 'active',
      createdAt: new Date('2025-02-20'),
      lastActivity: new Date(Date.now() - 120000),
      transactionCount: 234,
      owner: '0xowner2222222222222222222222222222222222',
    },
    {
      id: 'agent-3',
      name: 'Liquidity Provider Bot',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      status: 'inactive',
      createdAt: new Date('2025-01-05'),
      lastActivity: new Date(Date.now() - 86400000),
      transactionCount: 89,
      owner: '0xowner3333333333333333333333333333333333',
    },
    {
      id: 'agent-4',
      name: 'Yield Farming Bot',
      address: '0x1111111111111111111111111111111111111111',
      status: 'suspended',
      createdAt: new Date('2025-02-10'),
      lastActivity: new Date(Date.now() - 604800000),
      transactionCount: 45,
      owner: '0xowner4444444444444444444444444444444444',
    },
  ]);

  const handleAddAgent = () => {
    alert('Add agent dialog would open here');
  };

  const handleEditAgent = (agentId: string) => {
    alert(`Edit agent ${agentId}`);
  };

  const handleRemoveAgent = (agentId: string) => {
    if (confirm('Are you sure you want to remove this agent?')) {
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
    }
  };

  const handleSuspendAgent = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId ? { ...a, status: a.status === 'suspended' ? 'active' : 'suspended' } : a
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
        <p className="text-slate-600 mt-2">Manage agents, users, and system configuration</p>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold text-slate-900">All Systems Operational</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Last checked: just now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Database Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">8.2 GB</p>
            <p className="text-xs text-slate-500 mt-1">6.1 GB (75%) archived</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">API Health</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">99.9%</p>
            <p className="text-xs text-slate-500 mt-1">Uptime (30 days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Panel */}
      <AdminPanel
        agents={agents}
        onAddAgent={handleAddAgent}
        onEditAgent={handleEditAgent}
        onRemoveAgent={handleRemoveAgent}
        onSuspendAgent={handleSuspendAgent}
      />

      {/* Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Archival Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-slate-700">Automatic archival enabled</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm text-slate-700 min-w-[150px]">Retention period:</span>
                <input
                  type="number"
                  defaultValue={7}
                  className="w-16 rounded border border-slate-300 px-2 py-1"
                  disabled
                />
                <span className="text-sm text-slate-600">days</span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-semibold text-slate-900 mb-3">Cache Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <span className="text-sm text-slate-700 min-w-[150px]">TTL:</span>
                <input
                  type="number"
                  defaultValue={1800}
                  className="w-24 rounded border border-slate-300 px-2 py-1"
                  disabled
                />
                <span className="text-sm text-slate-600">seconds</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm text-slate-700 min-w-[150px]">Max size:</span>
                <input
                  type="number"
                  defaultValue={50000}
                  className="w-32 rounded border border-slate-300 px-2 py-1"
                  disabled
                />
                <span className="text-sm text-slate-600">entries</span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-semibold text-slate-900 mb-3">Verification Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <span className="text-sm text-slate-700 min-w-[150px]">Confirmations required:</span>
                <input
                  type="number"
                  defaultValue={12}
                  className="w-16 rounded border border-slate-300 px-2 py-1"
                  disabled
                />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-slate-700">Automatic re-verification</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { AdminPage };
export default AdminPage;
