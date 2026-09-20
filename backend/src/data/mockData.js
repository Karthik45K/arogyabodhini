/**
 * Mock Disease Knowledge Base — Phase 4 Enhanced
 * Added: Pulmonologist, ENT, Pediatrician, emergency keyword scoring
 */

const SYMPTOM_MAP = [
  {
    keywords: ['chest pain', 'chest pressure', 'chest tightness', 'heart', 'palpitation', 'irregular heartbeat', 'shortness of breath', 'breathing difficulty', 'breathless', 'left arm pain', 'jaw pain'],
    diseases: ['Coronary Artery Disease', 'Angina Pectoris', 'Myocardial Infarction', 'Pulmonary Embolism'],
    specialist: 'Cardiologist',
    severity: 'High',
    urgencyNote: 'Chest pain with breathing difficulty may indicate a cardiac emergency. Seek immediate care.',
    emergencyFlag: true,
  },
  {
    keywords: ['headache', 'migraine', 'head pain', 'blurred vision', 'dizziness', 'vertigo', 'nausea', 'vomiting', 'stiff neck', 'seizure', 'numbness', 'tingling', 'confusion', 'slurred speech', 'sudden weakness', 'face drooping'],
    diseases: ['Migraine', 'Tension Headache', 'Hypertension', 'Meningitis', 'Stroke'],
    specialist: 'Neurologist',
    severity: 'Moderate',
    urgencyNote: 'Sudden severe headache, confusion, or slurred speech may indicate stroke. Call emergency services.',
    emergencyFlag: false,
  },
  {
    keywords: ['fever', 'cough', 'cold', 'sore throat', 'runny nose', 'body ache', 'fatigue', 'chills', 'sneezing', 'congestion', 'flu', 'weakness', 'loss of taste', 'loss of smell'],
    diseases: ['Viral Flu (Influenza)', 'Common Cold', 'COVID-19', 'Pharyngitis'],
    specialist: 'General Physician',
    severity: 'Low',
    urgencyNote: 'Rest and hydration are usually effective. Consult a doctor if fever persists beyond 3 days.',
    emergencyFlag: false,
  },
  {
    keywords: ['stomach pain', 'abdominal pain', 'belly pain', 'diarrhea', 'constipation', 'bloating', 'gas', 'indigestion', 'acid reflux', 'heartburn', 'loose stool', 'stomach cramps', 'nausea'],
    diseases: ['Gastroenteritis', 'Irritable Bowel Syndrome', 'Acid Reflux / GERD', 'Appendicitis'],
    specialist: 'Gastroenterologist',
    severity: 'Moderate',
    urgencyNote: 'Severe right-side abdominal pain with fever may indicate appendicitis. Seek urgent care.',
    emergencyFlag: false,
  },
  {
    keywords: ['joint pain', 'knee pain', 'back pain', 'shoulder pain', 'muscle pain', 'arthritis', 'swelling joints', 'stiffness', 'sprain', 'bone pain', 'fracture', 'hip pain'],
    diseases: ['Osteoarthritis', 'Rheumatoid Arthritis', 'Muscle Strain', 'Gout'],
    specialist: 'Orthopedic Surgeon',
    severity: 'Moderate',
    urgencyNote: 'Sudden severe joint pain after injury should be X-rayed to rule out fracture.',
    emergencyFlag: false,
  },
  {
    keywords: ['rash', 'itching', 'itch', 'acne', 'eczema', 'psoriasis', 'hives', 'dry skin', 'blisters', 'sunburn', 'allergic reaction', 'skin irritation', 'redness skin'],
    diseases: ['Eczema / Atopic Dermatitis', 'Contact Dermatitis', 'Psoriasis', 'Urticaria'],
    specialist: 'Dermatologist',
    severity: 'Low',
    urgencyNote: 'Widespread rash with difficulty breathing indicates severe allergic reaction — seek emergency care.',
    emergencyFlag: false,
  },
  {
    keywords: ['eye pain', 'red eye', 'vision loss', 'double vision', 'eye discharge', 'conjunctivitis', 'pink eye', 'watery eyes', 'eye strain', 'blurry vision'],
    diseases: ['Conjunctivitis', 'Glaucoma', 'Dry Eye Syndrome', 'Uveitis'],
    specialist: 'Ophthalmologist',
    severity: 'Moderate',
    urgencyNote: 'Sudden vision loss or severe eye pain should be treated as a medical emergency.',
    emergencyFlag: false,
  },
  {
    keywords: ['urination', 'frequent urination', 'painful urination', 'burning urination', 'blood in urine', 'kidney pain', 'uti', 'urinary infection', 'lower back pain urinary'],
    diseases: ['Urinary Tract Infection', 'Kidney Stones', 'Cystitis', 'Kidney Infection'],
    specialist: 'Urologist',
    severity: 'Moderate',
    urgencyNote: 'Blood in urine or severe flank pain can indicate kidney stones requiring prompt treatment.',
    emergencyFlag: false,
  },
  {
    keywords: ['anxiety', 'depression', 'stress', 'panic attack', 'insomnia', 'sleep disorder', 'mood swing', 'sadness', 'mental health', 'phobia', 'suicidal', 'self harm', 'hopeless'],
    diseases: ['Generalised Anxiety Disorder', 'Major Depressive Disorder', 'Panic Disorder', 'Insomnia'],
    specialist: 'Psychiatrist',
    severity: 'Moderate',
    urgencyNote: 'If having thoughts of self-harm, call iCall immediately: 9152987821.',
    emergencyFlag: false,
  },
  {
    keywords: ['diabetes', 'high blood sugar', 'excessive thirst', 'weight loss sudden', 'slow healing wounds', 'increased hunger', 'blurred vision diabetes'],
    diseases: ['Type 2 Diabetes', 'Type 1 Diabetes', 'Prediabetes', 'Hypoglycaemia'],
    specialist: 'Endocrinologist',
    severity: 'High',
    urgencyNote: 'Uncontrolled blood sugar can cause serious complications. Schedule a fasting blood test promptly.',
    emergencyFlag: false,
  },
  {
    keywords: ['wheezing', 'asthma', 'shortness of breath', 'breathing problem', 'coughing at night', 'chest tightness', 'copd', 'lung', 'phlegm', 'mucus', 'pneumonia', 'sleep apnea'],
    diseases: ['Asthma', 'COPD', 'Pneumonia', 'Bronchitis', 'Sleep Apnea'],
    specialist: 'Pulmonologist',
    severity: 'High',
    urgencyNote: 'Severe breathing difficulty needs immediate medical attention.',
    emergencyFlag: false,
  },
  {
    keywords: ['ear pain', 'ear infection', 'hearing loss', 'ringing ears', 'tinnitus', 'sinus', 'sinusitis', 'nasal congestion', 'tonsils', 'tonsillitis', 'throat infection', 'voice hoarse'],
    diseases: ['Sinusitis', 'Otitis Media', 'Tonsillitis', 'Hearing Loss', 'Tinnitus'],
    specialist: 'ENT Specialist',
    severity: 'Low',
    urgencyNote: 'Persistent ear pain or hearing loss should be evaluated promptly.',
    emergencyFlag: false,
  },
]

// Emergency override — these keyword combos trigger emergencyFlag=true regardless of matched entry
const EMERGENCY_PATTERNS = [
  ['chest pain', 'breathing'],
  ['heart attack'],
  ['stroke'],
  ['unconscious'],
  ['severe bleeding', 'bleeding heavily'],
  ['face drooping'],
  ['slurred speech'],
  ['sudden numbness'],
  ['cannot breathe'],
  ['fainted', 'fainting'],
  ['poisoning'],
  ['overdose'],
]

const DEFAULT_RESPONSE = {
  diseases: ['Undetermined — Further Evaluation Needed'],
  specialist: 'General Physician',
  severity: 'Low',
  urgencyNote: 'We could not identify a specific condition. Please consult a general physician.',
  emergencyFlag: false,
  confidence: 35,
}

module.exports = { SYMPTOM_MAP, EMERGENCY_PATTERNS, DEFAULT_RESPONSE }
