/**
 * Validators per classi di gruppo
 */

const Joi = require('joi');

const createClassSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Nome classe obbligatorio' }),
    description: Joi.string().max(2000).allow('', null),
    type: Joi.string().valid('yoga', 'pilates', 'crossfit', 'spinning', 'zumba', 'hiit', 'functional', 'boxing', 'other').allow(null),
    maxParticipants: Joi.number().integer().min(1).max(100).required()
        .messages({ 'any.required': 'Capacità massima obbligatoria' }),
    durationMin: Joi.number().integer().min(15).max(240).default(60),
    instructorId: Joi.number().integer().allow(null),
    location: Joi.string().max(255).allow('', null),
    color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('', null),
    isActive: Joi.boolean().default(true)
});

const updateClassSchema = Joi.object({
    name: Joi.string().min(2).max(255),
    description: Joi.string().max(2000).allow('', null),
    type: Joi.string().valid('yoga', 'pilates', 'crossfit', 'spinning', 'zumba', 'hiit', 'functional', 'boxing', 'other').allow(null),
    maxParticipants: Joi.number().integer().min(1).max(100),
    durationMin: Joi.number().integer().min(15).max(240),
    instructorId: Joi.number().integer().allow(null),
    location: Joi.string().max(255).allow('', null),
    color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('', null),
    isActive: Joi.boolean()
});

const createSessionSchema = Joi.object({
    classId: Joi.number().integer().required(),
    date: Joi.date().required(),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).allow(null),
    notes: Joi.string().max(500).allow('', null),
    isRecurring: Joi.boolean().default(false),
    recurringWeeks: Joi.number().integer().min(1).max(52).allow(null)
});

module.exports = {
    createClassSchema,
    updateClassSchema,
    createSessionSchema
};
