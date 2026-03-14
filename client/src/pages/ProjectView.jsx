import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import CodeReview from '../components/CodeReview/CodeReview';
import NotificationBell from '../components/Notifications/NotificationBell';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: '#6c757d' },
  { id: 'todo', label: 'To Do', color: '#0d6efd' },
  { id: 'in_progress', label: 'In Progress', color: '#fd7e14' },
  { id: 'in_review', label: 'In Review', color: '#6f42c1' },
  { id: 'done', label: 'Done', color: '#198754' },
];

const PRIORITY_COLORS = {
  p1: 'danger', p2: 'warning', p3: 'info', p4: 'secondary'
};
const PRIORITY_LABELS = {
  p1: 'Critical', p2: 'High', p3: 'Medium', p4: 'Low'
};

function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState('backlog');
  const [activeTab, setActiveTab] = useState('kanban');
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'p3', story_points: 0
  });
  const [creating, setCreating] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [id]);

  useEffect(() => {
    if (socket) {
      socket.emit('join_project', id);
      socket.on('task_updated', (data) => {
        setTasks(prev => prev.map(t =>
          t.id === data.taskId ? { ...t, status: data.newStatus } : t
        ));
      });
      socket.on('new_task', (task) => {
        setTasks(prev => [...prev, task]);
      });
      return () => {
        socket.emit('leave_project', id);
        socket.off('task_updated');
        socket.off('new_task');
      };
    }
  }, [socket, id]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/tasks/project/${id}`);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/tasks', {
        ...taskForm,
        project_id: id,
        status: activeColumn
      });
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'p3', story_points: 0 });
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDragStart = (task) => setDraggedTask(task);

  const handleDrop = async (newStatus) => {
    if (!draggedTask || draggedTask.status === newStatus) return;
    try {
      await api.patch(`/tasks/${draggedTask.id}/status`, { status: newStatus });
      setTasks(prev => prev.map(t =>
        t.id === draggedTask.id ? { ...t, status: newStatus } : t
      ));
      if (socket) {
        socket.emit('task_status_changed', {
          projectId: id,
          taskId: draggedTask.id,
          newStatus
        });
      }
    } catch (err) {
      console.error(err);
    }
    setDraggedTask(null);
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const matchSearch = searchText === '' ||
        task.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchText.toLowerCase()));
      const matchPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchAssignee = filterAssignee === 'all' ||
        (filterAssignee === 'unassigned' ? !task.assigned_to : task.assigned_to_name === filterAssignee);
      return matchSearch && matchPriority && matchStatus && matchAssignee;
    });
  };

  const getTasksByStatus = (status) =>
    getFilteredTasks().filter(t => t.status === status);

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border text-primary" />
    </div>
  );

  return (
    <div className="min-vh-100 bg-light">

      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-light btn-sm" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <span className="navbar-brand fw-bold mb-0">{project?.name}</span>
          <span className={`badge ${project?.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
            {project?.status}
          </span>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <NotificationBell />
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate(`/members/${id}`)}
          >
            👥 Members
          </button>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate(`/sprints/${id}`)}
          >
            🏃 Sprints
          </button>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate(`/analytics/${id}`)}
          >
            📊 Analytics
          </button>
          <button
            className="btn btn-light btn-sm fw-semibold"
            onClick={() => setShowTaskModal(true)}
          >
            + Add Task
          </button>
        </div>
      </nav>

      {/* Project Info */}
      <div className="container-fluid px-4 mt-3">
        <div className="row mb-3">
          <div className="col">
            <p className="text-muted mb-1">{project?.description}</p>
            <div className="d-flex gap-3 text-muted small">
              <span>👥 {project?.members?.length} members</span>
              <span>📋 {tasks.length} tasks</span>
              <span>✅ {tasks.filter(t => t.status === 'done').length} done</span>
              {project?.deadline && (
                <span>📅 Due: {new Date(project.deadline).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        {activeTab === 'kanban' && (
          <div className="card border-0 shadow-sm mb-3 p-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">🔍</span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search tasks..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                  {searchText && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setSearchText('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="p1">🔴 Critical</option>
                  <option value="p2">🟡 High</option>
                  <option value="p3">🔵 Medium</option>
                  <option value="p4">⚪ Low</option>
                </select>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={filterAssignee}
                  onChange={e => setFilterAssignee(e.target.value)}
                >
                  <option value="all">All Members</option>
                  <option value="unassigned">Unassigned</option>
                  {project?.members?.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchText('');
                    setFilterPriority('all');
                    setFilterStatus('all');
                    setFilterAssignee('all');
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
            {(searchText || filterPriority !== 'all' || filterStatus !== 'all' || filterAssignee !== 'all') && (
              <div className="mt-2">
                <small className="text-muted">
                  Showing <strong>{getFilteredTasks().length}</strong> of <strong>{tasks.length}</strong> tasks
                  {searchText && <span className="badge bg-primary ms-1">"{searchText}"</span>}
                  {filterPriority !== 'all' && <span className="badge bg-warning text-dark ms-1">{filterPriority}</span>}
                  {filterStatus !== 'all' && <span className="badge bg-info ms-1">{filterStatus}</span>}
                  {filterAssignee !== 'all' && <span className="badge bg-success ms-1">{filterAssignee}</span>}
                </small>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'kanban' ? 'active' : ''}`}
              onClick={() => setActiveTab('kanban')}
            >
              📋 Kanban Board
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'codereview' ? 'active' : ''}`}
              onClick={() => setActiveTab('codereview')}
            >
              🔍 Code Review
            </button>
          </li>
        </ul>

        {/* Code Review Tab */}
        {activeTab === 'codereview' && (
          <CodeReview
            taskId={tasks[0]?.id || null}
            socket={socket}
            projectId={id}
            projectTasks={tasks}
          />
        )}

        {/* Kanban Board Tab */}
        {activeTab === 'kanban' && (
          <div className="d-flex gap-3 overflow-auto pb-4" style={{ minHeight: '70vh' }}>
            {COLUMNS.map(col => (
              <div
                key={col.id}
                className="flex-shrink-0"
                style={{ width: '280px' }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
              
              >
              
                <div
                  className="rounded-top p-2 d-flex justify-content-between align-items-center"
                  style={{ backgroundColor: col.color }}
                >
                  <span className="text-white fw-semibold">{col.label}</span>
                  <span className="badge bg-white text-dark">
                    {getTasksByStatus(col.id).length}
                  </span>
                </div>
            
                <div
            
                  className="bg-white rounded-bottom p-2 border border-top-0"
                  style={{ minHeight: '400px' }}
                >
                  {getTasksByStatus(col.id).map(task => (
                    <div
                      key={task.id}
                      className="card mb-2 shadow-sm border-0"
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      style={{ cursor: 'grab' }}
                    >
                      <div className="card-body p-2">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <p className="mb-0 fw-semibold small">{task.title}</p>
                          <span className={`badge bg-${PRIORITY_COLORS[task.priority]} ms-1`}
                            style={{ fontSize: '10px' }}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-muted mb-1" style={{ fontSize: '11px' }}>
                            {task.description.substring(0, 60)}
                            {task.description.length > 60 ? '...' : ''}
                          </p>
                        )}
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {task.assigned_to_name ? `👤 ${task.assigned_to_name}` : '👤 Unassigned'}
                          </span>
                          {task.story_points > 0 && (
                            <span className="badge bg-light text-dark border"
                              style={{ fontSize: '10px' }}>
                              {task.story_points} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                 
                  <button
                    className="btn btn-light btn-sm w-100 text-muted mt-1"
                    onClick={() => { setActiveColumn(col.id); setShowTaskModal(true); }}
                    style={{ border: '1px dashed #ccc' }}
                  >
                    + Add task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Add Task to {
                  COLUMNS.find(c => c.id === activeColumn)?.label
                }</h5>
                <button className="btn-close" onClick={() => setShowTaskModal(false)} />
              </div>
              <form onSubmit={handleCreateTask}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Task Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Implement login API"
                      value={taskForm.title}
                      onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="What needs to be done?"
                      value={taskForm.description}
                      onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Priority</label>
                      <select
                        className="form-select"
                        value={taskForm.priority}
                        onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                      >
                        <option value="p1">Critical</option>
                        <option value="p2">High</option>
                        <option value="p3">Medium</option>
                        <option value="p4">Low</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Story Points</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="100"
                        value={taskForm.story_points}
                        onChange={e => setTaskForm({ ...taskForm, story_points: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setShowTaskModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? 'Adding...' : 'Add Task'}
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

export default ProjectView;
