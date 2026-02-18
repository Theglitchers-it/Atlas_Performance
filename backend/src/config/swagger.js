const swaggerJsdoc = require('swagger-jsdoc');
const packageJson = require('../../package.json');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Atlas PT Platform API',
            version: packageJson.version || '1.0.0',
            description: 'API completa per la piattaforma SaaS di Personal Training. Gestione clienti, allenamenti, prenotazioni, analytics, gamification e pagamenti.',
            contact: {
                name: 'Atlas PT Support',
                email: 'support@atlaspt.com'
            }
        },
        servers: [
            {
                url: '/api',
                description: 'API Server'
            }
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token'
                },
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Errore generico' }
                    }
                },
                PaginationMeta: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer', example: 100 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 20 },
                        totalPages: { type: 'integer', example: 5 }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        email: { type: 'string', format: 'email' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string', enum: ['tenant_owner', 'staff', 'client', 'super_admin'] },
                        tenantId: { type: 'string', format: 'uuid' }
                    }
                },
                Client: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'inactive', 'cancelled'] },
                        fitness_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                        date_of_birth: { type: 'string', format: 'date' },
                        goal_weight_kg: { type: 'number' }
                    }
                },
                Appointment: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        client_id: { type: 'integer' },
                        trainer_id: { type: 'integer' },
                        start_datetime: { type: 'string', format: 'date-time' },
                        end_datetime: { type: 'string', format: 'date-time' },
                        appointment_type: { type: 'string', enum: ['training', 'assessment', 'consultation', 'other'] },
                        status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] },
                        location: { type: 'string' },
                        notes: { type: 'string' }
                    }
                },
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        type: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        is_read: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        security: [
            { cookieAuth: [] },
            { bearerAuth: [] }
        ],
        tags: [
            { name: 'Auth', description: 'Autenticazione e gestione sessioni' },
            { name: 'Clients', description: 'Gestione clienti e profili' },
            { name: 'Booking', description: 'Prenotazioni e calendario appuntamenti' },
            { name: 'Sessions', description: 'Sessioni di allenamento e tracking' },
            { name: 'Analytics', description: 'Statistiche e report' },
            { name: 'Measurements', description: 'Misurazioni corporee e progressi' },
            { name: 'Readiness', description: 'Check-in giornaliero e readiness score' },
            { name: 'Gamification', description: 'XP, livelli, sfide e leaderboard' },
            { name: 'Payments', description: 'Pagamenti, sottoscrizioni e Stripe' },
            { name: 'Notifications', description: 'Notifiche push e in-app' },
            { name: 'Admin', description: 'Gestione piattaforma, tenant e fatturazione (super admin)' },
            { name: 'AI', description: 'Servizi di intelligenza artificiale e suggerimenti' },
            { name: 'Alerts', description: 'Smart training alerts e notifiche automatiche' },
            { name: 'Anthropometric', description: 'Parametri antropometrici, plicometria, circonferenze e BIA' },
            { name: 'API Keys', description: 'Gestione API keys per integrazioni esterne' },
            { name: 'Chat', description: 'Messaggistica real-time e conversazioni' },
            { name: 'Classes', description: 'Corsi di gruppo, sessioni e iscrizioni' },
            { name: 'Community', description: 'Post, commenti, like e feed social' },
            { name: 'Exercises', description: 'Libreria esercizi e gruppi muscolari' },
            { name: 'Locations', description: 'Gestione sedi multi-location' },
            { name: 'Nutrition', description: 'Piani alimentari, pasti e alimenti' },
            { name: 'Programs', description: 'Programmi di allenamento e periodizzazione' },
            { name: 'Progress', description: 'Foto progresso e record performance' },
            { name: 'Referrals', description: 'Programma referral e codici sconto' },
            { name: 'Search', description: 'Ricerca globale nella piattaforma' },
            { name: 'Titles', description: 'Titoli gamification e badge' },
            { name: 'Users', description: 'Gestione utenti e profili staff' },
            { name: 'Videos', description: 'Video library, corsi e moduli formativi' },
            { name: 'Volume', description: 'Volume analytics per gruppo muscolare' },
            { name: 'Webhooks', description: 'Webhook subscriptions e delivery logs' },
            { name: 'Workouts', description: 'Template workout e schede di allenamento' }
        ]
    },
    apis: ['./src/routes/*.routes.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
