// ecosystem.config.js -- PM2 process configuration for Outland OS
// Run: pm2 start ecosystem.config.js --env production
// eslint-disable-next-line @typescript-eslint/no-require-imports
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
    {
      name: 'outland-agent',
      script: 'scripts/agent-runner.ts',
      interpreter: path.resolve(__dirname, 'node_modules/.bin/tsx'),
      cwd: path.resolve(__dirname),
      exec_mode: 'fork',
      instances: 1,
      env_production: {
        NODE_ENV: 'production',
        AGENT_BASE_URL: 'http://localhost:3000',
        AGENT_POLL_INTERVAL: '30',
      },
      // ANTHROPIC_API_KEY loaded from .env file in cwd
      error_file: '/Users/lisa/outland-data/logs/agent-error.log',
      out_file: '/Users/lisa/outland-data/logs/agent-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 5,
      min_uptime: '10s',
      restart_delay: 10000,    // 10s between restart attempts
      autorestart: true,
      // Wait for the main app to be up before starting
      wait_ready: false,
    },
  ],
};
