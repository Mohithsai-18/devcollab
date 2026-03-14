const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '1Y' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '1Y '}
  );
  return { accessToken, refreshToken };
};

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role || 'developer']
    );

    const { accessToken, refreshToken } = generateTokens(result.insertId);

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: result.insertId,
        name,
        email,
        role: role || 'developer'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?', [email]
    );
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET CURRENT USER
const getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?', [req.userId]
    );
    const user = users[0];

    // If changing password
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      const newHash = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'UPDATE users SET name=?, password_hash=? WHERE id=?',
        [name, newHash, req.userId]
      );
    } else {
      await pool.query(
        'UPDATE users SET name=? WHERE id=?',
        [name, req.userId]
      );
    }

    const [updated] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id=?',
      [req.userId]
    );
    res.json({ message: 'Profile updated', user: updated[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile };