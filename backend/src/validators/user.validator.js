/**
 * Validators per utenti
 */

const Joi = require('joi');

const createUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('staff', 'client').default('staff'),
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(2).max(100).required(),
    phone: Joi.string().allow('', null)
});

const updateUserSchema = Joi.object({
    firstName: Joi.string().min(2).max(100),
    lastName: Joi.string().min(2).max(100),
    phone: Joi.string().allow('', null),
    avatarUrl: Joi.string().uri().allow('', null),
    status: Joi.string().valid('active', 'inactive', 'suspended'),
    preferences: Joi.object()
});

module.exports = {
    createUserSchema,
    updateUserSchema
};
