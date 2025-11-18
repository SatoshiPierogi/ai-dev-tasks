import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { StatusIndicator } from '../ui/StatusIndicator';

export interface ManagedAgent {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastActivity: Date;
  transactionCount: number;
  owner: string;
}

export interface AdminPanelProps {
  agents: ManagedAgent[];
  onAddAgent?: () => void;
  onEditAgent?: (agentId: string) => void;
  onRemoveAgent?: (agentId: string) => void;
  onSuspendAgent?: (agentId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  agents,
  onAddAgent,
  onEditAgent,
  onRemoveAgent,
  onSuspendAgent,
}) => {
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'activity'>('activity');

  const sortedAgents = [...agents].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'activity':
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    }
  });

  const toggleSelectAgent = (agentId: string) => {
    const newSelected = new Set(selectedAgents);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedAgents(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedAgents.size === agents.length) {
      setSelectedAgents(new Set());
    } else {
      setSelectedAgents(new Set(agents.map((a) => a.id)));
    }
  };

  const statusBadges = {
    active: 'success',
    inactive: 'warning',
    suspended: 'destructive',
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Agent Management</h2>
          <p className="text-sm text-slate-500 mt-1">{agents.length} total agents</p>
        </div>
        <Button onClick={onAddAgent}>+ Add Agent</Button>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('name')}
              >
                Sort by Name
              </Button>
              <Button
                variant={sortBy === 'created' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('created')}
              >
                Sort by Created
              </Button>
              <Button
                variant={sortBy === 'activity' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('activity')}
              >
                Sort by Activity
              </Button>
            </div>

            {selectedAgents.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedAgents.size} selected</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectedAgents.forEach((id) => onSuspendAgent?.(id));
                    setSelectedAgents(new Set());
                  }}
                >
                  Suspend
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
          <CardDescription>View and manage monitored agents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedAgents.size === agents.length && agents.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedAgents.has(agent.id)}
                        onChange={() => toggleSelectAgent(agent.id)}
                        className="rounded border-slate-300"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-500">Owner: {agent.owner.slice(0, 10)}...</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-mono text-slate-600">{agent.address.slice(0, 12)}...</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadges[agent.status]}>
                        {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-slate-900">{agent.transactionCount}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600">
                        {new Date(agent.lastActivity).toLocaleTimeString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditAgent?.(agent.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onRemoveAgent?.(agent.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {sortedAgents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">No agents configured</p>
              <Button onClick={onAddAgent}>Add Agent</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {agents.filter((a) => a.status === 'active').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Inactive Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {agents.filter((a) => a.status === 'inactive').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {agents.reduce((sum, a) => sum + a.transactionCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { AdminPanel };
