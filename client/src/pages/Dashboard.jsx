import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark bg-primary px-4">
        <span className="navbar-brand fw-bold fs-4">DevCollab</span>
        <div className="d-flex align-items-center gap-3">
          <span className="text-white">
            Welcome, {user?.name}
          </span>
          <span className="badge bg-light text-primary">
            {user?.role}
          </span>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container mt-5">
        <div className="row">
          <div className="col-12">
            <h3 className="fw-bold">Dashboard</h3>
            <p className="text-muted">Your projects will appear here.</p>
          </div>
        </div>

        <div className="row mt-4">
          <div className="col-md-3">
            <div className="card text-center p-3 border-primary">
              <h2 className="text-primary fw-bold">0</h2>
              <p className="mb-0 text-muted">Projects</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-success">
              <h2 className="text-success fw-bold">0</h2>
              <p className="mb-0 text-muted">Tasks</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-warning">
              <h2 className="text-warning fw-bold">0</h2>
              <p className="mb-0 text-muted">In Progress</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-info">
              <h2 className="text-info fw-bold">0</h2>
              <p className="mb-0 text-muted">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
