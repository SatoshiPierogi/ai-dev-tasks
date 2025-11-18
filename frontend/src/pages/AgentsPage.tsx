import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge, AgentCard, type Agent } from '../components';

const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'agent-1',
      name: 'AI Arbitrage Bot',
      address: '0x1234567890123456789012345678901234567890',
      status: 'active',
      transactionCount: 456,
      verifiedCount: 443,
      failedCount: 13,
      totalValue: '$234,567',
      lastUpdate: new Date(),
    },
    {
      id: 'agent-2',
      name: 'Lending Protocol Manager',
      address: '0x0987654321098765432109876543210987654321',
      status: 'active',
      transactionCount: 234,
      verifiedCount: 234,
      failedCount: 0,
      totalValue: '$567,890',
      lastUpdate: new Date(Date.now() - 60000),
    },
    {
      id: 'agent-3',
      name: 'Liquidity Provider Bot',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      status: 'inactive',
      transactionCount: 89,
      verifiedCount: 87,
      failedCount: 2,
      totalValue: '$123,456',
      lastUpdate: new Date(Date.now() - 3600000),
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'error'>('all');
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesFilter = filter === 'all' || agent.status === filter;
      const matchesSearch =
        search === '' ||
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.address.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [agents, filter, search]);

  const stats = useMemo(
    () => ({
      total: agents.length,
      active: agents.filter((a) => a.status === 'active').length,
      inactive: agents.filter((a) => a.status === 'inactive').length,
      totalTransactions: agents.reduce((sum, a) => sum + a.transactionCount, 0),
      totalVerified: agents.reduce((sum, a) => sum + a.verifiedCount, 0),
    }),
    [agents]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agents</h1>
          <p className="text-slate-600 mt-2">Monitor and manage AI crypto agents</p>
        </div>
        <Button onClick={() => alert('Add agent dialog would open here')}>+ Add Agent</Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{stats.inactive}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats.totalTransactions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.totalVerified}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Search agents</label>
              <input
                type="text"
                placeholder="Search by name or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Filter by status</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'active', 'inactive', 'error'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No agents found matching your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={(id) => setSelectedAgent(id === selectedAgent ? null : id)}
            />
          ))}
        </div>
      )}

      {/* Selected Agent Details */}
      {selectedAgent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agent Details</CardTitle>
                <CardDescription>View and manage agent configuration</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAgent(null)}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents
                .filter((a) => a.id === selectedAgent)
                .map((agent) => (
                  <div key={agent.id} className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Name</p>
                      <p className="text-slate-900 font-semibold">{agent.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Address</p>
                      <p className="text-xs font-mono text-slate-600 break-all">{agent.address}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Status</p>
                      <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
                        {agent.status}
                      </Badge>
                    </div>
                    <div className="border-t border-slate-200 pt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Suspend
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { AgentsPage };
export default AgentsPage;
