# ERP Modules Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing the five core ERP modules in your School Management System.

---

## Database Setup

### 1. Execute SQL Scripts in Order
```bash
# Connect to PostgreSQL
psql -U postgres -d school_erp

# Execute schemas in order
\i backend/database/01_finance_schema.sql
\i backend/database/02_inventory_schema.sql
\i backend/database/03_asset_management_schema.sql
\i backend/database/04_hr_staff_schema.sql
\i backend/database/05_integration_schema.sql
```

### 2. Create Triggers for Automation

#### Stock Ledger Auto-Update Trigger
```sql
CREATE OR REPLACE FUNCTION update_stock_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate new balance based on transaction type
    IF NEW.transaction_type IN ('RECEIPT', 'RETURN') THEN
        NEW.balance_quantity := COALESCE(
            (SELECT balance_quantity FROM stock_ledger 
             WHERE item_id = NEW.item_id AND store_id = NEW.store_id 
             ORDER BY id DESC LIMIT 1), 0
        ) + NEW.quantity_in;
    ELSIF NEW.transaction_type IN ('ISSUE', 'TRANSFER') THEN
        NEW.balance_quantity := COALESCE(
            (SELECT balance_quantity FROM stock_ledger 
             WHERE item_id = NEW.item_id AND store_id = NEW.store_id 
             ORDER BY id DESC LIMIT 1), 0
        ) - NEW.quantity_out;
    END IF;
    
    NEW.total_value := NEW.balance_quantity * NEW.unit_cost;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_balance_trigger
BEFORE INSERT ON stock_ledger
FOR EACH ROW
EXECUTE FUNCTION update_stock_balance();
```

#### Invoice Balance Auto-Update Trigger
```sql
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET paid_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE invoice_id = NEW.invoice_id AND status = 'COMPLETED'
    ),
    balance_amount = net_amount - (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE invoice_id = NEW.invoice_id AND status = 'COMPLETED'
    ),
    status = CASE
        WHEN net_amount <= (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE invoice_id = NEW.invoice_id AND status = 'COMPLETED'
        ) THEN 'PAID'
        WHEN (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE invoice_id = NEW.invoice_id AND status = 'COMPLETED'
        ) > 0 THEN 'PARTIAL'
        ELSE status
    END
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_invoice_update_trigger
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_balance();
```

#### Depreciation Auto-Calculation Function
```sql
CREATE OR REPLACE FUNCTION calculate_depreciation(
    p_asset_id INTEGER,
    p_period_start DATE,
    p_period_end DATE
) RETURNS DECIMAL AS $$
DECLARE
    v_method VARCHAR(50);
    v_purchase_cost DECIMAL(12,2);
    v_salvage_value DECIMAL(12,2);
    v_useful_life INTEGER;
    v_accumulated_dep DECIMAL(12,2);
    v_depreciation DECIMAL(12,2);
    v_months INTEGER;
BEGIN
    SELECT depreciation_method, purchase_cost, salvage_value, 
           useful_life_years, accumulated_depreciation
    INTO v_method, v_purchase_cost, v_salvage_value, 
         v_useful_life, v_accumulated_dep
    FROM assets WHERE id = p_asset_id;
    
    v_months := EXTRACT(MONTH FROM AGE(p_period_end, p_period_start));
    
    IF v_method = 'STRAIGHT_LINE' THEN
        v_depreciation := ((v_purchase_cost - v_salvage_value) / v_useful_life) 
                         * (v_months / 12.0);
    ELSIF v_method = 'DECLINING_BALANCE' THEN
        v_depreciation := (v_purchase_cost - v_accumulated_dep) 
                         * (2.0 / v_useful_life) * (v_months / 12.0);
    END IF;
    
    RETURN v_depreciation;
END;
$$ LANGUAGE plpgsql;
```

---

## Backend Implementation (Node.js + Express)

