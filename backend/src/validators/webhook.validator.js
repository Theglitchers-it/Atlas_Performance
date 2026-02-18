/**
 * Validators per webhook
 */

const Joi = require('joi');

const WEBHOOK_EVENTS = [
    'client.created', 'client.updated', 'client.deleted',
    'payment.created', 'payment.completed', 'payment.failed',
    'appointment.created', 'appointment.updated', 'appointment.cancelled',
    'workout.completed', 'session.completed',
    'checkin.created',
    'achievement.unlocked'
];

const createWebhookSchema = Joi.object({
    url: Joi.string().uri().required()
        .messages({ 'any.required': 'URL obbligatorio', 'string.uri': 'URL non valido' }),
    events: Joi.array().items(
        Joi.string().valid(...WEBHOOK_EVENTS)
    ).min(1).required()
        .messages({ 'any.required': 'Almeno un evento obbligatorio', 'array.min': 'Almeno un evento obbligatorio' })
});

const updateWebhookSchema = Joi.object({
    url: Joi.string().uri(),
    events: Joi.array().items(
        Joi.string().valid(...WEBHOOK_EVENTS)
    ).min(1),
    isActive: Joi.boolean()
});

module.exports = {
    createWebhookSchema,
    updateWebhookSchema
};
