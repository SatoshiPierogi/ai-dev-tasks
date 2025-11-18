import React from 'react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: number;
}

export interface SidebarProps {
  items: NavItem[];
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItem,
  onItemClick,
  isOpen = true,
  onClose,
}) => {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen w-64 border-r border-slate-200 bg-slate-50 transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
        !isOpen && '-translate-x-full'
      )}
    >
      {/* Close Button on Mobile */}
      <div className="md:hidden absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Logo/Brand */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="font-bold text-slate-900">Agent Audit</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2 px-4 py-6">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onItemClick?.(item.id);
              item.onClick?.();
            }}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              activeItem === item.id
                ? 'bg-blue-100 text-blue-900'
                : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            <span className="text-current">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4">
        <Button variant="outline" className="w-full" size="sm">
          Logout
        </Button>
      </div>
    </aside>
  );
};

export { Sidebar };