### 1. Project Structure
```
backend/
├── routes/
│   ├── finance/
│   │   ├── accounts.js
│   │   ├── fees.js
│   │   ├── invoices.js
│   │   ├── payments.js
│   │   └── budgets.js
│   ├── inventory/
│   │   ├── items.js
│   │   ├── procurement.js
│   │   ├── stock.js
│   │   └── reports.js
│   ├── assets/
│   │   ├── registry.js
│   │   ├── maintenance.js
│   │   ├── depreciation.js
│   │   └── disposal.js
│   └── hr/
│       ├── employees.js
│       ├── attendance.js
│       ├── leave.js
│       └── payroll.js
├── controllers/
├── services/
├── models/
└── middleware/
```

### 2. Sample Controller Implementation

#### Finance - Invoice Controller
```javascript
// controllers/finance/invoiceController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class InvoiceController {
  // Generate invoice for student
  async generateInvoice(req, res) {
    try {
      const { studentId, feeStructureIds, dueDate } = req.body;
      
      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get student fee assignments
        const feeAssignments = await tx.student_fee_assignments.findMany({
          where: {
            student_id: studentId,
            fee_structure_id: { in: feeStructureIds }
          },
          include: { fee_structure: true, discount_rule: true }
        });
        
        // Calculate totals
        let totalAmount = 0;
        let discountAmount = 0;
        
        const lineItems = feeAssignments.map(assignment => {
          totalAmount += assignment.total_amount;
          discountAmount += assignment.discount_amount;
          
          return {
            fee_structure_id: assignment.fee_structure_id,
            description: assignment.fee_structure.name,
            quantity: 1,
            unit_price: assignment.total_amount,
            total_amount: assignment.total_amount,
            account_id: assignment.fee_structure.account_id
          };
        });
        
        const netAmount = totalAmount - discountAmount;
        
        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(tx);
        
        // Create invoice
        const invoice = await tx.invoices.create({
          data: {
            invoice_number: invoiceNumber,
            student_id: studentId,
            invoice_date: new Date(),
            due_date: new Date(dueDate),
            total_amount: totalAmount,
            discount_amount: discountAmount,
            net_amount: netAmount,
            balance_amount: netAmount,
            status: 'PENDING',
            created_by: req.user.id,
            invoice_line_items: {
              create: lineItems
            }
          },
          include: { invoice_line_items: true }
        });
        
        return invoice;
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Invoice generation error:', error);
      res.status(500).json({ 
        success: false, 
        error: { message: 'Failed to generate invoice' }
      });
    }
  }
  
  // Record payment
  async recordPayment(req, res) {
    try {
      const { invoiceId, amount, paymentMethod, referenceNumber } = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
        // Get invoice
        const invoice = await tx.invoices.findUnique({
          where: { id: invoiceId }
        });
        
        if (!invoice) {
          throw new Error('Invoice not found');
        }
        
        if (amount > invoice.balance_amount) {
          throw new Error('Payment amount exceeds balance');
        }
        
        // Generate payment number
        const paymentNumber = await generatePaymentNumber(tx);
        
        // Create payment
        const payment = await tx.payments.create({
          data: {
            payment_number: paymentNumber,
            invoice_id: invoiceId,
            student_id: invoice.student_id,
            payment_date: new Date(),
            amount: amount,
            payment_method: paymentMethod,
            reference_number: referenceNumber,
            status: 'COMPLETED',
            received_by: req.user.id
          }
        });
        
        // Create journal entry
        await createPaymentJournalEntry(tx, payment, invoice);
        
        return payment;
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Payment recording error:', error);
      res.status(500).json({ 
        success: false, 
        error: { message: error.message }
      });
    }
  }
}

// Helper functions
async function generateInvoiceNumber(tx) {
  const year = new Date().getFullYear();
  const count = await tx.invoices.count({
    where: {
      invoice_number: { startsWith: `INV-${year}` }
    }
  });
  return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
}

async function generatePaymentNumber(tx) {
  const year = new Date().getFullYear();
  const count = await tx.payments.count({
    where: {
      payment_number: { startsWith: `PAY-${year}` }
    }
  });
  return `PAY-${year}-${String(count + 1).padStart(6, '0')}`;
}

async function createPaymentJournalEntry(tx, payment, invoice) {
  // Implementation for double-entry bookkeeping
  // Debit: Cash/Bank Account
  // Credit: Accounts Receivable
}

module.exports = new InvoiceController();
```


