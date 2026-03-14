const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// GET ATTACHMENTS FOR A TASK
const getAttachments = async (req, res) => {
  try {
    const [attachments] = await pool.query(
      `SELECT ta.*, u.name as uploaded_by_name
       FROM task_attachments ta
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ?
       ORDER BY ta.created_at DESC`,
      [req.params.taskId]
    );
    res.json(attachments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPLOAD ATTACHMENT
const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const { task_id } = req.body;
    const [result] = await pool.query(
      `INSERT INTO task_attachments (task_id, user_id, filename, original_name, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task_id, req.userId, req.file.filename,
       req.file.originalname, req.file.size, req.file.mimetype]
    );
    const [attachments] = await pool.query(
      `SELECT ta.*, u.name as uploaded_by_name
       FROM task_attachments ta
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE ta.id = ?`,
      [result.insertId]
    );
    res.status(201).json(attachments[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE ATTACHMENT
const deleteAttachment = async (req, res) => {
  try {
    const [attachments] = await pool.query(
      'SELECT * FROM task_attachments WHERE id = ?', [req.params.id]
    );
    if (attachments.length === 0) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    // Delete file from disk
    const filePath = path.join(__dirname, '../uploads', attachments[0].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM task_attachments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Attachment deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DOWNLOAD ATTACHMENT
const downloadAttachment = async (req, res) => {
  try {
    const [attachments] = await pool.query(
      'SELECT * FROM task_attachments WHERE id = ?', [req.params.id]
    );
    if (attachments.length === 0) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    const filePath = path.join(__dirname, '../uploads', attachments[0].filename);
    res.download(filePath, attachments[0].original_name);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAttachments, uploadAttachment, deleteAttachment, downloadAttachment };