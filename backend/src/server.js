/**
 * Atlas - Server Entry Point
 * Piattaforma per Personal Trainer
 */

require("dotenv").config();
const { createServiceLogger } = require("./config/logger");
const logger = createServiceLogger("SERVER");

// Validate critical environment variables
const REQUIRED_ENV = [
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  if (process.env.NODE_ENV === "production") {
    logger.error(`Variabili d'ambiente mancanti: ${missing.join(", ")}`);
    logger.error(
      "Impossibile avviare il server in produzione senza queste variabili.",
    );
    process.exit(1);
  }
  logger.warn(`Variabili d'ambiente mancanti: ${missing.join(", ")}`);
  logger.warn(
    "Il server usera i valori di default. Configura il file .env per la produzione.",
  );
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

// Import configurations
const { connectDB } = require("./config/database");
const { initFirebase } = require("./config/firebase");
const { initSocket } = require("./socket/socketHandler");
const cron = require("node-cron");
const { checkAllTitleUnlocks } = require("./cron/checkTitleUnlocks");
const { sendAllReminders } = require("./cron/sendReminders");
const { checkAllAlerts } = require("./cron/checkAlerts");

// Import middlewares
const { errorHandler } = require("./middlewares/errorHandler");
const { notFound } = require("./middlewares/notFound");
const { csrfProtection } = require("./middlewares/csrfProtection");
const { validateTenant } = require("./middlewares/tenantContext");
const { verifyToken } = require("./middlewares/auth");
const { requestId } = require("./middlewares/requestId");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const clientRoutes = require("./routes/client.routes");
const exerciseRoutes = require("./routes/exercise.routes");
const workoutRoutes = require("./routes/workout.routes");
const programRoutes = require("./routes/program.routes");
const sessionRoutes = require("./routes/session.routes");
const measurementRoutes = require("./routes/measurement.routes");
const nutritionRoutes = require("./routes/nutrition.routes");
const chatRoutes = require("./routes/chat.routes");
const communityRoutes = require("./routes/community.routes");
const bookingRoutes = require("./routes/booking.routes");
const classRoutes = require("./routes/class.routes");
const videoRoutes = require("./routes/video.routes");
const gamificationRoutes = require("./routes/gamification.routes");
const notificationRoutes = require("./routes/notification.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const aiRoutes = require("./routes/ai.routes");
const paymentRoutes = require("./routes/payment.routes");
const readinessRoutes = require("./routes/readiness.routes");
const anthropometricRoutes = require("./routes/anthropometric.routes");
const titleRoutes = require("./routes/title.routes");
const alertRoutes = require("./routes/alert.routes");
const progressRoutes = require("./routes/progress.routes");
const volumeRoutes = require("./routes/volume.routes");
const apiKeyRoutes = require("./routes/apiKey.routes");
const referralRoutes = require("./routes/referral.routes");
const webhookRoutes = require("./routes/webhook.routes");
const locationRoutes = require("./routes/location.routes");
const adminRoutes = require("./routes/admin.routes");
const searchRoutes = require("./routes/search.routes");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible to routes
app.set("io", io);

// Wire Socket.io to notification service for real-time push
const notificationService = require("./services/notification.service");
notificationService.setIO(io);

// Initialize Firebase Admin SDK for FCM push notifications (native Android/iOS)
initFirebase();

// Request ID for end-to-end tracing
app.use(requestId);

// Security middlewares
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const frontendHost = (() => {
  try {
    return new URL(frontendUrl).host;
  } catch {
    return "localhost:5173";
  }
})();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: [
          "'self'",
          `wss://${frontendHost}`,
          `ws://${frontendHost}`,
          frontendUrl,
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests:
          process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());

// CSRF protection — richiede Content-Type JSON su POST/PUT/DELETE
// Escludi webhook Stripe (riceve raw body con Stripe-Signature)
app.use("/api/", csrfProtection({ excludePaths: ["/webhooks"] }));

// Rate limiting - Generale (200 req / 15 min per IP)
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  message: {
    success: false,
    message: "Troppe richieste, riprova tra qualche minuto",
  },
});
app.use("/api/", generalLimiter);

// Rate limiting - Auth (10 req / 15 min per IP - anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Troppi tentativi di accesso, riprova tra qualche minuto",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Rate limiting - Password reset (3 req / 15 min per IP - anti spam)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Troppi tentativi di reset password, riprova tra qualche minuto",
  },
});
app.use("/api/auth/forgot-password", passwordResetLimiter);
app.use("/api/auth/reset-password", passwordResetLimiter);

