-- CreateEnum
CREATE TYPE "school_comms"."Role" AS ENUM ('director', 'teacher', 'guardian');

-- CreateEnum
CREATE TYPE "school_comms"."RequestStatus" AS ENUM ('pending', 'responded', 'expired');

-- CreateEnum
CREATE TYPE "school_comms"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "school_comms"."PaymentType" AS ENUM ('ONE_TIME', 'RECURRING', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "school_comms"."DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "school_comms"."InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "school_comms"."PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'ONLINE');

-- CreateEnum
CREATE TYPE "school_comms"."PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "school_comms"."RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "school_comms"."ExpenseStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "school_comms"."RecurringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "school_comms"."BudgetStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "school_comms"."ComponentType" AS ENUM ('ALLOWANCE', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "school_comms"."CalculationType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "school_comms"."PayrollStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "school_comms"."EntityType" AS ENUM ('EXPENSE', 'REFUND', 'BUDGET', 'PAYROLL', 'SCHOLARSHIP');

-- CreateEnum
CREATE TYPE "school_comms"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "school_comms"."ApprovalAction_Action" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "school_comms"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "school_comms"."TransactionSource" AS ENUM ('INVOICE', 'PAYMENT', 'EXPENSE', 'PAYROLL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "school_comms"."TransactionStatus" AS ENUM ('PENDING', 'POSTED', 'REVERSED');

-- CreateTable
CREATE TABLE "school_comms"."User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" "school_comms"."Role" NOT NULL,
    "username" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Student" (
    "id" UUID NOT NULL,
    "studentName" TEXT NOT NULL,
    "classId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Class" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" UUID,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Request" (
    "id" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "questions" JSONB NOT NULL,
    "responses" JSONB,
    "status" "school_comms"."RequestStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."ChatLog" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Account" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "school_comms"."AccountType" NOT NULL,
    "parentId" UUID,
    "campusId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLeaf" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."FeeStructure" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "academicYearId" UUID NOT NULL,
    "termId" UUID,
    "gradeLevel" TEXT,
    "campusId" UUID,
    "studentCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."FeeStructureItem" (
    "id" UUID NOT NULL,
    "feeStructureId" UUID NOT NULL,
    "feeCategory" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "accountId" UUID NOT NULL,
    "paymentType" "school_comms"."PaymentType" NOT NULL,
    "dueDate" TIMESTAMPTZ,
    "installmentCount" INTEGER,
    "description" TEXT,

    CONSTRAINT "FeeStructureItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Discount" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "school_comms"."DiscountType" NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "applicableFeeCategories" JSONB NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Scholarship" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "discountId" UUID NOT NULL,
    "eligibilityCriteria" JSONB NOT NULL,
    "maxRecipients" INTEGER,
    "academicYearId" UUID NOT NULL,
    "approvalWorkflowId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."LateFeeRule" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "school_comms"."DiscountType" NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "gracePeriodDays" INTEGER NOT NULL,
    "applicableFeeCategories" JSONB NOT NULL,
    "campusId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LateFeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Invoice" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "termId" UUID,
    "issueDate" TIMESTAMPTZ NOT NULL,
    "dueDate" TIMESTAMPTZ NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lateFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "school_comms"."InvoiceStatus" NOT NULL,
    "campusId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."InvoiceItem" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "feeCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "accountId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Payment" (
    "id" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "studentId" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentMethod" "school_comms"."PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMPTZ NOT NULL,
    "referenceNumber" TEXT,
    "status" "school_comms"."PaymentStatus" NOT NULL,
    "campusId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."PaymentAllocation" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Refund" (
    "id" UUID NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "studentId" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "school_comms"."RefundStatus" NOT NULL,
    "requestedBy" UUID NOT NULL,
    "approvedBy" UUID,
    "requestDate" TIMESTAMPTZ NOT NULL,
    "approvalDate" TIMESTAMPTZ,
    "completionDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Expense" (
    "id" UUID NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "expenseDate" TIMESTAMPTZ NOT NULL,
    "vendorId" UUID,
    "accountId" UUID NOT NULL,
    "departmentId" UUID,
    "campusId" UUID NOT NULL,
    "status" "school_comms"."ExpenseStatus" NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringFrequency" "school_comms"."RecurringFrequency",
    "budgetId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."ExpenseAttachment" (
    "id" UUID NOT NULL,
    "expenseId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" UUID NOT NULL,

    CONSTRAINT "ExpenseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Vendor" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Budget" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "status" "school_comms"."BudgetStatus" NOT NULL,
    "campusId" UUID,
    "approvedBy" UUID,
    "approvalDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."BudgetLine" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "departmentId" UUID,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "spentAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(15,2) NOT NULL,
    "alertThreshold" DECIMAL(5,2) NOT NULL DEFAULT 80,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."SalaryStructure" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "staffCategory" TEXT NOT NULL,
    "baseSalary" DECIMAL(15,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."SalaryComponent" (
    "id" UUID NOT NULL,
    "salaryStructureId" UUID NOT NULL,
    "componentType" "school_comms"."ComponentType" NOT NULL,
    "name" TEXT NOT NULL,
    "calculationType" "school_comms"."CalculationType" NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "accountId" UUID NOT NULL,

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Payroll" (
    "id" UUID NOT NULL,
    "payrollNumber" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "school_comms"."PayrollStatus" NOT NULL,
    "totalGrossSalary" DECIMAL(15,2) NOT NULL,
    "totalDeductions" DECIMAL(15,2) NOT NULL,
    "totalNetSalary" DECIMAL(15,2) NOT NULL,
    "approvedBy" UUID,
    "approvalDate" TIMESTAMPTZ,
    "paymentDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."PayrollItem" (
    "id" UUID NOT NULL,
    "payrollId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "salaryStructureId" UUID NOT NULL,
    "baseSalary" DECIMAL(15,2) NOT NULL,
    "totalAllowances" DECIMAL(15,2) NOT NULL,
    "totalDeductions" DECIMAL(15,2) NOT NULL,
    "netSalary" DECIMAL(15,2) NOT NULL,
    "payslipGenerated" BOOLEAN NOT NULL DEFAULT false,
    "payslipPath" TEXT,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."PayrollItemDetail" (
    "id" UUID NOT NULL,
    "payrollItemId" UUID NOT NULL,
    "componentType" "school_comms"."ComponentType" NOT NULL,
    "componentName" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "accountId" UUID NOT NULL,

    CONSTRAINT "PayrollItemDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."ApprovalWorkflow" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" "school_comms"."EntityType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."ApprovalStep" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverRole" TEXT NOT NULL,
    "minAmount" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."ApprovalRequest" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "entityType" "school_comms"."EntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "currentStepOrder" INTEGER NOT NULL,
    "status" "school_comms"."ApprovalStatus" NOT NULL,
    "requestedBy" UUID NOT NULL,
    "requestDate" TIMESTAMPTZ NOT NULL,
    "completionDate" TIMESTAMPTZ,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."ApprovalAction" (
    "id" UUID NOT NULL,
    "approvalRequestId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverUserId" UUID NOT NULL,
    "action" "school_comms"."ApprovalAction_Action" NOT NULL,
    "comments" TEXT,
    "actionDate" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."AuditLog" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" "school_comms"."AuditAction" NOT NULL,
    "userId" UUID NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."Transaction" (
    "id" UUID NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "transactionDate" TIMESTAMPTZ NOT NULL,
    "description" TEXT NOT NULL,
    "sourceType" "school_comms"."TransactionSource" NOT NULL,
    "sourceId" UUID NOT NULL,
    "status" "school_comms"."TransactionStatus" NOT NULL,
    "postedBy" UUID,
    "postedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_comms"."TransactionLine" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "debitAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "TransactionLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "school_comms"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_key" ON "school_comms"."Class"("name");

-- CreateIndex
CREATE INDEX "Request_senderId_createdAt_idx" ON "school_comms"."Request"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Request_recipientId_createdAt_idx" ON "school_comms"."Request"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "school_comms"."Request"("status");

-- CreateIndex
CREATE INDEX "ChatLog_requestId_idx" ON "school_comms"."ChatLog"("requestId");

-- CreateIndex
CREATE INDEX "ChatLog_actorId_idx" ON "school_comms"."ChatLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_code_key" ON "school_comms"."Account"("code");

-- CreateIndex
CREATE INDEX "Account_code_idx" ON "school_comms"."Account"("code");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "school_comms"."Account"("type");

-- CreateIndex
CREATE INDEX "Account_campusId_idx" ON "school_comms"."Account"("campusId");

-- CreateIndex
CREATE INDEX "Account_isActive_idx" ON "school_comms"."Account"("isActive");

-- CreateIndex
CREATE INDEX "FeeStructure_academicYearId_idx" ON "school_comms"."FeeStructure"("academicYearId");

-- CreateIndex
CREATE INDEX "FeeStructure_campusId_idx" ON "school_comms"."FeeStructure"("campusId");

-- CreateIndex
CREATE INDEX "FeeStructure_isActive_idx" ON "school_comms"."FeeStructure"("isActive");

-- CreateIndex
CREATE INDEX "FeeStructureItem_feeStructureId_idx" ON "school_comms"."FeeStructureItem"("feeStructureId");

-- CreateIndex
CREATE INDEX "FeeStructureItem_feeCategory_idx" ON "school_comms"."FeeStructureItem"("feeCategory");

-- CreateIndex
CREATE INDEX "Discount_isActive_idx" ON "school_comms"."Discount"("isActive");

-- CreateIndex
CREATE INDEX "Discount_startDate_endDate_idx" ON "school_comms"."Discount"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Scholarship_academicYearId_idx" ON "school_comms"."Scholarship"("academicYearId");

-- CreateIndex
CREATE INDEX "Scholarship_isActive_idx" ON "school_comms"."Scholarship"("isActive");

-- CreateIndex
CREATE INDEX "LateFeeRule_campusId_idx" ON "school_comms"."LateFeeRule"("campusId");

-- CreateIndex
CREATE INDEX "LateFeeRule_isActive_idx" ON "school_comms"."LateFeeRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "school_comms"."Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "school_comms"."Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_studentId_idx" ON "school_comms"."Invoice"("studentId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "school_comms"."Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "school_comms"."Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Invoice_campusId_idx" ON "school_comms"."Invoice"("campusId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "school_comms"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "school_comms"."Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_receiptNumber_idx" ON "school_comms"."Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_studentId_idx" ON "school_comms"."Payment"("studentId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "school_comms"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "school_comms"."Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_campusId_idx" ON "school_comms"."Payment"("campusId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "school_comms"."PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_invoiceId_idx" ON "school_comms"."PaymentAllocation"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundNumber_key" ON "school_comms"."Refund"("refundNumber");

-- CreateIndex
CREATE INDEX "Refund_refundNumber_idx" ON "school_comms"."Refund"("refundNumber");

-- CreateIndex
CREATE INDEX "Refund_studentId_idx" ON "school_comms"."Refund"("studentId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "school_comms"."Refund"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_expenseNumber_key" ON "school_comms"."Expense"("expenseNumber");

-- CreateIndex
CREATE INDEX "Expense_expenseNumber_idx" ON "school_comms"."Expense"("expenseNumber");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "school_comms"."Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "school_comms"."Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_vendorId_idx" ON "school_comms"."Expense"("vendorId");

-- CreateIndex
CREATE INDEX "Expense_campusId_idx" ON "school_comms"."Expense"("campusId");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "school_comms"."Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "ExpenseAttachment_expenseId_idx" ON "school_comms"."ExpenseAttachment"("expenseId");

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "school_comms"."Vendor"("name");

-- CreateIndex
CREATE INDEX "Vendor_isActive_idx" ON "school_comms"."Vendor"("isActive");

-- CreateIndex
CREATE INDEX "Budget_fiscalYear_idx" ON "school_comms"."Budget"("fiscalYear");

-- CreateIndex
CREATE INDEX "Budget_status_idx" ON "school_comms"."Budget"("status");

-- CreateIndex
CREATE INDEX "Budget_campusId_idx" ON "school_comms"."Budget"("campusId");

-- CreateIndex
CREATE INDEX "BudgetLine_budgetId_idx" ON "school_comms"."BudgetLine"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetLine_category_idx" ON "school_comms"."BudgetLine"("category");

-- CreateIndex
CREATE INDEX "SalaryStructure_staffCategory_idx" ON "school_comms"."SalaryStructure"("staffCategory");

-- CreateIndex
CREATE INDEX "SalaryStructure_isActive_idx" ON "school_comms"."SalaryStructure"("isActive");

-- CreateIndex
CREATE INDEX "SalaryComponent_salaryStructureId_idx" ON "school_comms"."SalaryComponent"("salaryStructureId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_payrollNumber_key" ON "school_comms"."Payroll"("payrollNumber");

-- CreateIndex
CREATE INDEX "Payroll_payrollNumber_idx" ON "school_comms"."Payroll"("payrollNumber");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "school_comms"."Payroll"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_month_year_key" ON "school_comms"."Payroll"("month", "year");

-- CreateIndex
CREATE INDEX "PayrollItem_payrollId_idx" ON "school_comms"."PayrollItem"("payrollId");

-- CreateIndex
CREATE INDEX "PayrollItem_staffId_idx" ON "school_comms"."PayrollItem"("staffId");

-- CreateIndex
CREATE INDEX "PayrollItemDetail_payrollItemId_idx" ON "school_comms"."PayrollItemDetail"("payrollItemId");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_entityType_idx" ON "school_comms"."ApprovalWorkflow"("entityType");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_isActive_idx" ON "school_comms"."ApprovalWorkflow"("isActive");

-- CreateIndex
CREATE INDEX "ApprovalStep_workflowId_idx" ON "school_comms"."ApprovalStep"("workflowId");

-- CreateIndex
CREATE INDEX "ApprovalStep_stepOrder_idx" ON "school_comms"."ApprovalStep"("stepOrder");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "school_comms"."ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "school_comms"."ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedBy_idx" ON "school_comms"."ApprovalRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ApprovalAction_approvalRequestId_idx" ON "school_comms"."ApprovalAction"("approvalRequestId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "school_comms"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "school_comms"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "school_comms"."AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionNumber_key" ON "school_comms"."Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "Transaction_transactionNumber_idx" ON "school_comms"."Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "Transaction_sourceType_sourceId_idx" ON "school_comms"."Transaction"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "school_comms"."Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "school_comms"."Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "TransactionLine_transactionId_idx" ON "school_comms"."TransactionLine"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionLine_accountId_idx" ON "school_comms"."TransactionLine"("accountId");

-- AddForeignKey
ALTER TABLE "school_comms"."Student" ADD CONSTRAINT "Student_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "school_comms"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_comms"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "school_comms"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Request" ADD CONSTRAINT "Request_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "school_comms"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Request" ADD CONSTRAINT "Request_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "school_comms"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."ChatLog" ADD CONSTRAINT "ChatLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "school_comms"."Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."ChatLog" ADD CONSTRAINT "ChatLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "school_comms"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "school_comms"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."FeeStructureItem" ADD CONSTRAINT "FeeStructureItem_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "school_comms"."FeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."FeeStructureItem" ADD CONSTRAINT "FeeStructureItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "school_comms"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Scholarship" ADD CONSTRAINT "Scholarship_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "school_comms"."Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Scholarship" ADD CONSTRAINT "Scholarship_approvalWorkflowId_fkey" FOREIGN KEY ("approvalWorkflowId") REFERENCES "school_comms"."ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "school_comms"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "school_comms"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "school_comms"."Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "school_comms"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Expense" ADD CONSTRAINT "Expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "school_comms"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "school_comms"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."Expense" ADD CONSTRAINT "Expense_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "school_comms"."Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."ExpenseAttachment" ADD CONSTRAINT "ExpenseAttachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "school_comms"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."BudgetLine" ADD CONSTRAINT "BudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "school_comms"."Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."BudgetLine" ADD CONSTRAINT "BudgetLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "school_comms"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."SalaryComponent" ADD CONSTRAINT "SalaryComponent_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "school_comms"."SalaryStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."SalaryComponent" ADD CONSTRAINT "SalaryComponent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "school_comms"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "school_comms"."Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."PayrollItem" ADD CONSTRAINT "PayrollItem_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "school_comms"."SalaryStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."PayrollItemDetail" ADD CONSTRAINT "PayrollItemDetail_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "school_comms"."PayrollItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."PayrollItemDetail" ADD CONSTRAINT "PayrollItemDetail_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "school_comms"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."ApprovalStep" ADD CONSTRAINT "ApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "school_comms"."ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "school_comms"."ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."ApprovalAction" ADD CONSTRAINT "ApprovalAction_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "school_comms"."ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."TransactionLine" ADD CONSTRAINT "TransactionLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "school_comms"."Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_comms"."TransactionLine" ADD CONSTRAINT "TransactionLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "school_comms"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
