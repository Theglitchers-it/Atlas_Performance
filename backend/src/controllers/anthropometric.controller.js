/**
 * Anthropometric Controller
 * Gestione parametri antropometrici, plicometria, circonferenze e BIA
 */

const anthropometricService = require('../services/anthropometric.service');

class AnthropometricController {
    // ============================================
    // PARAMETRI ANTROPOMETRICI BASE
    // ============================================

    async saveAnthropometric(req, res, next) {
        try {
            const result = await anthropometricService.saveAnthropometric(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'Dati antropometrici salvati', data: result });
        } catch (error) {
            next(error);
        }
    }

    async getLatest(req, res, next) {
        try {
            const data = await anthropometricService.getLatest(
                parseInt(req.params.clientId),
                req.user.tenantId
            );
            res.json({ success: true, data: { anthropometric: data } });
        } catch (error) {
            next(error);
        }
    }

    async getHistory(req, res, next) {
        try {
            const options = {
                limit: parseInt(req.query.limit) || 50,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };
            const history = await anthropometricService.getHistory(
                parseInt(req.params.clientId),
                req.user.tenantId,
                options
            );
            res.json({ success: true, data: { history } });
        } catch (error) {
            next(error);
        }
    }

    async deleteAnthropometric(req, res, next) {
        try {
            const deleted = await anthropometricService.deleteAnthropometric(
                parseInt(req.params.id),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Record non trovato' });
            }
            res.json({ success: true, message: 'Record eliminato' });
        } catch (error) {
            next(error);
        }
    }

    // ============================================
    // PLICOMETRIA
    // ============================================

    async saveSkinfold(req, res, next) {
        try {
            const result = await anthropometricService.saveSkinfold(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({
                success: true,
                message: 'Plicometria salvata',
                data: {
                    skinfold: result
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getLatestSkinfold(req, res, next) {
        try {
            const data = await anthropometricService.getLatestSkinfold(
                parseInt(req.params.clientId),
                req.user.tenantId
            );
            res.json({ success: true, data: { skinfold: data } });
        } catch (error) {
            next(error);
        }
    }

    async getSkinfoldHistory(req, res, next) {
        try {
            const history = await anthropometricService.getSkinfoldHistory(
                parseInt(req.params.clientId),
                req.user.tenantId,
                { limit: parseInt(req.query.limit) || 50 }
            );
            res.json({ success: true, data: { history } });
        } catch (error) {
            next(error);
        }
    }

    async getBodyFatTrend(req, res, next) {
        try {
            const trend = await anthropometricService.getBodyFatTrend(
                parseInt(req.params.clientId),
                req.user.tenantId,
                { limit: parseInt(req.query.limit) || 20 }
            );
            res.json({ success: true, data: { trend } });
        } catch (error) {
            next(error);
        }
    }

    async deleteSkinfold(req, res, next) {
        try {
            const deleted = await anthropometricService.deleteSkinfold(
                parseInt(req.params.id),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Record non trovato' });
            }
            res.json({ success: true, message: 'Plicometria eliminata' });
        } catch (error) {
            next(error);
        }
    }

    // ============================================
    // CIRCONFERENZE
    // ============================================

    async saveCircumference(req, res, next) {
        try {
            const result = await anthropometricService.saveCircumference(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({
                success: true,
                message: 'Circonferenze salvate',
                data: { circumference: result }
            });
        } catch (error) {
            next(error);
        }
    }

    async getLatestCircumference(req, res, next) {
        try {
            const data = await anthropometricService.getLatestCircumference(
                parseInt(req.params.clientId),
                req.user.tenantId
            );
            res.json({ success: true, data: { circumference: data } });
        } catch (error) {
            next(error);
        }
    }

    async getCircumferenceHistory(req, res, next) {
        try {
            const history = await anthropometricService.getCircumferenceHistory(
                parseInt(req.params.clientId),
                req.user.tenantId,
                { limit: parseInt(req.query.limit) || 50 }
            );
            res.json({ success: true, data: { history } });
        } catch (error) {
            next(error);
        }
    }

    async deleteCircumference(req, res, next) {
        try {
            const deleted = await anthropometricService.deleteCircumference(
                parseInt(req.params.id),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Record non trovato' });
            }
            res.json({ success: true, message: 'Circonferenze eliminate' });
        } catch (error) {
            next(error);
        }
    }

    // ============================================
    // BIA
    // ============================================

    async saveBia(req, res, next) {
        try {
            const result = await anthropometricService.saveBia(
                parseInt(req.params.clientId),
                req.user.tenantId,
                req.body
            );
            res.status(201).json({ success: true, message: 'BIA salvata', data: { bia: result } });
        } catch (error) {
            next(error);
        }
    }

    async getLatestBia(req, res, next) {
        try {
            const data = await anthropometricService.getLatestBia(
                parseInt(req.params.clientId),
                req.user.tenantId
            );
            res.json({ success: true, data: { bia: data } });
        } catch (error) {
            next(error);
        }
    }

    async getBiaHistory(req, res, next) {
        try {
            const history = await anthropometricService.getBiaHistory(
                parseInt(req.params.clientId),
                req.user.tenantId,
                { limit: parseInt(req.query.limit) || 50 }
            );
            res.json({ success: true, data: { history } });
        } catch (error) {
            next(error);
        }
    }

    async deleteBia(req, res, next) {
        try {
            const deleted = await anthropometricService.deleteBia(
                parseInt(req.params.id),
                req.user.tenantId
            );
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Record non trovato' });
            }
            res.json({ success: true, message: 'BIA eliminata' });
        } catch (error) {
            next(error);
        }
    }

    // ============================================
    // COMPOSIZIONE CORPOREA
    // ============================================

    async getOverview(req, res, next) {
        try {
            const overview = await anthropometricService.getBodyCompositionOverview(
                parseInt(req.params.clientId),
                req.user.tenantId
            );
            res.json({ success: true, data: { overview } });
        } catch (error) {
            next(error);
        }
    }

    async compareMeasurements(req, res, next) {
        try {
            const { date1, date2 } = req.query;
            if (!date1 || !date2) {
                return res.status(400).json({ success: false, message: 'date1 e date2 sono obbligatorie' });
            }
            const comparison = await anthropometricService.compareMeasurements(
                parseInt(req.params.clientId),
                req.user.tenantId,
                date1,
                date2
            );
            res.json({ success: true, data: { comparison } });
        } catch (error) {
            next(error);
        }
    }

    async getAvailableDates(req, res, next) {
        try {
            const dates = await anthropometricService.getAvailableDates(
                parseInt(req.params.clientId),
                req.user.tenantId
            );
            res.json({ success: true, data: { dates } });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AnthropometricController();
