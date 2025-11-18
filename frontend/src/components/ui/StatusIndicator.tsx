import React from 'react';
import { cn } from '../../utils/cn';

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'success' | 'warning' | 'error' | 'pending' | 'info';
  label?: string;
  pulse?: boolean;
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ className, status, label, pulse = false, ...props }, ref) => {
    const statusColors = {
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
      pending: 'bg-blue-500',
      info: 'bg-cyan-500',
    };

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
        <div className="relative">
          <div className={cn('h-3 w-3 rounded-full', statusColors[status])} />
          {pulse && (
            <div
              className={cn('absolute inset-0 h-3 w-3 rounded-full animate-pulse', statusColors[status])}
            />
          )}
        </div>
        {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      </div>
    );
  }
);

StatusIndicator.displayName = 'StatusIndicator';

export { StatusIndicator };
