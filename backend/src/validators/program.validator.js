/**
 * Validators per programmi di allenamento
 */

const Joi = require('joi');

const createProgramSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Nome programma obbligatorio' }),
    description: Joi.string().max(2000).allow('', null),
    clientId: Joi.number().integer().required()
        .messages({ 'any.required': 'Cliente obbligatorio' }),
    durationWeeks: Joi.number().integer().min(1).max(52).allow(null),
    daysPerWeek: Joi.number().integer().min(1).max(7).allow(null),
    goal: Joi.string().valid(
        'weight_loss', 'muscle_gain', 'strength', 'endurance',
        'flexibility', 'general_fitness', 'sport_specific'
    ).allow(null),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'elite').allow(null),
    startDate: Joi.date().allow(null),
    endDate: Joi.date().greater(Joi.ref('startDate')).allow(null),
    notes: Joi.string().max(2000).allow('', null)
});

const updateProgramSchema = Joi.object({
    name: Joi.string().min(2).max(255),
    description: Joi.string().max(2000).allow('', null),
    durationWeeks: Joi.number().integer().min(1).max(52).allow(null),
    daysPerWeek: Joi.number().integer().min(1).max(7).allow(null),
    goal: Joi.string().valid(
        'weight_loss', 'muscle_gain', 'strength', 'endurance',
        'flexibility', 'general_fitness', 'sport_specific'
    ).allow(null),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'elite').allow(null),
    startDate: Joi.date().allow(null),
    endDate: Joi.date().allow(null),
    notes: Joi.string().max(2000).allow('', null)
});

const updateStatusSchema = Joi.object({
    status: Joi.string().valid('active', 'paused', 'completed', 'cancelled').required()
});

const addWorkoutSchema = Joi.object({
    workoutTemplateId: Joi.number().integer().required(),
    dayOfWeek: Joi.number().integer().min(1).max(7).required(),
    weekNumber: Joi.number().integer().min(1).allow(null),
    notes: Joi.string().max(500).allow('', null)
});

module.exports = {
    createProgramSchema,
    updateProgramSchema,
    updateStatusSchema,
    addWorkoutSchema
};
