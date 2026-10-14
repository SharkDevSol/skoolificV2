const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'school_management10',
  password: String(process.env.DB_PASSWORD),
  port: process.env.DB_PORT || 5432,
});

// Keep per-backend connections low so the shared database (max_connections=100)
// is never exhausted across all branches. Fail fast instead of hanging the request.
pool.options.max = 5;
pool.options.idleTimeoutMillis = 30000;
pool.options.connectionTimeoutMillis = 8000;
pool.options.idleInTransactionSessionTimeout = 60000;
pool.options.keepAlive = true;

module.exports = pool;