#### HR - Payroll Processing Controller
```javascript
// controllers/hr/payrollController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PayrollController {
  // Process payroll for a month
  async processPayroll(req, res) {
    try {
      const { month, year, departmentId } = req.body;
      const payPeriodStart = new Date(year, month - 1, 1);
      const payPeriodEnd = new Date(year, month, 0);
      
      const result = await prisma.$transaction(async (tx) => {
        // Get active employees
        const employees = await tx.employees.findMany({
          where: {
            status: 'ACTIVE',
            ...(departmentId && { department_id: departmentId })
          },
          include: {
            employee_salary_structures: {
              where: {
                is_active: true,
                effective_from: { lte: payPeriodEnd }
              },
              include: { component: true }
            }
          }
        });
        
        // Get attendance summary for the period
        const attendanceSummary = await tx.$queryRaw`
          SELECT 
            employee_id,
            COUNT(*) FILTER (WHERE status = 'PRESENT') as days_present,
            COUNT(*) FILTER (WHERE status = 'ABSENT') as days_absent,
            SUM(overtime_hours) as total_overtime
          FROM attendance_records
          WHERE attendance_date BETWEEN ${payPeriodStart} AND ${payPeriodEnd}
          GROUP BY employee_id
        `;
        
        // Create payroll run
        const payrollNumber = await generatePayrollNumber(tx, month, year);
        const payrollRun = await tx.payroll_runs.create({
          data: {
            payroll_number: payrollNumber,
            payroll_month: `${year}-${String(month).padStart(2, '0')}`,
            pay_period_start: payPeriodStart,
            pay_period_end: payPeriodEnd,
            total_employees: employees.length,
            status: 'DRAFT',
            processed_by: req.user.id
          }
        });
        
        // Calculate payroll for each employee
        const payrollDetails = [];
        
        for (const employee of employees) {
          const attendance = attendanceSummary.find(
            a => a.employee_id === employee.id
          ) || { days_present: 0, days_absent: 0, total_overtime: 0 };
          
          const calculation = await calculateEmployeePayroll(
            employee,
            attendance,
            payPeriodStart,
            payPeriodEnd
          );
          
          const payrollDetail = await tx.payroll_details.create({
            data: {
              payroll_run_id: payrollRun.id,
              employee_id: employee.id,
              days_worked: attendance.days_present,
              days_absent: attendance.days_absent,
              overtime_hours: attendance.total_overtime,
              basic_salary: calculation.basicSalary,
              gross_salary: calculation.grossSalary,
              total_allowances: calculation.totalAllowances,
              total_deductions: calculation.totalDeductions,
              tax_amount: calculation.taxAmount,
              net_salary: calculation.netSalary,
              status: 'PENDING'
            }
          });
          
          // Create component breakdown
          for (const component of calculation.components) {
            await tx.payroll_component_details.create({
              data: {
                payroll_detail_id: payrollDetail.id,
                component_id: component.id,
                component_type: component.type,
                amount: component.amount,
                calculation_basis: component.basis
              }
            });
          }
          
          payrollDetails.push(payrollDetail);
        }
        
        // Update payroll run totals
        const totals = payrollDetails.reduce((acc, detail) => ({
          grossSalary: acc.grossSalary + detail.gross_salary,
          deductions: acc.deductions + detail.total_deductions,
          netSalary: acc.netSalary + detail.net_salary
        }), { grossSalary: 0, deductions: 0, netSalary: 0 });
        
        await tx.payroll_runs.update({
          where: { id: payrollRun.id },
          data: {
            total_gross_salary: totals.grossSalary,
            total_deductions: totals.deductions,
            total_net_salary: totals.netSalary,
            status: 'CALCULATED'
          }
        });
        
        return { payrollRun, payrollDetails };
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Payroll processing error:', error);
      res.status(500).json({ 
        success: false, 
        error: { message: 'Failed to process payroll' }
      });
    }
  }
}

async function calculateEmployeePayroll(employee, attendance, startDate, endDate) {
  // Get working days in month
  const workingDays = getWorkingDays(startDate, endDate);
  
  // Calculate basic salary (pro-rated if absent)
  const basicComponent = employee.employee_salary_structures.find(
    s => s.component.component_type === 'BASIC'
  );
  const monthlyBasic = basicComponent?.amount || 0;
  const dailyRate = monthlyBasic / workingDays;
  const basicSalary = dailyRate * attendance.days_present;
  
  let grossSalary = basicSalary;
  let totalAllowances = 0;
  let totalDeductions = 0;
  const components = [];
  
  // Calculate allowances
  for (const structure of employee.employee_salary_structures) {
    if (structure.component.component_type === 'ALLOWANCE') {
      let amount = structure.amount;
      
      if (structure.component.calculation_type === 'PERCENTAGE') {
        amount = (basicSalary * structure.amount) / 100;
      } else if (structure.component.calculation_type === 'ATTENDANCE_BASED') {
        amount = (structure.amount / workingDays) * attendance.days_present;
      }
      
      grossSalary += amount;
      totalAllowances += amount;
      
      components.push({
        id: structure.component_id,
        type: 'ALLOWANCE',
        amount: amount,
        basis: structure.component.calculation_type
      });
    }
  }
  
  // Calculate overtime
  if (attendance.total_overtime > 0) {
    const overtimeRate = dailyRate / 8; // Assuming 8-hour workday
    const overtimeAmount = overtimeRate * attendance.total_overtime * 1.5;
    grossSalary += overtimeAmount;
    
    components.push({
      id: null,
      type: 'OVERTIME',
      amount: overtimeAmount,
      basis: 'HOURLY_RATE'
    });
  }
  
  // Calculate deductions
  for (const structure of employee.employee_salary_structures) {
    if (structure.component.component_type === 'DEDUCTION') {
      let amount = structure.amount;
      
      if (structure.component.calculation_type === 'PERCENTAGE') {
        amount = (grossSalary * structure.amount) / 100;
      }
      
      totalDeductions += amount;
      
      components.push({
        id: structure.component_id,
        type: 'DEDUCTION',
        amount: amount,
        basis: structure.component.calculation_type
      });
    }
  }
  
  // Calculate tax
  const taxAmount = calculateTax(grossSalary);
  totalDeductions += taxAmount;
  
  const netSalary = grossSalary - totalDeductions;
  
  return {
    basicSalary,
    grossSalary,
    totalAllowances,
    totalDeductions,
    taxAmount,
    netSalary,
    components
  };
}

function calculateTax(grossSalary) {
  // Implement tax calculation based on tax_slabs table
  // This is a simplified version
  if (grossSalary <= 50000) return 0;
  if (grossSalary <= 100000) return (grossSalary - 50000) * 0.1;
  return 5000 + (grossSalary - 100000) * 0.2;
}

function getWorkingDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Exclude weekends
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

async function generatePayrollNumber(tx, month, year) {
  const prefix = `PAY-${year}${String(month).padStart(2, '0')}`;
  const count = await tx.payroll_runs.count({
    where: { payroll_number: { startsWith: prefix } }
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

module.exports = new PayrollController();
```

