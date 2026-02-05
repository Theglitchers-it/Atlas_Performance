/**
 * Measurement Controller
 */

const measurementService = require('../services/measurement.service');

class MeasurementController {
    async getAllProgress(req, res, next) {
        try {
            const progress = await measurementService.getAllProgress(
                parseInt(req.params.clientId),
                req.user.tenantId
            );
            res.json({ success: true, data: progress });
        } catch (error) {
            next(error);
        }
    }

    async getBodyMeasurements(req, res, next) {
        try {
            const options = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: parseInt(req.query.limit) || 30
            };
            const measurements = await measurementService.getBodyMeasurements(
                parseInt(req.params.clientId),
                req.user.tenantId,
                options
            );
            res.json({ success: true, data: { measurements } });
        } catch (error) {
            next(error);
        }
    }

    async addBodyMeasurement(req, res, next) {
        try {
            const result = await measurementService.addBodyMeasurement(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'Misurazione aggiunta', data: result });
        } catch (error) {
            next(error);
        }
    }

    async getCircumferences(req, res, next) {
        try {
            const circumferences = await measurementService.getCircumferences(
                parseInt(req.params.clientId),
                req.user.tenantId,
                { limit: parseInt(req.query.limit) || 30 }
            );
            res.json({ success: true, data: { circumferences } });
        } catch (error) {
            next(error);
        }
    }

    async addCircumferences(req, res, next) {
        try {
            const result = await measurementService.addCircumferences(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'Circonferenze aggiunte', data: result });
        } catch (error) {
            next(error);
        }
    }

    async getSkinfolds(req, res, next) {
        try {
            const skinfolds = await measurementService.getSkinfolds(
                parseInt(req.params.clientId),
                req.user.tenantId,
                { limit: parseInt(req.query.limit) || 30 }
            );
            res.json({ success: true, data: { skinfolds } });
        } catch (error) {
            next(error);
        }
    }

    async addSkinfolds(req, res, next) {
        try {
            const result = await measurementService.addSkinfolds(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'Plicometria aggiunta', data: result });
        } catch (error) {
            next(error);
        }
    }

    async getBiaMeasurements(req, res, next) {
        try {
            const biaMeasurements = await measurementService.getBiaMeasurements(
                parseInt(req.params.clientId),
                req.user.tenantId,
                { limit: parseInt(req.query.limit) || 30 }
            );
            res.json({ success: true, data: { biaMeasurements } });
        } catch (error) {
            next(error);
        }
    }

    async addBiaMeasurement(req, res, next) {
        try {
            const result = await measurementService.addBiaMeasurement(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'BIA aggiunta', data: result });
        } catch (error) {
            next(error);
        }
    }

    async getWeightChange(req, res, next) {
        try {
            const change = await measurementService.getWeightChange(
                parseInt(req.params.clientId),
                req.user.tenantId,
                parseInt(req.query.days) || 30
            );
            res.json({ success: true, data: { weightChange: change } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new MeasurementController();
