/**
 * Validators per pagamenti e abbonamenti
 */

const Joi = require('joi');

const createPaymentSchema = Joi.object({
    clientId: Joi.number().integer().required()
        .messages({ 'any.required': 'Cliente obbligatorio' }),
    amount: Joi.number().positive().required()
        .messages({ 'any.required': 'Importo obbligatorio' }),
    currency: Joi.string().valid('EUR', 'USD', 'GBP').default('EUR'),
    paymentMethod: Joi.string().valid('cash', 'card', 'bank_transfer', 'stripe', 'other').allow(null),
    paymentDate: Joi.date().default(() => new Date()),
    status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled').default('completed'),
    transactionId: Joi.string().max(255).allow('', null),
    notes: Joi.string().max(1000).allow('', null)
});

const updatePaymentStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled').required()
});

const createSubscriptionSchema = Joi.object({
    clientId: Joi.number().integer().required(),
    planType: Joi.string().valid('monthly', 'quarterly', 'semi_annual', 'annual', 'custom').required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid('EUR', 'USD', 'GBP').default('EUR'),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).allow(null),
    autoRenew: Joi.boolean().default(true),
    notes: Joi.string().max(1000).allow('', null)
});

const stripeCheckoutSchema = Joi.object({
    itemType: Joi.string().valid('course', 'video').required(),
    itemId: Joi.number().integer().required(),
    successUrl: Joi.string().uri().required(),
    cancelUrl: Joi.string().uri().required()
});

module.exports = {
    createPaymentSchema,
    updatePaymentStatusSchema,
    createSubscriptionSchema,
    stripeCheckoutSchema
};
