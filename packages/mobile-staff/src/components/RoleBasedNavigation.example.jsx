/**
 * RoleBasedNavigation Usage Examples
 * 
 * This file demonstrates various ways to use the RoleBasedNavigation component
 * in the Skoolific Staff mobile application.
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import RoleBasedNavigation from './RoleBasedNavigation';

// ============================================================================
// Example 1: Basic Usage with AuthContext
// ============================================================================

function BasicExample() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="app-container">
      <main className="main-content">
        <h1>Welcome, {user.username}!</h1>
        <p>Role: {user.staffType}</p>
      </main>
      
      {/* Bottom navigation - automatically shows features for user's role */}
      <RoleBasedNavigation user={user} />
    </div>
  );
}

// ============================================================================
// Example 2: Complete App Structure with Routing
// ============================================================================

function CompleteAppExample() {
  return (
    <AuthProvider apiBaseUrl="https://api.skoolific.com">
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="app-layout">
      {/* Main content area with routes */}
      <main className="content-area">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marks" element={<MarkListsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/exams" element={<ExamCreationPage />} />
          <Route path="/classes" element={<ClassManagementPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/reports/students" element={<StudentReportsPage />} />
          <Route path="/evaluation" element={<EvaluationBookPage />} />
          <Route path="/students/register" element={<StudentRegistrationPage />} />
          <Route path="/fees" element={<FeeManagementPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/communication" element={<CommunicationPage />} />
          <Route path="/attendance/view" element={<AttendanceViewPage />} />
          <Route path="/students" element={<StudentListPage />} />
          <Route path="/payments/track" element={<PaymentTrackingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>

      {/* Bottom navigation - only shows features accessible to user's role */}
      <RoleBasedNavigation user={user} />
    </div>
  );
}

// ============================================================================
// Example 3: Custom Navigation Callback
// ============================================================================

function NavigationWithCallbackExample() {
  const { user } = useAuth();

  const handleNavigate = (route, itemId) => {
    console.log(`Navigating to ${route} (${itemId})`);
    
    // Track analytics
    trackNavigation(itemId);
    
    // Show loading indicator
    showLoadingIndicator();
  };

  return (
    <div>
      <MainContent />
      <RoleBasedNavigation 
        user={user} 
        onNavigate={handleNavigate}
      />
    </div>
  );
}

// ============================================================================
// Example 4: Customized Navigation (Hide Home/Profile)
// ============================================================================

function CustomizedNavigationExample() {
  const { user } = useAuth();

  return (
    <div>
      <MainContent />
      
      {/* Only show role-based features, no home or profile */}
      <RoleBasedNavigation 
        user={user}
        showHome={false}
        showProfile={false}
      />
    </div>
  );
}

// ============================================================================
// Example 5: Role-Specific Layouts
// ============================================================================

function RoleSpecificLayoutExample() {
  const { user } = useAuth();

  // Different layouts for different roles
  if (user.staffType === 'Teacher') {
    return <TeacherLayout user={user} />;
  } else if (user.staffType === 'Administrative') {
    return <AdministrativeLayout user={user} />;
  } else if (user.staffType === 'Supportive') {
    return <SupportiveLayout user={user} />;
  }

  return <DefaultLayout user={user} />;
}

function TeacherLayout({ user }) {
  return (
    <div className="teacher-layout">
      <header className="app-header">
        <h1>Teacher Dashboard</h1>
        <p>Welcome, {user.username}</p>
      </header>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<TeacherDashboard />} />
          <Route path="/marks" element={<MarkListsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/exams" element={<ExamCreationPage />} />
          {/* Other teacher routes */}
        </Routes>
      </main>

      <RoleBasedNavigation user={user} />
    </div>
  );
}

function AdministrativeLayout({ user }) {
  return (
    <div className="administrative-layout">
      <header className="app-header">
        <h1>Administrative Dashboard</h1>
        <p>Welcome, {user.username}</p>
      </header>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<AdministrativeDashboard />} />
          <Route path="/students/register" element={<StudentRegistrationPage />} />
          <Route path="/fees" element={<FeeManagementPage />} />
          {/* Other administrative routes */}
        </Routes>
      </main>

      <RoleBasedNavigation user={user} />
    </div>
  );
}

// ============================================================================
// Example 6: With Loading States
// ============================================================================

function NavigationWithLoadingExample() {
  const { user, isLoading } = useAuth();
  const [isNavigating, setIsNavigating] = React.useState(false);

  const handleNavigate = async (route, itemId) => {
    setIsNavigating(true);
    
    // Simulate loading data for the new route
    await loadRouteData(route);
    
    setIsNavigating(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div>
      <MainContent />
      
      {isNavigating && <LoadingOverlay />}
      
      <RoleBasedNavigation 
        user={user}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

// ============================================================================
// Example 7: Responsive Layout with Navigation
// ============================================================================

function ResponsiveLayoutExample() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="responsive-layout">
      {/* Desktop: Sidebar navigation */}
      {!isMobile && <SidebarNavigation user={user} />}
      
      <main className="main-content">
        <Routes>
          {/* Your routes */}
        </Routes>
      </main>

      {/* Mobile: Bottom navigation */}
      {isMobile && <RoleBasedNavigation user={user} />}
    </div>
  );
}

// ============================================================================
// Example 8: Integration with Offline Mode
// ============================================================================

function OfflineAwareNavigationExample() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNavigate = (route, itemId) => {
    if (!isOnline) {
      // Check if route is available offline
      const offlineRoutes = ['/', '/profile', '/attendance/view'];
      
      if (!offlineRoutes.includes(route)) {
        alert('This feature requires an internet connection');
        return;
      }
    }
  };

  return (
    <div>
      {!isOnline && <OfflineBanner />}
      
      <MainContent />
      
      <RoleBasedNavigation 
        user={user}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

// ============================================================================
// Mock Components (for demonstration purposes)
// ============================================================================

function LoginScreen() {
  return <div>Login Screen</div>;
}

function LoadingScreen() {
  return <div>Loading...</div>;
}

function HomePage() {
  return <div>Home Page</div>;
}

function MarkListsPage() {
  return <div>Mark Lists Page</div>;
}

function AttendancePage() {
  return <div>Attendance Page</div>;
}

function ExamCreationPage() {
  return <div>Exam Creation Page</div>;
}

function ClassManagementPage() {
  return <div>Class Management Page</div>;
}

function SchedulePage() {
  return <div>Schedule Page</div>;
}

function StudentReportsPage() {
  return <div>Student Reports Page</div>;
}

function EvaluationBookPage() {
  return <div>Evaluation Book Page</div>;
}

function StudentRegistrationPage() {
  return <div>Student Registration Page</div>;
}

function FeeManagementPage() {
  return <div>Fee Management Page</div>;
}

function ReportsPage() {
  return <div>Reports Page</div>;
}

function CommunicationPage() {
  return <div>Communication Page</div>;
}

function AttendanceViewPage() {
  return <div>Attendance View Page</div>;
}

function StudentListPage() {
  return <div>Student List Page</div>;
}

function PaymentTrackingPage() {
  return <div>Payment Tracking Page</div>;
}

function ProfilePage() {
  return <div>Profile Page</div>;
}

function TeacherDashboard() {
  return <div>Teacher Dashboard</div>;
}

function AdministrativeDashboard() {
  return <div>Administrative Dashboard</div>;
}

function LoadingOverlay() {
  return <div>Loading Overlay</div>;
}

function SidebarNavigation({ user }) {
  return <div>Sidebar Navigation</div>;
}

function OfflineBanner() {
  return <div>Offline Banner</div>;
}

// Helper functions
function trackNavigation(itemId) {
  console.log('Track navigation:', itemId);
}

function showLoadingIndicator() {
  console.log('Show loading indicator');
}

async function loadRouteData(route) {
  return new Promise(resolve => setTimeout(resolve, 500));
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  BasicExample,
  CompleteAppExample,
  NavigationWithCallbackExample,
  CustomizedNavigationExample,
  RoleSpecificLayoutExample,
  NavigationWithLoadingExample,
  ResponsiveLayoutExample,
  OfflineAwareNavigationExample,
};
