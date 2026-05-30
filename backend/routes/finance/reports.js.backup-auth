const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../../middleware/auth');

// Trial Balance
router.get('/trial-balance', authenticateToken, async (req, res) => {
  try {
    const { asOfDate, campusId } = req.query;
    const date = asOfDate ? new Date(asOfDate) : new Date();
    
    const where = { status: 'POSTED', transactionDate: { lte: date } };
    
    const transactions = await prisma.transactionLine.findMany({
      where: {
        transaction: where
      },
      include: {
        account: true,
        transaction: true
      }
    });
    
    // Group by account
    const accountBalances = {};
    
    transactions.forEach(line => {
      const accountId = line.accountId;
      if (!accountBalances[accountId]) {
        accountBalances[accountId] = {
          account: line.account,
          debit: 0,
          credit: 0
        };
      }
      accountBalances[accountId].debit += parseFloat(line.debitAmount);
      accountBalances[accountId].credit += parseFloat(line.creditAmount);
    });
    
    const trialBalance = Object.values(accountBalances).map(item => ({
      accountCode: item.account.code,
      accountName: item.account.name,
      accountType: item.account.type,
      debit: item.debit,
      credit: item.credit,
      balance: item.debit - item.credit
    }));
    
    const totalDebit = trialBalance.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = trialBalance.reduce((sum, item) => sum + item.credit, 0);
    
    res.json({
      success: true,
      data: {
        asOfDate: date,
        accounts: trialBalance,
        totals: {
          debit: totalDebit,
          credit: totalCredit,
          difference: totalDebit - totalCredit
        }
      }
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to generate trial balance' } });
  }
});

// Income Statement (Profit & Loss)
router.get('/income-statement', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, campusId } = req.query;
    
    const where = {
      status: 'POSTED',
      transactionDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };
    
    const transactions = await prisma.transactionLine.findMany({
      where: {
        transaction: where,
        account: {
          type: { in: ['INCOME', 'EXPENSE'] }
        }
      },
      include: {
        account: true
      }
    });
    
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeAccounts = [];
    const expenseAccounts = [];
    
    const accountTotals = {};
    
    transactions.forEach(line => {
      const accountId = line.accountId;
      if (!accountTotals[accountId]) {
        accountTotals[accountId] = {
          account: line.account,
          amount: 0
        };
      }
      
      if (line.account.type === 'INCOME') {
        accountTotals[accountId].amount += parseFloat(line.creditAmount) - parseFloat(line.debitAmount);
      } else {
        accountTotals[accountId].amount += parseFloat(line.debitAmount) - parseFloat(line.creditAmount);
      }
    });
    
    Object.values(accountTotals).forEach(item => {
      if (item.account.type === 'INCOME') {
        totalIncome += item.amount;
        incomeAccounts.push({
          code: item.account.code,
          name: item.account.name,
          amount: item.amount
        });
      } else {
        totalExpense += item.amount;
        expenseAccounts.push({
          code: item.account.code,
          name: item.account.name,
          amount: item.amount
        });
      }
    });
    
    const netIncome = totalIncome - totalExpense;
    
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        income: {
          accounts: incomeAccounts,
          total: totalIncome
        },
        expenses: {
          accounts: expenseAccounts,
          total: totalExpense
        },
        netIncome,
        profitMargin: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error generating income statement:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to generate income statement' } });
  }
});

// Balance Sheet
router.get('/balance-sheet', authenticateToken, async (req, res) => {
  try {
    const { asOfDate, campusId } = req.query;
    const date = asOfDate ? new Date(asOfDate) : new Date();
    
    const where = { status: 'POSTED', transactionDate: { lte: date } };
    
    const transactions = await prisma.transactionLine.findMany({
      where: {
        transaction: where,
        account: {
          type: { in: ['ASSET', 'LIABILITY'] }
        }
      },
      include: {
        account: true
      }
    });
    
    const accountBalances = {};
    
    transactions.forEach(line => {
      const accountId = line.accountId;
      if (!accountBalances[accountId]) {
        accountBalances[accountId] = {
          account: line.account,
          balance: 0
        };
      }
      accountBalances[accountId].balance += parseFloat(line.debitAmount) - parseFloat(line.creditAmount);
    });
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    const assets = [];
    const liabilities = [];
    
    Object.values(accountBalances).forEach(item => {
      if (item.account.type === 'ASSET') {
        totalAssets += item.balance;
        assets.push({
          code: item.account.code,
          name: item.account.name,
          balance: item.balance
        });
      } else {
        totalLiabilities += Math.abs(item.balance);
        liabilities.push({
          code: item.account.code,
          name: item.account.name,
          balance: Math.abs(item.balance)
        });
      }
    });
    
    res.json({
      success: true,
      data: {
        asOfDate: date,
        assets: {
          accounts: assets,
          total: totalAssets
        },
        liabilities: {
          accounts: liabilities,
          total: totalLiabilities
        },
        equity: totalAssets - totalLiabilities
      }
    });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to generate balance sheet' } });
  }
});

