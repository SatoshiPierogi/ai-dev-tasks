import React, { useCallback, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface AlertItem {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

export interface AlertCenterProps {
  alerts: AlertItem[];
  maxVisible?: number;
  onDismiss?: (alertId: string) => void;
  onRead?: (alertId: string) => void;
}

const AlertCenter: React.FC<AlertCenterProps> = ({
  alerts,
  maxVisible = 3,
  onDismiss,
  onRead,
}) => {
  const visibleAlerts = alerts.slice(0, maxVisible);
  const unreadCount = alerts.filter((a) => !a.read).length;

  const typeVariants = {
    error: 'destructive',
    warning: 'warning',
    success: 'success',
    info: 'info',
  } as const;

  const handleAlertClick = useCallback(
    (alert: AlertItem) => {
      if (!alert.read) {
        onRead?.(alert.id);
      }
    },
    [onRead]
  );

  return (
    <div className="space-y-3">
      {/* Alert Count Badge */}
      {unreadCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{unreadCount} new alerts</Badge>
        </div>
      )}

      {/* Alert List */}
      {visibleAlerts.length === 0 ? (
        <div className="text-center py-6 text-slate-500">
          <p className="text-sm">No alerts at this time</p>
        </div>
      ) : (
        visibleAlerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={typeVariants[alert.type]}
            className="cursor-pointer"
            onClick={() => handleAlertClick(alert)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <AlertTitle className="text-sm font-semibold">{alert.title}</AlertTitle>
                <AlertDescription className="mt-1 text-xs">
                  {alert.message}
                </AlertDescription>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!alert.read && (
                  <div className="h-2 w-2 rounded-full bg-current" />
                )}
                {alert.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss?.(alert.id);
                    }}
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>

            {alert.action && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    alert.action?.onClick();
                  }}
                >
                  {alert.action.label}
                </Button>
              </div>
            )}
          </Alert>
        ))
      )}

      {alerts.length > maxVisible && (
        <Button variant="outline" className="w-full" size="sm">
          View All {alerts.length} Alerts
        </Button>
      )}
    </div>
  );
};

export { AlertCenter };
