// server/utils/helpers.js

// Extract keywords from a text
exports.extractKeywords = (text) => {
  if (!text) return [];
  
  // Remove punctuation and convert to lowercase
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words
  const words = cleanText.split(/\s+/);
  
  // Filter out common stop words
  const stopWords = {
    en: ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'is', 'are', 'was', 'were'],
    ru: ['и', 'в', 'не', 'на', 'я', 'с', 'что', 'по', 'это', 'он', 'она', 'как', 'у', 'к'],
    uz: ['va', 'bu', 'bilan', 'ham', 'uchun', 'da', 'dan', 'ga', 'ning', 'edi', 'bo\'lgan']
  };
  
  // Detect language
  const language = exports.detectLanguage(text);
  const allStopWords = [...stopWords.en, ...stopWords.ru, ...stopWords.uz];
  
  const filteredWords = words.filter(word => 
    !allStopWords.includes(word) && word.length > 2
  );
  
  // Count word frequency
  const wordCount = {};
  filteredWords.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Sort by frequency and get top keywords
  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(item => item[0]);
  
  return sortedWords;
};

// Detect language from text
// server/utils/helpers.js
// DASTURDA ISHLATISH UCHUN UNIVERSAL DETECTLANGUAGE FUNKSIYASI

exports.detectLanguage = (text) => {
  if (!text || typeof text !== "string") return 'en';
  const orig = text.toLowerCase()
    .replace(/[’'‘`"“”—\-.,:;!?\(\)\[\]{}«»]/g, "")
    .replace(/ё/g, "е")
    .replace(/ў/g, "o")
    .replace(/ғ/g, "g")
    .replace(/ҳ/g, "h")
    .replace(/[\u200C-\u200F]/g, "");

  // O'zbek kirill va lotin maxsus belgilar va apostrof turlari
  if (/['ʻʼ’`´’]/.test(text) || /[қўғҳ]/i.test(text)) return "uz";

  // Judayam keng o‘zbek tipik frazalar (kirill va lotin)
  const uzWords = [
    "yaxshi", "zo'r", "zoʻr", "zor", "ajoyib", "a'lo", "qulay", "toza", "do'st", "dos't", "dostona",
    "samarali", "mukammal", "mukammal", "eng yaxshi", "go'zal", "baxtli", "hursand", "shodon", "xursand", "soʻzsiz", "aqlli", "tezkor", "samimiy", "tabrik", "rahmat", "tashakkur", "minnatdor", "beqiyos", "baholi", "ofarin", "ibratli", "maqtovga sazovor", "gap yo‘q", "afsus", "hech kim", "shikoyat", "yoqdi", "mamnun", "bahoriy", "dadil", "hurmatli", "eko", "kuzgi", "o'zbek", "oson", "muloqot", "navbat", "intizom", "ochiq", "barchasi yaxshi", "chiroyli"
  ];
  if (uzWords.some(w => orig.includes(w))) return "uz";

  // Rus kirill harflari A-Я, ё, э, ы, ж, ч, ш, щ hamma asosiylari
  if (/[а-яёэыжчшщъьҳқўғӣ]/i.test(text)) return "ru";

  // Eng ko'p uchraydigan rus tipik so'zlar/frazalari (kirill)
  const ruWords = [
    "хорошо", "отлично", "замечательно", "прекрасно", "дружелюбно", "эффективно", "идеально", "лучший", "красивый", "быстро", "спасибо", "понравилось", "рекомендую", "обратился", "быстро", "удобно", "неудобно", "медленно", "грязно", "грубый", "дорого", "качество", "вежливый", "жалоба", "проблема", "обслуживание", "недостаточно", "персонал", "этот", "ужасно", "медленно", "долго", "не", "разочарован", "обидно", "оператор", "очередь", "запах", "перфект", "страшный"
  ];
  if (ruWords.some(w => orig.includes(w))) return "ru";

  // Ingliz — fallback
  return "en";
};

// Format date to YYYY-MM-DD
exports.formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Get today's date at midnight
exports.getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Truncate text with ellipsis
exports.truncateText = (text, length = 100) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substr(0, length) + '...';
};