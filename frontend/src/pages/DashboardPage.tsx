import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, AgentDashboard, Badge } from '../components';
import { useWebSocket } from '../hooks/useWebSocket';

const DashboardPage: React.FC = () => {
  const ws = useWebSocket();
  const [systemStatus, setSystemStatus] = useState<{
    databaseHealth: 'healthy' | 'degraded' | 'down';
    cacheHitRate: number;
    averageLatency: number;
    activeConnections: number;
  }>({
    databaseHealth: 'healthy',
    cacheHitRate: 87,
    averageLatency: 145,
    activeConnections: 1,
  });

  useEffect(() => {
    // Simulate system health updates
    const interval = setInterval(() => {
      setSystemStatus((prev) => ({
        ...prev,
        cacheHitRate: Math.max(70, prev.cacheHitRate + (Math.random() - 0.5) * 5),
        averageLatency: Math.max(50, prev.averageLatency + (Math.random() - 0.5) * 20),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const dbStatusVariant = {
    healthy: 'success',
    degraded: 'warning',
    down: 'destructive',
  }[systemStatus.databaseHealth] as 'success' | 'warning' | 'destructive';

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Real-time monitoring and analytics for AI crypto agents</p>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Database Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  systemStatus.databaseHealth === 'healthy'
                    ? 'bg-green-500'
                    : systemStatus.databaseHealth === 'degraded'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="capitalize text-slate-900 font-semibold">
                {systemStatus.databaseHealth}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{systemStatus.cacheHitRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">Last hour average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{systemStatus.averageLatency.toFixed(0)}ms</p>
            <p className="text-xs text-slate-500 mt-1">Response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">WebSocket Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{systemStatus.activeConnections}</p>
            <p className="text-xs text-slate-500 mt-1">
              {ws.isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Monitoring</CardTitle>
          <CardDescription>Real-time tracking of AI agent activities</CardDescription>
        </CardHeader>
        <CardContent>
          <AgentDashboard refreshInterval={5000} />
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>24-hour metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">CPU Usage</span>
                <span className="text-sm font-semibold text-slate-900">42%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[42%] bg-blue-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Memory Usage</span>
                <span className="text-sm font-semibold text-slate-900">68%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[68%] bg-yellow-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Disk Usage</span>
                <span className="text-sm font-semibold text-slate-900">45%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[45%] bg-green-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Network I/O</span>
                <span className="text-sm font-semibold text-slate-900">23%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-[23%] bg-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Current system overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-sm text-slate-600">Uptime</span>
              <span className="font-semibold text-slate-900">99.99%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-sm text-slate-600">Requests/min</span>
              <span className="font-semibold text-slate-900">2,847</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-sm text-slate-600">Errors/min</span>
              <span className="font-semibold text-red-600">12</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Avg Response Time</span>
              <span className="font-semibold text-slate-900">{systemStatus.averageLatency.toFixed(0)}ms</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { DashboardPage };
export default DashboardPage;
