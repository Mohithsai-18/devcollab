import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import Analytics from './pages/Analytics';
import SprintPlanning from './pages/SprintPlanning';
import Members from './pages/Members';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border" /></div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/project/:id" element={
          <ProtectedRoute><ProjectView /></ProtectedRoute>
        } />
        <Route path="/analytics/:id" element={
          <ProtectedRoute><Analytics /></ProtectedRoute>
        } />
        <Route path="/sprints/:id" element={
          <ProtectedRoute><SprintPlanning /></ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/members/:id" element={
  <ProtectedRoute><Members /></ProtectedRoute>
} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;