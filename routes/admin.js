// server/routes/admin.js
const express = require('express');
const { getFeedbackStats } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorize('admin', 'super-admin'));

// Admin routes
router.get('/dashboard/stats', getFeedbackStats);

module.exports = router;