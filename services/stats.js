// server/services/stats.js
const Feedback = require('../models/Feedback');
const Stats = require('../models/Stats');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

// Update daily stats when a new feedback is added
exports.updateStats = async (feedback) => {
  try {
    const today = helpers.getTodayDate();
    
    // Find or create stats for today
    let stats = await Stats.findOne({ date: today });
    
    if (!stats) {
      stats = new Stats({
        date: today,
        totalFeedbacks: 0,
        sentiments: { positive: 0, neutral: 0, negative: 0 },
        languages: { en: 0, ru: 0, uz: 0, other: 0 },
        airports: {},
        services: {},
        hourlyDistribution: {}
      });
    }
    
    // Update totals
    stats.totalFeedbacks += 1;
    
    // Update sentiment counts
    stats.sentiments[feedback.sentiment] += 1;
    
    // Update language counts
    const lang = ['en', 'ru', 'uz'].includes(feedback.language) ? 
      feedback.language : 'other';
    stats.languages[lang] += 1;
    
    // Update airport stats
    if (feedback.airport) {
      const airportCount = stats.airports.get(feedback.airport) || 0;
      stats.airports.set(feedback.airport, airportCount + 1);
    }
    
    // Update service stats
    if (feedback.service) {
      const serviceCount = stats.services.get(feedback.service) || 0;
      stats.services.set(feedback.service, serviceCount + 1);
    }
    
    // Update hourly distribution
    const hour = new Date(feedback.createdAt).getHours();
    const hourString = hour.toString();
    const hourCount = stats.hourlyDistribution.get(hourString) || 0;
    stats.hourlyDistribution.set(hourString, hourCount + 1);
    
    // Save updated stats
    await stats.save();
    
    logger.info(`Stats updated for ${helpers.formatDate(today)}`);
    return stats;
  } catch (error) {
    logger.error('Error updating stats:', error);
    throw error;
  }
};

// Get dashboard stats
exports.getDashboardStats = async (dateRange = 30) => {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    
    // Get stats for the date range
    const stats = await Stats.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Calculate totals
    let totalFeedbacks = 0;
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    const languages = { en: 0, ru: 0, uz: 0, other: 0 };
    const airports = {};
    const services = {};
    const dailyStats = [];
    
    // Process each day's stats
    stats.forEach(dayStat => {
      // Add to totals
      totalFeedbacks += dayStat.totalFeedbacks;
      
      // Add to sentiments
      sentiments.positive += dayStat.sentiments.positive;
      sentiments.neutral += dayStat.sentiments.neutral;
      sentiments.negative += dayStat.sentiments.negative;
      
      // Add to languages
      languages.en += dayStat.languages.en;
      languages.ru += dayStat.languages.ru;
      languages.uz += dayStat.languages.uz;
      languages.other += dayStat.languages.other;
      
      // Add to airports
      dayStat.airports.forEach((value, key) => {
        airports[key] = (airports[key] || 0) + value;
      });
      
      // Add to services
      dayStat.services.forEach((value, key) => {
        services[key] = (services[key] || 0) + value;
      });
      
      // Add to daily stats
      dailyStats.push({
        date: helpers.formatDate(dayStat.date),
        totalFeedbacks: dayStat.totalFeedbacks,
        positive: dayStat.sentiments.positive,
        neutral: dayStat.sentiments.neutral,
        negative: dayStat.sentiments.negative
      });
    });
    
    // Convert maps to arrays for easier frontend handling
    const airportData = Object.entries(airports).map(([name, count]) => ({
      name,
      count
    }));
    
    const serviceData = Object.entries(services).map(([name, count]) => ({
      name,
      count
    }));
    
    return {
      totalFeedbacks,
      sentiments,
      languages,
      airports: airportData,
      services: serviceData,
      dailyStats
    };
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    throw error;
  }
};