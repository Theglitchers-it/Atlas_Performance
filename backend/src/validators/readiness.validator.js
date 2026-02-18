/**
 * Validators per daily readiness check-in
 */

const Joi = require('joi');

const checkinSchema = Joi.object({
    sleepHours: Joi.number().min(0).max(24).allow(null),
    sleepQuality: Joi.number().integer().min(1).max(5).allow(null),
    energyLevel: Joi.number().integer().min(1).max(5).allow(null),
    stressLevel: Joi.number().integer().min(1).max(5).allow(null),
    muscleSoreness: Joi.number().integer().min(1).max(5).allow(null),
    mood: Joi.number().integer().min(1).max(5).allow(null),
    motivation: Joi.number().integer().min(1).max(5).allow(null),
    readinessScore: Joi.number().min(0).max(100).allow(null),
    notes: Joi.string().max(1000).allow('', null),
    injuries: Joi.array().items(Joi.object({
        bodyPart: Joi.string().required(),
        severity: Joi.string().valid('mild', 'moderate', 'severe')
    }))
});

module.exports = {
    checkinSchema
};
