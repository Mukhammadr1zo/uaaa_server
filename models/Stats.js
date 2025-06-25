// server/models/Stats.js
const mongoose = require('mongoose');

const StatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  totalFeedbacks: {
    type: Number,
    default: 0
  },
  sentiments: {
    positive: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    negative: { type: Number, default: 0 }
  },
  languages: {
    en: { type: Number, default: 0 },
    ru: { type: Number, default: 0 },
    uz: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  airports: {
    type: Map,
    of: Number,
    default: {}
  },
  services: {
    type: Map,
    of: Number,
    default: {}
  },
  hourlyDistribution: {
    type: Map,
    of: Number,
    default: {}
  }
});

module.exports = mongoose.model('Stats', StatsSchema);