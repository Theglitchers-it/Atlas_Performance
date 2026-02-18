/**
 * Validators per misurazioni corporee unificate
 * Allineati alle colonne reali del database
 */

const Joi = require("joi");

const anthropometricSchema = Joi.object({
  measurementDate: Joi.date().default(() => new Date()),
  heightCm: Joi.number().min(50).max(250).allow(null),
  weightKg: Joi.number().min(20).max(400).allow(null),
  ageYears: Joi.number().integer().min(5).max(120).allow(null),
  dailyStepsAvg: Joi.number().integer().min(0).max(100000).allow(null),
  notes: Joi.string().max(1000).allow("", null),
}).options({ stripUnknown: true });

const bodyMeasurementSchema = Joi.object({
  measurementDate: Joi.date().default(() => new Date()),
  weightKg: Joi.number().min(20).max(400).allow(null),
  bodyFatPercentage: Joi.number().min(1).max(60).allow(null),
  muscleMassKg: Joi.number().min(10).max(200).allow(null),
  notes: Joi.string().max(1000).allow("", null),
}).options({ stripUnknown: true });

const circumferenceSchema = Joi.object({
  measurementDate: Joi.date().default(() => new Date()),
  waistCm: Joi.number().min(30).max(200).allow(null),
  hipsCm: Joi.number().min(40).max(200).allow(null),
  bicepsCm: Joi.number().min(15).max(70).allow(null),
  bicepsFlexedCm: Joi.number().min(15).max(80).allow(null),
  shouldersCm: Joi.number().min(60).max(200).allow(null),
  chestCm: Joi.number().min(50).max(200).allow(null),
  thighUpperCm: Joi.number().min(30).max(100).allow(null),
  thighLowerCm: Joi.number().min(20).max(80).allow(null),
  glutesCm: Joi.number().min(50).max(200).allow(null),
  notes: Joi.string().max(1000).allow("", null),
}).options({ stripUnknown: true });

const skinfoldSchema = Joi.object({
  measurementDate: Joi.date().default(() => new Date()),
  chestMm: Joi.number().min(1).max(80).allow(null),
  subscapularMm: Joi.number().min(1).max(80).allow(null),
  suprailiacMm: Joi.number().min(1).max(80).allow(null),
  abdominalMm: Joi.number().min(1).max(80).allow(null),
  quadricepsMm: Joi.number().min(1).max(80).allow(null),
  bicepsMm: Joi.number().min(1).max(80).allow(null),
  tricepsMm: Joi.number().min(1).max(80).allow(null),
  cheekMm: Joi.number().min(1).max(80).allow(null),
  calfMm: Joi.number().min(1).max(80).allow(null),
  calculationMethod: Joi.string()
    .valid("jackson_pollock_3", "jackson_pollock_7", "durnin_womersley")
    .default("jackson_pollock_3"),
  gender: Joi.string().valid("male", "female").default("male"),
  age: Joi.number().integer().min(5).max(120).default(30),
  notes: Joi.string().max(1000).allow("", null),
}).options({ stripUnknown: true });

const biaMeasurementSchema = Joi.object({
  measurementDate: Joi.date().default(() => new Date()),
  leanMassKg: Joi.number().min(10).max(200).allow(null),
  leanMassPct: Joi.number().min(10).max(99).allow(null),
  fatMassKg: Joi.number().min(0).max(200).allow(null),
  fatMassPct: Joi.number().min(1).max(60).allow(null),
  totalBodyWaterL: Joi.number().min(10).max(100).allow(null),
  totalBodyWaterPct: Joi.number().min(30).max(80).allow(null),
  muscleMassKg: Joi.number().min(10).max(200).allow(null),
  basalMetabolicRate: Joi.number().integer().min(500).max(5000).allow(null),
  visceralFatLevel: Joi.number().min(1).max(30).allow(null),
  boneMassKg: Joi.number().min(0.5).max(10).allow(null),
  deviceModel: Joi.string().max(100).allow("", null),
  notes: Joi.string().max(1000).allow("", null),
}).options({ stripUnknown: true });

module.exports = {
  anthropometricSchema,
  bodyMeasurementSchema,
  circumferenceSchema,
  skinfoldSchema,
  biaMeasurementSchema,
};
