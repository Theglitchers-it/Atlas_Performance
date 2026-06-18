/**
 * Validators per community (post, commenti)
 */

const Joi = require('joi');

const createPostSchema = Joi.object({
    content: Joi.string().min(1).max(5000).required()
        .messages({ 'any.required': 'Contenuto obbligatorio' }),
    type: Joi.string().valid('text', 'image', 'video', 'poll', 'achievement').default('text'),
    postType: Joi.string().max(50).allow('', null),
    imageUrl: Joi.string().uri().allow('', null),
    videoUrl: Joi.string().uri().allow('', null),
    tags: Joi.array().items(Joi.string().max(50)),
    // Fase 5: visibility per-trainer
    visibilityType: Joi.string().valid('global', 'my_clients', 'specific_clients').default('global'),
    specificClientUserIds: Joi.alternatives().try(
        Joi.array().items(Joi.number().integer().positive()),
        Joi.string() // JSON stringified array via multipart
    ).optional()
});

const updatePostSchema = Joi.object({
    content: Joi.string().min(1).max(5000),
    imageUrl: Joi.string().uri().allow('', null),
    videoUrl: Joi.string().uri().allow('', null),
    tags: Joi.array().items(Joi.string().max(50))
});

const addCommentSchema = Joi.object({
    content: Joi.string().min(1).max(2000).required()
        .messages({ 'any.required': 'Commento obbligatorio' }),
    parentId: Joi.number().integer().allow(null)
});

const reportPostSchema = Joi.object({
    reason: Joi.string().valid('spam', 'harassment', 'inappropriate', 'off_topic', 'other').required(),
    details: Joi.string().max(2000).allow('', null)
});

const moderateActionSchema = Joi.object({
    action: Joi.string().valid('dismiss', 'remove').required()
});

const ruleSchema = Joi.object({
    title: Joi.string().min(2).max(150).required(),
    description: Joi.string().max(2000).allow('', null),
    sortOrder: Joi.number().integer().min(0).default(0),
    active: Joi.boolean()
});

module.exports = {
    createPostSchema,
    updatePostSchema,
    addCommentSchema,
    reportPostSchema,
    moderateActionSchema,
    ruleSchema
};
