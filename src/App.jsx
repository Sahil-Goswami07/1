import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Demo from './pages/Demo'
import SimplePage from './pages/SimplePage'
import AdminDashboard from './pages/AdminDashboard'
import UniversityDashboard from './pages/UniversityDashboard'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'

export default function App() {
  return (
    <Routes>
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
      {/* <Route
        path="/api"
        element={<MainLayout><SimplePage title="API Documentation" /></MainLayout>}
      /> */}
      <Route
        path="/about"
        element={<MainLayout><SimplePage title="About" /></MainLayout>}
      />
      {/* <Route
        path="/roadmap"
        element={<MainLayout><SimplePage title="Roadmap" /></MainLayout>}
      /> */}
      <Route
        path="/contact"
        element={<MainLayout><SimplePage title="Contact & Request Pilot" /></MainLayout>}
      />
      <Route
        path="/admin"
        element={<DashboardLayout><AdminDashboard /></DashboardLayout>}
      />
      <Route
        path="/university"
        element={<DashboardLayout><UniversityDashboard /></DashboardLayout>}
      />
      <Route
        path="*"
        element={<MainLayout><SimplePage title="Not Found">The page you’re looking for doesn’t exist.</SimplePage></MainLayout>}
      />
    </Routes>
  )
}
