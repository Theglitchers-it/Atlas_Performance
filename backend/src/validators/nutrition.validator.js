/**
 * Validators per nutrizione e piani alimentari
 */

const Joi = require('joi');

const createMealPlanSchema = Joi.object({
    name: Joi.string().min(2).max(255).required()
        .messages({
            'any.required': 'Nome piano obbligatorio',
            'string.min': 'Il nome del piano deve avere almeno 2 caratteri',
            'string.max': 'Il nome del piano non può superare i 255 caratteri',
            'string.empty': 'Nome piano obbligatorio'
        }),
    clientId: Joi.number().integer().required()
        .messages({ 'any.required': 'Cliente obbligatorio' }),
    targetCalories: Joi.number().integer().min(0).max(10000).allow(null),
    targetProteinG: Joi.number().min(0).allow(null),
    targetCarbsG: Joi.number().min(0).allow(null),
    targetFatG: Joi.number().min(0).allow(null),
    startDate: Joi.date().min('now').allow(null, '').messages({
        'date.min': 'La data di inizio non può essere nel passato'
    }),
    endDate: Joi.date().min('now').allow(null, '').messages({
        'date.min': 'La data di fine non può essere nel passato'
    }),
    notes: Joi.string().max(2000).allow('', null)
}).custom((value) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
        throw new Error('La data di fine deve essere uguale o successiva alla data di inizio');
    }
    return value;
});

const updateMealPlanSchema = Joi.object({
    name: Joi.string().min(2).max(255)
        .messages({
            'string.min': 'Il nome del piano deve avere almeno 2 caratteri',
            'string.max': 'Il nome del piano non può superare i 255 caratteri'
        }),
    targetCalories: Joi.number().integer().min(0).max(10000).allow(null),
    targetProteinG: Joi.number().min(0).allow(null),
    targetCarbsG: Joi.number().min(0).allow(null),
    targetFatG: Joi.number().min(0).allow(null),
    startDate: Joi.date().min('now').allow(null, '').messages({
        'date.min': 'La data di inizio non può essere nel passato'
    }),
    endDate: Joi.date().min('now').allow(null, '').messages({
        'date.min': 'La data di fine non può essere nel passato'
    }),
    status: Joi.string().valid('draft', 'active', 'archived').allow(null),
    notes: Joi.string().max(2000).allow('', null)
}).custom((value) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
        throw new Error('La data di fine deve essere uguale o successiva alla data di inizio');
    }
    return value;
});

const addPlanDaySchema = Joi.object({
    dayNumber: Joi.number().integer().min(1).max(7).required(),
    dayName: Joi.string().max(255).allow('', null),
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
