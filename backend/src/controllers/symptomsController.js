const { analyzeSymptoms: aiAnalyze } = require('../services/aiSymptomService');
const { lookupDoctorsBySpecialtyStrict } = require('./doctorsController');
const { detectLanguageAndTranslate, translateTo } = require('../services/translationService');
const { toMajorSpecialty } = require('../config/majorSpecialties');
const { getSpecialtyForDisease } = require('../config/diseaseSpecialtyMap');

function resolveMajorSpecialty(aiResult, englishSymptoms) {
  let major = toMajorSpecialty(aiResult.recommendedSpecialty || 'General Physician');
  const fromCondition = getSpecialtyForDisease(aiResult.condition);
  const fromSymptoms = getSpecialtyForDisease(englishSymptoms);

  // If AI/vague path landed on GP but condition/symptom pattern maps to a major specialty, use that.
  if (major.canonical === 'general-physician') {
    if (fromCondition && fromCondition !== 'general-physician') {
      major = toMajorSpecialty(fromCondition);
    } else if (fromSymptoms && fromSymptoms !== 'general-physician') {
      major = toMajorSpecialty(fromSymptoms);
    }
  }
  return major;
}

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

    // Step 2: Call cascading AI service on the English text (same pipeline for typed + voice)
    const aiResult = await aiAnalyze(englishSymptoms);

    // Step 3: Controlled major specialty from overall pattern (no silent switch later)
    const major = resolveMajorSpecialty(aiResult, englishSymptoms);
    const specialistLabel = major.label;

    // Step 4: Strict doctor preview for the SAME specialty only (no GP fallback)
    const lookup = await lookupDoctorsBySpecialtyStrict(major.canonical);

    // Step 5: Translate user-facing outputs back to their requested language
    let urgencyNote = aiResult.triageAdvice;
    let summary = aiResult.summary;
    let conditionName = aiResult.condition;
    let precautions = aiResult.precautions || [];

    if (isNonEnglish) {
      urgencyNote = await translateTo(urgencyNote, targetLangCode);
      summary = await translateTo(summary, targetLangCode);
      conditionName = await translateTo(conditionName, targetLangCode);
      precautions = await Promise.all(precautions.map((p) => translateTo(p, targetLangCode)));
    }

    const possibleDiseases = [aiResult.condition].filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        predictions: [{ disease: aiResult.condition, probability: aiResult.confidence * 100 }],
        possibleDiseases,
        predictedDisease: aiResult.condition,
        translatedCondition: conditionName,
        matchedSymptoms: [],
        inputSymptoms: trimmedSymptoms,
        englishSymptoms: isNonEnglish ? englishSymptoms : undefined,
        recommendedSpecialist: specialistLabel,
        specialty: major.canonical,
        specialtyCanonical: major.canonical,
        specialtyFellBackToGp: major.fellBackToGp === true,
        severity: aiResult.severity,
        urgencyNote,
        emergencyFlag: aiResult.emergencyWarning === true || String(aiResult.severity || '').toLowerCase() === 'emergency',
        precautions,
        summary,
        modelUsed: aiResult.modelUsed,
        confidence: Math.round(aiResult.confidence * 100),
        recommendedDoctors: lookup.doctors || [],
        doctors: lookup.doctors || [],
        language: targetLangCode,
        analyzedAt: new Date().toISOString(),
        disclaimer: 'Possible conditions only — not a medical diagnosis. Seek emergency care if symptoms are severe.',
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { analyzeSymptoms };
