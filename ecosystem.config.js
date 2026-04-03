// ecosystem.config.js -- PM2 process configuration for Outland OS
// Run: pm2 start ecosystem.config.js --env production
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'outland',
      script: '.next/standalone/server.js',
      cwd: path.resolve(__dirname),  // REQUIRED for launchd boot persistence (DEPLOY-05)
      exec_mode: 'fork',        // REQUIRED -- SQLite cannot use cluster mode
      instances: 1,
      env_production: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',   // Required for Tailscale access (not just localhost)
      },
      // Secrets (DATABASE_URL, API keys) loaded from .env file in cwd
      error_file: '/Users/lisa/outland-data/logs/pm2-error.log',
      out_file: '/Users/lisa/outland-data/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 10,
      min_uptime: '10s',       // Must stay up 10s to count as successful start
      restart_delay: 4000,     // 4s between restart attempts
      autorestart: true,
    },
  ],
};
