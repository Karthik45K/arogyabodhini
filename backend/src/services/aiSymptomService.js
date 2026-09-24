const { InferenceClient } = require('@huggingface/inference');
const diseasePredictionService = require('./diseasePredictionService');
const { toMajorSpecialty } = require('../config/majorSpecialties');

// Priority ordered: fastest, most reliable free-tier models first
const MODELS = [
  { name: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Primary (Llama 3.3 70B)', timeoutMs: 5000 },
  { name: 'meta-llama/Llama-3.1-8B-Instruct',  label: 'Secondary (Llama 3.1 8B)', timeoutMs: 4000 },
  { name: 'deepseek-ai/DeepSeek-R1',          label: 'Tertiary (DeepSeek R1)', timeoutMs: 6000 },
  { name: 'Qwen/Qwen2.5-72B-Instruct',        label: 'Quaternary (Qwen 72B)', timeoutMs: 6000 },
];

const SYSTEM_PROMPT = `You are an emergency clinical triage assistant.
Analyze the FULL patient symptom pattern (not just the last symptom) and output ONLY a valid JSON object matching the exact schema below.
No markdown formatting, no code fences, no extra text — ONLY the raw JSON object.

Do NOT invent rare diseases from vague/generic symptoms.
Do NOT present findings as a definitive diagnosis — condition is a possible condition only.
If symptoms are vague or insufficient for reliable specialist routing, use "General Physician".

recommendedSpecialty MUST be exactly one of these major specialties:
General Physician, Cardiology, Neurology, Pulmonology, Gastroenterology, Dermatology, Orthopedics, ENT, Ophthalmology, Pediatrics, Obstetrics & Gynecology, Urology, Nephrology, Endocrinology, Rheumatology, Psychiatry, General Surgery, Oncology, Infectious Disease.

Schema:
{
  "condition": "Possible Condition Name",
  "severity": "Mild" | "Moderate" | "Emergency",
  "confidence": 0.88,
  "recommendedSpecialty": "Specialty Name from the list above",
  "summary": "Brief clinical summary — not a diagnosis",
  "triageAdvice": "Actionable advice for the patient",
  "emergencyWarning": false,
  "precautions": ["precaution1", "precaution2"]
}`;

const withTimeout = (promise, ms, modelName) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Inference timed out after ${ms}ms on ${modelName}`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

/**
 * Call a HuggingFace model using the official @huggingface/inference SDK.
 * Uses the chatCompletion API for instruction-tuned models with timeout protection.
 */
const callHuggingFace = async (client, model, symptoms, timeoutMs = 5000) => {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Patient symptoms: "${symptoms}"\n\nProvide your clinical triage assessment as JSON.` }
  ];

  const chatPromise = client.chatCompletion({
    model,
    messages,
    max_tokens: 450,
    temperature: 0.2,
  });

  const chatOutput = await withTimeout(chatPromise, timeoutMs, model);
  let output = chatOutput.choices?.[0]?.message?.content || '';
  
  // Strip any markdown code fences or thinking tags the model might add
  output = output.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  output = output.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  
  // Extract JSON from the output
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Model returned non-JSON output: ${output.substring(0, 150)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  parsed.modelUsed = model;
  return parsed;
};

const analyzeSymptoms = async (symptoms) => {
  const token = process.env.HF_TOKEN;
  if (!token || token === 'hf_dummy_token_replace_me') {
    console.warn(`\x1b[33m[AI Triage]\x1b[0m HF_TOKEN not configured, using local engine directly`);
    return localFallback(symptoms);
  }

  const client = new InferenceClient(token);

  for (const { name, label, timeoutMs } of MODELS) {
    try {
      const startTime = Date.now();
      console.log(`\n\x1b[36m[AI Triage]\x1b[0m Attempting ${label}: ${name}`);
      const result = await callHuggingFace(client, name, symptoms, timeoutMs);
      const elapsed = Date.now() - startTime;
      const major = toMajorSpecialty(result.recommendedSpecialty || 'General Physician');
      result.recommendedSpecialty = major.label;
      console.log(`\x1b[32m[AI Triage] ✓ ${label} succeeded in ${elapsed}ms\x1b[0m — Condition: "${result.condition}", Specialty: "${result.recommendedSpecialty}", Severity: ${result.severity}`);
      return result;
    } catch (error) {
      console.warn(`\x1b[31m[AI Triage] ${label} Failed:\x1b[0m ${error.message}`);
    }
  }

  // All HF models failed — use local clinical engine
  console.log(`\x1b[33m[AI Triage]\x1b[0m All cloud models failed. Falling back to local clinical engine.`);
  return localFallback(symptoms);
};

function localFallback(symptoms) {
  const predictFn = diseasePredictionService.predict || diseasePredictionService.predictFromSymptomText;
  const localResult = predictFn ? predictFn(symptoms) : {};
  
  const topDisease = localResult.topDisease || localResult.predictedDisease || localResult.possibleDiseases?.[0]?.disease || 'General Symptoms';
  const severityLabel = localResult.severity?.label || (typeof localResult.severity === 'string' ? localResult.severity : 'Moderate');
  const confidenceRatio = localResult.confidence ? (localResult.confidence > 1 ? localResult.confidence / 100 : localResult.confidence) : 0.75;
  
  const major = toMajorSpecialty(localResult.action?.specialist || 'General Physician');
  return {
    condition: topDisease,
    severity: severityLabel,
    confidence: confidenceRatio,
    recommendedSpecialty: major.label,
    summary: "Notice: Generated using approximate clinical rule-engine.",
    triageAdvice: localResult.urgencyNote || "Please consult a doctor for a proper diagnosis.",
    emergencyWarning: !!localResult.emergencyFlag,
    precautions: ["Rest and stay hydrated", "Monitor symptoms closely", "Consult a qualified doctor if symptoms persist"],
    modelUsed: "Approximate Clinical Engine (Offline Fallback)"
  };
}

module.exports = { analyzeSymptoms };
