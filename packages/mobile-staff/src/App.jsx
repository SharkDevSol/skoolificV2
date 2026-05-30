import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import './App.css';

function App() {
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    setPlatform(Capacitor.getPlatform());
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Skoolific Staff</h1>
        <p>Mobile Application for Teachers & Staff</p>
        <div className="platform-badge">
          Platform: {platform}
        </div>
      </header>

      <main className="app-main">
        <div className="welcome-card">
          <h2>Welcome to Skoolific Staff App</h2>
          <p>This is the mobile application for school staff members.</p>
        </div>

        <div className="features-list">
          <div className="feature-item">
            <span className="feature-icon">📚</span>
            <div className="feature-content">
              <h3>Mark Lists</h3>
              <p>Enter and manage student marks</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <div className="feature-content">
              <h3>Attendance</h3>
              <p>Mark student attendance</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">📝</span>
            <div className="feature-content">
              <h3>Exams</h3>
              <p>Create and manage exams</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">👥</span>
            <div className="feature-content">
              <h3>Students</h3>
              <p>View student information</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <div className="feature-content">
              <h3>Reports</h3>
              <p>Generate and view reports</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">💬</span>
            <div className="feature-content">
              <h3>Communication</h3>
              <p>Message parents and students</p>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h3>Setup Status</h3>
          <ul>
            <li>✅ Capacitor initialized</li>
            <li>✅ React app configured</li>
            <li>🚧 Android platform pending</li>
            <li>🚧 Push notifications pending</li>
            <li>🚧 Secure storage pending</li>
          </ul>
        </div>
      </main>

      <footer className="app-footer">
        <p>Skoolific Staff v2.0.0</p>
      </footer>
    </div>
  );
}

export default App;
