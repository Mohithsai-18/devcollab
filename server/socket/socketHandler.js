module.exports = (io) => {

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins a project room
    socket.on('join_project', (projectId) => {
      socket.join(`project_${projectId}`);
      console.log(`Socket ${socket.id} joined project_${projectId}`);
    });

    // User leaves a project room
    socket.on('leave_project', (projectId) => {
      socket.leave(`project_${projectId}`);
      console.log(`Socket ${socket.id} left project_${projectId}`);
    });

    // Task status changed (Kanban drag and drop)
    socket.on('task_status_changed', (data) => {
      // data = { projectId, taskId, newStatus, updatedBy }
      socket.to(`project_${data.projectId}`).emit('task_updated', {
        taskId: data.taskId,
        newStatus: data.newStatus,
        updatedBy: data.updatedBy
      });
    });

    // New task created
    socket.on('task_created', (data) => {
      // data = { projectId, task }
      socket.to(`project_${data.projectId}`).emit('new_task', data.task);
    });

    // Task assigned to someone
    socket.on('task_assigned', (data) => {
      // data = { projectId, taskId, assignedTo, assignedBy }
      socket.to(`project_${data.projectId}`).emit('task_assignment', {
        taskId: data.taskId,
        assignedTo: data.assignedTo,
        assignedBy: data.assignedBy
      });
    });

    // New comment on code review
    socket.on('new_code_comment', (data) => {
      // data = { projectId, snippetId, comment }
      socket.to(`project_${data.projectId}`).emit('code_comment_added', {
        snippetId: data.snippetId,
        comment: data.comment
      });
    });

    // Sprint started
    socket.on('sprint_started', (data) => {
      // data = { projectId, sprint }
      socket.to(`project_${data.projectId}`).emit('sprint_update', {
        type: 'started',
        sprint: data.sprint
      });
    });

    // Sprint completed
    socket.on('sprint_completed', (data) => {
      // data = { projectId, sprint, velocity }
      socket.to(`project_${data.projectId}`).emit('sprint_update', {
        type: 'completed',
        sprint: data.sprint,
        velocity: data.velocity
      });
    });

    // User is typing a comment
    socket.on('typing', (data) => {
      // data = { projectId, userName }
      socket.to(`project_${data.projectId}`).emit('user_typing', {
        userName: data.userName
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

};