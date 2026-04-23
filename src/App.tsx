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
import ClinicalCases from './pages/ClinicalCases';
import Files from './pages/Files';
import NewCase from './pages/NewCase';
import Profile from './pages/Profile';
import Notificaciones from './pages/Notificaciones';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* Casos Clínicos */}
          <Route path="casos" element={<ClinicalCases />} />
          <Route path="casos/nuevo" element={<NewCase />} />
          <Route path="casos/:id" element={<CaseDetail />} />

          {/* Expedientes / Archivos de apoyo */}
          <Route path="expedientes" element={<Files />} />

          {/* Panel de revisión para instructores */}
          <Route path="revisiones" element={<ReviewPanel />} />
          <Route path="revisiones/:id" element={<ReviewPanel />} />

          {/* Notificaciones */}
          <Route path="notificaciones" element={<Notificaciones />} />

          {/* Perfil / Configuración */}
          <Route path="configuracion" element={<Profile />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
