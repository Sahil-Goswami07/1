// src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'

// Pages
import Home from './pages/Home'
// Removed marketing pages (Demo, About, etc.)
import SimplePage from './pages/SimplePage'
import AdminDashboard from './pages/AdminDashboard'
import UniversityDashboard from './pages/UniversityDashboard'

// Layouts
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'
import CertificateUpload from './components/certificateUpload'
import UniversityApply from './pages/UniversityApply.jsx'

export default function App() {
  return (
    <AuthProvider>
    <Routes>
      {/* Public Pages */}
      <Route
        path="/"
        element={<MainLayout><Home /></MainLayout>}
      />
      <Route
        path="/verify"
        element={<MainLayout><CertificateUpload/></MainLayout>} // <-- CertificateUpload page
      />
      {/* Simplified: removed Contact/Roadmap/etc. */}

      {/* Dashboard Pages */}
  <Route path="/login/admin" element={<MainLayout><Login targetRole="superAdmin" /></MainLayout>} />
  <Route path="/login/university" element={<MainLayout><Login targetRole="universityAdmin" /></MainLayout>} />
  <Route path="/university/apply" element={<MainLayout><UniversityApply /></MainLayout>} />
      <Route path="/admin" element={<ProtectedRoute roles={['superAdmin']}><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/university" element={<ProtectedRoute roles={['universityAdmin','superAdmin']}><DashboardLayout><UniversityDashboard /></DashboardLayout></ProtectedRoute>} />

      {/* Fallback for unmatched routes */}
      <Route
        path="*"
        element={
          <MainLayout>
            <SimplePage title="Not Found">
              The page you’re looking for doesn’t exist.
            </SimplePage>
          </MainLayout>
        }
      />
    </Routes>
    </AuthProvider>
  )
}
