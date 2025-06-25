// server/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/error');
const { initializeAdmin } = require('./controllers/authController');
const feedbackController = require('./controllers/feedbackController');

// Environment variables
dotenv.config();

// Route imports
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const adminRoutes = require('./routes/admin');

// Initialize app
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://uzairports-ai.netlify.app/" // (Agar kerak bo‘lsa)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"]
  }
});

// Pass socket.io to feedback controller
feedbackController.setSocket(io);

// Middleware
app.use(cors({
  origin: [
      "http://localhost:3000",
      "https://uzairports-ai.netlify.app/" // (Agar kerak bo‘lsa)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"]
}));

app.options('*', cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO events
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    logger.info(`Socket ${socket.id} joined admin room`);
  });
  
  socket.on('feedback_submitted', (data) => {
    // This will be handled when feedback is saved in the database
    logger.info(`Feedback submitted notification received for ID: ${data.id}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('MongoDB connected');
    
    // Initialize admin user
    initializeAdmin();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} with Socket.IO support`);
    });
  })
  .catch(err => {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});