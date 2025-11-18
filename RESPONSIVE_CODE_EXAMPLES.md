# Responsive Design - Code Examples from Analysis

## Current Responsive Patterns in Codebase

### 1. Sidebar - Mobile Overlay + Desktop Sidebar
**File**: `/frontend/src/components/layout/Sidebar.tsx`

```tsx
// Currently implemented:
<aside
  className={cn(
    'fixed left-0 top-0 h-screen w-64 border-r border-slate-200 bg-slate-50 transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
    !isOpen && '-translate-x-full'  // Hidden on mobile
  )}
>
  {/* Close Button on Mobile */}
  <div className="md:hidden absolute top-4 right-4">
    <Button variant="ghost" size="icon" onClick={onClose}>
      <svg className="h-6 w-6">...</svg>
    </Button>
  </div>
  {/* Rest of sidebar */}
</aside>
```

**What this does:**
- Mobile: Fixed position overlay, slides in/out with `-translate-x-full`
- Desktop (md:): Relative position, always visible
- Close button: Only shown on mobile with `md:hidden`

---

### 2. Main Layout - Responsive Container
**File**: `/frontend/src/layout/Layout.tsx`

```tsx
const Layout: React.FC<LayoutProps> = ({ children, navItems, ... }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay for sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Page content with responsive padding */}
        <main className="relative flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
```

**Responsive Features:**
- Content padding: `p-4 md:p-6 lg:p-8` (mobile → tablet → desktop)
- Mobile overlay: `fixed inset-0 z-40 bg-black/50 md:hidden`

---

### 3. Dashboard Page - Grid Layout with Breakpoints
**File**: `/frontend/src/pages/DashboardPage.tsx`

```tsx
// System Health Cards - 4 columns on desktop, 2 on tablet, 1 on mobile
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>

// Performance Metrics - 2 columns on desktop, 1 on mobile
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
  <Card>...</Card>
  <Card>...</Card>
</div>
```

**Breakpoints:**
- Mobile (default): 1 column
- Tablet (md:): 2 columns
- Desktop (lg:): 3-4 columns

---

### 4. Agents Page - Responsive Header
**File**: `/frontend/src/pages/AgentsPage.tsx`

```tsx
// Header - stacks on mobile, horizontal on desktop
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div>
    <h1 className="text-3xl font-bold text-slate-900">Agents</h1>
    <p className="text-slate-600 mt-2">Monitor and manage AI crypto agents</p>
  </div>
  <Button onClick={() => alert('Add agent dialog would open here')}>
    + Add Agent
  </Button>
</div>

// Agent cards grid
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {filteredAgents.map((agent) => (
    <AgentCard key={agent.id} agent={agent} />
  ))}
</div>
```

---

### 5. Table with Mobile Scrolling
**File**: `/frontend/src/components/ui/Table.tsx`

```tsx
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">  {/* Horizontal scroll on mobile */}
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
);
```

**How it works:**
- Wrapper div with `overflow-auto` allows horizontal scrolling on mobile
- Table maintains full width
- No column hiding or restructuring (limitation)

---

### 6. Dialog - Mobile Aware
**File**: `/frontend/src/components/ui/Dialog.tsx`

```tsx
const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Dialog content - responsive width and height */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white shadow-lg">
        {children}
      </div>
    </div>
  );
};
```

**Mobile-Friendly:**
- `max-h-[90vh]` - Leaves room for mobile keyboard
- `w-full max-w-lg` - Full width on mobile, constrained on desktop
- Scrollable content with `overflow-auto`

---

### 7. Input Field - Full Width
**File**: `/frontend/src/components/forms/Input.tsx`

```tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, type = 'text', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-slate-700">
            {label}
            {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && <span className="absolute left-3 top-3 text-slate-400">{icon}</span>}
          <input
            type={type}
            className={cn(
              'flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm',
              icon && 'pl-10',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      </div>
    );
  }
);
```

**Responsive:**
- `w-full` - Takes full width of container
- Padding adjustable per container width
- Icon offset handled with `pl-10`

---

### 8. Card with Responsive Header
**File**: `/frontend/src/components/dashboard/AgentCard.tsx`

