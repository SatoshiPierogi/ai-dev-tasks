import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-slate-200 bg-slate-100 text-slate-900',
        primary: 'border border-blue-200 bg-blue-100 text-blue-900',
        success: 'border border-green-200 bg-green-100 text-green-900',
        warning: 'border border-yellow-200 bg-yellow-100 text-yellow-900',
        destructive: 'border border-red-200 bg-red-100 text-red-900',
        secondary: 'border border-slate-300 bg-slate-200 text-slate-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
