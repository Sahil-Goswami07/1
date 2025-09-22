import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Demo from './pages/Demo'
import AdminDashboard from './pages/AdminDashboard'
import UniversityDashboard from './pages/UniversityDashboard'
import Upload from './pages/Upload'
import Result from './pages/Result'
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
        path="/upload"
        element={<MainLayout><Upload /></MainLayout>}
      />
      <Route
        path="/result/:id"
        element={<MainLayout><Result /></MainLayout>}
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
        element={<MainLayout><div className="max-w-4xl mx-auto px-4 py-10"><h1 className="text-2xl font-bold text-slate-900">Not Found</h1><p className="mt-2 text-slate-700">The page you’re looking for doesn’t exist.</p></div></MainLayout>}
      />
    </Routes>
  )
}
