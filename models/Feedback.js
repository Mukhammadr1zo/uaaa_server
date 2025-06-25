// server/models/Feedback.js
const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Anonymous'
  },
  email: {
    type: String,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  airport: {
    type: String,
    required: [true, 'Please specify an airport']
  },
  service: {
    type: String,
    required: [true, 'Please specify a service']
  },
  comment: {
    type: String,
    required: [true, 'Please add a comment'],
    trim: true
  },
  language: {
    type: String,
    enum: ['en', 'ru', 'uz', 'other'],
    default: 'en'
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    required: true
  },
  sentimentScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  keywords: {
    type: [String],
    default: []
  },
  isModerated: {
    type: Boolean,
    default: false
  },
  moderationNotes: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster querying
FeedbackSchema.index({ airport: 1, sentiment: 1 });
FeedbackSchema.index({ service: 1 });
FeedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);