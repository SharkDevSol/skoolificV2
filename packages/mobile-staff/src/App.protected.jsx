/**
 * Skoolific Staff Mobile App - With Protected Routes
 * 
 * Main application component with role-based navigation and protected routes.
 * This version demonstrates how to protect the mark lists feature for Teacher role only.
 * 
 * To use this version:
 * 1. Rename this file to App.jsx (backup the original first)
 * 2. Update main.jsx to wrap App with BrowserRouter
 * 3. Ensure all route components are created
 * 4. Update the API base URL in AuthProvider
 */

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleBasedNavigation, ProtectedRoute } from './components';
import MarkListsPage from './pages/MarkListsPage';
import './App.css';

/**
 * Main App Component with Authentication Provider
 */
function App() {
  return (
    <AuthProvider apiBaseUrl={import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}>
      <AppContent />
    </AuthProvider>
  );
}

/**
 * App Content Component
 * Handles authentication state and routing
 */
function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    setPlatform(Capacitor.getPlatform());
  }, []);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Main app layout with role-based navigation
  return (
    <div className="app">
      {/* Main content area */}
      <main className="app-main">
        <Routes>
          {/* Home route */}
          <Route path="/" element={<HomePage user={user} platform={platform} />} />

          {/* Protected Teacher routes */}
          <Route 
            path="/marks" 
            element={
              <ProtectedRoute user={user} featureId="mark-lists">
                <MarkListsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/attendance" 
            element={
              <ProtectedRoute user={user} featureId="attendance">
                <AttendancePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/exams" 
            element={
              <ProtectedRoute user={user} featureId="exam-creation">
                <ExamCreationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/classes" 
            element={
              <ProtectedRoute user={user} featureId="class-management">
                <ClassManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/schedule" 
            element={
              <ProtectedRoute user={user} featureId="schedule-view">
                <SchedulePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/students" 
            element={
              <ProtectedRoute user={user} featureId="student-reports">
                <StudentReportsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/evaluation" 
            element={
              <ProtectedRoute user={user} featureId="evaluation-book">
                <EvaluationBookPage />
              </ProtectedRoute>
            } 
          />

          {/* Protected Administrative routes */}
          <Route 
            path="/students/register" 
            element={
              <ProtectedRoute user={user} featureId="student-registration">
                <StudentRegistrationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/fees" 
            element={
              <ProtectedRoute user={user} featureId="fee-management">
                <FeeManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute user={user} featureId="reports">
                <ReportsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payments/track" 
            element={
              <ProtectedRoute user={user} featureId="payment-tracking">
                <PaymentTrackingPage />
              </ProtectedRoute>
            } 
          />

          {/* Protected Supportive routes */}
          <Route 
            path="/attendance/view" 
            element={
              <ProtectedRoute user={user} featureId="attendance-view">
                <AttendanceViewPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/students" 
            element={
              <ProtectedRoute user={user} featureId="student-list">
                <StudentListPage />
              </ProtectedRoute>
            } 
          />

          {/* Common routes (accessible to all roles) */}
          <Route 
            path="/communication" 
            element={
              <ProtectedRoute user={user} featureId="communication">
                <CommunicationPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Access denied route */}
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Role-based bottom navigation */}
      <RoleBasedNavigation 
        user={user}
        onNavigate={(route, itemId) => {
          console.log(`Navigating to ${route} (${itemId})`);
        }}
      />
    </div>
  );
}

/**
 * Loading Screen Component
 */
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p>Loading Skoolific Staff...</p>
    </div>
  );
}

/**
 * Login Screen Component
 */
function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password, branchCode);

    if (!result.success) {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <header className="login-header">
          <h1>Skoolific Staff</h1>
          <p>Mobile Application for Teachers & Staff</p>
        </header>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="branchCode">Branch Code</label>
            <input
              id="branchCode"
              type="text"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
              placeholder="e.g., ib3"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Home Page Component
 */
function HomePage({ user, platform }) {
  return (
    <div className="page home-page">
      <header className="page-header">
        <h1>Welcome, {user.username}!</h1>
        <p className="user-role">Role: {user.staffType}</p>
        <div className="platform-badge">Platform: {platform}</div>
      </header>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Dashboard</h2>
          <p>Select a feature from the navigation below to get started.</p>
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <span className="stat-icon">📚</span>
            <div className="stat-content">
              <h3>Quick Access</h3>
              <p>Your most used features</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-content">
              <h3>Recent Activity</h3>
              <p>View your recent actions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder Page Components
 */

function AttendancePage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Attendance</h1>
      </header>
      <div className="page-content">
        <p>Mark student attendance</p>
      </div>
    </div>
  );
}

function ExamCreationPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Exam Creation</h1>
      </header>
      <div className="page-content">
        <p>Create and manage exams</p>
      </div>
    </div>
  );
}

function ClassManagementPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Class Management</h1>
      </header>
      <div className="page-content">
        <p>Manage class information and students</p>
      </div>
    </div>
  );
}

function SchedulePage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Schedule</h1>
      </header>
      <div className="page-content">
        <p>View class schedules</p>
      </div>
    </div>
  );
}

function StudentReportsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Student Reports</h1>
      </header>
      <div className="page-content">
        <p>Generate and view student reports</p>
      </div>
    </div>
  );
}

function EvaluationBookPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Evaluation Book</h1>
      </header>
      <div className="page-content">
        <p>Student assessments and observations</p>
      </div>
    </div>
  );
}

function StudentRegistrationPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Student Registration</h1>
      </header>
      <div className="page-content">
        <p>Register new students</p>
      </div>
    </div>
  );
}

function FeeManagementPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Fee Management</h1>
      </header>
      <div className="page-content">
        <p>Manage student fees and payments</p>
      </div>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Reports</h1>
      </header>
      <div className="page-content">
        <p>Generate administrative reports</p>
      </div>
    </div>
  );
}

function PaymentTrackingPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Payment Tracking</h1>
      </header>
      <div className="page-content">
        <p>Track payment status</p>
      </div>
    </div>
  );
}

function AttendanceViewPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Attendance View</h1>
      </header>
      <div className="page-content">
        <p>View attendance records</p>
      </div>
    </div>
  );
}

function StudentListPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Students</h1>
      </header>
      <div className="page-content">
        <p>View student information</p>
      </div>
    </div>
  );
}

function CommunicationPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Communication</h1>
      </header>
      <div className="page-content">
        <p>Message parents and students</p>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Profile</h1>
      </header>
      <div className="page-content">
        <div className="profile-info">
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Role:</strong> {user.staffType}</p>
          <p><strong>Branch:</strong> {user.branchCode}</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}

function AccessDeniedPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Access Denied</h1>
      </header>
      <div className="page-content">
        <p>You do not have permission to access this feature.</p>
      </div>
    </div>
  );
}

export default App;
