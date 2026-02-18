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
    tags: Joi.array().items(Joi.string().max(50))
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

module.exports = {
    createPostSchema,
    updatePostSchema,
    addCommentSchema
};
