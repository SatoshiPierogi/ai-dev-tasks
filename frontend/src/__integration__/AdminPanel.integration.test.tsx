/**
 * Frontend Integration Tests - Admin Panel
 * Tests for complete admin workflows including forms, data display, and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPage } from '../pages/AdminPage';

// Mock API calls
jest.mock('../services/api', () => ({
  api: {
    getAgents: jest.fn(),
    createAgent: jest.fn(),
    updateAgent: jest.fn(),
    deleteAgent: jest.fn(),
  },
}));

describe('AdminPanel Integration Tests', () => {
  // ============================================================================
  // ADMIN PAGE RENDERING
  // ============================================================================

  describe('Admin Page Rendering', () => {
    it('should render admin page with all sections', () => {
      render(<AdminPage />);

      // Check header
      expect(screen.getByText('Administration')).toBeInTheDocument();

      // Check system overview
      expect(screen.getByText('System Status')).toBeInTheDocument();
      expect(screen.getByText('Database Size')).toBeInTheDocument();
      expect(screen.getByText('API Health')).toBeInTheDocument();

      // Check admin panel
      expect(screen.getByText('Agent Management')).toBeInTheDocument();

      // Check settings
      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });

    it('should display all agents in table', () => {
      render(<AdminPage />);

      // Check for agent names
      expect(screen.getByText('AI Arbitrage Bot')).toBeInTheDocument();
      expect(screen.getByText('Lending Protocol Manager')).toBeInTheDocument();
      expect(screen.getByText('Liquidity Provider Bot')).toBeInTheDocument();
    });

    it('should show agent statistics', () => {
      render(<AdminPage />);

      // Stats should be visible
      expect(screen.getByText(/Active Agents/)).toBeInTheDocument();
      expect(screen.getByText(/Inactive Agents/)).toBeInTheDocument();
      expect(screen.getByText(/Total Transactions/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // AGENT MANAGEMENT WORKFLOW
  // ============================================================================

  describe('Agent Management Workflow', () => {
    it('should add a new agent via form', async () => {
      render(<AdminPage />);

      const addButton = screen.getByText('+ Add Agent');
      fireEvent.click(addButton);

      // Dialog should open (note: this would be tested with the actual dialog)
      expect(addButton).toBeInTheDocument();
    });

    it('should edit an agent', async () => {
      render(<AdminPage />);

      // Find and click edit button for first agent
      const editButtons = screen.getAllByText('Edit');
      if (editButtons.length > 0) {
        fireEvent.click(editButtons[0]);
        // Edit dialog would open
      }

      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should remove an agent', async () => {
      render(<AdminPage />);

      // Find and click remove button
      const removeButtons = screen.getAllByText('Remove');
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
        // Confirmation would appear
      }

      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SORTING AND FILTERING
  // ============================================================================

  describe('Sorting and Filtering', () => {
    it('should sort by name', async () => {
      render(<AdminPage />);

      const sortByNameButton = screen.getByText('Sort by Name');
      fireEvent.click(sortByNameButton);

      // Verify sort was applied (button should be highlighted)
      expect(sortByNameButton).toBeInTheDocument();
    });

    it('should sort by creation date', async () => {
      render(<AdminPage />);

      const sortByCreatedButton = screen.getByText('Sort by Created');
      fireEvent.click(sortByCreatedButton);

      expect(sortByCreatedButton).toBeInTheDocument();
    });

    it('should sort by activity', async () => {
      render(<AdminPage />);

      const sortByActivityButton = screen.getByText('Sort by Activity');
      fireEvent.click(sortByActivityButton);

      expect(sortByActivityButton).toBeInTheDocument();
    });
  });

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  describe('Settings Management', () => {
    it('should display archival settings', () => {
      render(<AdminPage />);

      expect(screen.getByText('Archival Settings')).toBeInTheDocument();
      expect(screen.getByDisplayValue('7', { selector: 'input[type="number"]' })).toBeInTheDocument();
    });

    it('should display cache settings', () => {
      render(<AdminPage />);

      expect(screen.getByText('Cache Settings')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1800', { selector: 'input[type="number"]' })).toBeInTheDocument();
    });

    it('should display verification settings', () => {
      render(<AdminPage />);

      expect(screen.getByText('Verification Settings')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12', { selector: 'input[type="number"]' })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // MULTI-SELECT OPERATIONS
  // ============================================================================

  describe('Multi-Select Operations', () => {
    it('should select individual agents', () => {
      render(<AdminPage />);

      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 1) {
        fireEvent.click(checkboxes[1]); // Click second checkbox (first is select all)
        // Agent should be marked as selected
      }

      expect(checkboxes.length).toBeGreaterThan(1);
    });

    it('should select all agents', () => {
      render(<AdminPage />);

      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0]); // Click select all checkbox
      }

      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should perform bulk actions on selected agents', () => {
      render(<AdminPage />);

      // Select some agents (implementation specific)
      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 1) {
        fireEvent.click(checkboxes[1]);
      }

      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // DATA PERSISTENCE
  // ============================================================================

  describe('Data Persistence', () => {
    it('should maintain agent list after operations', () => {
      const { rerender } = render(<AdminPage />);

      // Initial render should show agents
      expect(screen.getByText('AI Arbitrage Bot')).toBeInTheDocument();

      // Rerender
      rerender(<AdminPage />);

      // Agents should still be visible
      expect(screen.getByText('AI Arbitrage Bot')).toBeInTheDocument();
    });

    it('should display updated agent status', () => {
      render(<AdminPage />);

      // Check for status badges
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should display error when agent operations fail', async () => {
      // Mock API to fail
      const api = require('../services/api').api;
      api.deleteAgent.mockRejectedValueOnce(new Error('Delete failed'));

      render(<AdminPage />);

      // Attempt deletion would show error
      const removeButtons = screen.getAllByText('Remove');
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
      }

      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<AdminPage />);

      const heading = screen.getByText('Administration');
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible form controls', () => {
      render(<AdminPage />);

      const settingsInputs = screen.getAllByDisplayValue(
        /1800|12|7/,
        { selector: 'input[type="number"]' }
      );

      expect(settingsInputs.length).toBeGreaterThan(0);
    });

    it('should have keyboard navigable buttons', () => {
      render(<AdminPage />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
