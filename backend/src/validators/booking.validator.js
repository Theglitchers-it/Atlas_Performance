/**
 * Validators per prenotazioni e appuntamenti
 */

const Joi = require('joi');

const createAppointmentSchema = Joi.object({
    clientId: Joi.number().integer().required()
        .messages({ 'any.required': 'Cliente obbligatorio' }),
    date: Joi.date().required()
        .messages({ 'any.required': 'Data obbligatoria' }),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required()
        .messages({ 'string.pattern.base': 'Orario inizio formato HH:MM', 'any.required': 'Orario inizio obbligatorio' }),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required()
        .messages({ 'string.pattern.base': 'Orario fine formato HH:MM' }),
    type: Joi.string().valid('personal_training', 'consultation', 'assessment', 'follow_up', 'other').default('personal_training'),
    location: Joi.string().max(255).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    isRecurring: Joi.boolean().default(false),
    recurringPattern: Joi.string().valid('weekly', 'biweekly', 'monthly').allow(null)
});

const updateAppointmentSchema = Joi.object({
    date: Joi.date(),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/),
    type: Joi.string().valid('personal_training', 'consultation', 'assessment', 'follow_up', 'other'),
    location: Joi.string().max(255).allow('', null),
    notes: Joi.string().max(1000).allow('', null)
});

const updateStatusSchema = Joi.object({
    status: Joi.string().valid('confirmed', 'cancelled', 'completed', 'no_show').required()
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
