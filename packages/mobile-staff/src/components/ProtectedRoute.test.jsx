/**
 * ProtectedRoute Component Tests
 * 
 * Tests for role-based access control in protected routes.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute, { AccessDeniedPage } from './ProtectedRoute';

// Mock child component
const MockProtectedComponent = () => <div>Protected Content</div>;

// Helper to render with router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ProtectedRoute Component', () => {
  describe('Access Control', () => {
    test('should render protected content when user has access', () => {
      const user = { staffType: 'Teacher', username: 'teacher1' };
      
      renderWithRouter(
        <ProtectedRoute user={user} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('should show access denied when user does not have access', () => {
      const user = { staffType: 'Administrative', username: 'admin1' };
      
      renderWithRouter(
        <ProtectedRoute user={user} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should show access denied when user object is invalid', () => {
      renderWithRouter(
        <ProtectedRoute user={null} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    test('should show access denied when user has no staffType', () => {
      const user = { username: 'user1' };
      
      renderWithRouter(
        <ProtectedRoute user={user} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access - Teacher', () => {
    const teacherUser = { staffType: 'Teacher', username: 'teacher1' };

    test('Teacher should access mark-lists', () => {
      renderWithRouter(
        <ProtectedRoute user={teacherUser} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('Teacher should access attendance', () => {
      renderWithRouter(
        <ProtectedRoute user={teacherUser} featureId="attendance">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('Teacher should access exam-creation', () => {
      renderWithRouter(
        <ProtectedRoute user={teacherUser} featureId="exam-creation">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('Teacher should NOT access fee-management', () => {
      renderWithRouter(
        <ProtectedRoute user={teacherUser} featureId="fee-management">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Role-Based Access - Administrative', () => {
    const adminUser = { staffType: 'Administrative', username: 'admin1' };

    test('Administrative should access fee-management', () => {
      renderWithRouter(
        <ProtectedRoute user={adminUser} featureId="fee-management">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('Administrative should access student-registration', () => {
      renderWithRouter(
        <ProtectedRoute user={adminUser} featureId="student-registration">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('Administrative should NOT access mark-lists', () => {
      renderWithRouter(
        <ProtectedRoute user={adminUser} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('Administrative should NOT access exam-creation', () => {
      renderWithRouter(
        <ProtectedRoute user={adminUser} featureId="exam-creation">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access - Supportive', () => {
    const supportiveUser = { staffType: 'Supportive', username: 'support1' };

    test('Supportive should access attendance-view', () => {
      renderWithRouter(
        <ProtectedRoute user={supportiveUser} featureId="attendance-view">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('Supportive should access schedule-view', () => {
      renderWithRouter(
        <ProtectedRoute user={supportiveUser} featureId="schedule-view">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('Supportive should NOT access mark-lists', () => {
      renderWithRouter(
        <ProtectedRoute user={supportiveUser} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    test('Supportive should NOT access fee-management', () => {
      renderWithRouter(
        <ProtectedRoute user={supportiveUser} featureId="fee-management">
          <MockProtectedComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Requirement 23.9 - Mark Lists Teacher-Only Access', () => {
    test('REQUIREMENT 23.9: Only Teacher role should access mark-lists', () => {
      const teacherUser = { staffType: 'Teacher', username: 'teacher1' };
      const adminUser = { staffType: 'Administrative', username: 'admin1' };
      const supportiveUser = { staffType: 'Supportive', username: 'support1' };

      // Teacher should have access
      const { unmount: unmount1 } = renderWithRouter(
        <ProtectedRoute user={teacherUser} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      unmount1();

      // Administrative should NOT have access
      const { unmount: unmount2 } = renderWithRouter(
        <ProtectedRoute user={adminUser} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      unmount2();

      // Supportive should NOT have access
      renderWithRouter(
        <ProtectedRoute user={supportiveUser} featureId="mark-lists">
          <MockProtectedComponent />
        </ProtectedRoute>
      );
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });
});

describe('AccessDeniedPage Component', () => {
  test('should render access denied message', () => {
    renderWithRouter(<AccessDeniedPage featureId="mark-lists" />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/Mark Lists/)).toBeInTheDocument();
  });

  test('should display user role when provided', () => {
    renderWithRouter(<AccessDeniedPage featureId="mark-lists" userRole="Administrative" />);

    expect(screen.getByText(/Administrative/)).toBeInTheDocument();
  });

  test('should render Go Back button', () => {
    renderWithRouter(<AccessDeniedPage featureId="mark-lists" />);

    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  test('should render Go to Home button', () => {
    renderWithRouter(<AccessDeniedPage featureId="mark-lists" />);

    expect(screen.getByText('Go to Home')).toBeInTheDocument();
  });

  test('should display feature-specific message', () => {
    renderWithRouter(<AccessDeniedPage featureId="exam-creation" />);

    expect(screen.getByText(/Exam Creation/)).toBeInTheDocument();
  });
});
