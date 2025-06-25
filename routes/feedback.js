// server/routes/feedback.js
const express = require('express');
const {
  getFeedbacks,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/', createFeedback);

// Admin routes
router.get('/', getFeedbacks);
router.get('/stats', protect, authorize('admin', 'super-admin'), getFeedbackStats);
router.get('/:id', getFeedback);
router.put('/:id', protect, authorize('admin', 'super-admin'), updateFeedback);
router.delete('/:id', protect, authorize('admin', 'super-admin'), deleteFeedback);

module.exports = router;