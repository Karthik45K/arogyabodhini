const { analyzeSymptoms: aiAnalyze } = require('../services/aiSymptomService');
const { lookupDoctorsForTriage } = require('./doctorsController');
const { titleCase } = require('../services/diseasePredictionService');
const { detectLanguageAndTranslate, translateTo } = require('../services/translationService');

const analyzeSymptoms = async (req, res, next) => {
  try {
    const { symptoms, language } = req.body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) {
      return res.status(400).json({
        success: false, error: 'INVALID_INPUT',
        message: 'Field "symptoms" must be a string of at least 3 characters.',
      });
    }
    if (symptoms.length > 2000) {
      return res.status(400).json({
        success: false, error: 'TOO_LONG',
        message: 'Symptom description must be under 2000 characters.',
      });
    }

    const trimmedSymptoms = symptoms.trim();
    
    // Step 1: Translate symptoms to English for clinical evaluation
    const targetLangCode = language || 'en';
    const isNonEnglish = !targetLangCode.toLowerCase().startsWith('en');
    
    let englishSymptoms = trimmedSymptoms;
    if (isNonEnglish) {
      const translationResult = await detectLanguageAndTranslate(trimmedSymptoms, 'en');
      englishSymptoms = translationResult.text;
    }
    
    // Step 2: Call cascading AI service on the English text
    const aiResult = await aiAnalyze(englishSymptoms);
    
    // Step 3: Lookup doctors based on recommended specialty and condition
    const lookup = await lookupDoctorsForTriage(aiResult.recommendedSpecialty, aiResult.condition);
    
    // Step 4: Translate user-facing outputs back to their requested language
    let urgencyNote = aiResult.triageAdvice;
    let summary = aiResult.summary;
    let conditionName = aiResult.condition;
    let precautions = aiResult.precautions || [];
    
    if (isNonEnglish) {
       urgencyNote = await translateTo(urgencyNote, targetLangCode);
       summary = await translateTo(summary, targetLangCode);
       conditionName = await translateTo(conditionName, targetLangCode);
       
       precautions = await Promise.all(precautions.map(p => translateTo(p, targetLangCode)));
    }
    
    res.status(200).json({
      success: true,
      data: {
        predictions: [{ disease: aiResult.condition, probability: aiResult.confidence * 100 }],
        possibleDiseases: [aiResult.condition],
        predictedDisease: aiResult.condition,
        translatedCondition: conditionName,
        matchedSymptoms: [], // No longer explicitly extracting tokens
        inputSymptoms: trimmedSymptoms,
        englishSymptoms: isNonEnglish ? englishSymptoms : undefined,
        recommendedSpecialist: aiResult.recommendedSpecialty,
        specialty: aiResult.recommendedSpecialty.toLowerCase().replace(/\s+/g, '-'),
        severity: aiResult.severity,
        urgencyNote: urgencyNote,
        emergencyFlag: aiResult.emergencyWarning,
        precautions: precautions,
        summary: summary,
        modelUsed: aiResult.modelUsed,
        confidence: Math.round(aiResult.confidence * 100),
        recommendedDoctors: lookup.doctors || [],
        doctors: lookup.doctors || [],
        language: targetLangCode,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { analyzeSymptoms };
