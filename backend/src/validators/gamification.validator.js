/**
 * Validators per gamification
 */

const Joi = require('joi');

const addBonusXPSchema = Joi.object({
    clientId: Joi.number().integer().required()
        .messages({ 'any.required': 'Cliente obbligatorio' }),
    amount: Joi.number().integer().min(1).max(10000).required()
        .messages({ 'any.required': 'Quantità XP obbligatoria' }),
    reason: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Motivo obbligatorio' })
});

const createChallengeSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Nome sfida obbligatorio' }),
    description: Joi.string().max(2000).allow('', null),
    type: Joi.string().valid('workout_count', 'streak', 'volume', 'duration', 'custom').required(),
    targetValue: Joi.number().positive().required(),
    unit: Joi.string().max(50).allow('', null),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    xpReward: Joi.number().integer().min(0).default(100),
    maxParticipants: Joi.number().integer().min(2).allow(null),
    isPublic: Joi.boolean().default(true)
});

module.exports = {
    addBonusXPSchema,
    createChallengeSchema
};
