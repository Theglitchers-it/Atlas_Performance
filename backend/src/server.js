/**
 * PT SAAS - Server Entry Point
 * Piattaforma SaaS per Personal Trainer
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

// Import configurations
const { connectDB } = require('./config/database');
const { initSocket } = require('./socket/socketHandler');

// Import middlewares
const { errorHandler } = require('./middlewares/errorHandler');
const { notFound } = require('./middlewares/notFound');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const clientRoutes = require('./routes/client.routes');
const exerciseRoutes = require('./routes/exercise.routes');
const workoutRoutes = require('./routes/workout.routes');
const programRoutes = require('./routes/program.routes');
const sessionRoutes = require('./routes/session.routes');
const measurementRoutes = require('./routes/measurement.routes');
const nutritionRoutes = require('./routes/nutrition.routes');
const chatRoutes = require('./routes/chat.routes');
const communityRoutes = require('./routes/community.routes');
const bookingRoutes = require('./routes/booking.routes');
const classRoutes = require('./routes/class.routes');
const videoRoutes = require('./routes/video.routes');
const gamificationRoutes = require('./routes/gamification.routes');
const notificationRoutes = require('./routes/notification.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiRoutes = require('./routes/ai.routes');
const paymentRoutes = require('./routes/payment.routes');
const readinessRoutes = require('./routes/readiness.routes');
const anthropometricRoutes = require('./routes/anthropometric.routes');
const titleRoutes = require('./routes/title.routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible to routes
app.set('io', io);

// Security middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Troppe richieste, riprova tra qualche minuto'
    }
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'PT SAAS API',
        version: '1.0.0',
        description: 'Piattaforma SaaS per Personal Trainer',
        documentation: '/api',
        health: '/health',
        frontend: process.env.FRONTEND_URL || 'http://localhost:5173'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/readiness', readinessRoutes);
app.use('/api/anthropometric', anthropometricRoutes);
app.use('/api/titles', titleRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Initialize Socket handlers
initSocket(io);

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('Database connesso con successo');

        // Start listening
        server.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   PT SAAS - Server avviato con successo!              ║
║                                                       ║
║   Porta: ${PORT}                                        ║
║   Ambiente: ${process.env.NODE_ENV || 'development'}                        ║
║   URL: http://localhost:${PORT}                         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Errore avvio server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM ricevuto. Chiusura graceful...');
    server.close(() => {
        console.log('Server chiuso');
        process.exit(0);
    });
});

module.exports = { app, server, io };
