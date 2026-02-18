/**
 * Measurement Controller - Controller Unificato
 * CRUD completo per antropometria, peso, circonferenze, plicometria, BIA
 */

const measurementService = require("../services/measurement.service");

class MeasurementController {
  // ============================================
  // OVERVIEW & DASHBOARD
  // ============================================

  async getOverview(req, res, next) {
    try {
      const data = await measurementService.getOverview(
        parseInt(req.params.clientId),
        req.user.tenantId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getWeightChange(req, res, next) {
    try {
      const data = await measurementService.getWeightChange(
        parseInt(req.params.clientId),
        req.user.tenantId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async compareMeasurements(req, res, next) {
    try {
      const { date1, date2 } = req.query;
      if (!date1 || !date2) {
        return res
          .status(400)
          .json({ success: false, message: "date1 e date2 sono obbligatorie" });
      }
      const data = await measurementService.compareMeasurements(
        parseInt(req.params.clientId),
        req.user.tenantId,
        date1,
        date2,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableDates(req, res, next) {
    try {
      const data = await measurementService.getAvailableDates(
        parseInt(req.params.clientId),
        req.user.tenantId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ANTROPOMETRIA
  // ============================================

  async getAnthropometricList(req, res, next) {
    try {
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 50,
      };
      const data = await measurementService.getAnthropometricList(
        parseInt(req.params.clientId),
        req.user.tenantId,
        options,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLatestAnthropometric(req, res, next) {
    try {
      const data = await measurementService.getLatestAnthropometric(
        parseInt(req.params.clientId),
        req.user.tenantId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createAnthropometric(req, res, next) {
    try {
      const data = await measurementService.createAnthropometric(
        parseInt(req.params.clientId),
        req.user.tenantId,
        req.body,
      );
      res
        .status(201)
        .json({ success: true, message: "Dati antropometrici salvati", data });
    } catch (error) {
      next(error);
    }
  }

  async updateAnthropometric(req, res, next) {
    try {
      const data = await measurementService.updateAnthropometric(
        parseInt(req.params.id),
        req.user.tenantId,
        req.body,
      );
      if (!data)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({
        success: true,
        message: "Dati antropometrici aggiornati",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAnthropometric(req, res, next) {
    try {
      const deleted = await measurementService.deleteAnthropometric(
        parseInt(req.params.id),
        req.user.tenantId,
      );
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({ success: true, message: "Dato antropometrico eliminato" });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PESO & COMPOSIZIONE CORPOREA (BODY)
  // ============================================

  async getBodyList(req, res, next) {
    try {
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 50,
      };
      const data = await measurementService.getBodyList(
        parseInt(req.params.clientId),
        req.user.tenantId,
        options,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLatestBody(req, res, next) {
    try {
      const data = await measurementService.getLatestBody(
        parseInt(req.params.clientId),
        req.user.tenantId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createBody(req, res, next) {
    try {
      const data = await measurementService.createBody(
        parseInt(req.params.clientId),
        req.user.tenantId,
        req.body,
      );
      res
        .status(201)
        .json({ success: true, message: "Misurazione corporea salvata", data });
    } catch (error) {
      next(error);
    }
  }

  async updateBody(req, res, next) {
    try {
      const data = await measurementService.updateBody(
        parseInt(req.params.id),
        req.user.tenantId,
        req.body,
      );
      if (!data)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({
        success: true,
        message: "Misurazione corporea aggiornata",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBody(req, res, next) {
    try {
      const deleted = await measurementService.deleteBody(
        parseInt(req.params.id),
        req.user.tenantId,
      );
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({ success: true, message: "Misurazione corporea eliminata" });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // CIRCONFERENZE
  // ============================================

  async getCircumferenceList(req, res, next) {
    try {
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 50,
      };
      const data = await measurementService.getCircumferenceList(
        parseInt(req.params.clientId),
        req.user.tenantId,
        options,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLatestCircumference(req, res, next) {
    try {
      const data = await measurementService.getLatestCircumference(
        parseInt(req.params.clientId),
        req.user.tenantId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createCircumference(req, res, next) {
    try {
      const data = await measurementService.createCircumference(
        parseInt(req.params.clientId),
        req.user.tenantId,
        req.body,
      );
      res
        .status(201)
        .json({ success: true, message: "Circonferenze salvate", data });
    } catch (error) {
      next(error);
    }
  }

  async updateCircumference(req, res, next) {
    try {
      const data = await measurementService.updateCircumference(
        parseInt(req.params.id),
        req.user.tenantId,
        req.body,
      );
      if (!data)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({ success: true, message: "Circonferenze aggiornate", data });
    } catch (error) {
      next(error);
    }
  }

  async deleteCircumference(req, res, next) {
    try {
      const deleted = await measurementService.deleteCircumference(
        parseInt(req.params.id),
        req.user.tenantId,
      );
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({ success: true, message: "Circonferenze eliminate" });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PLICOMETRIA
  // ============================================

  async getSkinfoldList(req, res, next) {
    try {
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 50,
      };
      const data = await measurementService.getSkinfoldList(
        parseInt(req.params.clientId),
        req.user.tenantId,
        options,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLatestSkinfold(req, res, next) {
    try {
      const data = await measurementService.getLatestSkinfold(
        parseInt(req.params.clientId),
        req.user.tenantId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createSkinfold(req, res, next) {
    try {
      const data = await measurementService.createSkinfold(
        parseInt(req.params.clientId),
        req.user.tenantId,
        req.body,
      );
      res
        .status(201)
        .json({ success: true, message: "Plicometria salvata", data });
    } catch (error) {
      next(error);
    }
  }

  async updateSkinfold(req, res, next) {
    try {
      const data = await measurementService.updateSkinfold(
        parseInt(req.params.id),
        req.user.tenantId,
        req.body,
      );
      if (!data)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({ success: true, message: "Plicometria aggiornata", data });
    } catch (error) {
      next(error);
    }
  }

  async deleteSkinfold(req, res, next) {
    try {
      const deleted = await measurementService.deleteSkinfold(
        parseInt(req.params.id),
        req.user.tenantId,
      );
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({ success: true, message: "Plicometria eliminata" });
    } catch (error) {
      next(error);
    }
  }

  async getBodyFatTrend(req, res, next) {
    try {
      const data = await measurementService.getBodyFatTrend(
        parseInt(req.params.clientId),
        req.user.tenantId,
        { limit: parseInt(req.query.limit) || 20 },
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // BIA - BIOIMPEDENZA
  // ============================================

  async getBiaList(req, res, next) {
    try {
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 50,
      };
      const data = await measurementService.getBiaList(
        parseInt(req.params.clientId),
        req.user.tenantId,
        options,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLatestBia(req, res, next) {
    try {
      const data = await measurementService.getLatestBia(
        parseInt(req.params.clientId),
        req.user.tenantId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createBia(req, res, next) {
    try {
      const data = await measurementService.createBia(
        parseInt(req.params.clientId),
        req.user.tenantId,
        req.body,
      );
      res.status(201).json({ success: true, message: "BIA salvata", data });
    } catch (error) {
      next(error);
    }
  }

  async updateBia(req, res, next) {
    try {
      const data = await measurementService.updateBia(
        parseInt(req.params.id),
        req.user.tenantId,
        req.body,
      );
      if (!data)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({ success: true, message: "BIA aggiornata", data });
    } catch (error) {
      next(error);
    }
  }

  async deleteBia(req, res, next) {
    try {
      const deleted = await measurementService.deleteBia(
        parseInt(req.params.id),
        req.user.tenantId,
      );
      if (!deleted)
        return res
          .status(404)
          .json({ success: false, message: "Record non trovato" });
      res.json({ success: true, message: "BIA eliminata" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MeasurementController();
