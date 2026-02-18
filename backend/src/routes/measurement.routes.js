/**
 * Measurement Routes - Route Unificate
 * CRUD completo per tutte le misurazioni corporee
 */

const express = require("express");
const router = express.Router();

const mc = require("../controllers/measurement.controller");
const { verifyToken, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const {
  anthropometricSchema,
  bodyMeasurementSchema,
  circumferenceSchema,
  skinfoldSchema,
  biaMeasurementSchema,
} = require("../validators/measurement.validator");

const trainerRole = requireRole("tenant_owner", "staff", "super_admin");

router.use(verifyToken);

// ============================================
// OVERVIEW & DASHBOARD
// ============================================

router.get("/:clientId/overview", mc.getOverview);
router.get("/:clientId/weight-change", mc.getWeightChange);
router.get("/:clientId/compare", mc.compareMeasurements);
router.get("/:clientId/dates", mc.getAvailableDates);

// ============================================
// ANTROPOMETRIA
// ============================================

router.get("/:clientId/anthropometric", mc.getAnthropometricList);
router.get("/:clientId/anthropometric/latest", mc.getLatestAnthropometric);
router.post(
  "/:clientId/anthropometric",
  trainerRole,
  validate(anthropometricSchema),
  mc.createAnthropometric,
);
router.put(
  "/:clientId/anthropometric/:id",
  trainerRole,
  validate(anthropometricSchema),
  mc.updateAnthropometric,
);
router.delete(
  "/:clientId/anthropometric/:id",
  trainerRole,
  mc.deleteAnthropometric,
);

// ============================================
// PESO & COMPOSIZIONE CORPOREA (BODY)
// ============================================

router.get("/:clientId/body", mc.getBodyList);
router.get("/:clientId/body/latest", mc.getLatestBody);
router.post(
  "/:clientId/body",
  trainerRole,
  validate(bodyMeasurementSchema),
  mc.createBody,
);
router.put(
  "/:clientId/body/:id",
  trainerRole,
  validate(bodyMeasurementSchema),
  mc.updateBody,
);
router.delete("/:clientId/body/:id", trainerRole, mc.deleteBody);

// ============================================
// CIRCONFERENZE
// ============================================

router.get("/:clientId/circumferences", mc.getCircumferenceList);
router.get("/:clientId/circumferences/latest", mc.getLatestCircumference);
router.post(
  "/:clientId/circumferences",
  trainerRole,
  validate(circumferenceSchema),
  mc.createCircumference,
);
router.put(
  "/:clientId/circumferences/:id",
  trainerRole,
  validate(circumferenceSchema),
  mc.updateCircumference,
);
router.delete(
  "/:clientId/circumferences/:id",
  trainerRole,
  mc.deleteCircumference,
);

// ============================================
// PLICOMETRIA
// ============================================

router.get("/:clientId/skinfolds", mc.getSkinfoldList);
router.get("/:clientId/skinfolds/latest", mc.getLatestSkinfold);
router.get("/:clientId/skinfolds/body-fat-trend", mc.getBodyFatTrend);
router.post(
  "/:clientId/skinfolds",
  trainerRole,
  validate(skinfoldSchema),
  mc.createSkinfold,
);
router.put(
  "/:clientId/skinfolds/:id",
  trainerRole,
  validate(skinfoldSchema),
  mc.updateSkinfold,
);
router.delete("/:clientId/skinfolds/:id", trainerRole, mc.deleteSkinfold);

// ============================================
// BIA - BIOIMPEDENZA
// ============================================

router.get("/:clientId/bia", mc.getBiaList);
router.get("/:clientId/bia/latest", mc.getLatestBia);
router.post(
  "/:clientId/bia",
  trainerRole,
  validate(biaMeasurementSchema),
  mc.createBia,
);
router.put(
  "/:clientId/bia/:id",
  trainerRole,
  validate(biaMeasurementSchema),
  mc.updateBia,
);
router.delete("/:clientId/bia/:id", trainerRole, mc.deleteBia);

module.exports = router;
