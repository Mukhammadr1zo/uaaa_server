// server/services/nlp/analyzer.js
const { NlpManager } = require('node-nlp');
const natural = require('natural');
const { WordTokenizer } = natural;
const tokenizer = new WordTokenizer();
const helpers = require('../../utils/helpers');
const logger = require('../../utils/logger');

// Initialize NLP manager
const manager = new NlpManager({
  languages: ['en', 'ru', 'uz'],
  forceNER: true,
  modelFileName: './models/nlp-model.json',
});

// Load models asynchronously
let modelsLoaded = false;
const loadModels = async () => {
  try {
    // Try to load existing model
    await manager.load('./models/nlp-model.json');
    modelsLoaded = true;
    logger.info('NLP models loaded successfully');
  } catch (error) {
    logger.warn('Could not load NLP models, training new ones...');
    
    // Train basic models (in production, you'd have a much more comprehensive training set)
    // English
    manager.addDocument('en', 'great service', 'sentiment.positive');
    manager.addDocument('en', 'excellent airport', 'sentiment.positive');
    manager.addDocument('en', 'helpful staff', 'sentiment.positive');
    manager.addDocument('en', 'clean facilities', 'sentiment.positive');
    manager.addDocument('en', 'efficient check-in', 'sentiment.positive');
    
    manager.addDocument('en', 'average experience', 'sentiment.neutral');
    manager.addDocument('en', 'not bad but not great', 'sentiment.neutral');
    manager.addDocument('en', 'okay service', 'sentiment.neutral');
    manager.addDocument('en', 'could be better', 'sentiment.neutral');
    
    manager.addDocument('en', 'terrible experience', 'sentiment.negative');
    manager.addDocument('en', 'rude staff', 'sentiment.negative');
    manager.addDocument('en', 'dirty facilities', 'sentiment.negative');
    manager.addDocument('en', 'long wait times', 'sentiment.negative');
    manager.addDocument('en', 'poor service', 'sentiment.negative');
    
    // Russian
    manager.addDocument('ru', 'отличный сервис', 'sentiment.positive');
    manager.addDocument('ru', 'прекрасный аэропорт', 'sentiment.positive');
    manager.addDocument('ru', 'услужливый персонал', 'sentiment.positive');
    manager.addDocument('ru', 'чистые помещения', 'sentiment.positive');
    
    manager.addDocument('ru', 'средний опыт', 'sentiment.neutral');
    manager.addDocument('ru', 'не плохо, но и не отлично', 'sentiment.neutral');
    
    manager.addDocument('ru', 'ужасный опыт', 'sentiment.negative');
    manager.addDocument('ru', 'грубый персонал', 'sentiment.negative');
    manager.addDocument('ru', 'грязные помещения', 'sentiment.negative');
    
    // Uzbek
    manager.addDocument('uz', 'ajoyib xizmat', 'sentiment.positive');
    manager.addDocument('uz', 'yaxshi aeroport', 'sentiment.positive');
    
    manager.addDocument('uz', 'o\'rtacha tajriba', 'sentiment.neutral');
    
    manager.addDocument('uz', 'juda yomon', 'sentiment.negative');
    manager.addDocument('uz', 'xizmat yomon', 'sentiment.negative');
    
    // Train the model
    await manager.train();
    await manager.save();
    modelsLoaded = true;
    logger.info('New NLP models trained and saved successfully');
  }
};

// Start loading models immediately
loadModels();

// Simple word-based sentiment analysis as fallback
const getSentimentScore = (text, language = 'en') => {
  // Define positive and negative words for each language
  const positiveWords = {
    en: ['good', 'great', 'excellent', 'amazing', 'love', 'nice', 'clean', 'helpful', 'convenient'],
    ru: ['хороший', 'отличный', 'превосходный', 'замечательный', 'люблю', 'приятный', 'чистый'],
    uz: ['yaxshi', 'ajoyib', 'zo\'r', 'a\'lo', 'yoqimli', 'toza', 'foydali']
  };
  
  const negativeWords = {
    en: ['bad', 'poor', 'awful', 'terrible', 'dirty', 'slow', 'rude', 'difficult'],
    ru: ['плохой', 'ужасный', 'отвратительный', 'грязный', 'медленный', 'грубый', 'трудный'],
    uz: ['yomon', 'rasvo', 'jirkanch', 'iflos', 'sekin', 'qo\'pol', 'qiyin']
  };
  
  const words = tokenizer.tokenize(text.toLowerCase());
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  // Count positive and negative words
  words.forEach(word => {
    if ((positiveWords[language] || []).includes(word)) positiveCount++;
    if ((negativeWords[language] || []).includes(word)) negativeCount++;
  });
  
  // Calculate score (range 0-1 where 0 is negative, 1 is positive)
  const totalSentimentWords = positiveCount + negativeCount;
  
  if (totalSentimentWords === 0) return 0.5; // neutral
  
  return positiveCount / totalSentimentWords;
};

// Analyze sentiment of a text
exports.analyzeSentiment = async (text, language = 'auto') => {
  try {
    // Ensure models are loaded
    if (!modelsLoaded) {
      logger.warn('NLP models not yet loaded, using fallback method');
      
      // Use fallback while models are loading
      if (language === 'auto') {
        language = helpers.detectLanguage(text);
      }
      
      const score = getSentimentScore(text, language);
      let sentiment = 'neutral';
      if (score >= 0.6) sentiment = 'positive';
      else if (score <= 0.4) sentiment = 'negative';
      
      return {
        sentiment,
        score,
        language,
        keywords: helpers.extractKeywords(text),
        method: 'fallback'
      };
    }
    
    // Detect language if auto
    if (language === 'auto') {
      language = helpers.detectLanguage(text);
    }
    
    // Process with NLP manager
    const result = await manager.process(language, text);
    
    // Extract sentiment
    let sentiment = 'neutral';
    let score = 0.5;
    
    if (result.sentiment && result.sentiment.vote) {
      if (result.sentiment.vote === 'sentiment.positive') {
        sentiment = 'positive';
        score = result.sentiment.score || 0.7;
      } else if (result.sentiment.vote === 'sentiment.negative') {
        sentiment = 'negative';
        score = 1 - (result.sentiment.score || 0.7);
      }
    } else {
      // Fallback to simple word counting method
      score = getSentimentScore(text, language);
      if (score >= 0.6) sentiment = 'positive';
      else if (score <= 0.4) sentiment = 'negative';
    }
    
    return {
      sentiment,
      score,
      language,
      keywords: helpers.extractKeywords(text),
      method: 'nlp-manager'
    };
    
  } catch (error) {
    logger.error('Error analyzing sentiment:', error);
    
    // Fallback to simple method on error
    if (language === 'auto') {
      language = helpers.detectLanguage(text);
    }
    
    const score = getSentimentScore(text, language);
    let sentiment = 'neutral';
    if (score >= 0.6) sentiment = 'positive';
    else if (score <= 0.4) sentiment = 'negative';
    
    return {
      sentiment,
      score,
      language,
      keywords: helpers.extractKeywords(text),
      method: 'fallback'
    };
  }
};