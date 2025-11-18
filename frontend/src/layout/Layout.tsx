import React, { useState } from 'react';
import { Header, Sidebar, type NavItem } from '../components';
import { cn } from '../utils/cn';

export interface LayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  activeNav?: string;
  onNavClick?: (itemId: string) => void;
  title?: string;
  subtitle?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  navItems,
  activeNav,
  onNavClick,
  title = 'Agent Audit Dashboard',
  subtitle,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <Header
        title={title}
        subtitle={subtitle}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          items={navItems}
          activeItem={activeNav}
          onItemClick={(id) => {
            onNavClick?.(id);
            setSidebarOpen(false);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Page Content */}
        <main className="relative flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export { Layout };
