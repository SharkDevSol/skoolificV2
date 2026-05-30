/**
 * Unit Tests for Ethiopian Calendar Service
 * 
 * Tests all methods of the EthiopianCalendarService class including:
 * - Gregorian to Ethiopian conversion
 * - Ethiopian to Gregorian conversion
 * - Date formatting
 * - Current date retrieval
 * - Year rollover
 * - Academic year calculations
 */

const ethiopianCalendarService = require('./ethiopianCalendar');
const { EthiopianCalendarService } = require('./ethiopianCalendar');

describe('EthiopianCalendarService', () => {
  let service;

  beforeEach(() => {
    service = new EthiopianCalendarService();
  });

  describe('toEthiopian()', () => {
    test('should convert Gregorian date to Ethiopian date correctly', () => {
      // Test Ethiopian New Year in leap year (Sept 12, 2024 = Meskerem 1, 2017)
      const result1 = service.toEthiopian(new Date(2024, 8, 12)); // Sept 12, 2024 (leap year)
      expect(result1).toEqual({ year: 2017, month: 1, day: 1 });

      // Test another date (Jan 1, 2024 = Tahsas 22, 2016)
      const result2 = service.toEthiopian(new Date(2024, 0, 1)); // Jan 1, 2024
      expect(result2.year).toBe(2016);
      expect(result2.month).toBe(4); // Tahsas
    });

    test('should handle leap year correctly', () => {
      // Sept 12, 2024 (leap year) = Meskerem 1, 2017
      const result = service.toEthiopian(new Date(2024, 8, 12));
      expect(result).toEqual({ year: 2017, month: 1, day: 1 });
    });

    test('should handle dates before Ethiopian New Year', () => {
      // Sept 10, 2024 = Pagume 5, 2016 (previous Ethiopian year)
      const result = service.toEthiopian(new Date(2024, 8, 10));
      expect(result.year).toBe(2016);
      expect(result.month).toBe(13); // Pagume
    });

    test('should handle end of year dates', () => {
      // Dec 31, 2024
      const result = service.toEthiopian(new Date(2024, 11, 31));
      expect(result.year).toBe(2017);
      expect(result.month).toBe(4); // Tahsas
    });
  });

  describe('toGregorian()', () => {
    test('should convert Ethiopian date to Gregorian date correctly', () => {
      // Meskerem 1, 2017 = Sept 12, 2024 (leap year)
      const result1 = service.toGregorian(2017, 1, 1);
      expect(result1.getFullYear()).toBe(2024);
      expect(result1.getMonth()).toBe(8); // September (0-indexed)
      expect(result1.getDate()).toBe(12);
    });

    test('should handle Pagume (13th month) correctly', () => {
      // Pagume 1, 2016
      const result = service.toGregorian(2016, 13, 1);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(8); // September
    });

    test('should handle mid-year dates correctly', () => {
      // Tir 15, 2017 (5th month)
      const result = service.toGregorian(2017, 5, 15);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
    });
  });

  describe('Bidirectional Conversion', () => {
    test('should maintain consistency when converting back and forth', () => {
      const originalDate = new Date(2024, 5, 15); // June 15, 2024
      
      // Convert to Ethiopian
      const ethDate = service.toEthiopian(originalDate);
      
      // Convert back to Gregorian
      const gregorianDate = service.toGregorian(ethDate.year, ethDate.month, ethDate.day);
      
      // Should match original date
      expect(gregorianDate.getFullYear()).toBe(originalDate.getFullYear());
      expect(gregorianDate.getMonth()).toBe(originalDate.getMonth());
      expect(gregorianDate.getDate()).toBe(originalDate.getDate());
    });

    test('should handle multiple round-trip conversions', () => {
      const testDates = [
        new Date(2024, 0, 1),   // Jan 1, 2024
        new Date(2024, 6, 15),  // July 15, 2024
        new Date(2024, 11, 31), // Dec 31, 2024
        new Date(2025, 3, 20),  // April 20, 2025
      ];

      testDates.forEach(originalDate => {
        const ethDate = service.toEthiopian(originalDate);
        const gregorianDate = service.toGregorian(ethDate.year, ethDate.month, ethDate.day);
        
        expect(gregorianDate.getFullYear()).toBe(originalDate.getFullYear());
        expect(gregorianDate.getMonth()).toBe(originalDate.getMonth());
        expect(gregorianDate.getDate()).toBe(originalDate.getDate());
      });
    });
  });

  describe('format()', () => {
    test('should format Ethiopian date in English', () => {
      const ethDate = { year: 2017, month: 1, day: 15 };
      const formatted = service.format(ethDate, 'en');
      expect(formatted).toBe('Meskerem 15, 2017');
    });

    test('should format Ethiopian date in Amharic', () => {
      const ethDate = { year: 2017, month: 1, day: 15 };
      const formatted = service.format(ethDate, 'am');
      expect(formatted).toBe('መስከረም 15, 2017');
    });

    test('should default to English if locale not specified', () => {
      const ethDate = { year: 2017, month: 5, day: 10 };
      const formatted = service.format(ethDate);
      expect(formatted).toBe('Tir 10, 2017');
    });

    test('should handle all 13 months', () => {
      const months = [
        'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
        'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
      ];

      months.forEach((monthName, index) => {
        const ethDate = { year: 2017, month: index + 1, day: 1 };
        const formatted = service.format(ethDate, 'en');
        expect(formatted).toContain(monthName);
      });
    });
  });

  describe('now()', () => {
    test('should return current Ethiopian date', () => {
      const result = service.now();
      
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
      
      expect(typeof result.year).toBe('number');
      expect(typeof result.month).toBe('number');
      expect(typeof result.day).toBe('number');
      
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(13);
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(30);
    });

    test('should return valid Ethiopian date that can be converted back', () => {
      const ethDate = service.now();
      const gregorianDate = service.toGregorian(ethDate.year, ethDate.month, ethDate.day);
      
      expect(gregorianDate).toBeInstanceOf(Date);
      expect(gregorianDate.getTime()).not.toBeNaN();
    });
  });

  describe('incrementYear()', () => {
    test('should increment Ethiopian year by 1', () => {
      expect(service.incrementYear(2017)).toBe(2018);
      expect(service.incrementYear(2016)).toBe(2017);
      expect(service.incrementYear(2000)).toBe(2001);
    });

    test('should handle negative years', () => {
      expect(service.incrementYear(-1)).toBe(0);
      expect(service.incrementYear(0)).toBe(1);
    });
  });

  describe('getAcademicYear()', () => {
    test('should return academic year in correct format', () => {
      expect(service.getAcademicYear(2017)).toBe('2017/2018');
      expect(service.getAcademicYear(2016)).toBe('2016/2017');
      expect(service.getAcademicYear(2020)).toBe('2020/2021');
    });

    test('should handle year transitions', () => {
      const year = 2017;
      const academicYear = service.getAcademicYear(year);
      expect(academicYear).toContain(year.toString());
      expect(academicYear).toContain((year + 1).toString());
    });
  });

  describe('getMonthName()', () => {
    test('should return correct month name in English', () => {
      expect(service.getMonthName(1, 'en')).toBe('Meskerem');
      expect(service.getMonthName(5, 'en')).toBe('Tir');
      expect(service.getMonthName(13, 'en')).toBe('Pagume');
    });

    test('should return correct month name in Amharic', () => {
      expect(service.getMonthName(1, 'am')).toBe('መስከረም');
      expect(service.getMonthName(5, 'am')).toBe('ጥር');
      expect(service.getMonthName(13, 'am')).toBe('ጳጉሜን');
    });

    test('should default to English if locale not specified', () => {
      expect(service.getMonthName(1)).toBe('Meskerem');
    });

    test('should return "Unknown" for invalid month numbers', () => {
      expect(service.getMonthName(0)).toBe('Unknown');
      expect(service.getMonthName(14)).toBe('Unknown');
      expect(service.getMonthName(-1)).toBe('Unknown');
    });
  });

  describe('getDayOfWeek()', () => {
    test('should return correct day of week', () => {
      // Meskerem 1, 2017 = Sept 12, 2024 (Thursday in leap year)
      const dayOfWeek = service.getDayOfWeek(2017, 1, 1);
      expect(dayOfWeek).toBe('Thursday');
    });

    test('should handle all days of the week', () => {
      const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Test a week of dates
      for (let day = 1; day <= 7; day++) {
        const dayOfWeek = service.getDayOfWeek(2017, 1, day);
        expect(validDays).toContain(dayOfWeek);
      }
    });
  });

  describe('getAllMonthNames()', () => {
    test('should return all 13 month names in English', () => {
      const months = service.getAllMonthNames('en');
      expect(months).toHaveLength(13);
      expect(months[0]).toBe('Meskerem');
      expect(months[12]).toBe('Pagume');
    });

    test('should return all 13 month names in Amharic', () => {
      const months = service.getAllMonthNames('am');
      expect(months).toHaveLength(13);
      expect(months[0]).toBe('መስከረም');
      expect(months[12]).toBe('ጳጉሜን');
    });

    test('should default to English if locale not specified', () => {
      const months = service.getAllMonthNames();
      expect(months[0]).toBe('Meskerem');
    });
  });

  describe('Legacy Exports', () => {
    test('should export singleton instance', () => {
      expect(ethiopianCalendarService).toBeDefined();
      expect(ethiopianCalendarService.toEthiopian).toBeDefined();
    });

    test('should export convertToEthiopian function', () => {
      const { convertToEthiopian } = require('./ethiopianCalendar');
      const result = convertToEthiopian(new Date(2024, 8, 12)); // Sept 12, 2024 (leap year)
      expect(result).toEqual({ year: 2017, month: 1, day: 1 });
    });

    test('should export getEthiopianMonthName function', () => {
      const { getEthiopianMonthName } = require('./ethiopianCalendar');
      expect(getEthiopianMonthName(1)).toBe('Meskerem');
    });

    test('should export getCurrentEthiopianDate function', () => {
      const { getCurrentEthiopianDate } = require('./ethiopianCalendar');
      const result = getCurrentEthiopianDate();
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
    });

    test('should export getEthiopianDayOfWeek function', () => {
      const { getEthiopianDayOfWeek } = require('./ethiopianCalendar');
      const dayOfWeek = getEthiopianDayOfWeek(2017, 1, 1);
      expect(dayOfWeek).toBe('Thursday'); // Sept 12, 2024 is Thursday
    });

    test('should export ethiopianMonths array', () => {
      const { ethiopianMonths } = require('./ethiopianCalendar');
      expect(ethiopianMonths).toHaveLength(13);
      expect(ethiopianMonths[0]).toBe('Meskerem');
    });
  });

  describe('Edge Cases', () => {
    test('should handle leap year edge cases', () => {
      // Test dates around leap year boundaries
      const leapYearDate = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      const ethDate = service.toEthiopian(leapYearDate);
      expect(ethDate).toBeDefined();
      expect(ethDate.year).toBeGreaterThan(0);
    });

    test('should handle year boundaries', () => {
      // Test dates at year boundaries
      const endOfYear = new Date(2024, 11, 31); // Dec 31, 2024
      const startOfYear = new Date(2024, 0, 1); // Jan 1, 2024
      
      const ethEndOfYear = service.toEthiopian(endOfYear);
      const ethStartOfYear = service.toEthiopian(startOfYear);
      
      expect(ethEndOfYear).toBeDefined();
      expect(ethStartOfYear).toBeDefined();
    });

    test('should handle Pagume month (13th month)', () => {
      // Pagume has only 5-6 days
      const pagume1 = service.toGregorian(2016, 13, 1);
      const pagume5 = service.toGregorian(2016, 13, 5);
      
      expect(pagume1).toBeInstanceOf(Date);
      expect(pagume5).toBeInstanceOf(Date);
      expect(pagume5.getTime()).toBeGreaterThan(pagume1.getTime());
    });
  });

  describe('Performance', () => {
    test('should handle bulk conversions efficiently', () => {
      const startTime = Date.now();
      
      // Convert 1000 dates
      for (let i = 0; i < 1000; i++) {
        const date = new Date(2024, 0, 1 + (i % 365));
        service.toEthiopian(date);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
