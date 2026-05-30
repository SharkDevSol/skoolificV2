/**
 * Script to update all route files to use centralized API config
 * 
 * This script adds the import statement for getEndpointPath to all route files
 * and documents which config entries correspond to each route.
 * 
 * Usage: node backend/scripts/update-routes-with-api-config.js
 */

const fs = require('fs');
const path = require('path');

// Route files to update (relative to backend/routes/)
const routeFiles = [
  'adminRoutes.js',
  'studentRoutes.js',
  'staffRoutes.js',
  'attendanceRoutes.js',
  'viewStudentAttendanceRoutes.js',
  'studentFaultsRoutes.js',
  'markListRoutes.js',
  'evaluations.js',
  'postRoutes.js',
  'chatRoutes.js',
  'scheduleRoutes.js',
  'schoolSetupRoutes.js',
  'task6Routes.js',
  'dashboardRoutes.js',
  'guardianListRoutes.js',
  'studentAttendanceRoutes.js',
  'classTeacherRoutes.js',
  'adminAttendanceRoutes.js',
  'classCommunicationRoutes.js',
  'guardianAttendanceRoutes.js',
  'guardianStudentAttendance.js',
  'evaluationBookRoutes.js',
  'guardianPayments.js',
  'guardianNotificationRoutes.js',
  'subAccountRoutes.js',
  'reportsRoutes.js',
  'branchRoutes.js',
  'healthRoutes.js',
  'machineAttendance.js',
  'machineWebhook.js',
  'settingsRoutes.js',
  'shiftSettings.js',
  'simpleBudgetRoutes.js',
  'simpleExpenseRoutes.js',
  'simpleFeeManagement.js',
  'simpleFeePayments.js',
  'staffAttendanceRoutes.js',
  'staffAttendanceLog.js',
  'staffFaultsRoutes.js',
  'staffMachineMapping.js',
  'studentActivitiesRoutes.js',
  'studentListRoutes.js',
  'taskStatusRoutes.js',
  'usbAttendanceImport.js',
  'deviceUserManagement.js',
  'financeAccountRoutes.js',
  'financeClassStudentRoutes.js',
  'financeDiscountRoutes.js',
  'financeFeeStructureRoutes.js',
  'financeInvoiceRoutes.js',
  'financeLateFeeApplicationRoutes.js',
  'financeLateFeeRoutes.js',
  'financeMonthlyPaymentRoutes.js',
  'financeMonthlyPaymentViewRoutes.js',
  'financePaymentRoutes.js',
  'financeProgressiveInvoiceRoutes.js',
  'financeScholarshipRoutes.js',
  'financeSimpleInvoiceRoutes.js',
  // Subdirectories
  'hr/index.js',
  'hr/attendance.js',
  'hr/dashboardReports.js',
  'hr/leaveManagement.js',
  'hr/payroll.js',
  'hr/salaryManagement.js',
  'inventory/index.js',
  'inventory/items.js',
  'inventory/dashboardReports.js',
  'finance/index.js',
  'finance/accounts.js',
  'finance/budgets.js',
  'finance/dashboardReports.js',
  'finance/expenses.js',
  'finance/feeStructures.js',
  'finance/invoices.js',
  'finance/payments.js',
  'finance/payroll.js',
  'finance/reports.js',
  'assets/dashboardReports.js',
  'academic/studentAttendance.js'
];

function addConfigImport(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', 'routes', filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if import already exists
    if (content.includes("require('../config/api.config')") || 
        content.includes("require('../../config/api.config')") ||
        content.includes('from \'../config/api.config\'') ||
        content.includes('from \'../../config/api.config\'')) {
      console.log(`✓ Already updated: ${filePath}`);
      return true;
    }
    
    // Determine the correct relative path based on subdirectory depth
    const depth = filePath.split('/').length - 1;
    const relativePath = depth === 0 ? '../config/api.config' : '../../config/api.config';
    
    // Find the first require statement
    const requireRegex = /const .+ = require\(['"]/;
    const match = content.match(requireRegex);
    
    if (match) {
      const insertIndex = match.index;
      const importStatement = `const { getEndpointPath, API_ENDPOINTS } = require('${relativePath}');\n`;
      
      // Insert the import after the first require
      const beforeInsert = content.substring(0, insertIndex);
      const afterInsert = content.substring(insertIndex);
      
      // Find the end of the first require block (look for empty line or non-require line)
      const lines = afterInsert.split('\n');
      let insertAfterLines = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('const') && lines[i].includes('require(')) {
          insertAfterLines = i + 1;
        } else if (lines[i].trim() === '') {
          break;
        } else if (!lines[i].trim().startsWith('const')) {
          break;
        }
      }
      
      const insertPoint = beforeInsert + lines.slice(0, insertAfterLines).join('\n') + '\n';
      const remaining = lines.slice(insertAfterLines).join('\n');
      
      content = insertPoint + importStatement + remaining;
      
      // Write back to file
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  No require statements found in: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Updating route files to use centralized API config...\n');
  
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  
  for (const file of routeFiles) {
    const result = addConfigImport(file);
    if (result === true) {
      successCount++;
    } else if (result === false) {
      failCount++;
    } else {
      skippedCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✓ Successfully updated: ${successCount}`);
  console.log(`   ✗ Failed: ${failCount}`);
  console.log(`   ⚠️  Skipped: ${skippedCount}`);
  console.log(`   📁 Total files: ${routeFiles.length}`);
  
  console.log('\n✅ Route files have been updated with API config imports.');
  console.log('📝 Note: Routes still use relative paths. The config is imported for reference and future use.');
  console.log('🔍 Review the changes and test the application to ensure everything works correctly.');
}

main();