---

## Frontend Implementation (React + Vite)

### 1. Component Structure
```
APP/src/
├── PAGE/
│   ├── Finance/
│   │   ├── ChartOfAccounts/
│   │   ├── FeeManagement/
│   │   ├── Invoicing/
│   │   └── Budgeting/
│   ├── Inventory/
│   │   ├── ItemMaster/
│   │   ├── Procurement/
│   │   ├── StockManagement/
│   │   └── Reports/
│   ├── Assets/
│   │   ├── AssetRegistry/
│   │   ├── Maintenance/
│   │   └── Depreciation/
│   └── HR/
│       ├── Employees/
│       ├── Attendance/
│       ├── Leave/
│       └── Payroll/
└── COMPONENTS/
    ├── Finance/
    ├── Inventory/
    ├── Assets/
    └── HR/
```

### 2. Sample React Component

#### Invoice Generation Component
```jsx
// APP/src/PAGE/Finance/Invoicing/GenerateInvoice.jsx
import React, { useState, useEffect } from 'react';
import styles from './GenerateInvoice.module.css';

const GenerateInvoice = () => {
  const [students, setStudents] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFees, setSelectedFees] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchStudents();
    fetchFeeStructures();
  }, []);
  
  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      setStudents(data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };
  
  const fetchFeeStructures = async () => {
    try {
      const response = await fetch('/api/finance/fee-structures?is_active=true');
      const data = await response.json();
      setFeeStructures(data.data);
    } catch (error) {
      console.error('Error fetching fee structures:', error);
    }
  };
  
  const handleGenerateInvoice = async () => {
    if (!selectedStudent || selectedFees.length === 0 || !dueDate) {
      alert('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/finance/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          feeStructureIds: selectedFees,
          dueDate: dueDate
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Invoice generated successfully!');
        // Reset form or redirect
      } else {
        alert('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <h2>Generate Invoice</h2>
      
      <div className={styles.formGroup}>
        <label>Select Student</label>
        <select 
          value={selectedStudent?.id || ''} 
          onChange={(e) => {
            const student = students.find(s => s.id === parseInt(e.target.value));
            setSelectedStudent(student);
          }}
        >
          <option value="">-- Select Student --</option>
          {students.map(student => (
            <option key={student.id} value={student.id}>
              {student.name} ({student.student_code})
            </option>
          ))}
        </select>
      </div>
      
      <div className={styles.formGroup}>
        <label>Select Fee Items</label>
        <div className={styles.checkboxGroup}>
          {feeStructures.map(fee => (
            <label key={fee.id} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={selectedFees.includes(fee.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFees([...selectedFees, fee.id]);
                  } else {
                    setSelectedFees(selectedFees.filter(id => id !== fee.id));
                  }
                }}
              />
              {fee.name} - ${fee.amount}
            </label>
          ))}
        </div>
      </div>
      
      <div className={styles.formGroup}>
        <label>Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      
      <button 
        onClick={handleGenerateInvoice} 
        disabled={loading}
        className={styles.submitButton}
      >
        {loading ? 'Generating...' : 'Generate Invoice'}
      </button>
    </div>
  );
};

export default GenerateInvoice;
```

