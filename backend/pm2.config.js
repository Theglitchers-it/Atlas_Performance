/**
 * PM2 Production Configuration
 * Atlas - Piattaforma SaaS per Personal Trainer
 *
 * Usage:
 *   pm2 start pm2.config.js --env production
 *   pm2 start pm2.config.js --env staging
 */

module.exports = {
  apps: [
    {
      name: 'atlas-api',
      script: './src/server.js',
      cwd: __dirname,

      // Cluster mode — use all available CPUs
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',

      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Restart limits — prevent infinite crash loops
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      // Log rotation (requires pm2-logrotate: pm2 install pm2-logrotate)
      // Default: 10MB max size, 30 files retained, daily rotation

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
