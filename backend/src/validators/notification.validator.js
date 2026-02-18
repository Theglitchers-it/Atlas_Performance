/**
 * Validators per notifiche
 */

const Joi = require('joi');

const registerDeviceTokenSchema = Joi.object({
    token: Joi.string().required()
        .messages({ 'any.required': 'Token dispositivo obbligatorio' }),
    platform: Joi.string().valid('web', 'android', 'ios').default('web'),
    deviceInfo: Joi.string().max(500).allow('', null)
});

const updatePreferencesSchema = Joi.object({
    emailEnabled: Joi.boolean(),
    pushEnabled: Joi.boolean(),
    inAppEnabled: Joi.boolean(),
    workoutReminders: Joi.boolean(),
    checkinReminders: Joi.boolean(),
    achievementNotifications: Joi.boolean(),
    chatNotifications: Joi.boolean(),
    marketingEmails: Joi.boolean()
});

module.exports = {
    registerDeviceTokenSchema,
    updatePreferencesSchema
};
