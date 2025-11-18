import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './layout/Layout';
import {
  DashboardPage,
  AgentsPage,
  AdminPage,
  SettingsPage,
  NotFoundPage,
} from './pages';
import { ROUTE_PATHS, createNavigation } from './routing/routes';

/**
 * Main Application Component
 * Handles routing and layout for the entire application
 */

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeNav, setActiveNav] = useState<string>('dashboard');

  const navItems = useMemo(() => createNavigation(), []);

  // Update active nav item based on current route
  React.useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === ROUTE_PATHS.DASHBOARD) {
      setActiveNav('dashboard');
    } else if (currentPath === ROUTE_PATHS.AGENTS || currentPath.startsWith(ROUTE_PATHS.AGENT_DETAIL)) {
      setActiveNav('agents');
    } else if (currentPath === ROUTE_PATHS.ADMIN || currentPath.startsWith('/admin')) {
      setActiveNav('admin');
    } else if (currentPath === ROUTE_PATHS.SETTINGS) {
      setActiveNav('settings');
    }
  }, [location.pathname]);

  const handleNavClick = (itemId: string) => {
    setActiveNav(itemId);

    // Navigate to the corresponding route
    switch (itemId) {
      case 'dashboard':
        navigate(ROUTE_PATHS.DASHBOARD);
        break;
      case 'agents':
        navigate(ROUTE_PATHS.AGENTS);
        break;
      case 'transactions':
        navigate(ROUTE_PATHS.TRANSACTIONS);
        break;
      case 'admin':
        navigate(ROUTE_PATHS.ADMIN);
        break;
      case 'settings':
        navigate(ROUTE_PATHS.SETTINGS);
        break;
    }
  };

  // Determine page title and subtitle based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case ROUTE_PATHS.DASHBOARD:
        return { title: 'Dashboard', subtitle: 'Real-time monitoring and analytics' };
      case ROUTE_PATHS.AGENTS:
        return { title: 'Agents', subtitle: 'Monitor and manage AI agents' };
      case ROUTE_PATHS.TRANSACTIONS:
        return { title: 'Transactions', subtitle: 'View and verify transactions' };
      case ROUTE_PATHS.ADMIN:
        return { title: 'Administration', subtitle: 'System management and configuration' };
      case ROUTE_PATHS.SETTINGS:
        return { title: 'Settings', subtitle: 'Account and preference settings' };
      default:
        return { title: 'Agent Audit Dashboard', subtitle: undefined };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <Layout
      navItems={navItems}
      activeNav={activeNav}
      onNavClick={handleNavClick}
      title={title}
      subtitle={subtitle}
    >
      <Routes>
        <Route path={ROUTE_PATHS.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTE_PATHS.AGENTS} element={<AgentsPage />} />
        <Route path={ROUTE_PATHS.ADMIN} element={<AdminPage />} />
        <Route path={ROUTE_PATHS.SETTINGS} element={<SettingsPage />} />
        <Route path={ROUTE_PATHS.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export { App };
export default App;
