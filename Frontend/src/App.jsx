// src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'

// Pages
import Home from './pages/Home'
import Demo from './pages/Demo'
import SimplePage from './pages/SimplePage'
import AdminDashboard from './pages/AdminDashboard'
import UniversityDashboard from './pages/UniversityDashboard'

// Layouts
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'
import CertificateUpload from './components/certificateUpload'

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route
        path="/"
        element={<MainLayout><Home /></MainLayout>}
      />
      <Route
        path="/demo"
        element={<MainLayout><Demo /></MainLayout>}
      />
      <Route
        path="/features"
        element={<MainLayout><SimplePage title="Features" /></MainLayout>}
      />
      <Route
        path="/tech-specs"
        element={<MainLayout><SimplePage title="Technical Specifications" /></MainLayout>}
      />
      <Route
        path="/api"
        element={<MainLayout><SimplePage title="API Documentation" /></MainLayout>}
      />
      <Route
        path="/about"
        element={<MainLayout><SimplePage title="About" /></MainLayout>}
      />
      <Route
        path="/verify"
        element={<MainLayout><CertificateUpload/></MainLayout>} // <-- CertificateUpload page
      />
      <Route
        path="/contact"
        element={<MainLayout><SimplePage title="Contact & Request Pilot" /></MainLayout>}
      />

      {/* Dashboard Pages */}
      <Route
        path="/admin"
        element={<DashboardLayout><AdminDashboard /></DashboardLayout>}
      />
      <Route
        path="/university"
        element={<DashboardLayout><UniversityDashboard /></DashboardLayout>}
      />

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
  )
}
