import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import Analytics from './pages/Analytics';
import SprintPlanning from './pages/SprintPlanning';
import Members from './pages/Members';
import Profile from './pages/Profile';
import GitHub from './pages/GitHub';
import GitHubCallback from './pages/GitHubCallback';
import ImportFromGitHub from './pages/ImportFromGitHub';
import HandoffPage from './pages/HandoffPage';
import AIChatPage       from './pages/AIChatPage';
import PRQualityPage    from './pages/PRQualityPage';
import ImpactAnalyserPage from './pages/ImpactAnalyserPage';
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border" /></div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/github/success" element={<GitHubCallback />} />
        <Route path="/ai-chat/:id"   element={<ProtectedRoute><AIChatPage /></ProtectedRoute>} />
<Route path="/pr-review/:id" element={<ProtectedRoute><PRQualityPage /></ProtectedRoute>} />
<Route path="/impact/:id"    element={<ProtectedRoute><ImpactAnalyserPage /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/project/:id" element={
          <ProtectedRoute><ProjectView /></ProtectedRoute>
        } />
        <Route path="/github/:id" element={
          <ProtectedRoute><GitHub /></ProtectedRoute>
        } />
        <Route path="/handoff/:id" element={
          <ProtectedRoute><HandoffPage /></ProtectedRoute>
        } />
        <Route path="/analytics/:id" element={
          <ProtectedRoute><Analytics /></ProtectedRoute>
        } />
        <Route path="/sprints/:id" element={
          <ProtectedRoute><SprintPlanning /></ProtectedRoute>
        } />
        <Route path="/members/:id" element={
          <ProtectedRoute><Members /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/import/github" element={
          <ProtectedRoute><ImportFromGitHub /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;