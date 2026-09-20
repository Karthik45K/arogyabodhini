const { translate } = require('@vitalets/google-translate-api');

const detectLanguageAndTranslate = async (text, targetLang = 'en') => {
  try {
    const res = await translate(text, { to: targetLang });
    return {
      text: res.text,
      detectedLang: res.raw.src || targetLang,
    };
  } catch (error) {
    console.error('[Translation] Error translating text:', error.message);
    // Fallback to original text if translation fails
    return {
      text,
      detectedLang: 'en' // fallback
    };
  }
};

const translateTo = async (text, targetLang) => {
  if (!text) return text;
  if (!targetLang || targetLang.toLowerCase().startsWith('en')) return text;
  try {
    const res = await translate(text, { to: targetLang });
    return res.text;
  } catch (error) {
    console.error(`[Translation] Error translating to ${targetLang}:`, error.message);
    return text;
  }
};

module.exports = { detectLanguageAndTranslate, translateTo };
