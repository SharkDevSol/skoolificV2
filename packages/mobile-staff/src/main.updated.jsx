/**
 * Main Entry Point for Skoolific Staff Mobile App
 * 
 * This is an updated version that includes BrowserRouter for React Router.
 * 
 * To use this version:
 * 1. Rename this file to main.jsx (backup the original first)
 * 2. Ensure App.updated.jsx is renamed to App.jsx
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
