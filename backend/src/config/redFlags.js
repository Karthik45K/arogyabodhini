const RED_FLAGS = [
  {
    symptom: 'difficulty breathing',
    severityLevel: 4,
    reason: 'Difficulty breathing may require urgent medical evaluation.',
    patterns: ['difficulty breathing', 'shortness of breath', 'breathlessness', 'hard to breathe', 'cant breathe', "can't breathe"],
  },
  {
    symptom: 'chest pain',
    severityLevel: 4,
    reason: 'Chest pain may require urgent medical evaluation.',
    patterns: ['chest pain', 'pain in chest'],
  },
  {
    symptom: 'unconsciousness',
    severityLevel: 4,
    reason: 'Unconsciousness or fainting may require immediate medical evaluation.',
    patterns: ['unconscious', 'fainted', 'coma', 'altered sensorium'],
  },
  {
    symptom: 'slurred speech',
    severityLevel: 4,
    reason: 'Slurred speech or sudden weakness may require urgent medical evaluation.',
    patterns: ['slurred speech', 'slurred words', 'weakness of one body side', 'weakness on one side'],
  },
  {
    symptom: 'severe bleeding',
    severityLevel: 4,
    reason: 'Severe bleeding may require immediate medical evaluation.',
    patterns: ['severe bleeding', 'bleeding heavily', 'blood in sputum', 'coughing blood', 'blood in stool'],
  },
  {
    symptom: 'confusion',
    severityLevel: 3,
    reason: 'Confusion may require prompt medical evaluation.',
    patterns: ['confusion', 'disoriented', 'confused', 'altered mental status'],
  },
  {
    symptom: 'high fever',
    severityLevel: 3,
    reason: 'High fever may require prompt medical evaluation, especially with worsening symptoms.',
    patterns: ['high fever', 'fever', 'temperature'],
  },
]

module.exports = { RED_FLAGS }
