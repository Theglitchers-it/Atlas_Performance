/**
 * Validators per workout templates
 */

const Joi = require('joi');

const exerciseItemSchema = Joi.object({
    exerciseId: Joi.number().integer().required(),
    sets: Joi.number().integer().min(1).max(20).allow(null),
    reps: Joi.string().max(50).allow('', null),
    durationSeconds: Joi.number().integer().min(0).allow(null),
    restSeconds: Joi.number().integer().min(0).max(600).allow(null),
    weightKg: Joi.number().min(0).allow(null),
    rpe: Joi.number().min(1).max(10).allow(null),
    notes: Joi.string().max(500).allow('', null),
    exerciseOrder: Joi.number().integer().min(0)
});

const createWorkoutSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Nome workout obbligatorio' }),
    description: Joi.string().max(1000).allow('', null),
    category: Joi.string().valid(
        'strength', 'hypertrophy', 'endurance', 'flexibility',
        'cardio', 'hiit', 'functional', 'rehabilitation', 'other'
    ).allow(null),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'elite').allow(null),
    estimatedDurationMinutes: Joi.number().integer().min(5).max(300).allow(null),
    exercises: Joi.array().items(exerciseItemSchema),
    tags: Joi.array().items(Joi.string().max(50)),
    isPublic: Joi.boolean().default(false)
});

const updateWorkoutSchema = Joi.object({
    name: Joi.string().min(2).max(255),
    description: Joi.string().max(1000).allow('', null),
    category: Joi.string().valid(
        'strength', 'hypertrophy', 'endurance', 'flexibility',
        'cardio', 'hiit', 'functional', 'rehabilitation', 'other'
    ).allow(null),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'elite').allow(null),
    estimatedDurationMinutes: Joi.number().integer().min(5).max(300).allow(null),
    exercises: Joi.array().items(exerciseItemSchema),
    tags: Joi.array().items(Joi.string().max(50)),
    isPublic: Joi.boolean()
});

module.exports = {
    createWorkoutSchema,
    updateWorkoutSchema
};
