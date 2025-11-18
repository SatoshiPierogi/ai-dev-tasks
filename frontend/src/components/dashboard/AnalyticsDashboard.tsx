/**
 * Analytics Dashboard Component
 * Displays real-time analytics and monitoring data
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  LoadingSpinner,
} from '../index';

// ============================================================================
// TYPES
// ============================================================================

interface MetricsData {
  totalEvents: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  avgResponseTime: string;
  errorRate: string;
  apiRequests: number;
}

interface TopUser {
  userId: string;
  totalEvents: number;
  totalTransactions: number;
  lastActivityAt: Date;
}

interface TopAgent {
  agentId: string;
  totalTransactions: number;
  successfulTransactions: number;
  successRate: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface AnalyticsDashboardProps {
  refreshInterval?: number;
  isAdmin?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  refreshInterval = 30000,
  isAdmin = false,
}) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState(3600); // 1 hour

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, refreshInterval);
    return () => clearInterval(interval);
  }, [timeWindow, refreshInterval]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch metrics
      const metricsResponse = await fetch(
        `/api/analytics/metrics/summary?timeWindow=${timeWindow}`
      );
      if (!metricsResponse.ok) throw new Error('Failed to fetch metrics');
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Fetch top users (admin only)
      if (isAdmin) {
        const usersResponse = await fetch('/api/analytics/users/top?limit=5');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setTopUsers(usersData.users);
        }
      }

      // Fetch top agents
      const agentsResponse = await fetch('/api/analytics/agents/top?limit=5');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setTopAgents(agentsData.agents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Time Window Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setTimeWindow(3600)}
          className={`px-3 py-1 text-sm rounded ${
            timeWindow === 3600
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          1h
        </button>
        <button
          onClick={() => setTimeWindow(86400)}
          className={`px-3 py-1 text-sm rounded ${
            timeWindow === 86400
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          24h
        </button>
        <button
          onClick={() => setTimeWindow(604800)}
          className={`px-3 py-1 text-sm rounded ${
            timeWindow === 604800
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          7d
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {metrics.totalEvents.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {metrics.totalTransactions}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Success: {metrics.successfulTransactions} / Fail: {metrics.failedTransactions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {metrics.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{metrics.avgResponseTime}ms</p>
            <p className="text-xs text-slate-500 mt-1">Error Rate: {metrics.errorRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* API Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>API Performance</CardTitle>
          <CardDescription>Request and error metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Total Requests</span>
                <span className="text-sm font-semibold text-slate-900">
                  {metrics.apiRequests.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-full bg-blue-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Error Rate</span>
                <span className="text-sm font-semibold text-red-600">{metrics.errorRate}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${Math.min(parseFloat(metrics.errorRate), 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Avg Response Time
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {metrics.avgResponseTime}ms
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500"
                  style={{
                    width: `${Math.min(
                      (parseInt(metrics.avgResponseTime) / 1000) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Top Agents</CardTitle>
          <CardDescription>By transaction count</CardDescription>
        </CardHeader>
        <CardContent>
          {topAgents.length === 0 ? (
            <p className="text-sm text-slate-500">No agent data available</p>
          ) : (
            <div className="space-y-3">
              {topAgents.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {agent.agentId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {agent.totalTransactions} transactions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">
                      {agent.successRate.toFixed(0)}% success
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Users (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
            <CardDescription>By event count</CardDescription>
          </CardHeader>
          <CardContent>
            {topUsers.length === 0 ? (
              <p className="text-sm text-slate-500">No user data available</p>
            ) : (
              <div className="space-y-3">
                {topUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{user.userId}</p>
                      <p className="text-xs text-slate-500">
                        {user.totalEvents} events • {user.totalTransactions} transactions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Last active:{' '}
                        {new Date(user.lastActivityAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
