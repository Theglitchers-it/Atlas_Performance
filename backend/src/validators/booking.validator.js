/**
 * Validators per prenotazioni e appuntamenti
 */

const Joi = require('joi');

const createAppointmentSchema = Joi.object({
    clientId: Joi.number().integer().required()
        .messages({ 'any.required': 'Cliente obbligatorio' }),
    trainerId: Joi.number().integer().required()
        .messages({ 'any.required': 'Trainer obbligatorio' }),
    startDatetime: Joi.string().required()
        .messages({ 'any.required': 'Data/ora inizio obbligatoria' }),
    endDatetime: Joi.string().required()
        .messages({ 'any.required': 'Data/ora fine obbligatoria' }),
    appointmentType: Joi.string().valid('training', 'assessment', 'consultation', 'other', 'personal_training', 'follow_up').default('training'),
    location: Joi.string().max(255).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    isRecurring: Joi.boolean().default(false),
    recurringPattern: Joi.string().valid('weekly', 'biweekly', 'monthly').allow(null)
});

const updateAppointmentSchema = Joi.object({
    startDatetime: Joi.string().allow(null),
    endDatetime: Joi.string().allow(null),
    appointmentType: Joi.string().valid('training', 'assessment', 'consultation', 'other', 'personal_training', 'follow_up'),
    location: Joi.string().max(255).allow('', null),
    notes: Joi.string().max(1000).allow('', null)
});

const updateStatusSchema = Joi.object({
    status: Joi.string().valid('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show').required()
});

const setAvailabilitySchema = Joi.object({
    dayOfWeek: Joi.number().integer().min(0).max(6).required(),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    isAvailable: Joi.boolean().default(true),
    slotDurationMinutes: Joi.number().integer().min(15).max(240).default(60)
});

module.exports = {
    createAppointmentSchema,
    updateAppointmentSchema,
    updateStatusSchema,
    setAvailabilitySchema
};
