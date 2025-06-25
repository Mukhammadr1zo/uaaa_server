const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

// So'zdan belgilarni olib tashlash
const normalize = (w) =>
  w.toLowerCase()
   .replace(/[’'‘`"“”\-—.,:;!?\(\)\[\]{}«»]/g, "")
   .replace(/ё/g, "е")
   .replace(/ў/g, "о")
   .replace(/ғ/g, "г")
   .replace(/ҳ/g, "х");

// Kengaytirilgan so'zlar ro'yxati
const positiveWords = {
  en: [
    'good','great','excellent','amazing','wonderful','fantastic','helpful','clean','friendly','efficient','perfect',
    'best','awesome','beautiful','happy','joyful','lovely','brilliant','superb','terrific','positive','love','like',
    'enjoy','recommend','nice','pleasant','outstanding','fast','polite','super','impressive','professional','thank','thanks'
  ],
  ru: [
    'хороший','отличный','замечательный','прекрасно','замечательно','удобно','чисто','дружелюбный','эффективно',
    'идеально','лучший','превосходно','красивый','счастливый','радостный','блестящий','великолепный','потрясающий',
    'чудесный','добрый','приятный','уютный','комфортно','впечатляющий','великий','чудный','спасибо','рекомендую',
    'понравилось','полюбил','удовлетворен','позитивно','супер','улыбка'
  ],
  uz: [
    'yaxshi','zo\'r','ajoyib','a\'lo','qulay','toza','do\'stona','samarali','mukammal','eng yaxshi','a\'lo darajada',
    'chiroyli','baxtli','xursand','go\'zal','aqlli','tezkor','samimiy','quvonchli','yaxshilab','mamnun','tashakkur',
    'rahmat','juda yaxshi','beqiyos','tengsiz','hurmatli','arzon','yordam berdi','muomala yaxshi','sifatli','zo’r','tabrik'
  ]
};
const negativeWords = {
  en: [
    'bad','poor','terrible','awful','horrible','disappointing','dirty','slow','rude','unfriendly','nasty','disgusting',
    'unpleasant','expensive','broken','lousy','negative','hate','dislike','worst','problem','issue','delay','angry',
    'dissatisfied','complaint','late','queue','crowd','unclean','impolite','smell','noisy','waste'
  ],
  ru: [
    'плохо','ужасно','разочаровывающий','грязный','медленно','грубо','недружелюбный','страшный','противный','дорогой',
    'сломанный','паршивый','отвратительный','неприятный','скверный','жалоба','негативный','ненавижу','проблема',
    'задержка','сложно','очередь','толпа','нечисто','разбитый','громко','жутко','никогда'
  ],
  uz: [
    'yomon','rasvo','dahshatli','qo\'pol','iflos','sekin','qimmat','buzilgan','noqulay','achinarli','qo\'rqinchli',
    'jirkanch','noxush','singan','juda yomon','tanqid','umidsiz','muammo','shikoyat','orqaga','hech kim','kechikish',
    'jo\'y','axlat','tartibsiz','hurmat qilmaydi','foydasiz','muammoli'
  ]
};

// Universal sentiment aniqlovchi funksiya
function analyzeCustom(text, lang) {
  const words = text
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (positiveWords[lang]?.includes(word)) positiveCount++;
    if (negativeWords[lang]?.includes(word)) negativeCount++;
  });

  // Bittasi chiqsa ham, taniladi
  if (positiveCount > 0 && negativeCount === 0) return { score: 1, sentiment: 'positive' };
  if (negativeCount > 0 && positiveCount === 0) return { score: 0, sentiment: 'negative' };
  if (positiveCount > 0 && negativeCount > 0) {
    const score = positiveCount / (positiveCount + negativeCount);
    if (score > 0.6) return { score, sentiment: 'positive' };
    if (score < 0.4) return { score, sentiment: 'negative' };
    return { score, sentiment: 'neutral' };
  }
  // Hech nima topilmasa (neytral)
  return { score: 0.5, sentiment: 'neutral' };
}

exports.analyzeSentiment = async (text, lang = 'auto') => {
  try {
    // Til kodini aniqlaymiz
    if (lang === 'auto') {
      lang = helpers.detectLanguage(text);
    }
    // Hamma til uchun custom analizor ishlatamiz (uzbek, rus, ingliz)
    const { score, sentiment } = analyzeCustom(text, lang);
    const keywords = helpers.extractKeywords(text);

    return {
      sentiment,
      score,
      language: lang,
      keywords
    };
  } catch (error) {
    logger.error('Error analyzing sentiment:', error);
    return {
      sentiment: 'neutral',
      score: 0.5,
      language: lang === 'auto' ? 'uz' : lang,
      keywords: []
    };
  }
};