/**
 * Component Library Exports
 * All UI components, layout components, and feature components
 */

// ============================================================================
// UI COMPONENTS
// ============================================================================

export { Button, type ButtonProps } from './ui/Button';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
export { Badge, type BadgeProps } from './ui/Badge';
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell } from './ui/Table';
export { LoadingSpinner, type LoadingSpinnerProps } from './ui/LoadingSpinner';
export { StatusIndicator, type StatusIndicatorProps } from './ui/StatusIndicator';
export { Alert, AlertTitle, AlertDescription } from './ui/Alert';

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

export { Header, type HeaderProps } from './layout/Header';
export { Sidebar, type SidebarProps, type NavItem } from './layout/Sidebar';

// ============================================================================
// DASHBOARD COMPONENTS
// ============================================================================

export { AgentCard, type AgentCardProps, type Agent } from './dashboard/AgentCard';
export { TransactionCard, type TransactionCardProps, type Transaction } from './dashboard/TransactionCard';
export { AgentDashboard, type AgentDashboardProps } from './dashboard/AgentDashboard';

// ============================================================================
// VERIFICATION COMPONENTS
// ============================================================================

export { TransactionVerification, type TransactionVerificationProps, type VerificationProof } from './verification/TransactionVerification';

// ============================================================================
// ADMIN COMPONENTS
// ============================================================================

export { AdminPanel, type AdminPanelProps, type ManagedAgent } from './admin/AdminPanel';

// ============================================================================
// NOTIFICATION COMPONENTS
// ============================================================================

export { AlertCenter, type AlertCenterProps, type AlertItem } from './notifications/AlertCenter';
export { Toast, type ToastProps } from './notifications/Toast';
