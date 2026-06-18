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
    content: Joi.string().allow('').max(5000).default(''),
    messageType: Joi.string().valid('text', 'image', 'file', 'audio').default('text'),
    attachments: Joi.array().items(Joi.object()).allow(null).default(null)
}).custom((value, helpers) => {
    // Almeno uno tra content (non vuoto) o attachments (non vuoto) e richiesto
    const hasContent = typeof value.content === 'string' && value.content.trim().length > 0;
    const hasAttachments = Array.isArray(value.attachments) && value.attachments.length > 0;
    if (!hasContent && !hasAttachments) {
        return helpers.error('any.invalid', { message: 'Messaggio vuoto: serve testo o allegato' });
    }
    return value;
});

module.exports = {
    createConversationSchema,
    sendMessageSchema
};
