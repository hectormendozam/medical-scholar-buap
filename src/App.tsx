/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CaseDetail } from './pages/CaseDetail';
import { ReviewPanel } from './pages/ReviewPanel';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cases" element={<Dashboard />} /> {/* For demo simplicity */}
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/settings" element={<ReviewPanel />} /> {/* Mapping settings to review panel for demo as per screenshot list */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

