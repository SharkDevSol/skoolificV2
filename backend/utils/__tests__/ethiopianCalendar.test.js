/**
 * Unit Tests for EthiopianCalendarService
 * Tests all date conversion, formatting, and utility methods
 */

const ethiopianCalendarService = require('../ethiopianCalendar');
const { EthiopianCalendarService } = require('../ethiopianCalendar');

describe('EthiopianCalendarService', () => {
  let service;

  beforeEach(() => {
    service = new EthiopianCalendarService();
  });

  describe('toEthiopian()', () => {
    it('should convert Gregorian date to Ethiopian date correctly', () => {
      // Test case: January 1, 2024 (Gregorian) = Tahsas 22, 2016 (Ethiopian)
      const gregorianDate = new Date(2024, 0, 1); // Jan 1, 2024
      const ethiopianDate = service.toEthiopian(gregorianDate);
      
      expect(ethiopianDate).toHaveProperty('year');
      expect(ethiopianDate).toHaveProperty('month');
      expect(ethiopianDate).toHaveProperty('day');
      expect(ethiopianDate.year).toBe(2016);
    });

    it('should handle Ethiopian New Year correctly (Sept 11)', () => {
      // Sept 11, 2023 = Meskerem 1, 2016 (Ethiopian New Year)
      const gregorianDate = new Date(2023, 8, 11); // Sept 11, 2023
      const ethiopianDate = service.toEthiopian(gregorianDate);
      
      expect(ethiopianDate.year).toBe(2016);
      expect(ethiopianDate.month).toBe(1); // Meskerem
      expect(ethiopianDate.day).toBe(1);
    });

    it('should handle Ethiopian New Year in leap year (Sept 12)', () => {
      // Sept 12, 2024 = Meskerem 1, 2017 (Leap year)
      const gregorianDate = new Date(2024, 8, 12); // Sept 12, 2024
      const ethiopianDate = service.toEthiopian(gregorianDate);
      
      expect(ethiopianDate.year).toBe(2017);
      expect(ethiopianDate.month).toBe(1);
      expect(ethiopianDate.day).toBe(1);
    });

    it('should handle dates before Ethiopian New Year', () => {
      // Sept 10, 2023 = Pagume 5, 2015 (last day of previous year)
      const gregorianDate = new Date(2023, 8, 10); // Sept 10, 2023
      const ethiopianDate = service.toEthiopian(gregorianDate);
      
      expect(ethiopianDate.year).toBe(2015);
      expect(ethiopianDate.month).toBe(13); // Pagume
    });

    it('should handle dates after Ethiopian New Year', () => {
      // Sept 12, 2023 = Meskerem 2, 2016
      const gregorianDate = new Date(2023, 8, 12); // Sept 12, 2023
      const ethiopianDate = service.toEthiopian(gregorianDate);
      
      expect(ethiopianDate.year).toBe(2016);
      expect(ethiopianDate.month).toBe(1);
      expect(ethiopianDate.day).toBe(2);
    });

    it('should handle end of year dates', () => {
      // Dec 31, 2023
      const gregorianDate = new Date(2023, 11, 31);
      const ethiopianDate = service.toEthiopian(gregorianDate);
      
      expect(ethiopianDate.year).toBe(2016);
      expect(ethiopianDate.month).toBeGreaterThan(0);
      expect(ethiopianDate.day).toBeGreaterThan(0);
    });

    it('should handle beginning of year dates', () => {
      // Jan 1, 2024
      const gregorianDate = new Date(2024, 0, 1);
      const ethiopianDate = service.toEthiopian(gregorianDate);
      
      expect(ethiopianDate.year).toBe(2016);
      expect(ethiopianDate.month).toBeGreaterThan(0);
      expect(ethiopianDate.day).toBeGreaterThan(0);
    });
  });

  describe('toGregorian()', () => {
    it('should convert Ethiopian date to Gregorian date correctly', () => {
      // Meskerem 1, 2016 = Sept 11, 2023
      const gregorianDate = service.toGregorian(2016, 1, 1);
      
      expect(gregorianDate).toBeInstanceOf(Date);
      expect(gregorianDate.getFullYear()).toBe(2023);
      expect(gregorianDate.getMonth()).toBe(8); // September (0-indexed)
      expect(gregorianDate.getDate()).toBe(11);
    });

    it('should handle Pagume (13th month) correctly', () => {
      // Pagume 1, 2016
      const gregorianDate = service.toGregorian(2016, 13, 1);
      
      expect(gregorianDate).toBeInstanceOf(Date);
      expect(gregorianDate.getFullYear()).toBe(2024);
      expect(gregorianDate.getMonth()).toBe(8); // September
    });

    it('should handle leap year correctly', () => {
      // Meskerem 1, 2017 = Sept 12, 2024 (leap year)
      const gregorianDate = service.toGregorian(2017, 1, 1);
      
      expect(gregorianDate.getFullYear()).toBe(2024);
      expect(gregorianDate.getMonth()).toBe(8);
      expect(gregorianDate.getDate()).toBe(12);
    });

    it('should handle mid-year dates', () => {
      // Tir 15, 2016 (5th month, day 15)
      const gregorianDate = service.toGregorian(2016, 5, 15);
      
      expect(gregorianDate).toBeInstanceOf(Date);
      expect(gregorianDate.getFullYear()).toBeGreaterThan(2023);
    });

    it('should handle end of month dates', () => {
      // Meskerem 30, 2016 (last day of first month)
      const gregorianDate = service.toGregorian(2016, 1, 30);
      
      expect(gregorianDate).toBeInstanceOf(Date);
      expect(gregorianDate.getFullYear()).toBe(2023);
    });
  });

  describe('Round-trip conversion', () => {
    it('should convert Gregorian -> Ethiopian -> Gregorian correctly', () => {
      const originalDate = new Date(2024, 0, 15); // Jan 15, 2024
      const ethiopianDate = service.toEthiopian(originalDate);
      const convertedBack = service.toGregorian(
        ethiopianDate.year,
        ethiopianDate.month,
        ethiopianDate.day
      );
      
      expect(convertedBack.getFullYear()).toBe(originalDate.getFullYear());
      expect(convertedBack.getMonth()).toBe(originalDate.getMonth());
      expect(convertedBack.getDate()).toBe(originalDate.getDate());
    });

    it('should handle multiple round-trip conversions', () => {
      const testDates = [
        new Date(2023, 0, 1),
        new Date(2023, 5, 15),
        new Date(2023, 11, 31),
        new Date(2024, 2, 10)
      ];

      testDates.forEach(originalDate => {
        const ethiopianDate = service.toEthiopian(originalDate);
        const convertedBack = service.toGregorian(
          ethiopianDate.year,
          ethiopianDate.month,
          ethiopianDate.day
        );
        
        expect(convertedBack.getFullYear()).toBe(originalDate.getFullYear());
        expect(convertedBack.getMonth()).toBe(originalDate.getMonth());
        expect(convertedBack.getDate()).toBe(originalDate.getDate());
      });
    });
  });

  describe('format()', () => {
    it('should format Ethiopian date in English', () => {
      const ethDate = { year: 2016, month: 1, day: 15 };
      const formatted = service.format(ethDate, 'en');
      
      expect(formatted).toBe('Meskerem 15, 2016');
    });

    it('should format Ethiopian date in Amharic', () => {
      const ethDate = { year: 2016, month: 1, day: 15 };
      const formatted = service.format(ethDate, 'am');
      
      expect(formatted).toContain('መስከረም');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2016');
    });

    it('should handle all 13 months in English', () => {
      const monthNames = [
        'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
        'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
      ];

      monthNames.forEach((monthName, index) => {
        const ethDate = { year: 2016, month: index + 1, day: 1 };
        const formatted = service.format(ethDate, 'en');
        expect(formatted).toContain(monthName);
      });
    });

    it('should default to English if locale not provided', () => {
      const ethDate = { year: 2016, month: 1, day: 15 };
      const formatted = service.format(ethDate);
      
      expect(formatted).toBe('Meskerem 15, 2016');
    });

    it('should default to English if invalid locale provided', () => {
      const ethDate = { year: 2016, month: 1, day: 15 };
      const formatted = service.format(ethDate, 'invalid');
      
      expect(formatted).toBe('Meskerem 15, 2016');
    });
  });

  describe('now()', () => {
    it('should return current Ethiopian date', () => {
      const currentEthDate = service.now();
      
      expect(currentEthDate).toHaveProperty('year');
      expect(currentEthDate).toHaveProperty('month');
      expect(currentEthDate).toHaveProperty('day');
      expect(currentEthDate.year).toBeGreaterThan(2000);
      expect(currentEthDate.month).toBeGreaterThanOrEqual(1);
      expect(currentEthDate.month).toBeLessThanOrEqual(13);
      expect(currentEthDate.day).toBeGreaterThanOrEqual(1);
      expect(currentEthDate.day).toBeLessThanOrEqual(30);
    });

    it('should return consistent date when called multiple times quickly', () => {
      const date1 = service.now();
      const date2 = service.now();
      
      expect(date1.year).toBe(date2.year);
      expect(date1.month).toBe(date2.month);
      expect(date1.day).toBe(date2.day);
    });
  });

  describe('incrementYear()', () => {
    it('should increment Ethiopian year by 1', () => {
      expect(service.incrementYear(2016)).toBe(2017);
      expect(service.incrementYear(2015)).toBe(2016);
      expect(service.incrementYear(2000)).toBe(2001);
    });

    it('should handle large year numbers', () => {
      expect(service.incrementYear(9999)).toBe(10000);
    });

    it('should handle year 0', () => {
      expect(service.incrementYear(0)).toBe(1);
    });
  });

  describe('getAcademicYear()', () => {
    it('should return academic year in correct format', () => {
      expect(service.getAcademicYear(2016)).toBe('2016/2017');
      expect(service.getAcademicYear(2015)).toBe('2015/2016');
      expect(service.getAcademicYear(2000)).toBe('2000/2001');
    });

    it('should handle year transitions', () => {
      const academicYear = service.getAcademicYear(2016);
      expect(academicYear).toMatch(/^\d{4}\/\d{4}$/);
    });
  });

  describe('getMonthName()', () => {
    it('should return correct month name in English', () => {
      expect(service.getMonthName(1, 'en')).toBe('Meskerem');
      expect(service.getMonthName(6, 'en')).toBe('Yekatit');
      expect(service.getMonthName(13, 'en')).toBe('Pagume');
    });

    it('should return correct month name in Amharic', () => {
      expect(service.getMonthName(1, 'am')).toBe('መስከረም');
      expect(service.getMonthName(13, 'am')).toBe('ጳጉሜን');
    });

    it('should default to English if locale not provided', () => {
      expect(service.getMonthName(1)).toBe('Meskerem');
    });

    it('should return "Unknown" for invalid month number', () => {
      expect(service.getMonthName(0)).toBe('Unknown');
      expect(service.getMonthName(14)).toBe('Unknown');
      expect(service.getMonthName(-1)).toBe('Unknown');
    });
  });

  describe('getDayOfWeek()', () => {
    it('should return correct day of week', () => {
      // Meskerem 1, 2016 = Sept 11, 2023 = Monday
      const dayOfWeek = service.getDayOfWeek(2016, 1, 1);
      expect(dayOfWeek).toBe('Monday');
    });

    it('should handle all days of the week', () => {
      const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = service.getDayOfWeek(2016, 1, 1);
      expect(validDays).toContain(dayOfWeek);
    });

    it('should be consistent with toGregorian conversion', () => {
      const gregorianDate = service.toGregorian(2016, 5, 15);
      const dayOfWeek = service.getDayOfWeek(2016, 5, 15);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      expect(dayOfWeek).toBe(days[gregorianDate.getDay()]);
    });
  });

  describe('getAllMonthNames()', () => {
    it('should return all 13 month names in English', () => {
      const months = service.getAllMonthNames('en');
      
      expect(months).toHaveLength(13);
      expect(months[0]).toBe('Meskerem');
      expect(months[12]).toBe('Pagume');
    });

    it('should return all 13 month names in Amharic', () => {
      const months = service.getAllMonthNames('am');
      
      expect(months).toHaveLength(13);
      expect(months[0]).toBe('መስከረም');
      expect(months[12]).toBe('ጳጉሜን');
    });

    it('should default to English if locale not provided', () => {
      const months = service.getAllMonthNames();
      expect(months[0]).toBe('Meskerem');
    });

    it('should default to English if invalid locale provided', () => {
      const months = service.getAllMonthNames('invalid');
      expect(months[0]).toBe('Meskerem');
    });
  });

  describe('Legacy exports', () => {
    it('should export convertToEthiopian function', () => {
      const { convertToEthiopian } = require('../ethiopianCalendar');
      const date = new Date(2024, 0, 1);
      const result = convertToEthiopian(date);
      
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
    });

    it('should export getEthiopianMonthName function', () => {
      const { getEthiopianMonthName } = require('../ethiopianCalendar');
      expect(getEthiopianMonthName(1)).toBe('Meskerem');
    });

    it('should export getCurrentEthiopianDate function', () => {
      const { getCurrentEthiopianDate } = require('../ethiopianCalendar');
      const result = getCurrentEthiopianDate();
      
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
    });

    it('should export getEthiopianDayOfWeek function', () => {
      const { getEthiopianDayOfWeek } = require('../ethiopianCalendar');
      const result = getEthiopianDayOfWeek(2016, 1, 1);
      
      expect(typeof result).toBe('string');
    });

    it('should export ethiopianMonths array', () => {
      const { ethiopianMonths } = require('../ethiopianCalendar');
      
      expect(Array.isArray(ethiopianMonths)).toBe(true);
      expect(ethiopianMonths).toHaveLength(13);
    });
  });

  describe('Edge cases', () => {
    it('should handle very old dates', () => {
      const oldDate = new Date(1900, 0, 1);
      const ethiopianDate = service.toEthiopian(oldDate);
      
      expect(ethiopianDate).toHaveProperty('year');
      expect(ethiopianDate).toHaveProperty('month');
      expect(ethiopianDate).toHaveProperty('day');
    });

    it('should handle future dates', () => {
      const futureDate = new Date(2100, 11, 31);
      const ethiopianDate = service.toEthiopian(futureDate);
      
      expect(ethiopianDate).toHaveProperty('year');
      expect(ethiopianDate.year).toBeGreaterThan(2000);
    });

    it('should handle leap year edge cases', () => {
      // Feb 29, 2024 (leap year)
      const leapDate = new Date(2024, 1, 29);
      const ethiopianDate = service.toEthiopian(leapDate);
      
      expect(ethiopianDate).toHaveProperty('year');
      expect(ethiopianDate).toHaveProperty('month');
      expect(ethiopianDate).toHaveProperty('day');
    });

    it('should handle Pagume month correctly', () => {
      // Test all days of Pagume
      for (let day = 1; day <= 6; day++) {
        const gregorianDate = service.toGregorian(2016, 13, day);
        expect(gregorianDate).toBeInstanceOf(Date);
      }
    });
  });

  describe('Singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(ethiopianCalendarService).toBeDefined();
      expect(ethiopianCalendarService).toBeInstanceOf(EthiopianCalendarService);
    });

    it('should have all methods available on singleton', () => {
      expect(typeof ethiopianCalendarService.toEthiopian).toBe('function');
      expect(typeof ethiopianCalendarService.toGregorian).toBe('function');
      expect(typeof ethiopianCalendarService.format).toBe('function');
      expect(typeof ethiopianCalendarService.now).toBe('function');
      expect(typeof ethiopianCalendarService.incrementYear).toBe('function');
      expect(typeof ethiopianCalendarService.getAcademicYear).toBe('function');
    });
  });
});
