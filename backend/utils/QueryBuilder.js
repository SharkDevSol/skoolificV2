/**
 * Safe Query Builder
 * 
 * Provides safe methods for constructing SQL queries with dynamic table/column names
 * while preventing SQL injection attacks.
 * 
 * Phase 8.2: SQL Injection Prevention
 */

/**
 * Validate identifier (table name, column name, schema name)
 * Only allows alphanumeric characters, underscores, and hyphens
 * @param {string} identifier - Identifier to validate
 * @returns {string} - Validated identifier
 * @throws {Error} - If identifier is invalid
 */
function validateIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Identifier must be a non-empty string');
  }
  
  // Allow alphanumeric, underscores, hyphens, and spaces (for class names like "GRADE 10")
  const pattern = /^[a-zA-Z0-9_\-\s]+$/;
  
  if (!pattern.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}. Only alphanumeric characters, underscores, hyphens, and spaces are allowed.`);
  }
  
  // Check for SQL keywords that shouldn't be used as identifiers
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'UNION', 'WHERE', 'FROM', 'JOIN', 'TABLE', 'DATABASE', 'SCHEMA',
    'EXEC', 'EXECUTE', 'DECLARE', 'CAST', 'CONVERT'
  ];
  
  if (sqlKeywords.includes(identifier.toUpperCase())) {
    throw new Error(`Identifier cannot be a SQL keyword: ${identifier}`);
  }
  
  return identifier;
}

/**
 * Escape identifier for use in SQL queries
 * Wraps identifier in double quotes to prevent SQL injection
 * @param {string} identifier - Identifier to escape
 * @returns {string} - Escaped identifier
 */
function escapeIdentifier(identifier) {
  const validated = validateIdentifier(identifier);
  return `"${validated.replace(/"/g, '""')}"`;
}

/**
 * Build a safe SELECT query with dynamic table name
 * @param {object} options - Query options
 * @returns {object} - Query object with text and values
 */
function buildSelect(options) {
  const {
    schema = 'public',
    table,
    columns = ['*'],
    where = {},
    orderBy = null,
    limit = null,
    offset = null,
  } = options;
  
  if (!table) {
    throw new Error('Table name is required');
  }
  
  // Validate and escape identifiers
  const safeSchema = escapeIdentifier(schema);
  const safeTable = escapeIdentifier(table);
  const safeColumns = columns.map(col => {
    if (col === '*') return '*';
    return escapeIdentifier(col);
  }).join(', ');
  
  // Build WHERE clause with parameterized values
  const whereConditions = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [column, value] of Object.entries(where)) {
    const safeColumn = escapeIdentifier(column);
    
    if (value === null) {
      whereConditions.push(`${safeColumn} IS NULL`);
    } else if (Array.isArray(value)) {
      // IN clause
      const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
      whereConditions.push(`${safeColumn} IN (${placeholders})`);
      values.push(...value);
    } else {
      whereConditions.push(`${safeColumn} = $${paramIndex++}`);
      values.push(value);
    }
  }
  
  // Build query
  let query = `SELECT ${safeColumns} FROM ${safeSchema}.${safeTable}`;
  
  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }
  
  if (orderBy) {
    const safeOrderBy = escapeIdentifier(orderBy);
    query += ` ORDER BY ${safeOrderBy}`;
  }
  
  if (limit) {
    query += ` LIMIT $${paramIndex++}`;
    values.push(limit);
  }
  
  if (offset) {
    query += ` OFFSET $${paramIndex++}`;
    values.push(offset);
  }
  
  return { text: query, values };
}

/**
 * Build a safe INSERT query with dynamic table name
 * @param {object} options - Query options
 * @returns {object} - Query object with text and values
 */
function buildInsert(options) {
  const {
    schema = 'public',
    table,
    data,
    returning = null,
  } = options;
  
  if (!table) {
    throw new Error('Table name is required');
  }
  
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new Error('Data object is required');
  }
  
  // Validate and escape identifiers
  const safeSchema = escapeIdentifier(schema);
  const safeTable = escapeIdentifier(table);
  
  const columns = Object.keys(data);
  const safeColumns = columns.map(col => escapeIdentifier(col)).join(', ');
  
  const values = Object.values(data);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  
  let query = `INSERT INTO ${safeSchema}.${safeTable} (${safeColumns}) VALUES (${placeholders})`;
  
  if (returning) {
    const safeReturning = Array.isArray(returning)
      ? returning.map(col => escapeIdentifier(col)).join(', ')
      : escapeIdentifier(returning);
    query += ` RETURNING ${safeReturning}`;
  }
  
  return { text: query, values };
}

/**
 * Build a safe UPDATE query with dynamic table name
 * @param {object} options - Query options
 * @returns {object} - Query object with text and values
 */
