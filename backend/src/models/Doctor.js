const mongoose = require('mongoose')

const doctorSchema = new mongoose.Schema(
  {
    entry_id: String,
    name: String,
    specialty: String,
    degree: String,
    experience: mongoose.Schema.Types.Mixed,
    experience_years: Number,
    rating: Number,
    bangalore_location: String,
    source_url: String,
    email: String,
    passwordHash: String,
    availability: { type: String, default: 'Not Available' },
    availabilityStatus: { type: String, default: 'unavailable' },
  },
  {
    collection: 'doctors',
    strict: false,
  }
)

module.exports = mongoose.model('Doctor', doctorSchema)
