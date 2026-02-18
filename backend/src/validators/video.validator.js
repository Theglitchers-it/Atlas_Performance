/**
 * Validators per video e corsi
 */

const Joi = require('joi');

const createCourseSchema = Joi.object({
    title: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Titolo corso obbligatorio' }),
    description: Joi.string().max(2000).allow('', null),
    category: Joi.string().max(100).allow('', null),
    price: Joi.number().min(0).allow(null),
    currency: Joi.string().valid('EUR', 'USD', 'GBP').default('EUR'),
    thumbnailUrl: Joi.string().uri().allow('', null),
    isPublished: Joi.boolean().default(false),
    isFree: Joi.boolean().default(false),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').allow(null),
    estimatedDurationMinutes: Joi.number().integer().min(1).allow(null)
});

const updateCourseSchema = Joi.object({
    title: Joi.string().min(2).max(255),
    description: Joi.string().max(2000).allow('', null),
    category: Joi.string().max(100).allow('', null),
    price: Joi.number().min(0).allow(null),
    currency: Joi.string().valid('EUR', 'USD', 'GBP'),
    thumbnailUrl: Joi.string().uri().allow('', null),
    isPublished: Joi.boolean(),
    isFree: Joi.boolean(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').allow(null),
    estimatedDurationMinutes: Joi.number().integer().min(1).allow(null)
});

const createVideoSchema = Joi.object({
    title: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Titolo video obbligatorio' }),
    description: Joi.string().max(2000).allow('', null),
    videoUrl: Joi.string().uri().allow('', null),
    thumbnailUrl: Joi.string().uri().allow('', null),
    courseId: Joi.number().integer().allow(null),
    moduleOrder: Joi.number().integer().min(0).allow(null),
    durationMinutes: Joi.number().integer().min(0).allow(null),
    category: Joi.string().max(100).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)),
    isPublished: Joi.boolean().default(false)
});

const updateVideoSchema = Joi.object({
    title: Joi.string().min(2).max(255),
    description: Joi.string().max(2000).allow('', null),
    videoUrl: Joi.string().uri().allow('', null),
    thumbnailUrl: Joi.string().uri().allow('', null),
    courseId: Joi.number().integer().allow(null),
    moduleOrder: Joi.number().integer().min(0).allow(null),
    durationMinutes: Joi.number().integer().min(0).allow(null),
    category: Joi.string().max(100).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)),
    isPublished: Joi.boolean()
});

module.exports = {
    createCourseSchema,
    updateCourseSchema,
    createVideoSchema,
    updateVideoSchema
};
