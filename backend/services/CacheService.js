/**
 * Redis Cache Service
 * 
 * Provides caching functionality using Redis for improved performance.
 * 
 * Phase 9.1: Redis Caching Implementation
 */

const Redis = require('ioredis');
const { logger } = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default
    
    // Initialize Redis connection
    this.connect();
  }
  
  /**
   * Connect to Redis
   */
  connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      };
      
      this.redis = new Redis(redisConfig);
      
      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });
      
      this.redis.on('error', (err) => {
        this.isConnected = false;
        logger.error('Redis connection error', { error: err.message });
      });
      
      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });
      
    } catch (error) {
      logger.error('Failed to initialize Redis', { error: error.message });
      this.isConnected = false;
    }
  }
  
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    if (!this.isConnected) {
      return null;
    }
    
    try {
      const value = await this.redis.get(key);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }
  
  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      
      await this.redis.setex(key, expiry, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Delete all keys matching pattern
   * @param {string} pattern - Key pattern (e.g., 'students:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async invalidatePattern(pattern) {
    if (!this.isConnected) {
      return 0;
    }
    
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      logger.error('Cache invalidate pattern error', { pattern, error: error.message });
      return 0;
    }
  }
  
  /**
   * Wrap a database query with caching
   * @param {string} key - Cache key
   * @param {function} queryFn - Function that returns query result
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<any>} - Query result (from cache or database)
   */
  async cacheQuery(key, queryFn, ttl = null) {
    // Try to get from cache first
    const cached = await this.get(key);
    
    if (cached !== null) {
      logger.info('Cache hit', { key });
      return cached;
    }
    
    // Cache miss - execute query
    logger.info('Cache miss', { key });
    const result = await queryFn();
    
    // Store in cache
    await this.set(key, result, ttl);
    
    return result;
  }
  
  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if key exists
   */
  async exists(key) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Get remaining TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} - TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  async ttl(key) {
    if (!this.isConnected) {
      return -2;
    }
    
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error', { key, error: error.message });
      return -2;
    }
  }
  
  /**
   * Increment a counter
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment (default: 1)
   * @returns {Promise<number>} - New value
   */
  async increment(key, amount = 1) {
    if (!this.isConnected) {
      return 0;
    }
    
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      logger.error('Cache increment error', { key, error: error.message });
      return 0;
    }
  }
  
  /**
   * Flush all cache
   * @returns {Promise<boolean>} - Success status
   */
  async flushAll() {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.redis.flushdb();
      logger.warn('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error', { error: error.message });
      return false;
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Promise<object>} - Cache stats
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false };
    }
    
    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();
      
      return {
        connected: true,
        dbSize,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {}),
      };
    } catch (error) {
      logger.error('Cache stats error', { error: error.message });
      return { connected: false, error: error.message };
    }
  }
  
  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