// Rate limiting - Pagamenti (5 req / 15 min per IP - prevenire abuse)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Troppe richieste di pagamento, riprova tra qualche minuto",
  },
});
app.use("/api/payments/stripe/plan-upgrade", paymentLimiter);
app.use("/api/payments/stripe/checkout", paymentLimiter);
app.use("/api/payments/subscriptions", paymentLimiter);

// Rate limiting - AI (20 req / 15 min per IP - prevenire abuse OpenAI)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Troppe richieste AI, riprova tra qualche minuto",
  },
});
app.use("/api/ai", aiLimiter);

// Rate limiting - Search (30 req / 1 min per IP - anti scraping)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Troppe ricerche, riprova tra qualche minuto",
  },
});
app.use("/api/search", searchLimiter);

// Rate limiting - Webhooks (100 req / 1 min - Stripe high volume)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: "Troppe richieste webhook" },
});
app.use("/api/webhooks", webhookLimiter);

// Body parsers - 1MB default (upload routes use multer with higher limits)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Static files (uploads)
app.use("/uploads", express.static("uploads"));

// Swagger API Documentation (disabled in production for security)
if (process.env.NODE_ENV !== "production") {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Atlas PT API Docs",
    }),
  );
  app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));
} else {
  app.use("/api/docs", (req, res) =>
    res.status(404).json({ message: "Not available in production" }),
  );
}

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "PT SAAS API",
    version: "1.0.0",
    description: "Piattaforma SaaS per Personal Trainer",
    documentation: "/api",
    health: "/health",
    frontend: process.env.FRONTEND_URL || "http://localhost:5173",
  });
});

// Health check with DB readiness
app.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };
  try {
    const { query: dbQuery } = require("./config/database");
    await dbQuery("SELECT 1");
    health.database = "connected";
  } catch {
    health.status = "degraded";
    health.database = "disconnected";
    return res.status(503).json(health);
  }
  res.json(health);
});

// API Routes (tenant validation is built into verifyToken middleware)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/measurements", measurementRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/readiness", readinessRoutes);
app.use("/api/anthropometric", anthropometricRoutes);
app.use("/api/titles", titleRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/volume", volumeRoutes);
app.use("/api/api-keys", apiKeyRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);

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
    logger.info("Database connesso con successo");

    // Auto-migration: ensure required tables and columns exist
    const { query: dbQuery } = require("./config/database");

    // Stripe events table (idempotency tracking)
    await dbQuery(`
            CREATE TABLE IF NOT EXISTS stripe_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(255) NOT NULL UNIQUE,
                event_type VARCHAR(100) NOT NULL,
                processed_at DATETIME NOT NULL,
                INDEX idx_event_id (event_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

    // Account lockout columns on users table
    const safeAlter = async (sql) => {
      try {
        await dbQuery(sql);
      } catch (e) {
        if (e.code !== "ER_DUP_FIELDNAME") throw e;
      }
    };
    await safeAlter(
      "ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0",
    );
    await safeAlter("ALTER TABLE users ADD COLUMN locked_until DATETIME NULL");
    await safeAlter(
      "ALTER TABLE tenants ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active'",
    );

    // Start listening
    server.listen(PORT, () => {
      logger.info(
        `Server avviato su porta ${PORT} (${process.env.NODE_ENV || "development"}) - http://localhost:${PORT}`,
      );
    });

    // Cron Jobs (after DB is connected)
    const runWithLock = async (jobName, fn) => {
      try {
        const [lockResult] = await dbQuery(
          "SELECT GET_LOCK(?, 0) as acquired",
          [jobName],
        );
        if (!lockResult.acquired) {
          logger.info(`Cron ${jobName}: skipped (altra istanza in esecuzione)`);
          return;
        }
        try {
          await fn();
        } finally {
          await dbQuery("SELECT RELEASE_LOCK(?)", [jobName]);
        }
      } catch (error) {
        logger.error(`Cron ${jobName} errore`, { error: error.message });
      }
    };

    cron.schedule("0 * * * *", () => {
      runWithLock("cron_title_unlocks", checkAllTitleUnlocks);
    });

    cron.schedule("0 * * * *", () => {
      runWithLock("cron_reminders", sendAllReminders);
    });

    cron.schedule("0 */6 * * *", () => {
      runWithLock("cron_alerts", checkAllAlerts);
    });

    logger.info("Cron jobs registrati");
  } catch (error) {
    logger.error("Errore avvio server", { error: error.message });
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM ricevuto. Chiusura graceful...");
  server.close(() => {
    logger.info("Server chiuso");
    process.exit(0);
  });
});

module.exports = { app, server, io };
