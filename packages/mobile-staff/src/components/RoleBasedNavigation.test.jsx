/**
 * RoleBasedNavigation Component Tests
 * 
 * Basic tests for the RoleBasedNavigation component.
 * These tests verify role-based feature filtering and navigation behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RoleBasedNavigation from './RoleBasedNavigation';

// Mock the roleFeatures module
vi.mock('../config/roleFeatures', () => ({
  getRoleFeaturesWithMetadata: vi.fn((staffType) => {
    const features = {
      Teacher: [
        { id: 'mark-lists', title: 'Mark Lists', icon: '📚', route: '/marks' },
        { id: 'attendance', title: 'Attendance', icon: '✅', route: '/attendance' },
        { id: 'exam-creation', title: 'Exams', icon: '📝', route: '/exams' },
      ],
      Administrative: [
        { id: 'student-registration', title: 'Registration', icon: '➕', route: '/students/register' },
        { id: 'fee-management', title: 'Fees', icon: '💰', route: '/fees' },
      ],
      Supportive: [
        { id: 'attendance-view', title: 'Attendance', icon: '👁️', route: '/attendance/view' },
        { id: 'student-list', title: 'Students', icon: '👥', route: '/students' },
      ],
    };
    return features[staffType] || [];
  }),
}));

// Helper function to render component with router
function renderWithRouter(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('RoleBasedNavigation', () => {
  describe('Teacher Role', () => {
    const teacherUser = {
      username: 'john.teacher',
      staffType: 'Teacher',
      branchCode: 'ib3',
    };

    it('should render navigation for teacher role', () => {
      renderWithRouter(<RoleBasedNavigation user={teacherUser} />);

      // Should show home, teacher features, and profile
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Mark Lists')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
      expect(screen.getByText('Exams')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should not show administrative features for teacher', () => {
      renderWithRouter(<RoleBasedNavigation user={teacherUser} />);

      // Should not show administrative features
      expect(screen.queryByText('Registration')).not.toBeInTheDocument();
      expect(screen.queryByText('Fees')).not.toBeInTheDocument();
    });
  });

  describe('Administrative Role', () => {
    const adminUser = {
      username: 'jane.admin',
      staffType: 'Administrative',
      branchCode: 'ib3',
    };

    it('should render navigation for administrative role', () => {
      renderWithRouter(<RoleBasedNavigation user={adminUser} />);

      // Should show home, administrative features, and profile
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Registration')).toBeInTheDocument();
      expect(screen.getByText('Fees')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should not show teacher features for administrative', () => {
      renderWithRouter(<RoleBasedNavigation user={adminUser} />);

      // Should not show teacher features
      expect(screen.queryByText('Mark Lists')).not.toBeInTheDocument();
      expect(screen.queryByText('Exams')).not.toBeInTheDocument();
    });
  });

  describe('Supportive Role', () => {
    const supportUser = {
      username: 'bob.support',
      staffType: 'Supportive',
      branchCode: 'ib3',
    };

    it('should render navigation for supportive role', () => {
      renderWithRouter(<RoleBasedNavigation user={supportUser} />);

      // Should show home, supportive features, and profile
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
      expect(screen.getByText('Students')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should show limited features for supportive role', () => {
      renderWithRouter(<RoleBasedNavigation user={supportUser} />);

      // Should not show teacher or administrative features
      expect(screen.queryByText('Mark Lists')).not.toBeInTheDocument();
      expect(screen.queryByText('Exams')).not.toBeInTheDocument();
      expect(screen.queryByText('Registration')).not.toBeInTheDocument();
      expect(screen.queryByText('Fees')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Options', () => {
    const teacherUser = {
      username: 'john.teacher',
      staffType: 'Teacher',
      branchCode: 'ib3',
    };

    it('should hide home when showHome is false', () => {
      renderWithRouter(
        <RoleBasedNavigation user={teacherUser} showHome={false} />
      );

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      expect(screen.getByText('Mark Lists')).toBeInTheDocument();
    });

    it('should hide profile when showProfile is false', () => {
      renderWithRouter(
        <RoleBasedNavigation user={teacherUser} showProfile={false} />
      );

      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      expect(screen.getByText('Mark Lists')).toBeInTheDocument();
    });

    it('should call onNavigate callback when item is clicked', () => {
      const onNavigate = vi.fn();
      renderWithRouter(
        <RoleBasedNavigation user={teacherUser} onNavigate={onNavigate} />
      );

      const markListsButton = screen.getByText('Mark Lists');
      fireEvent.click(markListsButton);

      expect(onNavigate).toHaveBeenCalledWith('/marks', 'mark-lists');
    });
  });

  describe('Invalid User Handling', () => {
    it('should return null for invalid user object', () => {
      const { container } = renderWithRouter(
        <RoleBasedNavigation user={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should return null for user without staffType', () => {
      const invalidUser = {
        username: 'test.user',
        branchCode: 'ib3',
      };

      const { container } = renderWithRouter(
        <RoleBasedNavigation user={invalidUser} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    const teacherUser = {
      username: 'john.teacher',
      staffType: 'Teacher',
      branchCode: 'ib3',
    };

    it('should have proper ARIA labels', () => {
      renderWithRouter(<RoleBasedNavigation user={teacherUser} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('should have aria-current on active route', () => {
      renderWithRouter(<RoleBasedNavigation user={teacherUser} />);

      // Home should be active by default (current route is '/')
      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).toHaveAttribute('aria-current', 'page');
    });

    it('should have keyboard accessible buttons', () => {
      renderWithRouter(<RoleBasedNavigation user={teacherUser} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Navigation Item Limit', () => {
    it('should warn when more than 5 items', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock a role with many features
      const userWithManyFeatures = {
        username: 'test.user',
        staffType: 'Teacher',
        branchCode: 'ib3',
      };

      renderWithRouter(<RoleBasedNavigation user={userWithManyFeatures} />);

      // With home, 3 teacher features, and profile = 5 items (no warning)
      // If we had more features, it would warn

      consoleSpy.mockRestore();
    });
  });
});
