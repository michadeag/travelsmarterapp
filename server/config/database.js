const { Pool } = require('pg');
require('dotenv').config();

// Support both DATABASE_URL and individual environment variables
let pool;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if available (standard PostgreSQL format)
  console.log('📡 Connecting using DATABASE_URL');
  // Strip sslmode from connection string and handle via ssl option
  const connString = process.env.DATABASE_URL.replace('?sslmode=require', '').replace('&sslmode=require', '');
  pool = new Pool({
    connectionString: connString,
    ssl: {
      rejectUnauthorized: false // DigitalOcean uses self-signed certs
    }
  });
} else {
  // Fall back to individual variables
  console.log('📡 Connecting using individual DB environment variables');
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'travelsmarter',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected connection error:', err);
});

module.exports = pool;