```tsx
<Card className="cursor-pointer transition-shadow hover:shadow-md">
  <CardHeader>
    {/* Responsive flex layout */}
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <CardTitle className="text-lg">{agent.name}</CardTitle>
        <CardDescription className="text-xs text-slate-500">
          {agent.address}
        </CardDescription>
      </div>
      <Badge variant={statusVariant}>{agent.status}</Badge>
    </div>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* Grid - 3 columns always (could be improved) */}
    <div className="grid grid-cols-3 gap-4">
      <div>
        <p className="text-xs text-slate-500">Transactions</p>
        <p className="text-2xl font-bold text-slate-900">{agent.transactionCount}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Verified</p>
        <p className="text-2xl font-bold text-green-600">{agent.verifiedCount}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Failed</p>
        <p className="text-2xl font-bold text-red-600">{agent.failedCount}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

**Issue**: Grid is `grid-cols-3` always - could overflow on mobile phones in landscape

---

### 9. Admin Panel - Responsive Filter Bar
**File**: `/frontend/src/components/admin/AdminPanel.tsx`

```tsx
<Card>
  <CardContent className="pt-6">
    {/* Stacks on mobile, horizontal on desktop */}
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-2">
        <Button variant={sortBy === 'name' ? 'default' : 'outline'} size="sm">
          Sort by Name
        </Button>
        <Button variant={sortBy === 'created' ? 'default' : 'outline'} size="sm">
          Sort by Created
        </Button>
      </div>

      {selectedAgents.size > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{selectedAgents.size} selected</Badge>
          <Button variant="outline" size="sm">Suspend</Button>
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

---

## Common Responsive Patterns

### Pattern 1: Grid with Responsive Columns
```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns */}
</div>
```

### Pattern 2: Flex Direction Toggle
```tsx
<div className="flex flex-col md:flex-row gap-4">
  {/* Mobile: stacked vertically, Desktop: horizontal */}
</div>
```

### Pattern 3: Mobile-Only Elements
```tsx
<div className="md:hidden">
  {/* Only visible on mobile */}
</div>
```

### Pattern 4: Desktop-Only Elements
```tsx
<div className="hidden md:block">
  {/* Only visible on desktop */}
</div>
```

### Pattern 5: Responsive Padding
```tsx
<div className="p-4 md:p-6 lg:p-8">
  {/* Mobile: 1rem, Tablet: 1.5rem, Desktop: 2rem */}
</div>
```

---

## What's MISSING

### 1. Small Breakpoint (sm:)
Currently NOT used anywhere
```tsx
// Should add sm: for 640px breakpoint:
<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {/* Mobile < 640px: 1 col, Tablet 640-768: 2 cols, etc. */}
</div>
```

### 2. Touch-Friendly Sizing
Not implemented:
```tsx
// Current:
<Button>Click</Button>

// Should be:
<Button className="min-h-[44px] min-w-[44px]">Click</Button>
```

### 3. Responsive Typography
Not implemented:
```tsx
// Should add:
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
  Title
</h1>
```

### 4. Responsive Table
Not implemented:
```tsx
// On mobile, should show as card view instead of horizontal scroll:
{/* Mobile */}
<div className="md:hidden">
  {data.map(row => (
    <div className="border rounded p-3 mb-2">
      <p><strong>{row.name}</strong>: {row.value}</p>
    </div>
  ))}
</div>

{/* Desktop */}
<div className="hidden md:block overflow-x-auto">
  <Table>{/* Regular table */}</Table>
</div>
```

### 5. Safe Area Insets
Not implemented (for notched phones):
```tsx
// Should add:
<div className="pt-[max(1rem,env(safe-area-inset-top))]">
  {/* Content with safe area respect */}
</div>
```

---

## Performance Notes

### Current Approach
- All Tailwind classes are inline (no CSS files)
- Minimal build size
- No CSS-in-JS overhead

### Optimizations Possible
1. Add `@apply` for repeated patterns (in config)
2. Use responsive image loading
3. Lazy load heavy components
4. Optimize for WebSocket on mobile networks

---

## Testing Recommendations

### Mobile Devices to Test
- iPhone 12/13 (small: 390px)
- iPhone 12 Pro Max (large: 428px)
- iPad (tablet: 768px)
- Android phones (varies)

### Breakpoints to Test
- 320px (very small)
- 480px (small phones landscape)
- 640px (sm: breakpoint - missing!)
- 768px (md: breakpoint)
- 1024px (lg: breakpoint)
- 1280px (xl: breakpoint - rarely used)

