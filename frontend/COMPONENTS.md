# Frontend Components Documentation

Agent Audit Dashboard - Comprehensive component library and feature documentation.

## Table of Contents

1. [UI Components](#ui-components)
2. [Layout Components](#layout-components)
3. [Dashboard Components](#dashboard-components)
4. [Verification Components](#verification-components)
5. [Admin Components](#admin-components)
6. [Notification Components](#notification-components)

---

## UI Components

### Button

Flexible button component with multiple variants and sizes.

```tsx
import { Button } from '@/components';

// Basic
<Button>Click me</Button>

// Variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">⭐</Button>

// States
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>

// With Icon
<Button icon={<DownloadIcon />}>Download</Button>
```

**Props:**
- `variant`: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
- `size`: "default" | "sm" | "lg" | "icon"
- `loading`: boolean (optional, default: false)
- `icon`: React.ReactNode (optional)
- All standard HTML button attributes

---

### Card

Container component with optional header, title, description, content, and footer sections.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components';

<Card>
  <CardHeader>
    <CardTitle>Agent Details</CardTitle>
    <CardDescription>View agent information</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content here */}
  </CardContent>
  <CardFooter>
    {/* Footer actions */}
  </CardFooter>
</Card>
```

---

### Badge

Compact status/label component with color variants.

```tsx
import { Badge } from '@/components';

<Badge>Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="secondary">Secondary</Badge>
```

**Variants:**
- default, primary, success, warning, destructive, secondary

---

### Table

Data table component with header, body, and footer sections.

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Agent Alpha</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### LoadingSpinner

Animated loading indicator.

```tsx
import { LoadingSpinner } from '@/components';

<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />
```

**Sizes:** sm (16px), md (32px), lg (48px)

---

### StatusIndicator

Visual status indicator with optional pulse animation and label.

```tsx
import { StatusIndicator } from '@/components';

<StatusIndicator status="success" label="Connected" pulse />
<StatusIndicator status="pending" label="Processing" pulse />
<StatusIndicator status="error" label="Error" />
<StatusIndicator status="warning" label="Warning" />
<StatusIndicator status="info" label="Info" />
```

**Status Values:** "success" | "warning" | "error" | "pending" | "info"

---

### Alert

Alert message component with variants and title/description sections.

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components';

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>
```

**Variants:** default, destructive, warning, success, info

---

## Layout Components

### Header

Top navigation header with time display, WebSocket connection status, and user menu.

```tsx
import { Header } from '@/components';

<Header
  title="Agent Audit Dashboard"
  subtitle="Real-time monitoring"
  onMenuClick={() => setSidebarOpen(true)}
/>
```

**Features:**
- Dynamic time display (updates every second)
- WebSocket connection status indicator
- User menu button
- Responsive design

---

### Sidebar

Navigation sidebar with icon items, badges, and optional mobile menu.

```tsx
import { Sidebar } from '@/components';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'agents', label: 'Agents', icon: <AgentIcon />, badge: 3 },
  { id: 'transactions', label: 'Transactions', icon: <TxIcon /> },
  { id: 'admin', label: 'Admin', icon: <SettingsIcon /> },
];

<Sidebar
  items={navItems}
  activeItem={activeItem}
  onItemClick={(id) => setActiveItem(id)}
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
```

---

## Dashboard Components

### AgentCard

Displays agent summary information with status, metrics, and verification progress.

```tsx
import { AgentCard } from '@/components';

const agent = {
  id: 'agent-1',
  name: 'AI Agent Alpha',
  address: '0x1234...',
  status: 'active',
  transactionCount: 100,
  verifiedCount: 95,
  failedCount: 5,
  totalValue: '$50,000',
  lastUpdate: new Date(),
};

<AgentCard
  agent={agent}
  onClick={(id) => selectAgent(id)}
/>
```

**Features:**
- Real-time status badge
- Transaction metrics (total, verified, failed)
- Verification rate progress bar
- Last update timestamp
- Clickable for selection

---

### TransactionCard

Displays transaction details with status, token information, and timestamps.

```tsx
import { TransactionCard } from '@/components';

const transaction = {
  id: 'tx-1',
  hash: '0xabc...',
  agentAddress: '0x123...',
  type: 'swap',
  protocol: 'Uniswap',
  status: 'verified',
  tokenIn: { symbol: 'ETH', amount: '1.0' },
  tokenOut: { symbol: 'USDC', amount: '2500' },
  value: '$2500',
  timestamp: new Date(),
  confirmations: 15,
};

<TransactionCard
  transaction={transaction}
  onClick={(id) => viewDetails(id)}
/>
```

---

### AgentDashboard

Complete real-time dashboard with agents, transactions, and statistics.

```tsx
import { AgentDashboard } from '@/components';

<AgentDashboard refreshInterval={5000} />
```

**Features:**
- Real-time WebSocket updates
- Statistics summary cards
- Agent grid with filtering
- Transaction list with real-time updates
- Connection status indicator
- Responsive multi-column layout

---

## Verification Components

### TransactionVerification

Detailed transaction verification view with blockchain proof and event logs.

```tsx
import { TransactionVerification } from '@/components';

<TransactionVerification
  transactionHash="0xabc..."
  status="verified"
  proof={{
    blockNumber: 18500000,
    transactionHash: '0xabc...',
    confirmations: 15,
    gasUsed: '150000',
    gasPrice: '25 Gwei',
    eventLogs: [...],
    timestamp: new Date(),
  }}
  onRetry={() => retryVerification()}
/>
```

**Features:**
- Status display with indicators
- Block number and confirmation count
- Gas metrics
- Expandable event logs
- Etherscan link
- Retry functionality

---

## Admin Components

### AdminPanel

Agent management interface with filtering, sorting, and bulk actions.

```tsx
import { AdminPanel } from '@/components';

const agents = [
  {
    id: 'agent-1',
    name: 'Agent Alpha',
    address: '0x1234...',
    status: 'active',
    createdAt: new Date(),
    lastActivity: new Date(),
    transactionCount: 100,
    owner: '0x5678...',
  },
];

<AdminPanel
  agents={agents}
  onAddAgent={() => openAddDialog()}
  onEditAgent={(id) => openEditDialog(id)}
  onRemoveAgent={(id) => confirmRemove(id)}
  onSuspendAgent={(id) => suspendAgent(id)}
/>
```

**Features:**
- Agent table with sorting options
- Multi-select with bulk actions
- Status filtering
- Quick statistics
- Add/Edit/Remove actions
- Active/Inactive/Suspended status

---

## Notification Components

### AlertCenter

Notification panel with unread count, dismiss buttons, and action links.

```tsx
import { AlertCenter } from '@/components';

const alerts = [
  {
    id: 'alert-1',
    type: 'error',
    title: 'Verification Failed',
    message: 'Failed to verify transaction 0xabc...',
    timestamp: new Date(),
    read: false,
    dismissible: true,
    action: {
      label: 'Retry',
      onClick: () => retryVerification(),
    },
  },
];

<AlertCenter
  alerts={alerts}
  maxVisible={3}
  onDismiss={(id) => removeAlert(id)}
  onRead={(id) => markAsRead(id)}
/>
```

**Features:**
- Unread count badge
- Color-coded by type (error, warning, success, info)
- Dismissible alerts
- Action buttons
- Max visible limit with "View All" link
- Auto-read on click

---

### Toast

Temporary notification that auto-dismisses after duration.

```tsx
import { Toast } from '@/components';

<Toast
  id="toast-1"
  type="success"
  title="Verification Successful"
  message="Transaction verified on blockchain"
  duration={5000}
  onClose={(id) => removeToast(id)}
/>
```

**Types:** success, error, warning, info

**Duration:** Milliseconds (0 = manual dismiss only)

---

## Best Practices

### Composition

Use component composition to build complex UIs:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Agents</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  </CardContent>
</Card>
```

### Styling

Components use Tailwind CSS. Extend with className prop:

```tsx
<Button className="rounded-full px-8">Custom Button</Button>
<Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
  {/* Content */}
</Card>
```

### TypeScript

All components are fully typed:

```tsx
import { Button, type ButtonProps } from '@/components';

const CustomButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />;
};
```

### Accessibility

Components follow WCAG guidelines:
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Color contrast

---

## Testing

All components have comprehensive test coverage:

```bash
npm test frontend/src/components
npm test frontend/src/components -- --coverage
```

Test files: `*.test.tsx` (co-located with components)

---

## Contributing

When adding new components:

1. Create component in appropriate subdirectory
2. Export in `components/index.ts`
3. Add TypeScript interfaces for props
4. Include JSDoc comments
5. Create test file with 50%+ coverage
6. Update this documentation

---

## Changelog

### Version 1.0.0 (Current)

- Initial component library
- UI components (Button, Card, Badge, Table, etc.)
- Layout components (Header, Sidebar)
- Dashboard components (AgentCard, TransactionCard, AgentDashboard)
- Verification components (TransactionVerification)
- Admin components (AdminPanel)
- Notification components (AlertCenter, Toast)
- Comprehensive test coverage
