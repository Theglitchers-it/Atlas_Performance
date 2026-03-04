/**
 * Validators per workout templates
 */

const Joi = require('joi');

const exerciseItemSchema = Joi.object({
    exerciseId: Joi.number().integer().required(),
    sets: Joi.number().integer().min(1).max(20).required(),
    repsMin: Joi.number().integer().min(1).max(100).required(),
    repsMax: Joi.number().integer().min(1).max(100).required(),
    weightType: Joi.string().valid('fixed', 'percentage_1rm', 'rpe', 'bodyweight').required(),
    weightValue: Joi.when('weightType', {
        is: 'bodyweight',
        then: Joi.number().allow(null),
        otherwise: Joi.number().min(0).required()
    }),
    restSeconds: Joi.number().integer().min(0).max(600).required(),
    tempo: Joi.string().max(50).allow('', null),
    notes: Joi.string().max(500).allow('', null),
    supersetGroup: Joi.number().integer().min(1).max(10).allow(null),
    isWarmup: Joi.boolean().default(false)
});

const createWorkoutSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Nome workout obbligatorio' }),
    description: Joi.string().max(1000).allow('', null),
    category: Joi.string().valid(
        'strength', 'hypertrophy', 'endurance', 'flexibility',
        'cardio', 'hiit', 'functional', 'rehabilitation',
        'power', 'conditioning', 'recovery', 'custom', 'other'
    ).allow(null),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'elite').allow(null),
    estimatedDurationMin: Joi.number().integer().min(1).max(300).allow(null),
    exercises: Joi.array().items(exerciseItemSchema).min(1).required(),
    tags: Joi.array().items(Joi.string().max(50)),
    isPublic: Joi.boolean().default(false)
});

const updateWorkoutSchema = Joi.object({
    name: Joi.string().min(2).max(255),
    description: Joi.string().max(1000).allow('', null),
    category: Joi.string().valid(
        'strength', 'hypertrophy', 'endurance', 'flexibility',
        'cardio', 'hiit', 'functional', 'rehabilitation',
        'power', 'conditioning', 'recovery', 'custom', 'other'
    ).allow(null),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'elite').allow(null),
    estimatedDurationMin: Joi.number().integer().min(1).max(300).allow(null),
    exercises: Joi.array().items(exerciseItemSchema).min(1),
    tags: Joi.array().items(Joi.string().max(50)),
    isPublic: Joi.boolean()
});

module.exports = {
    createWorkoutSchema,
    updateWorkoutSchema
};
