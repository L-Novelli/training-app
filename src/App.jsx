import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Home } from './pages/Home'
import { ProgramEditor } from './pages/ProgramEditor'
import { AdminUsers } from './pages/AdminUsers'
import { AdminUserDetail } from './pages/AdminUserDetail'
import { UserDashboard } from './pages/UserDashboard'
import { ProgramView } from './pages/ProgramView'
import { Profile } from './pages/Profile'
import { Playlists } from './pages/Playlists'

function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
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
            path="/mis-programas"
            element={
              <ProtectedRoute>
                <Layout><UserDashboard /></Layout>
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

          <Route
            path="/playlists"
            element={
              <ProtectedRoute>
                <Layout><Playlists /></Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
