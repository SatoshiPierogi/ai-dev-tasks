# Frontend Pages Documentation

Agent Audit Dashboard - Complete page and routing structure documentation.

## Table of Contents

1. [Overview](#overview)
2. [Page Structure](#page-structure)
3. [Routing](#routing)
4. [Pages](#pages)
5. [Navigation](#navigation)
6. [Layouts](#layouts)

---

## Overview

The frontend is organized with a clear separation of concerns:

- **Pages**: Full-page components that represent distinct views
- **Layout**: Main wrapper providing header and sidebar navigation
- **Routing**: React Router for client-side navigation
- **Components**: Reusable UI components from the component library

---

## Page Structure

```
frontend/src/
├── App.tsx                          # Main app with routing
├── pages/
│   ├── index.ts                     # Page exports
│   ├── DashboardPage.tsx            # Dashboard view
│   ├── DashboardPage.test.tsx       # Dashboard tests
│   ├── AgentsPage.tsx               # Agents management view
│   ├── AdminPage.tsx                # Administration panel
│   ├── SettingsPage.tsx             # Settings/preferences view
│   ├── AdminPage.test.tsx           # Admin page tests
│   └── NotFoundPage.tsx             # 404 error page
├── layout/
│   ├── index.ts                     # Layout exports
│   └── Layout.tsx                   # Main layout wrapper
├── routing/
│   └── routes.ts                    # Route definitions
└── App.test.tsx                     # App routing tests
```

---

## Routing

### Route Paths

All route paths are centralized in `routing/routes.ts`:

```typescript
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
```

### Navigation Setup

Navigation items are created dynamically with `createNavigation()`:

```typescript
const navItems = createNavigation();
// Returns:
// [
//   { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: '📊' },
//   { id: 'agents', label: 'Agents', path: '/agents', icon: '🤖' },
//   { id: 'transactions', label: 'Transactions', path: '/transactions', icon: '💸' },
//   { id: 'admin', label: 'Administration', path: '/admin', icon: '⚙️' },
//   { id: 'settings', label: 'Settings', path: '/settings', icon: '🔧' },
// ]
```

---

## Pages

### DashboardPage

**Route:** `/dashboard`

Main dashboard showing real-time monitoring and analytics.

**Features:**
- System health status (Database, Cache, Latency, Connections)
- Agent monitoring with AgentDashboard component
- Performance metrics (CPU, Memory, Disk, Network)
- Quick statistics (Uptime, Requests/min, Errors, Response time)
- Real-time updates via WebSocket

**Components Used:**
- Card components for metrics display
- AgentDashboard for agent monitoring
- StatusIndicator for health status
- Progress bars for resource usage

**Example:**
```tsx
<DashboardPage />
```

**Data Flow:**
1. Fetches initial system status
2. Subscribes to WebSocket updates
3. Updates metrics every 5 seconds
4. Displays real-time agent activity

---

### AgentsPage

**Route:** `/agents`

Agent management and monitoring interface.

**Features:**
- List of all monitored agents
- Agent cards with metrics (Transactions, Verified, Failed)
- Verification rate progress visualization
- Filter by status (All, Active, Inactive)
- Search by agent name or address
- Selected agent details view
- Quick action buttons (Edit, Suspend, Remove)

**Components Used:**
- AgentCard for agent display
- Button components for actions
- Badge for status indicators
- Input fields for search

**Example:**
```tsx
<AgentsPage />
```

**Agent Card Data:**
```typescript
{
  id: 'agent-1',
  name: 'AI Agent Alpha',
  address: '0x1234...',
  status: 'active' | 'inactive' | 'error',
  transactionCount: number,
  verifiedCount: number,
  failedCount: number,
  totalValue: string,
  lastUpdate: Date,
}
```

---

### AdminPage

**Route:** `/admin`

System administration and agent management.

**Features:**
- System overview cards (Status, Database size, API health)
- Complete agent management table
- Sorting by name, creation date, or activity
- Multi-select with bulk actions
- Agent statistics
- System settings configuration
  - Archival settings
  - Cache settings
  - Verification settings

**Components Used:**
- AdminPanel for agent management
- Card components for statistics
- Table for agent listing
- Input fields for settings
- Badge for status display

**Example:**
```tsx
<AdminPage />
```

**Managed Agent Data:**
```typescript
{
  id: 'agent-1',
  name: 'AI Agent Alpha',
  address: '0x1234...',
  status: 'active' | 'inactive' | 'suspended',
  createdAt: Date,
  lastActivity: Date,
  transactionCount: number,
  owner: string,
}
```

---

### SettingsPage

**Route:** `/settings`

User account and application preferences.

**Features:**
- Profile settings (Email, Display name, Timezone)
- Appearance settings (Theme selection)
- Notification preferences
  - In-app notifications
  - Email alerts
- API Key management
- Account deletion (Danger zone)

**Form Fields:**
```typescript
{
  email: string,
  displayName: string,
  timezone: string,
  theme: 'light' | 'dark',
  notifications: boolean,
  emailAlerts: boolean,
}
```

**Example:**
```tsx
<SettingsPage />
```

---

### NotFoundPage

**Route:** `*` (404 fallback)

Error page displayed for non-existent routes.

**Features:**
- Large 404 message
- Helpful error description
- Navigation buttons
  - "Go to Dashboard"
  - "Go Back"

**Example:**
```tsx
<NotFoundPage />
```

---

## Navigation

### Navigation Component Structure

```
Header
├── Title and subtitle
├── Current time (updates every second)
├── WebSocket status indicator
└── User menu

Sidebar (responsive)
├── Logo/brand
├── Navigation items
│   ├── Dashboard (icon: 📊)
│   ├── Agents (icon: 🤖)
│   ├── Transactions (icon: 💸)
│   ├── Administration (icon: ⚙️)
│   └── Settings (icon: 🔧)
├── Active item highlighting
├── Badge support (for notifications)
└── Logout button
```

### Navigation Behavior

**Desktop:**
- Sidebar always visible
- Navigation items are clickable buttons
- Active item highlighted
- Icon + label display

**Mobile:**
- Sidebar hidden by default
- Menu button in header opens drawer
- Sidebar overlays content
- Touch-friendly tap targets

### Active Nav Item

Current route is tracked and passed to Sidebar:

```typescript
const [activeNav, setActiveNav] = useState('dashboard');

// Updates when route changes
useEffect(() => {
  if (location.pathname === ROUTE_PATHS.DASHBOARD) {
    setActiveNav('dashboard');
  }
}, [location.pathname]);
```

---

## Layouts

### Main Layout

**Component:** `Layout` (frontend/src/layout/Layout.tsx)

Wraps all page content with header and sidebar.

**Props:**
```typescript
interface LayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  activeNav?: string;
  onNavClick?: (itemId: string) => void;
  title?: string;
  subtitle?: string;
}
```

**Structure:**
```
┌─────────────────────────────────────────┐
│          Header (Full width)            │
├────────────────┬──────────────────────┬─┤
│     Sidebar    │   Page Content       │ │
│                │                      │ │
│  • Dashboard   │  Dynamic content     │ │
│  • Agents      │  based on route      │ │
│  • Admin       │                      │ │
│  • Settings    │                      │ │
│                │                      │ │
│                │                      │ │
└────────────────┴──────────────────────┴─┘
```

**Responsive Behavior:**
- Desktop (md+): Sidebar always visible, 256px width
- Mobile: Sidebar as overlay drawer, full-width content
- Header: Full-width on all screen sizes

---

## Integration

### With WebSocket

Pages automatically subscribe to WebSocket updates:

```typescript
const ws = useWebSocket();

useEffect(() => {
  if (ws.isConnected) {
    ws.subscribe('agent_updates');
    ws.subscribe('transaction_updates');
  }
}, [ws.isConnected]);
```

### With State Management

Pages can access shared state via context:

```typescript
// Future: Can be extended with Redux/Zustand/Context API
const state = useAppState(); // To be implemented
```

---

## Page Transitions

Navigation between pages:

1. **User clicks nav item**
2. **`onNavClick` handler called**
3. **Navigate to route using React Router**
4. **Active nav item updated**
5. **Page header title/subtitle updated**
6. **New page renders inside Layout**

```typescript
const handleNavClick = (itemId: string) => {
  setActiveNav(itemId);
  navigate(routeMap[itemId]);
};
```

---

## Testing

Each page has comprehensive test coverage:

### DashboardPage.test.tsx
- Rendering tests (title, cards, metrics)
- WebSocket integration
- Data update verification
- Component structure validation

### AdminPage.test.tsx
- Agent management tests
- Settings form tests
- Statistics display
- Interaction handling

### App.test.tsx
- Routing verification
- Navigation structure
- Layout rendering
- Accessibility compliance

**Run Tests:**
```bash
npm test frontend/src/pages
npm test frontend/src/App.test.tsx
```

---

## Best Practices

### Creating New Pages

1. Create page component in `pages/` directory
2. Add route definition in `routing/routes.ts`
3. Import page in `App.tsx`
4. Add route in `<Routes>` component
5. Create test file (`.test.tsx`)
6. Update navigation in `createNavigation()`

### Page Template

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components';

const MyPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold">Page Title</h1>
        <p className="text-slate-600">Subtitle</p>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your content */}
        </CardContent>
      </Card>
    </div>
  );
};

export { MyPage };
```

### Navigation Patterns

Always use centralized route paths:

```typescript
// ✓ Good
navigate(ROUTE_PATHS.DASHBOARD);

// ✗ Avoid
navigate('/dashboard');
```

---

## Future Enhancements

Potential improvements for upcoming versions:

1. **Lazy Loading**: Code-split pages for faster initial load
2. **Protected Routes**: Add authentication checks
3. **Breadcrumbs**: Show navigation path
4. **Page Transitions**: Add enter/exit animations
5. **State Management**: Implement Redux/Zustand for shared state
6. **Dynamic Titles**: Set page title in document head
7. **Error Boundaries**: Catch rendering errors per page
8. **Performance Monitoring**: Track page render times

---

## Debugging

### Check Active Route

```typescript
const location = useLocation();
console.log('Current route:', location.pathname);
```

### Check Navigation State

```typescript
const navigate = useNavigate();
// Navigate logs in console
navigate('/dashboard');
```

### Test Routes

```bash
npm test -- App.test.tsx --watch
```

---

## Summary

The frontend is organized into:

- **5 main pages** covering the core functionality
- **Centralized routing** with clear path definitions
- **Responsive layout** adapting to mobile/desktop
- **Real-time updates** via WebSocket integration
- **Component reuse** leveraging the UI library
- **Comprehensive testing** with Jest and React Testing Library

This structure provides a solid foundation for building a feature-rich dashboard application while maintaining code organization and testability.
