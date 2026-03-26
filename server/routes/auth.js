const express = require('express');
const router = express.Router();
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/api/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    const name = profile.displayName || profile.username;
    const avatar_url = profile.photos?.[0]?.value;

    // Check if user exists
    let [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      // Create new user
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?)',
        [name, email, 'github_oauth', 'developer', avatar_url]
      );
      const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return done(null, newUsers[0]);
    }

    return done(null, users[0]);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  done(null, users[0]);
});

// Normal auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);

// GitHub OAuth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: 'http://localhost:3000/login' }),
  async (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '365d' });
      // Redirect to frontend with token
      res.redirect(`http://localhost:3000/auth/github/success?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${user.role}&id=${user.id}`);
    } catch (err) {
      res.redirect('http://localhost:3000/login');
    }
  }
);

module.exports = router;