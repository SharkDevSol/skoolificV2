// DatabaseConnectionManager.js - Multi-Branch Database Connection Manager
// Manages separate PostgreSQL database connections for each school branch

const { Pool } = require('pg');

class DatabaseConnectionManager {
  constructor() {
    // Store connection pools for each branch
    this.pools = new Map();
    
    // Master database pool (contains branch_config table)
    this.masterPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'skoolific',
      password: String(process.env.DB_PASSWORD || '12345678'),
      port: process.env.DB_PORT || 5432,
    });

    console.log('✅ DatabaseConnectionManager initialized');
  }

  /**
   * Generate branch code from branch name
   * Algorithm: First letter + Last 2 characters (uppercase)
   * Examples:
   *   "Al Markaz Academy" -> "AMA"
   *   "Sunrise School" -> "SOL"
   *   "Tech" -> "TEH"
   */
  generateBranchCode(branchName) {
    const cleaned = branchName.trim().replace(/\s+/g, '');
    if (cleaned.length === 0) {
      throw new Error('Branch name cannot be empty');
    }
    
    if (cleaned.length === 1) {
      return cleaned.toUpperCase() + 'XX';
    } else if (cleaned.length === 2) {
      return cleaned.toUpperCase() + 'X';
    } else {
      const firstChar = cleaned[0];
      const lastTwoChars = cleaned.slice(-2);
      return (firstChar + lastTwoChars).toUpperCase();
    }
  }

  /**
   * Get database pool for a specific branch
   * Creates new pool if it doesn't exist
   */
  async getPool(branchCode) {
    // Check if pool already exists
    if (this.pools.has(branchCode)) {
      return this.pools.get(branchCode);
    }

    // Fetch branch configuration from master database
    const result = await this.masterPool.query(
      'SELECT * FROM branch_config WHERE branch_code = $1 AND is_active = true',
      [branchCode]
    );

    if (result.rows.length === 0) {
      throw new Error(`Branch with code "${branchCode}" not found or inactive`);
    }

    const branchConfig = result.rows[0];

    // Create new connection pool for this branch
    const pool = new Pool({
      user: branchConfig.database_user || process.env.DB_USER || 'postgres',
      host: branchConfig.database_host || 'localhost',
      database: branchConfig.database_name,
      password: branchConfig.database_password || String(process.env.DB_PASSWORD || '12345678'),
      port: branchConfig.database_port || 5432,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    try {
      const client = await pool.connect();
      console.log(`✅ Connected to branch database: ${branchConfig.database_name} (${branchCode})`);
      client.release();
    } catch (error) {
      console.error(`❌ Failed to connect to branch database: ${branchConfig.database_name}`, error);
      throw new Error(`Failed to connect to branch database: ${error.message}`);
    }

    // Store pool for reuse
    this.pools.set(branchCode, pool);

    return pool;
  }

  /**
   * Resolve database name from branch code
   */
  async resolveDatabaseName(branchCode) {
    const result = await this.masterPool.query(
      'SELECT database_name FROM branch_config WHERE branch_code = $1 AND is_active = true',
      [branchCode]
    );

    if (result.rows.length === 0) {
      throw new Error(`Branch with code "${branchCode}" not found`);
    }

    return result.rows[0].database_name;
  }

  /**
   * Get all active branches
   */
  async getAllBranches() {
    const result = await this.masterPool.query(
      'SELECT id, branch_name, branch_code, database_name, school_address, school_phone, created_at FROM branch_config WHERE is_active = true ORDER BY branch_name'
    );
    return result.rows;
  }

  /**
   * Create new branch configuration
   */
  async createBranch(branchData) {
    const { branchName, databaseName, databaseHost, databasePort, databaseUser, databasePassword, schoolAddress, schoolPhone, schoolEmail, adminName, adminEmail, adminPhone } = branchData;

    // Generate branch code
    const branchCode = this.generateBranchCode(branchName);

    // Insert into branch_config
    const result = await this.masterPool.query(
      `INSERT INTO branch_config (
        branch_name, branch_code, database_name, database_host, database_port,
        database_user, database_password, school_address, school_phone, school_email,
        admin_name, admin_email, admin_phone, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING *`,
      [branchName, branchCode, databaseName, databaseHost || 'localhost', databasePort || 5432,
       databaseUser, databasePassword, schoolAddress, schoolPhone, schoolEmail,
       adminName, adminEmail, adminPhone]
    );

    console.log(`✅ Branch created: ${branchName} (${branchCode}) -> ${databaseName}`);
    return result.rows[0];
  }

  /**
   * Close all connection pools
   */
  async closeAll() {
    console.log('🔌 Closing all database connections...');
    
    // Close branch pools
    for (const [branchCode, pool] of this.pools.entries()) {
      await pool.end();
      console.log(`  ✓ Closed pool for branch: ${branchCode}`);
    }
    
    // Close master pool
    await this.masterPool.end();
    console.log('  ✓ Closed master pool');
    
    this.pools.clear();
    console.log('✅ All database connections closed');
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(branchCode) {
    const pool = this.pools.get(branchCode);
    if (!pool) {
      return null;
    }

    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }
}

// Export singleton instance
const dbManager = new DatabaseConnectionManager();

module.exports = dbManager;
