// server/controllers/feedbackController.js
const Feedback = require('../models/Feedback');
const sentiment = require('../services/sentiment');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

// Socket.io reference
let io = null;

// Set socket.io reference
exports.setSocket = (socketIO) => {
  io = socketIO;
};

// @desc    Get all feedbacks
// @route   GET /api/feedback
// @access  Public/Admin
exports.getFeedbacks = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      airport, 
      service, 
      sentiment,
      startDate,
      endDate,
      language,
      sort = '-createdAt'
    } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters
    if (airport) query.airport = airport;
    if (service) query.service = service;
    if (sentiment) query.sentiment = sentiment;
    if (language) query.language = language;
    
    // Date filters
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }
    
    // Execute query with pagination
    const feedbacks = await Feedback.find(query)
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Feedback.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: feedbacks.length,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: feedbacks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single feedback
// @route   GET /api/feedback/:id
// @access  Public/Admin
exports.getFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create feedback
// @route   POST /api/feedback
// @access  Public
exports.createFeedback = async (req, res, next) => {
  try {
    const { name, email, airport, service, comment } = req.body;
    
    // Validate required fields
    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required'
      });
    }
    
    if (!airport) {
      return res.status(400).json({
        success: false,
        message: 'Airport is required'
      });
    }
    
    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Service is required'
      });
    }
    
    // Get client IP and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Analyze sentiment
    const { sentiment: sentimentResult, score, language, keywords } = 
      await sentiment.analyzeSentiment(comment, 'auto');
    
    // Create feedback
    const feedback = await Feedback.create({
      name: name || 'Anonymous',
      email,
      airport,
      service,
      comment,
      language,
      sentiment: sentimentResult,
      sentimentScore: score,
      keywords,
      ipAddress,
      userAgent
    });
    
    // Emit to socket.io if available
    if (io) {
      io.to('admin_room').emit('new_feedback', {
        id: feedback._id,
        name: feedback.name,
        airport: feedback.airport,
        service: feedback.service,
        comment: feedback.comment,
        sentiment: feedback.sentiment,
        language: feedback.language,
        createdAt: feedback.createdAt
      });
      
      logger.info(`Emitted feedback ${feedback._id} to admin_room`);
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: feedback._id,
        sentiment: feedback.sentiment,
        sentimentScore: feedback.sentimentScore,
        language: feedback.language
      }
    });
  } catch (error) {
    logger.error('Error creating feedback', error);
    next(error);
  }
};

// @desc    Update feedback (for moderation)
// @route   PUT /api/feedback/:id
// @access  Admin
exports.updateFeedback = async (req, res, next) => {
  try {
    const { isModerated, moderationNotes } = req.body;
    
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }
    
    // Update fields
    if (isModerated !== undefined) feedback.isModerated = isModerated;
    if (moderationNotes) feedback.moderationNotes = moderationNotes;
    
    await feedback.save();
    
    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Admin
exports.deleteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }
    
    await feedback.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback stats
// @route   GET /api/feedback/stats
// @access  Admin
exports.getFeedbackStats = async (req, res, next) => {
  try {
    // Get overall stats
    const totalCount = await Feedback.countDocuments();
    
    // Get sentiment counts
    const sentimentCounts = await Feedback.aggregate([
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get airport stats
    const airportStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$airport',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get service stats
    const serviceStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get language stats
    const languageStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Format sentiment stats
    const sentimentStats = {
      positive: 0,
      negative: 0,
      neutral: 0
    };
    
    sentimentCounts.forEach(item => {
      sentimentStats[item._id] = item.count;
    });
    
    res.status(200).json({
      success: true,
      data: {
        total: totalCount,
        sentiment: sentimentStats,
        airports: airportStats,
        services: serviceStats,
        languages: languageStats
      }
    });
  } catch (error) {
    next(error);
  }
};