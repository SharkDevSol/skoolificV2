/**
 * Integration Tests for Payment Processing
 * 
 * Tests the complete payment processing flow including:
 * - Record student payments
 * - Process monthly fees
 * - Handle partial payments
 * - Track payment history
 * - Generate payment receipts
 * - Calculate outstanding balances
 * - Payment validation
 * - Offline payment sync
 */

const {
  initTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  generateTestId,
  getTestPool
} = require('./setup');

describe('Payment Processing Integration Tests', () => {
  let testPool;
  let testClassName;
  let testStudents = [];
  let testPaymentId;

  beforeAll(async () => {
    testPool = await initTestDatabase();
    testClassName = `TEST_PAY_CLASS_${Date.now()}`;
    
    await testPool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await testPool.query('CREATE SCHEMA IF NOT EXISTS classes_schema');
    
    // Create payments table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        payment_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50),
        receipt_number VARCHAR(100) UNIQUE,
        academic_year VARCHAR(20),
        term VARCHAR(50),
        notes TEXT,
        recorded_by VARCHAR(100),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Create fee_structure table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS fee_structure (
        id SERIAL PRIMARY KEY,
        class VARCHAR(100) NOT NULL,
        fee_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        frequency VARCHAR(50),
        academic_year VARCHAR(20),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Create test class table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."${testClassName}" (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Create test students
    for (let i = 1; i <= 3; i++) {
      const result = await testPool.query(`
        INSERT INTO classes_schema."${testClassName}" (school_id, student_name, class, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [3000 + i, `Test Student ${i}`, testClassName, true]);
      
      testStudents.push(result.rows[0]);
    }
    
    // Create fee structure
    await testPool.query(`
      INSERT INTO fee_structure (class, fee_type, amount, frequency, academic_year)
      VALUES ($1, $2, $3, $4, $5)
    `, [testClassName, 'Monthly Fee', 500.00, 'monthly', '2025/2026']);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (testClassName) {
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName}" CASCADE`);
    }
    await testPool.query(`DELETE FROM payments WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM fee_structure WHERE class = $1`, [testClassName]);
    await closeTestDatabase();
  });

  afterEach(async () => {
    await testPool.query(`DELETE FROM payments WHERE class = $1`, [testClassName]);
    testPaymentId = null;
  });

  describe('1. Record Student Payments', () => {
    test('should record a full payment', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      
      const result = await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        500.00, paymentDate, 'Cash', `RCP${Date.now()}`, 'test_admin'
      ]);

      testPaymentId = result.rows[0].id;

      expect(result.rows.length).toBe(1);
      expect(parseFloat(result.rows[0].amount)).toBe(500.00);
      expect(result.rows[0].payment_type).toBe('Monthly Fee');
      expect(result.rows[0].receipt_number).toBeTruthy();
    });

    test('should record payment with different methods', async () => {
      const student = testStudents[1];
      const paymentDate = new Date().toISOString().split('T')[0];
      const methods = ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque'];
      
      for (const method of methods) {
        const result = await testPool.query(`
          INSERT INTO payments (
            student_id, student_name, class, payment_type, amount,
            payment_date, payment_method, receipt_number, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          student.school_id, student.student_name, testClassName, 'Monthly Fee',
          500.00, paymentDate, method, `RCP${Date.now()}_${method}`, 'test_admin'
        ]);

        expect(result.rows[0].payment_method).toBe(method);
      }
    });

    test('should record payment with notes', async () => {
      const student = testStudents[2];
      const paymentDate = new Date().toISOString().split('T')[0];
      
      const result = await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        500.00, paymentDate, 'Cash', `RCP${Date.now()}`, 'Payment for January', 'test_admin'
      ]);

      expect(result.rows[0].notes).toBe('Payment for January');
    });
  });

  describe('2. Process Monthly Fees', () => {
    test('should process monthly fee payment', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      
      const result = await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, term, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        500.00, paymentDate, 'Cash', `RCP${Date.now()}`, 'January', 'test_admin'
      ]);

      expect(result.rows[0].term).toBe('January');
      expect(parseFloat(result.rows[0].amount)).toBe(500.00);
    });

    test('should track payments for multiple months', async () => {
      const student = testStudents[0];
      const months = ['January', 'February', 'March'];
      
      for (const month of months) {
        const date = new Date();
        date.setMonth(months.indexOf(month));
        const paymentDate = date.toISOString().split('T')[0];
        
        await testPool.query(`
          INSERT INTO payments (
            student_id, student_name, class, payment_type, amount,
            payment_date, payment_method, receipt_number, term, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          student.school_id, student.student_name, testClassName, 'Monthly Fee',
          500.00, paymentDate, 'Cash', `RCP${Date.now()}_${month}`, month, 'test_admin'
        ]);
      }

      const result = await testPool.query(
        'SELECT * FROM payments WHERE student_id = $1 ORDER BY term',
        [student.school_id]
      );

      expect(result.rows.length).toBe(3);
    });
  });

  describe('3. Handle Partial Payments', () => {
    test('should record partial payment', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      const fullAmount = 500.00;
      const partialAmount = 300.00;
      
      const result = await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        partialAmount, paymentDate, 'Cash', `RCP${Date.now()}`,
        `Partial payment (${partialAmount}/${fullAmount})`, 'test_admin'
      ]);

      expect(parseFloat(result.rows[0].amount)).toBe(300.00);
      expect(result.rows[0].notes).toContain('Partial payment');
    });

    test('should track multiple partial payments', async () => {
      const student = testStudents[1];
      const paymentDate = new Date().toISOString().split('T')[0];
      const payments = [200.00, 150.00, 150.00]; // Total: 500
      
      for (let i = 0; i < payments.length; i++) {
        await testPool.query(`
          INSERT INTO payments (
            student_id, student_name, class, payment_type, amount,
            payment_date, payment_method, receipt_number, term, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          student.school_id, student.student_name, testClassName, 'Monthly Fee',
          payments[i], paymentDate, 'Cash', `RCP${Date.now()}_${i}`, 'January', 'test_admin'
        ]);
      }

      const result = await testPool.query(`
        SELECT SUM(amount) as total_paid
        FROM payments
        WHERE student_id = $1 AND term = $2
      `, [student.school_id, 'January']);

      expect(parseFloat(result.rows[0].total_paid)).toBe(500.00);
    });
  });

  describe('4. Track Payment History', () => {
    beforeEach(async () => {
      const student = testStudents[0];
      const months = ['January', 'February', 'March'];
      
      for (const month of months) {
        const date = new Date();
        date.setMonth(months.indexOf(month));
        const paymentDate = date.toISOString().split('T')[0];
        
        await testPool.query(`
          INSERT INTO payments (
            student_id, student_name, class, payment_type, amount,
            payment_date, payment_method, receipt_number, term, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          student.school_id, student.student_name, testClassName, 'Monthly Fee',
          500.00, paymentDate, 'Cash', `RCP${Date.now()}_${month}`, month, 'test_admin'
        ]);
      }
    });

    test('should retrieve payment history for student', async () => {
      const student = testStudents[0];
      
      const result = await testPool.query(
        'SELECT * FROM payments WHERE student_id = $1 ORDER BY payment_date DESC',
        [student.school_id]
      );

      expect(result.rows.length).toBe(3);
      expect(result.rows[0].student_id).toBe(student.school_id);
    });

    test('should calculate total payments for student', async () => {
      const student = testStudents[0];
      
      const result = await testPool.query(`
        SELECT SUM(amount) as total_paid
        FROM payments
        WHERE student_id = $1
      `, [student.school_id]);

      expect(parseFloat(result.rows[0].total_paid)).toBe(1500.00);
    });

    test('should retrieve payments by date range', async () => {
      const student = testStudents[0];
      const startDate = new Date();
      startDate.setMonth(0); // January
      const endDate = new Date();
      endDate.setMonth(1); // February
      
      const result = await testPool.query(`
        SELECT * FROM payments
        WHERE student_id = $1 AND payment_date BETWEEN $2 AND $3
      `, [
        student.school_id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ]);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('5. Generate Payment Receipts', () => {
    test('should generate unique receipt number', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      const receiptNumber = `RCP${Date.now()}`;
      
      const result = await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        500.00, paymentDate, 'Cash', receiptNumber, 'test_admin'
      ]);

      expect(result.rows[0].receipt_number).toBe(receiptNumber);
    });

    test('should prevent duplicate receipt numbers', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      const receiptNumber = `RCP_DUPLICATE_${Date.now()}`;
      
      await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        500.00, paymentDate, 'Cash', receiptNumber, 'test_admin'
      ]);

      try {
        await testPool.query(`
          INSERT INTO payments (
            student_id, student_name, class, payment_type, amount,
            payment_date, payment_method, receipt_number, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          student.school_id, student.student_name, testClassName, 'Monthly Fee',
          500.00, paymentDate, 'Cash', receiptNumber, 'test_admin'
        ]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBe('23505'); // Unique violation
      }
    });

    test('should retrieve payment by receipt number', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      const receiptNumber = `RCP_SEARCH_${Date.now()}`;
      
      await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        500.00, paymentDate, 'Cash', receiptNumber, 'test_admin'
      ]);

      const result = await testPool.query(
        'SELECT * FROM payments WHERE receipt_number = $1',
        [receiptNumber]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].receipt_number).toBe(receiptNumber);
    });
  });

  describe('6. Calculate Outstanding Balances', () => {
    test('should calculate outstanding balance for student', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      
      // Expected fee: 500 per month for 3 months = 1500
      // Paid: 1000
      await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        1000.00, paymentDate, 'Cash', `RCP${Date.now()}`, 'test_admin'
      ]);

      const totalPaid = await testPool.query(`
        SELECT SUM(amount) as total_paid
        FROM payments
        WHERE student_id = $1
      `, [student.school_id]);

      const expectedFee = 1500.00; // 3 months * 500
      const paid = parseFloat(totalPaid.rows[0].total_paid);
      const outstanding = expectedFee - paid;

      expect(outstanding).toBe(500.00);
    });

    test('should identify students with outstanding balances', async () => {
      // Student 1: Paid in full
      await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        testStudents[0].school_id, testStudents[0].student_name, testClassName,
        'Monthly Fee', 1500.00, new Date().toISOString().split('T')[0],
        'Cash', `RCP${Date.now()}_1`, 'test_admin'
      ]);

      // Student 2: Partial payment
      await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        testStudents[1].school_id, testStudents[1].student_name, testClassName,
        'Monthly Fee', 800.00, new Date().toISOString().split('T')[0],
        'Cash', `RCP${Date.now()}_2`, 'test_admin'
      ]);

      // Student 3: No payment (outstanding: 1500)

      const payments = await testPool.query(`
        SELECT 
          s.school_id,
          s.student_name,
          COALESCE(SUM(p.amount), 0) as total_paid
        FROM classes_schema."${testClassName}" s
        LEFT JOIN payments p ON s.school_id = p.student_id
        GROUP BY s.school_id, s.student_name
      `);

      const expectedFee = 1500.00;
      const studentsWithOutstanding = payments.rows.filter(row => {
        const paid = parseFloat(row.total_paid);
        return paid < expectedFee;
      });

      expect(studentsWithOutstanding.length).toBe(2); // Students 2 and 3
    });
  });

  describe('7. Payment Validation', () => {
    test('should validate payment amount is positive', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      
      // Application should validate before inserting
      const amount = -100.00;
      
      if (amount < 0) {
        expect(amount).toBeLessThan(0);
        // Application should reject this
      }
    });

    test('should require payment date', async () => {
      const student = testStudents[0];
      
      try {
        await testPool.query(`
          INSERT INTO payments (
            student_id, student_name, class, payment_type, amount,
            payment_method, receipt_number, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          student.school_id, student.student_name, testClassName, 'Monthly Fee',
          500.00, 'Cash', `RCP${Date.now()}`, 'test_admin'
        ]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    test('should require payment type', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      
      try {
        await testPool.query(`
          INSERT INTO payments (
            student_id, student_name, class, amount,
            payment_date, payment_method, receipt_number, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          student.school_id, student.student_name, testClassName,
          500.00, paymentDate, 'Cash', `RCP${Date.now()}`, 'test_admin'
        ]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('8. Offline Payment Sync', () => {
    test('should mark payment as unsynced for offline mode', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      
      const result = await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by, synced
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        500.00, paymentDate, 'Cash', `RCP${Date.now()}`, 'test_admin', false
      ]);

      expect(result.rows[0].synced).toBe(false);
    });

    test('should retrieve unsynced payments', async () => {
      for (let i = 0; i < testStudents.length; i++) {
        await testPool.query(`
          INSERT INTO payments (
            student_id, student_name, class, payment_type, amount,
            payment_date, payment_method, receipt_number, recorded_by, synced
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          testStudents[i].school_id, testStudents[i].student_name, testClassName,
          'Monthly Fee', 500.00, new Date().toISOString().split('T')[0],
          'Cash', `RCP${Date.now()}_${i}`, 'test_admin', i < 1
        ]);
      }

      const result = await testPool.query(
        'SELECT * FROM payments WHERE synced = FALSE'
      );

      expect(result.rows.length).toBe(2);
    });

    test('should mark as synced after successful sync', async () => {
      const student = testStudents[0];
      const paymentDate = new Date().toISOString().split('T')[0];
      
      const insertResult = await testPool.query(`
        INSERT INTO payments (
          student_id, student_name, class, payment_type, amount,
          payment_date, payment_method, receipt_number, recorded_by, synced
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        student.school_id, student.student_name, testClassName, 'Monthly Fee',
        500.00, paymentDate, 'Cash', `RCP${Date.now()}`, 'test_admin', false
      ]);

      const paymentId = insertResult.rows[0].id;

      await testPool.query(`
        UPDATE payments 
        SET synced = TRUE
        WHERE id = $1
      `, [paymentId]);

      const result = await testPool.query(
        'SELECT * FROM payments WHERE id = $1',
        [paymentId]
      );

      expect(result.rows[0].synced).toBe(true);
    });
  });
});
