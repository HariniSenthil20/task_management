import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Workspaces from './pages/Workspaces';
import WorkspaceDetails from './pages/WorkspaceDetails';
import KanbanBoard from './pages/KanbanBoard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
          <Route path="/workspaces" element={<ProtectedRoute><Layout><Workspaces /></Layout></ProtectedRoute>} />
          <Route path="/workspaces/:workspaceId" element={<ProtectedRoute><Layout><WorkspaceDetails /></Layout></ProtectedRoute>} />
          <Route path="/projects/:projectId" element={<ProtectedRoute><Layout><KanbanBoard /></Layout></ProtectedRoute>} />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;