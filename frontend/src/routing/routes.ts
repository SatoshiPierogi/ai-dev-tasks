/**
 * Application Routes
 * Centralized route definitions and navigation structure
 */

export interface Route {
  path: string;
  label: string;
  icon?: React.ReactNode;
  component: React.ComponentType<any>;
  requiredRole?: 'admin' | 'user' | 'viewer';
  badge?: number;
  children?: Route[];
}

export const ROUTE_PATHS = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  AGENTS: '/agents',
  AGENT_DETAIL: '/agents/:id',
  TRANSACTIONS: '/transactions',
  TRANSACTION_DETAIL: '/transactions/:id',
  ADMIN: '/admin',
  ADMIN_AGENTS: '/admin/agents',
  ADMIN_SETTINGS: '/admin/settings',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  NOT_FOUND: '*',
} as const;

export const createNavigation = () => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: ROUTE_PATHS.DASHBOARD,
    icon: '📊',
  },
  {
    id: 'agents',
    label: 'Agents',
    path: ROUTE_PATHS.AGENTS,
    icon: '🤖',
    badge: 0, // Populated dynamically
  },
  {
    id: 'transactions',
    label: 'Transactions',
    path: ROUTE_PATHS.TRANSACTIONS,
    icon: '💸',
  },
  {
    id: 'admin',
    label: 'Administration',
    path: ROUTE_PATHS.ADMIN,
    icon: '⚙️',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: ROUTE_PATHS.SETTINGS,
    icon: '🔧',
  },
];
