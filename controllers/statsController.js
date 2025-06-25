// server/controllers/statsController.js
const { getDashboardStats } = require('../services/stats');
const Feedback = require('../models/Feedback');
const logger = require('../utils/logger');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats/dashboard
// @access  Private (Admin)
exports.getDashboard = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    
    // Get dashboard stats
    const stats = await getDashboardStats(parseInt(days, 10));
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    next(error);
  }
};

// @desc    Get airport comparison stats
// @route   GET /api/admin/stats/airports
// @access  Private (Admin)
exports.getAirportComparison = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        dateFilter.createdAt.$lte = end;
      }
    }
    
    // Aggregate by airport
    const airportStats = await Feedback.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$airport',
          count: { $sum: 1 },
          positive: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] }
          },
          neutral: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] }
          },
          negative: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] }
          },
          averageScore: { $avg: '$sentimentScore' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      count: airportStats.length,
      data: airportStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get service analysis stats
// @route   GET /api/admin/stats/services
// @access  Private (Admin)
exports.getServiceAnalysis = async (req, res, next) => {
  try {
    const { airport, startDate, endDate } = req.query;
    
    // Build filter
    const filter = {};
    if (airport) filter.airport = airport;
    
    // Add date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lte = end;
      }
    }
    
    // Aggregate by service
    const serviceStats = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 },
          positive: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] }
          },
          neutral: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] }
          },
          negative: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] }
          },
          averageScore: { $avg: '$sentimentScore' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      count: serviceStats.length,
      data: serviceStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get keyword analysis
// @route   GET /api/admin/stats/keywords
// @access  Private (Admin)
exports.getKeywordAnalysis = async (req, res, next) => {
  try {
    const { airport, service, sentiment, startDate, endDate } = req.query;
    
    // Build filter
    const filter = {};
    if (airport) filter.airport = airport;
    if (service) filter.service = service;
    if (sentiment) filter.sentiment = sentiment;
    
    // Add date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lte = end;
      }
    }
    
    // Get keywords from matching feedbacks
    const feedbacks = await Feedback.find(filter);
    
    // Count keyword frequency
    const keywordCounts = {};
    
    feedbacks.forEach(feedback => {
      (feedback.keywords || []).forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });
    
    // Convert to array and sort
    const keywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count);
    
    res.status(200).json({
      success: true,
      count: keywords.length,
      data: keywords
    });
  } catch (error) {
    next(error);
  }
};