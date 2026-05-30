/**
 * CacheService Unit Tests
 * 
 * Comprehensive test suite for the CacheService class.
 * Tests cover:
 * - Constructor and initialization
 * - Connection management
 * - Get/Set/Delete operations
 * - Pattern invalidation
 * - Query caching
 * - TTL management
 * - Counter operations
 * - Statistics
 * - Error handling
 * 
 * Target: 80%+ code coverage
 */

// Mock ioredis before requiring CacheService
jest.mock('ioredis');
const Redis = require('ioredis');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

const { logger } = require('../../utils/logger');

describe('CacheService', () => {
  let mockRedisInstance;
  let CacheService;
  let cacheService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock Redis instance
    mockRedisInstance = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      incrby: jest.fn(),
      flushdb: jest.fn(),
      info: jest.fn(),
      dbsize: jest.fn(),
      quit: jest.fn(),
      on: jest.fn()
    };

    // Mock Redis constructor
    Redis.mockImplementation(() => mockRedisInstance);

    // Clear module cache and require fresh instance
    jest.resetModules();
    CacheService = require('../CacheService');
    cacheService = CacheService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // TEST SUITE 1: Constructor and Initialization
  // ============================================================================
  describe('1. Constructor and Initialization', () => {
    test('1.1 Should initialize with default configuration', () => {
      expect(cacheService).toBeDefined();
      expect(cacheService.defaultTTL).toBe(3600);
    });

    test('1.2 Should attempt to connect to Redis on initialization', () => {
      expect(Redis).toHaveBeenCalled();
    });

    test('1.3 Should set up event listeners', () => {
      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    test('1.4 Should handle connection success', () => {
      const connectHandler = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];

      connectHandler();

      expect(cacheService.isConnected).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Redis connected successfully');
    });

    test('1.5 Should handle connection error', () => {
      const errorHandler = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const error = new Error('Connection failed');
      errorHandler(error);

      expect(cacheService.isConnected).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Redis connection error', { error: 'Connection failed' });
    });

    test('1.6 Should handle connection close', () => {
      const closeHandler = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'close'
      )[1];

      closeHandler();

      expect(cacheService.isConnected).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Redis connection closed');
    });
  });

  // ============================================================================
  // TEST SUITE 2: Get Operation
  // ============================================================================
  describe('2. Get Operation', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
    });

    test('2.1 Should get value from cache successfully', async () => {
      const testData = { name: 'John', age: 30 };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test:key');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('test:key');
      expect(result).toEqual(testData);
    });

    test('2.2 Should return null for non-existent key', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent:key');

      expect(result).toBeNull();
    });

    test('2.3 Should return null when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
    });

    test('2.4 Should handle JSON parse errors gracefully', async () => {
      mockRedisInstance.get.mockResolvedValue('invalid json');

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    test('2.5 Should handle Redis errors gracefully', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Cache get error', expect.any(Object));
    });
  });

  // ============================================================================
  // TEST SUITE 3: Set Operation
  // ============================================================================
  describe('3. Set Operation', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
    });

    test('3.1 Should set value in cache with default TTL', async () => {
      const testData = { name: 'John', age: 30 };
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test:key', testData);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify(testData)
      );
      expect(result).toBe(true);
    });

    test('3.2 Should set value in cache with custom TTL', async () => {
      const testData = { name: 'John' };
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test:key', testData, 7200);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        7200,
        JSON.stringify(testData)
      );
      expect(result).toBe(true);
    });

    test('3.3 Should return false when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.set('test:key', { data: 'test' });

      expect(result).toBe(false);
      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });

    test('3.4 Should handle Redis errors gracefully', async () => {
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.set('test:key', { data: 'test' });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Cache set error', expect.any(Object));
    });

    test('3.5 Should serialize complex objects', async () => {
      const complexData = {
        user: { name: 'John', age: 30 },
        items: [1, 2, 3],
        active: true
      };
      mockRedisInstance.setex.mockResolvedValue('OK');

      await cacheService.set('test:key', complexData);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        3600,
        JSON.stringify(complexData)
      );
    });
  });

  // ============================================================================
  // TEST SUITE 4: Delete Operation
  // ============================================================================
  describe('4. Delete Operation', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
    });

    test('4.1 Should delete key from cache', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await cacheService.del('test:key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test:key');
      expect(result).toBe(true);
    });

    test('4.2 Should return false when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.del('test:key');

      expect(result).toBe(false);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    test('4.3 Should handle Redis errors gracefully', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.del('test:key');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Cache delete error', expect.any(Object));
    });
  });

  // ============================================================================
  // TEST SUITE 5: Pattern Invalidation
  // ============================================================================
  describe('5. Pattern Invalidation', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
    });

    test('5.1 Should invalidate keys matching pattern', async () => {
      mockRedisInstance.keys.mockResolvedValue(['students:1', 'students:2', 'students:3']);
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await cacheService.invalidatePattern('students:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('students:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('students:1', 'students:2', 'students:3');
      expect(result).toBe(3);
    });

    test('5.2 Should return 0 when no keys match pattern', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      const result = await cacheService.invalidatePattern('nonexistent:*');

      expect(result).toBe(0);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    test('5.3 Should return 0 when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.invalidatePattern('test:*');

      expect(result).toBe(0);
      expect(mockRedisInstance.keys).not.toHaveBeenCalled();
    });

    test('5.4 Should handle Redis errors gracefully', async () => {
      mockRedisInstance.keys.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.invalidatePattern('test:*');

      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalledWith('Cache invalidate pattern error', expect.any(Object));
    });
  });

  // ============================================================================
  // TEST SUITE 6: Query Caching
  // ============================================================================
  describe('6. Query Caching', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
    });

    test('6.1 Should return cached value on cache hit', async () => {
      const cachedData = { name: 'John' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));

      const queryFn = jest.fn().mockResolvedValue({ name: 'Jane' });
      const result = await cacheService.cacheQuery('test:key', queryFn);

      expect(result).toEqual(cachedData);
      expect(queryFn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Cache hit', { key: 'test:key' });
    });

    test('6.2 Should execute query and cache result on cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const queryResult = { name: 'John' };
      const queryFn = jest.fn().mockResolvedValue(queryResult);

      const result = await cacheService.cacheQuery('test:key', queryFn);

      expect(result).toEqual(queryResult);
      expect(queryFn).toHaveBeenCalled();
      expect(mockRedisInstance.setex).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Cache miss', { key: 'test:key' });
    });

    test('6.3 Should use custom TTL when provided', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const queryFn = jest.fn().mockResolvedValue({ data: 'test' });

      await cacheService.cacheQuery('test:key', queryFn, 7200);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        7200,
        expect.any(String)
      );
    });
  });

  // ============================================================================
  // TEST SUITE 7: Exists and TTL Operations
  // ============================================================================
  describe('7. Exists and TTL Operations', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
    });

    test('7.1 Should check if key exists', async () => {
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test:key');

      expect(mockRedisInstance.exists).toHaveBeenCalledWith('test:key');
      expect(result).toBe(true);
    });

    test('7.2 Should return false for non-existent key', async () => {
      mockRedisInstance.exists.mockResolvedValue(0);

      const result = await cacheService.exists('nonexistent:key');

      expect(result).toBe(false);
    });

    test('7.3 Should return false when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.exists('test:key');

      expect(result).toBe(false);
    });

    test('7.4 Should get TTL for key', async () => {
      mockRedisInstance.ttl.mockResolvedValue(3600);

      const result = await cacheService.ttl('test:key');

      expect(mockRedisInstance.ttl).toHaveBeenCalledWith('test:key');
      expect(result).toBe(3600);
    });

    test('7.5 Should return -2 for non-existent key TTL', async () => {
      mockRedisInstance.ttl.mockResolvedValue(-2);

      const result = await cacheService.ttl('nonexistent:key');

      expect(result).toBe(-2);
    });

    test('7.6 Should return -2 when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.ttl('test:key');

      expect(result).toBe(-2);
    });
  });

  // ============================================================================
  // TEST SUITE 8: Counter Operations
  // ============================================================================
  describe('8. Counter Operations', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
    });

    test('8.1 Should increment counter by 1', async () => {
      mockRedisInstance.incrby.mockResolvedValue(1);

      const result = await cacheService.increment('counter:key');

      expect(mockRedisInstance.incrby).toHaveBeenCalledWith('counter:key', 1);
      expect(result).toBe(1);
    });

    test('8.2 Should increment counter by custom amount', async () => {
      mockRedisInstance.incrby.mockResolvedValue(10);

      const result = await cacheService.increment('counter:key', 10);

      expect(mockRedisInstance.incrby).toHaveBeenCalledWith('counter:key', 10);
      expect(result).toBe(10);
    });

    test('8.3 Should return 0 when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.increment('counter:key');

      expect(result).toBe(0);
      expect(mockRedisInstance.incrby).not.toHaveBeenCalled();
    });

    test('8.4 Should handle Redis errors gracefully', async () => {
      mockRedisInstance.incrby.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.increment('counter:key');

      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalledWith('Cache increment error', expect.any(Object));
    });
  });

  // ============================================================================
  // TEST SUITE 9: Flush and Statistics
  // ============================================================================
  describe('9. Flush and Statistics', () => {
    beforeEach(() => {
      cacheService.isConnected = true;
    });

    test('9.1 Should flush all cache', async () => {
      mockRedisInstance.flushdb.mockResolvedValue('OK');

      const result = await cacheService.flushAll();

      expect(mockRedisInstance.flushdb).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith('Cache flushed');
    });

    test('9.2 Should return false when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.flushAll();

      expect(result).toBe(false);
      expect(mockRedisInstance.flushdb).not.toHaveBeenCalled();
    });

    test('9.3 Should get cache statistics', async () => {
      mockRedisInstance.info.mockResolvedValue('total_connections_received:100\r\ntotal_commands_processed:500');
      mockRedisInstance.dbsize.mockResolvedValue(42);

      const stats = await cacheService.getStats();

      expect(stats.connected).toBe(true);
      expect(stats.dbSize).toBe(42);
      expect(stats.info).toBeDefined();
      expect(stats.info.total_connections_received).toBe('100');
    });

    test('9.4 Should return disconnected status when not connected', async () => {
      cacheService.isConnected = false;

      const stats = await cacheService.getStats();

      expect(stats.connected).toBe(false);
    });

    test('9.5 Should handle errors in statistics', async () => {
      mockRedisInstance.info.mockRejectedValue(new Error('Redis error'));

      const stats = await cacheService.getStats();

      expect(stats.connected).toBe(false);
      expect(stats.error).toBeDefined();
    });
  });

  // ============================================================================
  // TEST SUITE 10: Connection Management
  // ============================================================================
  describe('10. Connection Management', () => {
    test('10.1 Should close Redis connection', async () => {
      cacheService.isConnected = true;
      mockRedisInstance.quit.mockResolvedValue('OK');

      await cacheService.close();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
      expect(cacheService.isConnected).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Redis connection closed');
    });

    test('10.2 Should handle close when redis is null', async () => {
      cacheService.redis = null;

      await cacheService.close();

      // Should not throw error
      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST SUITE 11: Edge Cases
  // ============================================================================
  describe('11. Edge Cases', () => {
    test('11.1 Should handle null values in set', async () => {
      cacheService.isConnected = true;
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test:key', null);

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:key',
        3600,
        'null'
      );
    });

    test('11.2 Should handle undefined values in set', async () => {
      cacheService.isConnected = true;
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test:key', undefined);

      expect(result).toBe(true);
    });

    test('11.3 Should handle empty string keys', async () => {
      cacheService.isConnected = true;
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get('');

      expect(result).toBeNull();
    });

    test('11.4 Should handle very long keys', async () => {
      cacheService.isConnected = true;
      const longKey = 'a'.repeat(1000);
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get(longKey);

      expect(mockRedisInstance.get).toHaveBeenCalledWith(longKey);
      expect(result).toBeNull();
    });

    test('11.5 Should handle circular references in set', async () => {
      cacheService.isConnected = true;
      
      const circularObj = { name: 'test' };
      circularObj.self = circularObj;

      const result = await cacheService.set('test:key', circularObj);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
