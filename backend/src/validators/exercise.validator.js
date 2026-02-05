/**
 * Validators per esercizi
 */

const Joi = require('joi');

// Schema per query params dei filtri
const exerciseQuerySchema = Joi.object({
    category: Joi.string().valid(
        'strength', 'cardio', 'flexibility', 'balance',
        'plyometric', 'compound', 'isolation'
    ),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    muscleGroup: Joi.number().integer().positive(),
    equipment: Joi.string(),
    search: Joi.string().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
});

// Schema per creazione esercizio
const createExerciseSchema = Joi.object({
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(2000).allow('', null),
    instructions: Joi.string().max(5000).allow('', null),
    videoUrl: Joi.string().uri().max(500).allow('', null),
    imageUrl: Joi.string().uri().max(500).allow('', null),
    category: Joi.string().valid(
        'strength', 'cardio', 'flexibility', 'balance',
        'plyometric', 'compound', 'isolation'
    ).required(),
    equipment: Joi.array().items(
        Joi.string().valid(
            'barbell', 'dumbbell', 'kettlebell', 'cable',
            'machine', 'bodyweight', 'resistance_band',
            'medicine_ball', 'trx', 'none'
        )
    ).default([]),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('intermediate'),
    isCompound: Joi.boolean().default(false),
    muscleGroups: Joi.array().items(
        Joi.object({
            id: Joi.number().integer().positive().required(),
            isPrimary: Joi.boolean().default(true),
            activationPercentage: Joi.number().min(1).max(100).default(100)
        })
    ).min(1).required()
});

// Schema per aggiornamento esercizio
const updateExerciseSchema = Joi.object({
    name: Joi.string().min(2).max(200),
    description: Joi.string().max(2000).allow('', null),
    instructions: Joi.string().max(5000).allow('', null),
    videoUrl: Joi.string().uri().max(500).allow('', null),
    imageUrl: Joi.string().uri().max(500).allow('', null),
    category: Joi.string().valid(
        'strength', 'cardio', 'flexibility', 'balance',
        'plyometric', 'compound', 'isolation'
    ),
    equipment: Joi.array().items(
        Joi.string().valid(
            'barbell', 'dumbbell', 'kettlebell', 'cable',
            'machine', 'bodyweight', 'resistance_band',
            'medicine_ball', 'trx', 'none'
        )
    ),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    isCompound: Joi.boolean(),
    muscleGroups: Joi.array().items(
        Joi.object({
            id: Joi.number().integer().positive().required(),
            isPrimary: Joi.boolean().default(true),
            activationPercentage: Joi.number().min(1).max(100).default(100)
        })
    ).min(1)
});

module.exports = {
    exerciseQuerySchema,
    createExerciseSchema,
    updateExerciseSchema
};
