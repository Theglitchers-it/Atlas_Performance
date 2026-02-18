/**
 * Analytics Service
 * Aggregazione dati e statistiche per il tenant
 */

const { query } = require('../config/database');

class AnalyticsService {
    /**
     * Overview generale del tenant
     */
    async getOverview(tenantId) {
        const [clientStats] = await query(
            `SELECT
                COUNT(*) as total_clients,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_clients,
                SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_clients_30d
            FROM clients WHERE tenant_id = ?`, [tenantId]
        );

        const [sessionStats] = await query(
            `SELECT
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN duration_minutes END), 0) as avg_duration,
                SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as sessions_this_week
            FROM workout_sessions WHERE tenant_id = ?`, [tenantId]
        );

        const [appointmentStats] = await query(
            `SELECT
                COUNT(*) as total_appointments,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
                SUM(CASE WHEN DATE(start_datetime) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as appointments_this_week
            FROM appointments WHERE tenant_id = ?`, [tenantId]
        );

        const [programStats] = await query(
            `SELECT
                COUNT(*) as total_programs,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_programs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_programs
            FROM client_programs WHERE tenant_id = ?`, [tenantId]
        );

        return {
            clients: clientStats,
            sessions: sessionStats,
            appointments: appointmentStats,
            programs: programStats
        };
    }

    /**
     * Trend sessioni per periodo (ultimi 12 periodi)
     */
    async getSessionTrend(tenantId, groupBy = 'week') {
        let dateFormat, interval;
        if (groupBy === 'day') {
            dateFormat = '%Y-%m-%d';
            interval = '30 DAY';
        } else if (groupBy === 'month') {
            dateFormat = '%Y-%m';
            interval = '12 MONTH';
        } else {
            dateFormat = '%x-W%v'; // ISO week
            interval = '12 WEEK';
        }

        const rows = await query(
            `SELECT
                DATE_FORMAT(created_at, ?) as period,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM workout_sessions
            WHERE tenant_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${interval})
            GROUP BY period ORDER BY period ASC`,
            [dateFormat, tenantId]
        );

        return rows;
    }

    /**
     * Clienti piu attivi (per sessioni completate)
     */
    async getTopClients(tenantId, limit = 10) {
        const rows = await query(
            `SELECT
                c.id, c.first_name, c.last_name,
                COUNT(ws.id) as total_sessions,
                SUM(CASE WHEN ws.status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
                COALESCE(SUM(ws.duration_minutes), 0) as total_minutes,
                c.xp_points, c.level
            FROM clients c
            LEFT JOIN workout_sessions ws ON ws.client_id = c.id AND ws.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            WHERE c.tenant_id = ?
            GROUP BY c.id
            ORDER BY completed_sessions DESC
            LIMIT ?`,
            [tenantId, parseInt(limit)]
        );
        return rows;
    }

    /**
     * Distribuzione tipi appuntamento
     */
    async getAppointmentDistribution(tenantId) {
        const rows = await query(
            `SELECT appointment_type, COUNT(*) as count
            FROM appointments
            WHERE tenant_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY appointment_type`,
            [tenantId]
        );
        return rows;
    }

    /**
     * Media readiness score ultimi 30 giorni
     */
    async getReadinessTrend(tenantId) {
        const rows = await query(
            `SELECT
                DATE(dc.checkin_date) as date,
                AVG(dc.readiness_score) as avg_score,
                COUNT(*) as checkins
            FROM daily_checkins dc
            JOIN clients c ON dc.client_id = c.id
            WHERE c.tenant_id = ? AND dc.checkin_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(dc.checkin_date)
            ORDER BY date ASC`,
            [tenantId]
        );
        return rows;
    }

    /**
     * Completamento programmi
     */
    async getProgramCompletion(tenantId) {
        const rows = await query(
            `SELECT status, COUNT(*) as count
            FROM client_programs
            WHERE tenant_id = ?
            GROUP BY status`,
            [tenantId]
        );
        return rows;
    }

    /**
     * Statistiche rapide per dashboard
     */
    async getQuickStats(tenantId) {
        const [stats] = await query(
            `SELECT
                (SELECT COUNT(*) FROM clients WHERE tenant_id = ? AND status = 'active') as active_clients,
                (SELECT COUNT(*) FROM workout_sessions WHERE tenant_id = ? AND DATE(created_at) = CURDATE()) as sessions_today,
                (SELECT COUNT(*) FROM appointments WHERE tenant_id = ? AND DATE(start_datetime) = CURDATE() AND status != 'cancelled') as appointments_today,
                (SELECT AVG(readiness_score) FROM daily_checkins dc JOIN clients c ON dc.client_id = c.id WHERE c.tenant_id = ? AND dc.checkin_date = CURDATE()) as avg_readiness_today`,
            [tenantId, tenantId, tenantId, tenantId]
        );
        return stats;
    }
}

module.exports = new AnalyticsService();
