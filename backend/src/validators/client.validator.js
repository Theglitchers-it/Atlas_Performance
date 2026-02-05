/**
 * Validators per clienti
 */

const Joi = require('joi');

const createClientSchema = Joi.object({
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().allow('', null),
    dateOfBirth: Joi.date().allow(null),
    gender: Joi.string().valid('male', 'female', 'other').allow(null),
    heightCm: Joi.number().min(100).max(250).allow(null),
    initialWeightKg: Joi.number().min(30).max(300).allow(null),
    fitnessLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'elite').default('beginner'),
    primaryGoal: Joi.string().valid(
        'weight_loss', 'muscle_gain', 'strength', 'endurance',
        'flexibility', 'general_fitness', 'sport_specific'
    ).default('general_fitness'),
    secondaryGoals: Joi.array().items(Joi.string()),
    medicalNotes: Joi.string().allow('', null),
    dietaryRestrictions: Joi.array().items(Joi.string()),
    emergencyContactName: Joi.string().allow('', null),
    emergencyContactPhone: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    trainingLocation: Joi.string().valid('online', 'in_person', 'hybrid').default('hybrid'),
    assignedTo: Joi.number().allow(null),
    createAccount: Joi.boolean().default(false),
    password: Joi.string().min(8).when('createAccount', {
        is: true,
        then: Joi.required()
    })
});

const updateClientSchema = Joi.object({
    firstName: Joi.string().min(2).max(100),
    lastName: Joi.string().min(2).max(100),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().allow('', null),
    dateOfBirth: Joi.date().allow(null),
    gender: Joi.string().valid('male', 'female', 'other'),
    heightCm: Joi.number().min(100).max(250),
    currentWeightKg: Joi.number().min(30).max(300),
    fitnessLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'elite'),
    primaryGoal: Joi.string().valid(
        'weight_loss', 'muscle_gain', 'strength', 'endurance',
        'flexibility', 'general_fitness', 'sport_specific'
    ),
    secondaryGoals: Joi.array().items(Joi.string()),
    medicalNotes: Joi.string().allow('', null),
    dietaryRestrictions: Joi.array().items(Joi.string()),
    emergencyContactName: Joi.string().allow('', null),
    emergencyContactPhone: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    trainingLocation: Joi.string().valid('online', 'in_person', 'hybrid'),
    assignedTo: Joi.number().allow(null),
    status: Joi.string().valid('active', 'inactive', 'paused', 'cancelled')
});

const addGoalSchema = Joi.object({
    goalType: Joi.string().required(),
    targetValue: Joi.number().required(),
    currentValue: Joi.number().default(0),
    unit: Joi.string().required(),
    deadline: Joi.date().allow(null),
    priority: Joi.number().min(1).max(10).default(1),
    notes: Joi.string().allow('', null)
});

const addInjurySchema = Joi.object({
    bodyPart: Joi.string().required(),
    description: Joi.string().allow('', null),
    severity: Joi.string().valid('mild', 'moderate', 'severe').default('mild'),
    injuryDate: Joi.date().allow(null),
    restrictions: Joi.array().items(Joi.string()),
    notes: Joi.string().allow('', null)
});

module.exports = {
    createClientSchema,
    updateClientSchema,
    addGoalSchema,
    addInjurySchema
};
