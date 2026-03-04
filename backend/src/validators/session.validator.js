/**
 * Validators per sessioni di allenamento
 */

const Joi = require('joi');

const startSessionSchema = Joi.object({
    clientId: Joi.number().integer().required()
        .messages({ 'any.required': 'Cliente obbligatorio' }),
    templateId: Joi.number().integer().allow(null),
    programId: Joi.number().integer().allow(null),
    notes: Joi.string().max(1000).allow('', null)
});

const logSetSchema = Joi.object({
    sessionExerciseId: Joi.number().integer().required(),
    setNumber: Joi.number().integer().min(1).required(),
    repsCompleted: Joi.number().integer().min(0).allow(null),
    weightUsed: Joi.number().min(0).allow(null),
    rpe: Joi.number().min(1).max(10).allow(null),
    isWarmup: Joi.boolean().default(false),
    isFailure: Joi.boolean().default(false),
    notes: Joi.string().max(500).allow('', null)
});

const completeSessionSchema = Joi.object({
    durationMinutes: Joi.number().integer().min(1).allow(null),
    notes: Joi.string().max(1000).allow('', null),
    rating: Joi.number().integer().min(1).max(5).allow(null),
    perceivedDifficulty: Joi.number().integer().min(1).max(10).allow(null),
    caloriesBurned: Joi.number().integer().min(0).allow(null),
    avgHeartRate: Joi.number().integer().min(30).max(250).allow(null),
    overallFeeling: Joi.string().max(500).allow('', null)
});

const updateSetSchema = Joi.object({
    repsCompleted: Joi.number().integer().min(0).required(),
    weightUsed: Joi.number().min(0).allow(null),
    rpe: Joi.number().min(1).max(10).allow(null),
    isWarmup: Joi.boolean().default(false),
    isFailure: Joi.boolean().default(false),
    notes: Joi.string().max(500).allow('', null)
});

module.exports = {
    startSessionSchema,
    logSetSchema,
    updateSetSchema,
    completeSessionSchema
};
