/**
 * Validators per nutrizione e piani alimentari
 */

const Joi = require('joi');

const createMealPlanSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
        .messages({ 'any.required': 'Nome piano obbligatorio' }),
    clientId: Joi.number().integer().required()
        .messages({ 'any.required': 'Cliente obbligatorio' }),
    dailyCaloriesTarget: Joi.number().integer().min(500).max(10000).allow(null),
    proteinTargetG: Joi.number().min(0).allow(null),
    carbsTargetG: Joi.number().min(0).allow(null),
    fatTargetG: Joi.number().min(0).allow(null),
    startDate: Joi.date().allow(null),
    endDate: Joi.date().allow(null),
    notes: Joi.string().max(2000).allow('', null)
});

const updateMealPlanSchema = Joi.object({
    name: Joi.string().min(2).max(255),
    dailyCaloriesTarget: Joi.number().integer().min(500).max(10000).allow(null),
    proteinTargetG: Joi.number().min(0).allow(null),
    carbsTargetG: Joi.number().min(0).allow(null),
    fatTargetG: Joi.number().min(0).allow(null),
    startDate: Joi.date().allow(null),
    endDate: Joi.date().allow(null),
    notes: Joi.string().max(2000).allow('', null)
});

const addPlanDaySchema = Joi.object({
    dayOfWeek: Joi.number().integer().min(1).max(7).required(),
    notes: Joi.string().max(500).allow('', null)
});

const addMealSchema = Joi.object({
    mealType: Joi.string().valid(
        'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack'
    ).required(),
    name: Joi.string().max(255).allow('', null),
    notes: Joi.string().max(500).allow('', null)
});

const addMealItemSchema = Joi.object({
    foodName: Joi.string().min(1).max(255).required(),
    foodDescription: Joi.string().max(500).allow('', null),
    quantity: Joi.number().positive().allow(null),
    unit: Joi.string().max(50).allow('', null),
    calories: Joi.number().min(0).allow(null),
    proteinG: Joi.number().min(0).allow(null),
    carbsG: Joi.number().min(0).allow(null),
    fatG: Joi.number().min(0).allow(null),
    fiberG: Joi.number().min(0).allow(null),
    notes: Joi.string().max(500).allow('', null)
});

module.exports = {
    createMealPlanSchema,
    updateMealPlanSchema,
    addPlanDaySchema,
    addMealSchema,
    addMealItemSchema
};
