import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { AdminPrograms } from './pages/AdminPrograms'
import { ProgramEditor } from './pages/ProgramEditor'
import { AdminUsers } from './pages/AdminUsers'
import { AdminUserDetail } from './pages/AdminUserDetail'
import { UserDashboard } from './pages/UserDashboard'
import { ProgramView } from './pages/ProgramView'
import { Profile } from './pages/Profile'

function Home() {
  const { isAdmin } = useAuth()
  return isAdmin ? <AdminPrograms /> : <UserDashboard />
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      {children}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout><Home /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/programs/:id"
            element={
              <ProtectedRoute adminOnly>
                <Layout><ProgramEditor /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <Layout><AdminUsers /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute adminOnly>
                <Layout><AdminUserDetail /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/program/:id"
            element={
              <ProtectedRoute>
                <Layout><ProgramView /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Layout><Profile /></Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
