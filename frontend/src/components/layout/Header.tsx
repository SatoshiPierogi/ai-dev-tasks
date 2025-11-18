import React from 'react';
import { Button } from '../ui/Button';
import { StatusIndicator } from '../ui/StatusIndicator';
import { useWebSocket } from '../../hooks/useWebSocket';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title = 'Agent Audit Dashboard', subtitle, onMenuClick }) => {
  const ws = useWebSocket();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Current Time */}
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              {currentTime.toLocaleTimeString()}
            </p>
            <p className="text-xs text-slate-500">
              {currentTime.toLocaleDateString()}
            </p>
          </div>

          {/* WebSocket Status */}
          <div className="border-l border-slate-200 pl-6">
            <StatusIndicator
              status={ws.isConnected ? 'success' : ws.isConnecting ? 'pending' : 'error'}
              label={ws.isConnected ? 'Connected' : ws.isConnecting ? 'Connecting' : 'Offline'}
              pulse={ws.isConnected}
            />
          </div>

          {/* User Menu */}
          <div className="border-l border-slate-200 pl-6">
            <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export { Header };
