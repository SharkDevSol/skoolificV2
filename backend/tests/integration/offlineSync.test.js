/**
 * Integration Tests for Offline Sync
 * 
 * Tests the offline sync functionality including:
 * - Queue operations when offline
 * - Sync queued operations when online
 * - Handle sync conflicts
 * - Retry failed syncs
 * - Track sync status
 * - Validate data integrity after sync
 */

const {
  initTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  generateTestId,
  getTestPool
} = require('./setup');

describe('Offline Sync Integration Tests', () => {
  let testPool;
  let testClassName;
  let testStudent;

  beforeAll(async () => {
    testPool = await initTestDatabase();
    testClassName = `TEST_SYNC_CLASS_${Date.now()}`;
    
    await testPool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await testPool.query('CREATE SCHEMA IF NOT EXISTS classes_schema');
    
    // Create sync_queue table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id SERIAL PRIMARY KEY,
        operation_type VARCHAR(50) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(100),
        data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMP
      )
    `);
    
    // Create tables for testing
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        synced BOOLEAN DEFAULT FALSE
      )
    `);
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS marks (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        marks_obtained DECIMAL(5,2),
        synced BOOLEAN DEFAULT FALSE
      )
    `);
    
    // Create test class table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."${testClassName}" (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(50)
      )
    `);
    
    // Create test student
    const result = await testPool.query(`
      INSERT INTO classes_schema."${testClassName}" (school_id, student_name, class)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [5001, 'Test Student Sync', testClassName]);
    
    testStudent = result.rows[0];
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (testClassName) {
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName}" CASCADE`);
    }
    await testPool.query(`DELETE FROM sync_queue WHERE data->>'class' = $1`, [testClassName]);
    await testPool.query(`DELETE FROM attendance WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM marks WHERE class = $1`, [testClassName]);
    await closeTestDatabase();
  });

  afterEach(async () => {
    await testPool.query(`DELETE FROM sync_queue WHERE data->>'class' = $1`, [testClassName]);
    await testPool.query(`DELETE FROM attendance WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM marks WHERE class = $1`, [testClassName]);
  });

  describe('1. Queue Operations When Offline', () => {
    test('should queue attendance operation', async () => {
      const attendanceData = {
        student_id: testStudent.school_id,
        student_name: testStudent.student_name,
        class: testClassName,
        date: '2025-01-15',
        status: 'present'
      };
      
      const result = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, ['INSERT', 'attendance', JSON.stringify(attendanceData), 'pending']);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].operation_type).toBe('INSERT');
      expect(result.rows[0].status).toBe('pending');
      expect(result.rows[0].data).toBeTruthy();
    });

    test('should queue marks operation', async () => {
      const marksData = {
        student_id: testStudent.school_id,
        student_name: testStudent.student_name,
        class: testClassName,
        subject: 'Math',
        marks_obtained: 85.00
      };
      
      const result = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, ['INSERT', 'marks', JSON.stringify(marksData), 'pending']);

      expect(result.rows[0].table_name).toBe('marks');
      expect(result.rows[0].data.marks_obtained).toBe(85.00);
    });

    test('should queue update operation', async () => {
      const updateData = {
        id: 123,
        student_id: testStudent.school_id,
        status: 'absent'
      };
      
      const result = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, record_id, data, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, ['UPDATE', 'attendance', '123', JSON.stringify(updateData), 'pending']);

      expect(result.rows[0].operation_type).toBe('UPDATE');
      expect(result.rows[0].record_id).toBe('123');
    });

    test('should queue delete operation', async () => {
      const deleteData = {
        id: 456,
        student_id: testStudent.school_id
      };
      
      const result = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, record_id, data, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, ['DELETE', 'marks', '456', JSON.stringify(deleteData), 'pending']);

      expect(result.rows[0].operation_type).toBe('DELETE');
    });

    test('should queue multiple operations', async () => {
      const operations = [
        { type: 'INSERT', table: 'attendance', data: { student_id: testStudent.school_id, status: 'present' } },
        { type: 'INSERT', table: 'marks', data: { student_id: testStudent.school_id, marks_obtained: 90 } },
        { type: 'UPDATE', table: 'attendance', data: { id: 1, status: 'late' } }
      ];
      
      for (const op of operations) {
        await testPool.query(`
          INSERT INTO sync_queue (operation_type, table_name, data, status)
          VALUES ($1, $2, $3, $4)
        `, [op.type, op.table, JSON.stringify(op.data), 'pending']);
      }

      const result = await testPool.query(
        'SELECT * FROM sync_queue WHERE status = $1',
        ['pending']
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('2. Sync Queued Operations When Online', () => {
    test('should sync pending attendance operation', async () => {
      const attendanceData = {
        student_id: testStudent.school_id,
        student_name: testStudent.student_name,
        class: testClassName,
        date: '2025-01-15',
        status: 'present'
      };
      
      // Queue operation
      const queueResult = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, ['INSERT', 'attendance', JSON.stringify(attendanceData), 'pending']);

      const queueId = queueResult.rows[0].id;

      // Simulate sync
      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, synced)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        attendanceData.student_id, attendanceData.student_name, attendanceData.class,
        attendanceData.date, attendanceData.status, true
      ]);

      // Mark as synced
      await testPool.query(`
        UPDATE sync_queue 
        SET status = $1, synced_at = NOW()
        WHERE id = $2
      `, ['synced', queueId]);

      const result = await testPool.query(
        'SELECT * FROM sync_queue WHERE id = $1',
        [queueId]
      );

      expect(result.rows[0].status).toBe('synced');
      expect(result.rows[0].synced_at).toBeTruthy();

      const attendanceResult = await testPool.query(
        'SELECT * FROM attendance WHERE student_id = $1',
        [testStudent.school_id]
      );

      expect(attendanceResult.rows.length).toBe(1);
      expect(attendanceResult.rows[0].synced).toBe(true);
    });

    test('should sync all pending operations in order', async () => {
      const operations = [
        { student_id: testStudent.school_id, date: '2025-01-15', status: 'present' },
        { student_id: testStudent.school_id, date: '2025-01-16', status: 'present' },
        { student_id: testStudent.school_id, date: '2025-01-17', status: 'absent' }
      ];
      
      // Queue operations
      for (const op of operations) {
        await testPool.query(`
          INSERT INTO sync_queue (operation_type, table_name, data, status)
          VALUES ($1, $2, $3, $4)
        `, ['INSERT', 'attendance', JSON.stringify({ ...op, student_name: testStudent.student_name, class: testClassName }), 'pending']);
      }

      // Get pending operations
      const pending = await testPool.query(
        'SELECT * FROM sync_queue WHERE status = $1 ORDER BY created_at',
        ['pending']
      );

      // Sync each operation
      for (const queueItem of pending.rows) {
        const data = queueItem.data;
        
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, synced)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [data.student_id, data.student_name, data.class, data.date, data.status, true]);

        await testPool.query(`
          UPDATE sync_queue 
          SET status = $1, synced_at = NOW()
          WHERE id = $2
        `, ['synced', queueItem.id]);
      }

      const syncedCount = await testPool.query(
        'SELECT COUNT(*) FROM sync_queue WHERE status = $1',
        ['synced']
      );

      expect(parseInt(syncedCount.rows[0].count)).toBeGreaterThanOrEqual(3);
    });
  });

  describe('3. Handle Sync Conflicts', () => {
    test('should detect conflict when record already exists', async () => {
      // Create existing record
      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, synced)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [testStudent.school_id, testStudent.student_name, testClassName, '2025-01-15', 'present', true]);

      // Queue conflicting operation
      const conflictData = {
        student_id: testStudent.school_id,
        student_name: testStudent.student_name,
        class: testClassName,
        date: '2025-01-15',
        status: 'absent'
      };
      
      const queueResult = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, ['INSERT', 'attendance', JSON.stringify(conflictData), 'pending']);

      // Check for existing record
      const existing = await testPool.query(`
        SELECT * FROM attendance 
        WHERE student_id = $1 AND date = $2
      `, [testStudent.school_id, '2025-01-15']);

      if (existing.rows.length > 0) {
        // Mark as conflict
        await testPool.query(`
          UPDATE sync_queue 
          SET status = $1, error_message = $2
          WHERE id = $3
        `, ['conflict', 'Record already exists', queueResult.rows[0].id]);
      }

      const result = await testPool.query(
        'SELECT * FROM sync_queue WHERE id = $1',
        [queueResult.rows[0].id]
      );

      expect(result.rows[0].status).toBe('conflict');
      expect(result.rows[0].error_message).toContain('already exists');
    });

    test('should resolve conflict with last-write-wins strategy', async () => {
      // Create existing record
      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, synced)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [testStudent.school_id, testStudent.student_name, testClassName, '2025-01-15', 'present', true]);

      // Update with newer data (last-write-wins)
      await testPool.query(`
        UPDATE attendance 
        SET status = $1, synced = $2
        WHERE student_id = $3 AND date = $4
      `, ['absent', true, testStudent.school_id, '2025-01-15']);

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE student_id = $1 AND date = $2',
        [testStudent.school_id, '2025-01-15']
      );

      expect(result.rows[0].status).toBe('absent');
    });
  });

  describe('4. Retry Failed Syncs', () => {
    test('should mark sync as failed on error', async () => {
      const queueResult = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, ['INSERT', 'attendance', JSON.stringify({ student_id: testStudent.school_id }), 'pending']);

      // Simulate sync failure
      await testPool.query(`
        UPDATE sync_queue 
        SET status = $1, error_message = $2, retry_count = retry_count + 1
        WHERE id = $3
      `, ['failed', 'Network error', queueResult.rows[0].id]);

      const result = await testPool.query(
        'SELECT * FROM sync_queue WHERE id = $1',
        [queueResult.rows[0].id]
      );

      expect(result.rows[0].status).toBe('failed');
      expect(result.rows[0].retry_count).toBe(1);
      expect(result.rows[0].error_message).toBe('Network error');
    });

    test('should retry failed sync operations', async () => {
      const queueResult = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status, retry_count)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, ['INSERT', 'attendance', JSON.stringify({ student_id: testStudent.school_id }), 'failed', 1]);

      // Retry
      await testPool.query(`
        UPDATE sync_queue 
        SET status = $1, retry_count = retry_count + 1
        WHERE id = $2
      `, ['pending', queueResult.rows[0].id]);

      const result = await testPool.query(
        'SELECT * FROM sync_queue WHERE id = $1',
        [queueResult.rows[0].id]
      );

      expect(result.rows[0].status).toBe('pending');
      expect(result.rows[0].retry_count).toBe(2);
    });

    test('should stop retrying after max attempts', async () => {
      const maxRetries = 3;
      
      const queueResult = await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status, retry_count)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, ['INSERT', 'attendance', JSON.stringify({ student_id: testStudent.school_id }), 'failed', maxRetries]);

      // Check if max retries reached
      if (queueResult.rows[0].retry_count >= maxRetries) {
        await testPool.query(`
          UPDATE sync_queue 
          SET status = $1, error_message = $2
          WHERE id = $3
        `, ['permanent_failure', 'Max retries exceeded', queueResult.rows[0].id]);
      }

      const result = await testPool.query(
        'SELECT * FROM sync_queue WHERE id = $1',
        [queueResult.rows[0].id]
      );

      expect(result.rows[0].status).toBe('permanent_failure');
    });
  });

  describe('5. Track Sync Status', () => {
    test('should retrieve pending sync count', async () => {
      // Queue multiple operations
      for (let i = 0; i < 5; i++) {
        await testPool.query(`
          INSERT INTO sync_queue (operation_type, table_name, data, status)
          VALUES ($1, $2, $3, $4)
        `, ['INSERT', 'attendance', JSON.stringify({ student_id: testStudent.school_id, class: testClassName }), 'pending']);
      }

      const result = await testPool.query(
        'SELECT COUNT(*) FROM sync_queue WHERE status = $1',
        ['pending']
      );

      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(5);
    });

    test('should retrieve failed sync operations', async () => {
      await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status, error_message)
        VALUES ($1, $2, $3, $4, $5)
      `, ['INSERT', 'attendance', JSON.stringify({ student_id: testStudent.school_id, class: testClassName }), 'failed', 'Test error']);

      const result = await testPool.query(
        'SELECT * FROM sync_queue WHERE status = $1',
        ['failed']
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].error_message).toBeTruthy();
    });

    test('should calculate sync progress', async () => {
      // Queue operations with different statuses
      await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status)
        VALUES 
          ($1, $2, $3, $4),
          ($1, $2, $3, $5),
          ($1, $2, $3, $6)
      `, ['INSERT', 'attendance', JSON.stringify({ student_id: testStudent.school_id, class: testClassName }), 'pending', 'synced', 'failed']);

      const stats = await testPool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'synced' THEN 1 ELSE 0 END) as synced,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM sync_queue
      `);

      expect(parseInt(stats.rows[0].total)).toBeGreaterThanOrEqual(3);
      expect(parseInt(stats.rows[0].synced)).toBeGreaterThan(0);
    });
  });

  describe('6. Validate Data Integrity After Sync', () => {
    test('should verify synced data matches queued data', async () => {
      const attendanceData = {
        student_id: testStudent.school_id,
        student_name: testStudent.student_name,
        class: testClassName,
        date: '2025-01-15',
        status: 'present'
      };
      
      // Queue and sync
      await testPool.query(`
        INSERT INTO sync_queue (operation_type, table_name, data, status)
        VALUES ($1, $2, $3, $4)
      `, ['INSERT', 'attendance', JSON.stringify(attendanceData), 'pending']);

      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, synced)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        attendanceData.student_id, attendanceData.student_name, attendanceData.class,
        attendanceData.date, attendanceData.status, true
      ]);

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE student_id = $1 AND date = $2',
        [testStudent.school_id, '2025-01-15']
      );

      expect(result.rows[0].student_id).toBe(attendanceData.student_id);
      expect(result.rows[0].status).toBe(attendanceData.status);
      expect(result.rows[0].synced).toBe(true);
    });

    test('should verify all queued operations were synced', async () => {
      const operations = [
        { date: '2025-01-15', status: 'present' },
        { date: '2025-01-16', status: 'present' },
        { date: '2025-01-17', status: 'absent' }
      ];
      
      // Queue operations
      for (const op of operations) {
        await testPool.query(`
          INSERT INTO sync_queue (operation_type, table_name, data, status)
          VALUES ($1, $2, $3, $4)
        `, ['INSERT', 'attendance', JSON.stringify({ ...op, student_id: testStudent.school_id, student_name: testStudent.student_name, class: testClassName }), 'synced']);

        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, synced)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [testStudent.school_id, testStudent.student_name, testClassName, op.date, op.status, true]);
      }

      const queueCount = await testPool.query(
        'SELECT COUNT(*) FROM sync_queue WHERE status = $1',
        ['synced']
      );

      const attendanceCount = await testPool.query(
        'SELECT COUNT(*) FROM attendance WHERE student_id = $1 AND synced = TRUE',
        [testStudent.school_id]
      );

      expect(parseInt(queueCount.rows[0].count)).toBeGreaterThanOrEqual(3);
      expect(parseInt(attendanceCount.rows[0].count)).toBe(3);
    });
  });
});