function buildUpdate(options) {
  const {
    schema = 'public',
    table,
    data,
    where = {},
    returning = null,
  } = options;
  
  if (!table) {
    throw new Error('Table name is required');
  }
  
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new Error('Data object is required');
  }
  
  if (Object.keys(where).length === 0) {
    throw new Error('WHERE clause is required for UPDATE (use where: { id: value })');
  }
  
  // Validate and escape identifiers
  const safeSchema = escapeIdentifier(schema);
  const safeTable = escapeIdentifier(table);
  
  // Build SET clause
  const setColumns = Object.keys(data);
  const setValues = Object.values(data);
  let paramIndex = 1;
  
  const setClause = setColumns.map(col => {
    const safeColumn = escapeIdentifier(col);
    return `${safeColumn} = $${paramIndex++}`;
  }).join(', ');
  
  // Build WHERE clause
  const whereConditions = [];
  const whereValues = [];
  
  for (const [column, value] of Object.entries(where)) {
    const safeColumn = escapeIdentifier(column);
    
    if (value === null) {
      whereConditions.push(`${safeColumn} IS NULL`);
    } else {
      whereConditions.push(`${safeColumn} = $${paramIndex++}`);
      whereValues.push(value);
    }
  }
  
  const values = [...setValues, ...whereValues];
  
  let query = `UPDATE ${safeSchema}.${safeTable} SET ${setClause} WHERE ${whereConditions.join(' AND ')}`;
  
  if (returning) {
    const safeReturning = Array.isArray(returning)
      ? returning.map(col => escapeIdentifier(col)).join(', ')
      : escapeIdentifier(returning);
    query += ` RETURNING ${safeReturning}`;
  }
  
  return { text: query, values };
}

/**
 * Build a safe DELETE query with dynamic table name
 * @param {object} options - Query options
 * @returns {object} - Query object with text and values
 */
function buildDelete(options) {
  const {
    schema = 'public',
    table,
    where = {},
    returning = null,
  } = options;
  
  if (!table) {
    throw new Error('Table name is required');
  }
  
  if (Object.keys(where).length === 0) {
    throw new Error('WHERE clause is required for DELETE (use where: { id: value })');
  }
  
  // Validate and escape identifiers
  const safeSchema = escapeIdentifier(schema);
  const safeTable = escapeIdentifier(table);
  
  // Build WHERE clause
  const whereConditions = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [column, value] of Object.entries(where)) {
    const safeColumn = escapeIdentifier(column);
    
    if (value === null) {
      whereConditions.push(`${safeColumn} IS NULL`);
    } else {
      whereConditions.push(`${safeColumn} = $${paramIndex++}`);
      values.push(value);
    }
  }
  
  let query = `DELETE FROM ${safeSchema}.${safeTable} WHERE ${whereConditions.join(' AND ')}`;
  
  if (returning) {
    const safeReturning = Array.isArray(returning)
      ? returning.map(col => escapeIdentifier(col)).join(', ')
      : escapeIdentifier(returning);
    query += ` RETURNING ${safeReturning}`;
  }
  
  return { text: query, values };
}

/**
 * Build a safe COUNT query with dynamic table name
 * @param {object} options - Query options
 * @returns {object} - Query object with text and values
 */
function buildCount(options) {
  const {
    schema = 'public',
    table,
    where = {},
    column = '*',
  } = options;
  
  if (!table) {
    throw new Error('Table name is required');
  }
  
  // Validate and escape identifiers
  const safeSchema = escapeIdentifier(schema);
  const safeTable = escapeIdentifier(table);
  const safeColumn = column === '*' ? '*' : escapeIdentifier(column);
  
  // Build WHERE clause
  const whereConditions = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [col, value] of Object.entries(where)) {
    const safeCol = escapeIdentifier(col);
    
    if (value === null) {
      whereConditions.push(`${safeCol} IS NULL`);
    } else {
      whereConditions.push(`${safeCol} = $${paramIndex++}`);
      values.push(value);
    }
  }
  
  let query = `SELECT COUNT(${safeColumn}) as count FROM ${safeSchema}.${safeTable}`;
  
  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }
  
  return { text: query, values };
}

/**
 * QueryBuilder class for fluent query building
 */
class QueryBuilder {
  constructor(pool) {
    this.pool = pool;
  }
  
  /**
   * Execute a SELECT query
   */
  async select(options) {
    const query = buildSelect(options);
    return await this.pool.query(query.text, query.values);
  }
  
  /**
   * Execute an INSERT query
   */
  async insert(options) {
    const query = buildInsert(options);
    return await this.pool.query(query.text, query.values);
  }
  
  /**
   * Execute an UPDATE query
   */
  async update(options) {
    const query = buildUpdate(options);
    return await this.pool.query(query.text, query.values);
  }
  
  /**
   * Execute a DELETE query
   */
  async delete(options) {
    const query = buildDelete(options);
    return await this.pool.query(query.text, query.values);
  }
  
  /**
   * Execute a COUNT query
   */
  async count(options) {
    const query = buildCount(options);
    const result = await this.pool.query(query.text, query.values);
    return parseInt(result.rows[0].count);
  }
  
  /**
   * Execute a raw parameterized query (for complex queries)
   * @param {string} text - SQL query with $1, $2, etc. placeholders
   * @param {array} values - Parameter values
   */
  async raw(text, values = []) {
    return await this.pool.query(text, values);
  }
}

module.exports = {
  QueryBuilder,
  validateIdentifier,
  escapeIdentifier,
  buildSelect,
  buildInsert,
  buildUpdate,
  buildDelete,
  buildCount,
};
