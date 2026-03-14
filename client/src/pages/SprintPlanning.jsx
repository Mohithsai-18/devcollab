import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

function SprintPlanning() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sprintForm, setSprintForm] = useState({
    name: '', start_date: '', end_date: '', capacity_points: 40
  });

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [projectRes, sprintsRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/sprints/project/${id}`),
        api.get(`/tasks/project/${id}`)
      ]);
      setProject(projectRes.data);
      setSprints(sprintsRes.data);
      setBacklogTasks(tasksRes.data.filter(t => !t.sprint_id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/sprints', { ...sprintForm, project_id: id });
      setShowModal(false);
      setSprintForm({ name: '', start_date: '', end_date: '', capacity_points: 40 });
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleAssignTask = async (taskId, sprintId) => {
    try {
      await api.put(`/tasks/${taskId}`, {
        sprint_id: sprintId,
        title: backlogTasks.find(t => t.id === taskId)?.title,
        description: backlogTasks.find(t => t.id === taskId)?.description,
        priority: backlogTasks.find(t => t.id === taskId)?.priority,
        status: backlogTasks.find(t => t.id === taskId)?.status,
        story_points: backlogTasks.find(t => t.id === taskId)?.story_points,
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromSprint = async (task) => {
    try {
      await api.put(`/tasks/${task.id}`, {
        sprint_id: null,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        story_points: task.story_points,
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      await api.put(`/sprints/${sprintId}`, {
        ...sprints.find(s => s.id === sprintId),
        status: 'active'
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      await api.patch(`/sprints/${sprintId}/complete`);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const getSprintTasks = (sprintId) =>
    backlogTasks.filter(t => t.sprint_id === sprintId);

  const getStatusColor = (status) => {
    const colors = {
      planning: 'secondary',
      active: 'success',
      completed: 'primary',
      archived: 'dark'
    };
    return colors[status] || 'secondary';
  };

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border text-primary" />
    </div>
  );

  // All tasks including sprint tasks
  const allTasks = [];
  sprints.forEach(s => {
    allTasks.push(...(s.tasks || []));
  });

  return (
    <div className="min-vh-100 bg-light">

      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate(`/project/${id}`)}
          >
            ← Back
          </button>
          <span className="navbar-brand fw-bold mb-0">
            Sprint Planning — {project?.name}
          </span>
        </div>
        <button
          className="btn btn-light btn-sm fw-semibold"
          onClick={() => setShowModal(true)}
        >
          + New Sprint
        </button>
      </nav>

      <div className="container-fluid px-4 mt-4">
        <div className="row">

          {/* Left — Backlog */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-secondary text-white d-flex justify-content-between">
                <span className="fw-bold">📋 Backlog</span>
                <span className="badge bg-white text-dark">{backlogTasks.filter(t => !t.sprint_id).length}</span>
              </div>
              <div className="card-body p-2" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {backlogTasks.filter(t => !t.sprint_id).length === 0 ? (
                  <p className="text-muted text-center mt-3 small">No unassigned tasks</p>
                ) : (
                  backlogTasks.filter(t => !t.sprint_id).map(task => (
                    <div key={task.id} className="card mb-2 border-0 bg-light">
                      <div className="card-body p-2">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <p className="mb-0 fw-semibold small">{task.title}</p>
                            <div className="d-flex gap-2 mt-1">
                              <span className={`badge bg-${task.priority === 'p1' ? 'danger' : task.priority === 'p2' ? 'warning' : 'info'}`}
                                style={{ fontSize: '10px' }}>
                                {task.priority === 'p1' ? 'Critical' : task.priority === 'p2' ? 'High' : task.priority === 'p3' ? 'Medium' : 'Low'}
                              </span>
                              <span className="badge bg-light text-dark border" style={{ fontSize: '10px' }}>
                                {task.story_points || 0} pts
                              </span>
                            </div>
                          </div>
                          {sprints.filter(s => s.status !== 'completed').length > 0 && (
                            <select
                              className="form-select form-select-sm ms-2"
                              style={{ width: '120px', fontSize: '11px' }}
                              defaultValue=""
                              onChange={e => {
                                if (e.target.value) handleAssignTask(task.id, e.target.value);
                              }}
                            >
                              <option value="">Add to...</option>
                              {sprints.filter(s => s.status !== 'completed').map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right — Sprints */}
          <div className="col-md-8">
            {sprints.length === 0 ? (
              <div className="text-center mt-5">
                <h5 className="text-muted">No sprints yet</h5>
                <p className="text-muted">Click "+ New Sprint" to create your first sprint</p>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  + New Sprint
                </button>
              </div>
            ) : (
              sprints.map(sprint => {
                const sprintTasks = backlogTasks.filter(t => t.sprint_id == sprint.id);
                const totalPoints = sprintTasks.reduce((s, t) => s + (t.story_points || 0), 0);
                const completedPoints = sprintTasks
                  .filter(t => t.status === 'done')
                  .reduce((s, t) => s + (t.story_points || 0), 0);
                const progress = totalPoints > 0
                  ? Math.round((completedPoints / totalPoints) * 100) : 0;

                return (
                  <div key={sprint.id} className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="fw-bold mb-0">
                          {sprint.name}
                          <span className={`badge bg-${getStatusColor(sprint.status)} ms-2`}>
                            {sprint.status}
                          </span>
                        </h6>
                        <small className="text-muted">
                          {sprint.start_date ? new Date(sprint.start_date).toLocaleDateString() : 'No start'} →{' '}
                          {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : 'No end'}
                          {' · '}{totalPoints}/{sprint.capacity_points || 0} pts
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        {sprint.status === 'planning' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleStartSprint(sprint.id)}
                          >
                            ▶ Start
                          </button>
                        )}
                        {sprint.status === 'active' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleCompleteSprint(sprint.id)}
                          >
                            ✓ Complete
                          </button>
                        )}
                        {sprint.status === 'completed' && (
                          <span className="text-success small fw-semibold">
                            Velocity: {sprint.velocity} pts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {sprint.status === 'active' && (
                      <div className="px-3 pt-2">
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Progress</small>
                          <small className="text-muted">{progress}%</small>
                        </div>
                        <div className="progress mb-2" style={{ height: '6px' }}>
                          <div
                            className="progress-bar bg-success"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="card-body p-2">
                      {sprintTasks.length === 0 ? (
                        <p className="text-muted text-center small py-2">
                          No tasks — assign from backlog
                        </p>
                      ) : (
                        <div className="row">
                          {sprintTasks.map(task => (
                            <div key={task.id} className="col-md-6 mb-2">
                              <div className="card border-0 bg-light">
                                <div className="card-body p-2">
                                  <div className="d-flex justify-content-between">
                                    <p className="mb-0 small fw-semibold">{task.title}</p>
                                    <button
                                      className="btn btn-outline-danger btn-sm py-0 px-1"
                                      style={{ fontSize: '10px' }}
                                      onClick={() => handleRemoveFromSprint(task)}
                                      title="Remove from sprint"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <div className="d-flex gap-1 mt-1">
                                    <span className="badge bg-light text-dark border" style={{ fontSize: '10px' }}>
                                      {task.story_points || 0} pts
                                    </span>
                                    <span className={`badge ${task.status === 'done' ? 'bg-success' : task.status === 'in_progress' ? 'bg-warning' : 'bg-secondary'}`}
                                      style={{ fontSize: '10px' }}>
                                      {task.status?.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create Sprint Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Create New Sprint</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleCreateSprint}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Sprint Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Sprint 1 - Auth Module"
                      value={sprintForm.name}
                      onChange={e => setSprintForm({ ...sprintForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={sprintForm.start_date}
                        onChange={e => setSprintForm({ ...sprintForm, start_date: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">End Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={sprintForm.end_date}
                        onChange={e => setSprintForm({ ...sprintForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Capacity Points
                      <small className="text-muted ms-2">
                        (how many story points your team can handle)
                      </small>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={sprintForm.capacity_points}
                      onChange={e => setSprintForm({ ...sprintForm, capacity_points: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Sprint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SprintPlanning;