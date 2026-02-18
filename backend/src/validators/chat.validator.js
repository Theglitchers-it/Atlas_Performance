/**
 * Validators per chat
 */

const Joi = require('joi');

const createConversationSchema = Joi.object({
    participantIds: Joi.array().items(Joi.number().integer()).min(1).required()
        .messages({
            'any.required': 'Almeno un partecipante richiesto',
            'array.min': 'Almeno un partecipante richiesto'
        }),
    type: Joi.string().valid('direct', 'group').default('direct'),
    name: Joi.string().max(255).allow('', null)
});

const sendMessageSchema = Joi.object({
    content: Joi.string().min(1).max(5000).required()
        .messages({ 'any.required': 'Messaggio obbligatorio' }),
    messageType: Joi.string().valid('text', 'image', 'file', 'audio').default('text'),
    attachments: Joi.array().items(Joi.object()).allow(null)
});

module.exports = {
    createConversationSchema,
    sendMessageSchema
};