// Cash Flow Statement
router.get('/cash-flow', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, campusId } = req.query;
    
    // Get cash account transactions
    const cashTransactions = await prisma.transactionLine.findMany({
      where: {
        transaction: {
          status: 'POSTED',
          transactionDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        account: {
          code: { startsWith: '1000' } // Assuming cash accounts start with 1000
        }
      },
      include: {
        transaction: true,
        account: true
      }
    });
    
    let operatingCashFlow = 0;
    let investingCashFlow = 0;
    let financingCashFlow = 0;
    
    cashTransactions.forEach(line => {
      const amount = parseFloat(line.debitAmount) - parseFloat(line.creditAmount);
      
      // Categorize based on transaction source
      if (line.transaction.sourceType === 'PAYMENT' || line.transaction.sourceType === 'INVOICE') {
        operatingCashFlow += amount;
      } else if (line.transaction.sourceType === 'EXPENSE') {
        operatingCashFlow -= Math.abs(amount);
      }
    });
    
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        operating: operatingCashFlow,
        investing: investingCashFlow,
        financing: financingCashFlow,
        netCashFlow
      }
    });
  } catch (error) {
    console.error('Error generating cash flow statement:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to generate cash flow statement' } });
  }
});

// Accounts Receivable Aging
router.get('/ar-aging', authenticateToken, async (req, res) => {
  try {
    const { campusId } = req.query;
    const today = new Date();
    
    const where = {
      status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] }
    };
    if (campusId) where.campusId = campusId;
    
    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        studentId: true,
        dueDate: true,
        netAmount: true,
        paidAmount: true
      }
    });
    
    const aging = {
      current: { count: 0, amount: 0 },
      days30: { count: 0, amount: 0 },
      days60: { count: 0, amount: 0 },
      days90: { count: 0, amount: 0 },
      over90: { count: 0, amount: 0 }
    };
    
    invoices.forEach(invoice => {
      const balance = parseFloat(invoice.netAmount) - parseFloat(invoice.paidAmount);
      const daysOverdue = Math.floor((today - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue <= 0) {
        aging.current.count++;
        aging.current.amount += balance;
      } else if (daysOverdue <= 30) {
        aging.days30.count++;
        aging.days30.amount += balance;
      } else if (daysOverdue <= 60) {
        aging.days60.count++;
        aging.days60.amount += balance;
      } else if (daysOverdue <= 90) {
        aging.days90.count++;
        aging.days90.amount += balance;
      } else {
        aging.over90.count++;
        aging.over90.amount += balance;
      }
    });
    
    const totalAmount = Object.values(aging).reduce((sum, bucket) => sum + bucket.amount, 0);
    
    res.json({
      success: true,
      data: {
        aging,
        totalAmount,
        totalInvoices: invoices.length
      }
    });
  } catch (error) {
    console.error('Error generating AR aging report:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to generate AR aging report' } });
  }
});

// Revenue Analysis
router.get('/revenue-analysis', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month', campusId } = req.query;
    
    const where = {
      status: { in: ['PAID', 'PARTIALLY_PAID'] },
      issueDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };
    if (campusId) where.campusId = campusId;
    
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: true
      }
    });
    
    // Group revenue by period
    const revenueByPeriod = {};
    const revenueByCategory = {};
    
    invoices.forEach(invoice => {
      const date = new Date(invoice.issueDate);
      const period = groupBy === 'month' 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : `${date.getFullYear()}`;
      
      if (!revenueByPeriod[period]) {
        revenueByPeriod[period] = 0;
      }
      revenueByPeriod[period] += parseFloat(invoice.paidAmount);
      
      // Group by category
      invoice.items.forEach(item => {
        if (!revenueByCategory[item.feeCategory]) {
          revenueByCategory[item.feeCategory] = 0;
        }
        revenueByCategory[item.feeCategory] += parseFloat(item.amount);
      });
    });
    
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        byPeriod: revenueByPeriod,
        byCategory: revenueByCategory,
        totalRevenue: Object.values(revenueByPeriod).reduce((sum, val) => sum + val, 0)
      }
    });
  } catch (error) {
    console.error('Error generating revenue analysis:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to generate revenue analysis' } });
  }
});

module.exports = router;
