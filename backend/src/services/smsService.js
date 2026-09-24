/**
 * SMS delivery — delegates to Twilio adapter.
 * Never reports sent:true unless Twilio confirms acceptance.
 */
const {
  isSmsConfigured,
  sendPrescriptionSMS,
} = require('./twilioDeliveryService')

module.exports = { isSmsConfigured, sendPrescriptionSMS }