---

## Testing Strategy

### 1. Unit Tests
```javascript
// __tests__/finance/invoiceService.test.js
describe('Invoice Service', () => {
  test('should generate invoice with correct calculations', async () => {
    const invoice = await invoiceService.generate({
      studentId: 1,
      feeStructureIds: [1, 2],
      dueDate: '2024-12-31'
    });
    
    expect(invoice.total_amount).toBeGreaterThan(0);
    expect(invoice.net_amount).toBe(
      invoice.total_amount - invoice.discount_amount
    );
  });
});
```

### 2. Integration Tests
```javascript
// __tests__/integration/payroll.test.js
describe('Payroll Processing', () => {
  test('should process payroll with attendance integration', async () => {
    // Create test data
    const employee = await createTestEmployee();
    await createAttendanceRecords(employee.id);
    
    // Process payroll
    const result = await payrollService.process({
      month: 12,
      year: 2024
    });
    
    expect(result.payrollDetails).toHaveLength(1);
    expect(result.payrollDetails[0].net_salary).toBeGreaterThan(0);
  });
});
```

---

## Deployment Checklist

- [ ] Database schema created
- [ ] Triggers and functions implemented
- [ ] Seed data loaded
- [ ] API routes configured
- [ ] Authentication middleware setup
- [ ] Role-based access control implemented
- [ ] Frontend components built
- [ ] API integration tested
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Backup strategy defined
- [ ] Performance optimization done
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] User training materials prepared
