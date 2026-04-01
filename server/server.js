const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment-specific configuration
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });

const session = require('express-session');
const passport = require('passport');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/sprints',       require('./routes/sprints'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/codereview',    require('./routes/codeReview'));
app.use('/api/comments',      require('./routes/comments'));
app.use('/api/attachments',   require('./routes/attachments'));
app.use('/api/github',        require('./routes/github'));
app.use('/api/handoff',       require('./routes/handoff'));
app.use('/api/activities',    require('./routes/activities'));
app.use('/uploads', express.static('uploads'));
app.use('/api/ai', require('./routes/ai'));


app.get('/', (req, res) => res.json({ message: 'DevCollab API is running!' }));

require('./socket/socketHandler')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));