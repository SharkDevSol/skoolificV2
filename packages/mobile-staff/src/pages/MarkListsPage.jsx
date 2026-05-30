/**
 * MarkListsPage Component
 * 
 * Page for teachers to enter and manage student marks.
 * This feature is only accessible to users with the Teacher role.
 * 
 * @module MarkListsPage
 */

import './MarkListsPage.css';

/**
 * MarkListsPage Component
 * 
 * Displays the mark lists interface for teachers to manage student grades.
 * 
 * @returns {JSX.Element} The mark lists page
 */
function MarkListsPage() {
  return (
    <div className="page mark-lists-page">
      <header className="page-header">
        <h1>📚 Mark Lists</h1>
        <p className="page-subtitle">Enter and manage student marks</p>
      </header>

      <div className="page-content">
        <div className="info-card">
          <h2>Mark Lists Management</h2>
          <p>
            This feature allows teachers to enter, view, and manage student marks
            for various assessments, tests, and exams.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">📝</span>
            <h3>Enter Marks</h3>
            <p>Record student marks for tests and assignments</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">📊</span>
            <h3>View Reports</h3>
            <p>Generate and view mark reports by class or student</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">✏️</span>
            <h3>Edit Marks</h3>
            <p>Update and correct previously entered marks</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">📈</span>
            <h3>Analytics</h3>
            <p>View class performance statistics and trends</p>
          </div>
        </div>

        <div className="action-section">
          <button className="btn-primary">
            Create New Mark List
          </button>
          <button className="btn-secondary">
            View Existing Mark Lists
          </button>
        </div>
      </div>
    </div>
  );
}

export default MarkListsPage;
