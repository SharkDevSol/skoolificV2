/**
 * Test script for EthiopianCalendarService
 * Run with: node backend/utils/test-ethiopian-calendar.js
 */

const ethiopianCalendar = require('./ethiopianCalendar');

console.log('=== Ethiopian Calendar Service Test ===\n');

// Test 1: Get current Ethiopian date
console.log('Test 1: Current Ethiopian Date');
const currentEthDate = ethiopianCalendar.now();
console.log('Current Ethiopian Date:', currentEthDate);
console.log('Formatted (English):', ethiopianCalendar.format(currentEthDate, 'en'));
console.log('Formatted (Amharic):', ethiopianCalendar.format(currentEthDate, 'am'));
console.log('');

// Test 2: Convert Gregorian to Ethiopian
console.log('Test 2: Gregorian to Ethiopian Conversion');
const testDate = new Date('2024-01-15');
const ethDate = ethiopianCalendar.toEthiopian(testDate);
console.log('Gregorian: 2024-01-15');
console.log('Ethiopian:', ethDate);
console.log('Formatted:', ethiopianCalendar.format(ethDate, 'en'));
console.log('');

// Test 3: Convert Ethiopian to Gregorian
console.log('Test 3: Ethiopian to Gregorian Conversion');
const gregDate = ethiopianCalendar.toGregorian(2016, 5, 7);
console.log('Ethiopian: 2016-05-07 (Tir 7, 2016)');
console.log('Gregorian:', gregDate.toISOString().split('T')[0]);
console.log('');

// Test 4: Get day of week
console.log('Test 4: Day of Week');
const dayOfWeek = ethiopianCalendar.getDayOfWeek(2016, 5, 7);
console.log('Day of week for Tir 7, 2016:', dayOfWeek);
console.log('');

// Test 5: Academic year
console.log('Test 5: Academic Year');
const academicYear = ethiopianCalendar.getAcademicYear(2016);
console.log('Academic Year for 2016:', academicYear);
console.log('');

// Test 6: Year increment (for rollover)
console.log('Test 6: Year Increment');
const nextYear = ethiopianCalendar.incrementYear(2016);
console.log('Current Year: 2016');
console.log('Next Year:', nextYear);
console.log('');

// Test 7: Get month name
console.log('Test 7: Month Names');
console.log('Month 1 (English):', ethiopianCalendar.getMonthName(1, 'en'));
console.log('Month 1 (Amharic):', ethiopianCalendar.getMonthName(1, 'am'));
console.log('Month 13 (English):', ethiopianCalendar.getMonthName(13, 'en'));
console.log('');

// Test 8: Get all month names
console.log('Test 8: All Month Names');
const allMonthsEn = ethiopianCalendar.getAllMonthNames('en');
console.log('All months (English):', allMonthsEn.join(', '));
console.log('');

// Test 9: Legacy function compatibility
console.log('Test 9: Legacy Function Compatibility');
const legacyEthDate = ethiopianCalendar.convertToEthiopian(new Date());
console.log('Legacy convertToEthiopian:', legacyEthDate);
const legacyMonthName = ethiopianCalendar.getEthiopianMonthName(1);
console.log('Legacy getEthiopianMonthName(1):', legacyMonthName);
const legacyCurrentDate = ethiopianCalendar.getCurrentEthiopianDate();
console.log('Legacy getCurrentEthiopianDate:', legacyCurrentDate);
const legacyDayOfWeek = ethiopianCalendar.getEthiopianDayOfWeek(2016, 5, 7);
console.log('Legacy getEthiopianDayOfWeek:', legacyDayOfWeek);
console.log('');

console.log('=== All Tests Completed Successfully ===');
