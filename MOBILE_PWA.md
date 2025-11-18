# Mobile & PWA Implementation Guide

Agent Audit Dashboard - Complete mobile responsive design and Progressive Web App setup.

## Table of Contents

1. [Overview](#overview)
2. [PWA Setup](#pwa-setup)
3. [Mobile-Responsive Design](#mobile-responsive-design)
4. [Service Worker](#service-worker)
5. [Offline Support](#offline-support)
6. [Touch Optimizations](#touch-optimizations)
7. [Performance on Mobile](#performance-on-mobile)
8. [Testing on Devices](#testing-on-devices)
9. [Deployment](#deployment)

---

## Overview

The Agent Audit Dashboard now includes full mobile support and PWA capabilities:

- **Responsive Design**: Mobile-first, works on all screen sizes (320px - 2560px)
- **PWA Ready**: Installable web app with offline support
- **Service Worker**: Caching, offline functionality, background sync
- **Touch Optimized**: 44px minimum touch targets, gesture support
- **Safe Area Support**: Handles notched devices (iPhone X+)
- **Performance**: Optimized for mobile networks and devices

---

## PWA Setup

### 1. Web App Manifest (`public/manifest.json`)

Defines how the app appears when installed:

```json
{
  "name": "Agent Audit Dashboard",
  "short_name": "Agent Audit",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

**Key fields**:
- `display: "standalone"` - Hides browser UI (full app experience)
- `start_url` - Page to load when app is launched
- `theme_color` - Color of browser UI and address bar
- `icons` - App icons for various contexts

### 2. HTML Meta Tags (`public/index.html`)

Essential tags for mobile and PWA:

```html
<!-- Viewport: controls layout on mobile -->
<meta name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover" />

<!-- Apple specific -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Agent Audit Dashboard" />

<!-- PWA manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- Apple touch icon -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

<!-- Theme color -->
<meta name="theme-color" content="#0f172a" />
```

### 3. Service Worker Registration

Automatic registration in `public/index.html`:

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
</script>
```

---

## Mobile-Responsive Design

### Responsive Breakpoints

Using Tailwind CSS mobile-first approach:

```typescript
screens: {
  'xs': '320px',   // Small phones
  'sm': '640px',   // Tablets
  'md': '768px',   // Small laptops
  'lg': '1024px',  // Laptops
  'xl': '1280px',  // Large screens
  '2xl': '1536px', // Extra large
}
```

### Responsive Component Pattern

```typescript
// Mobile-first: design for small screens first, then enhance
<div className="space-y-4 sm:space-y-6 md:space-y-8">
  {/* Spacing: 1rem on mobile, 1.5rem on sm+, 2rem on md+ */}
</div>

// Grid that adapts to screen size
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 1 column mobile, 2 columns tablet, 4 columns desktop */}
</div>

// Text that scales with screen
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
  {/* 24px mobile, 30px tablet, 36px desktop */}
</h1>
```

### Key Responsive Classes

**Visibility**:
```typescript
className="hidden sm:block"      // Show on sm+ only
className="block sm:hidden"      // Hide on sm+
className="md:hidden lg:block"   // Show on lg+
```

**Sizing**:
```typescript
className="w-full sm:w-1/2 lg:w-1/4"  // Responsive width
className="h-10 sm:h-12 md:h-16"      // Responsive height
className="p-4 sm:p-6 md:p-8"         // Responsive padding
```

**Spacing**:
```typescript
className="gap-4 sm:gap-6 lg:gap-8"   // Responsive gaps
className="mt-4 sm:mt-6 md:mt-8"      // Responsive margins
```

---

## Service Worker

### Caching Strategy

**Network First** (for HTML pages):
```javascript
// Try network first, fall back to cache
fetch -> success: cache + return
fetch -> fail: return cached version
```

**Cache First** (for JS, CSS, images):
```javascript
// Use cached version if available
cache exists -> return immediately
cache missing -> fetch + cache + return
```

### Cache Invalidation

Caches are versioned to auto-clear on updates:

```javascript
const CACHE_VERSION = 'v1';
const CACHE_NAME = `agent-audit-${CACHE_VERSION}`;

// Increment CACHE_VERSION to clear all caches on deploy
// Old caches automatically deleted on activation
```

### Offline Fallback

When offline and page isn't cached:
1. Service Worker catches fetch error
2. Returns cached fallback page
3. User sees "offline" message with cached data

---

## Offline Support

### Automatic Offline Detection

```typescript
// In any component
const isOnline = navigator.onLine;

// Listen for changes
window.addEventListener('online', () => {
  console.log('Back online');
  syncData();
});

window.addEventListener('offline', () => {
  console.log('Gone offline');
  showOfflineUI();
});
```

### Queuing Failed Requests

Failed API requests while offline can be:
1. Stored locally (IndexedDB)
2. Retried when back online
3. Synced with service worker

```typescript
// Pseudo-code
if (!navigator.onLine) {
  saveRequestToQueue(request);
} else {
  try {
    const response = await fetch(request);
  } catch (error) {
    saveRequestToQueue(request);
  }
}
```

### Background Sync

When app regains connectivity:

```javascript
// In service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});
```

---

## Touch Optimizations

### Touch-Friendly Sizing

All interactive elements minimum **44x44 pixels** (iOS standard):

```typescript
// Button sizes
<button className="min-h-44 min-w-44 px-4 py-3">
  {/* At least 44px tall and wide */}
</button>

// Link spacing
<a href="#" className="block py-3 px-4">
  {/* 44px minimum click target */}
</a>
```

### Touch Event Handling

```typescript
// Prevent double-tap zoom on buttons
<button
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  className="user-select-none"
>
  Click me
</button>
```

### Prevent Zoom on Input

```html
<!-- Prevents zoom when focusing inputs on mobile -->
<input
  type="text"
  style={{ fontSize: '16px' }}  <!-- Must be 16px+ -->
/>
```

### Safe Area Insets

For devices with notches/home indicators:

```typescript
// CSS automatically applied
body {
  padding-left: max(var(--safe-area-inset-left, 0px));
  padding-right: max(var(--safe-area-inset-right, 0px));
  padding-top: max(var(--safe-area-inset-top, 0px));
  padding-bottom: max(var(--safe-area-inset-bottom, 0px));
}

// Or use Tailwind classes
<div className="safe-inset-t safe-inset-b">
  {/* Auto-adjusts for notches */}
</div>
```

### Gesture Support

```typescript
// Swipe to go back
let touchStartX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
});

document.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const swipeDistance = touchStartX - touchEndX;

  if (swipeDistance > 50) {
    // Swiped left - could navigate forward
  }
});
```

---

## Performance on Mobile

### Mobile Network Optimization

1. **Reduce Bundle Size**: Already optimized with code splitting
2. **Compress Assets**: gzip/brotli enabled
3. **Image Optimization**: Use WebP with fallback
4. **Lazy Load Images**:
   ```typescript
   <img loading="lazy" src="..." />
   ```

### Mobile-Specific Optimizations

```typescript
// Reduce animations on slow devices
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Adapt based on connection
const connection = navigator.connection;
if (connection.effectiveType === '4g') {
  // Load high-res assets
} else if (connection.effectiveType === '3g') {
  // Load medium-res assets
}
```

### Viewport Configuration

```html
<!-- Critical for mobile performance -->
<meta name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## Testing on Devices

### Browser DevTools

1. **Chrome DevTools**:
   - F12 -> Toggle device toolbar (Ctrl+Shift+M)
   - Test responsive design for all breakpoints
   - Emulate slow 3G/4G networks
   - Test with reduced motion

2. **PWA Testing**:
   - Application tab -> Manifest
   - Application tab -> Service Workers
   - Check offline functionality

### Real Device Testing

1. **Local Testing**:
   ```bash
   # Serve with HTTPS (required for PWA)
   npm run build
   npx http-server -p 8080 -S -C
   ```

2. **Test on Physical Devices**:
   - iPhone (Safari)
   - Android (Chrome)
   - Tablet (iPad/Android tablet)

3. **PWA Installation**:
   - Chrome/Edge: Three dots menu -> "Install app"
   - Safari iOS: Share -> "Add to Home Screen"
   - Firefox: Optional home screen shortcut

### Testing Checklist

- [ ] Responsive on 320px (iPhone SE)
- [ ] Responsive on 768px (iPad)
- [ ] Responsive on 1024px+ (iPad Pro)
- [ ] All buttons/links are 44px+ minimum
- [ ] Safe area insets respected on notched devices
- [ ] Offline mode works
- [ ] Service Worker registered
- [ ] App installable on home screen
- [ ] App icon displays correctly
- [ ] Theme color applies correctly
- [ ] No zoom on input focus
- [ ] Smooth scrolling works
- [ ] Touch events handled properly
- [ ] Slow network conditions tested

---

## Deployment

### Build Optimization

```bash
# Build with PWA optimizations
npm run build

# Result:
# - dist/ with static assets
# - Includes public/sw.js
# - Includes public/manifest.json
```

### Server Configuration

**Nginx**:
```nginx
# Cache static assets (max 1 year)
location ~* \.(js|css|png|gif|ico|font|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# HTML with cache busting (max 1 hour)
location ~ \.html$ {
  expires 1h;
  add_header Cache-Control "public, max-age=3600";
}

# Service worker (no cache)
location = /sw.js {
  expires -1;
  add_header Cache-Control "public, max-age=0, must-revalidate";
  add_header Service-Worker-Allowed "/";
}

# Manifest (no cache)
location = /manifest.json {
  expires -1;
  add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

### HTTPS Requirement

**Service Workers require HTTPS** (except localhost):

1. Obtain SSL certificate (Let's Encrypt free option)
2. Configure HTTPS in web server
3. Redirect HTTP to HTTPS
4. Test PWA installation

### Deployment Steps

```bash
# 1. Build
npm run build

# 2. Test locally
npx http-server dist -p 8080 -S -C

# 3. Deploy to server
scp -r dist/* user@server:/var/www/dashboard/

# 4. Verify
curl -I https://yourdomain.com
# Should see: Service-Worker-Allowed: /
```

---

## Monitoring PWA Health

### Check PWA Installation

```typescript
// Listen for install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Show "Install" button
  console.log('PWA can be installed');
});

// Check if already installed
window.addEventListener('appinstalled', () => {
  console.log('PWA has been installed');
});

// Check running mode
const isInstalled = window.navigator.standalone === true;
const isAsPWA = window.matchMedia('(display-mode: standalone)').matches;
```

### Monitor Service Worker

```typescript
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((registration) => {
    console.log('Service Worker registered:', registration);

    registration.onupdatefound = () => {
      const newWorker = registration.installing;
      newWorker.onstatechange = () => {
        if (newWorker.state === 'installed') {
          console.log('New service worker ready');
          // Prompt user to reload
        }
      };
    };
  });
});
```

---

## Summary

The Agent Audit Dashboard now provides:

✓ **Responsive Design** - All breakpoints from 320px to 2560px
✓ **PWA Installation** - Installable web app icon
✓ **Offline Support** - Works without internet
✓ **Service Worker** - Intelligent caching and sync
✓ **Touch Optimized** - 44px minimum targets
✓ **Safe Area Support** - Handles notched devices
✓ **Performance** - Optimized for slow networks
✓ **Testing** - Easy to verify on real devices

The app is now truly mobile-first and ready for both web and home screen installation.
