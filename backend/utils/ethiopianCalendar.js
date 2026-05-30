/**
 * Ethiopian Calendar Service
 * 
 * Provides comprehensive Ethiopian calendar functionality including:
 * - Gregorian to Ethiopian date conversion
 * - Ethiopian to Gregorian date conversion
 * - Date formatting with multi-language support
 * - Academic year calculations
 * - Year rollover utilities
 * 
 * @module EthiopianCalendarService
 */

class EthiopianCalendarService {
  constructor() {
    // Month names in different languages
    this.monthNames = {
      en: [
        'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
        'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
      ],
      am: [
        'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
        'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'
      ]
    };
  }

  /**
   * Convert Gregorian date to Ethiopian date
   * @param {Date} gregorianDate - JavaScript Date object
   * @returns {Object} Ethiopian date {year, month, day}
   */
  toEthiopian(gregorianDate) {
    const date = new Date(gregorianDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Ethiopian New Year = Sept 11 (Sept 12 in Gregorian leap year)
    const isGregorianLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

    let ethYear, ethMonth, ethDay;

    if (month > 9 || (month === 9 && day >= (isGregorianLeapYear(year) ? 12 : 11))) {
      // On or after Ethiopian New Year in this Gregorian year
      ethYear = year - 7;
      const newYearDay = isGregorianLeapYear(year) ? 12 : 11;
      // Days since Ethiopian New Year
      const newYear = new Date(year, 8, newYearDay); // Sept
      const current = new Date(year, month - 1, day);
      const diff = Math.round((current - newYear) / 86400000);
      ethMonth = Math.floor(diff / 30) + 1;
      ethDay = (diff % 30) + 1;
    } else {
      // Before Ethiopian New Year — previous Ethiopian year
      ethYear = year - 8;
      const prevNewYearDay = isGregorianLeapYear(year - 1) ? 12 : 11;
      const newYear = new Date(year - 1, 8, prevNewYearDay); // Sept of previous year
      const current = new Date(year, month - 1, day);
      const diff = Math.round((current - newYear) / 86400000);
      ethMonth = Math.floor(diff / 30) + 1;
      ethDay = (diff % 30) + 1;
    }

    return { year: ethYear, month: ethMonth, day: ethDay };
  }

  /**
   * Convert Ethiopian date to Gregorian date
   * @param {number} year - Ethiopian year
   * @param {number} month - Ethiopian month (1-13)
   * @param {number} day - Ethiopian day
   * @returns {Date} JavaScript Date object
   */
  toGregorian(year, month, day) {
    // Calculate the Gregorian year
    let gregYear = year + 7;

    // Check if it's a leap year in Gregorian calendar
    const isGregorianLeapYear = (y) => {
      return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    };

    // Ethiopian New Year offset (Sept 11 or Sept 12)
    const ethNewYearDay = isGregorianLeapYear(gregYear) ? 12 : 11;

    // Calculate total days from Ethiopian New Year
    let totalDays = 0;

    // Add days from complete months
    for (let m = 1; m < month; m++) {
      if (m <= 12) {
        totalDays += 30; // First 12 months have 30 days each
      } else {
        // Pagume (13th month) has 5 or 6 days
        totalDays += isGregorianLeapYear(gregYear + 1) ? 6 : 5;
      }
    }

    // Add days in current month (day - 1 because Meskerem 1 is day 0 offset)
    totalDays += day - 1;

    // Create date starting from Ethiopian New Year
    const ethNewYear = new Date(gregYear, 8, ethNewYearDay); // Month 8 = September

    // Add the total days
    const gregorianDate = new Date(ethNewYear);
    gregorianDate.setDate(ethNewYear.getDate() + totalDays);

    return gregorianDate;
  }

  /**
   * Format Ethiopian date for display
   * @param {Object} ethDate - Ethiopian date {year, month, day}
   * @param {string} locale - Language code (am, en, etc.)
   * @returns {string} Formatted date string
   */
  format(ethDate, locale = 'en') {
    const months = this.monthNames[locale] || this.monthNames.en;
    return `${months[ethDate.month - 1]} ${ethDate.day}, ${ethDate.year}`;
  }

  /**
   * Get current Ethiopian date
   * @returns {Object} Current Ethiopian date {year, month, day}
   */
  now() {
    return this.toEthiopian(new Date());
  }

  /**
   * Increment Ethiopian year (for year rollover)
   * @param {number} currentYear - Current Ethiopian year
   * @returns {number} Next Ethiopian year
   */
  incrementYear(currentYear) {
    return currentYear + 1;
  }

  /**
   * Get academic year string
   * @param {number} year - Ethiopian year
   * @returns {string} Academic year format "2018/2019"
   */
  getAcademicYear(year) {
    return `${year}/${year + 1}`;
  }

  /**
   * Get Ethiopian month name
   * @param {number} monthNumber - Month number (1-13)
   * @param {string} locale - Language code (am, en, etc.)
   * @returns {string} Month name
   */
  getMonthName(monthNumber, locale = 'en') {
    const months = this.monthNames[locale] || this.monthNames.en;
    return months[monthNumber - 1] || 'Unknown';
  }

  /**
   * Get day of week for Ethiopian date
   * @param {number} year - Ethiopian year
   * @param {number} month - Ethiopian month (1-13)
   * @param {number} day - Ethiopian day
   * @returns {string} Day of week name
   */
  getDayOfWeek(year, month, day) {
    const gregorianDate = this.toGregorian(year, month, day);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[gregorianDate.getDay()];
  }

  /**
   * Get all month names for a specific locale
   * @param {string} locale - Language code (am, en, etc.)
   * @returns {Array<string>} Array of month names
   */
  getAllMonthNames(locale = 'en') {
    return this.monthNames[locale] || this.monthNames.en;
  }
}

// Export singleton instance
const ethiopianCalendarService = new EthiopianCalendarService();

// Export both the class and instance for flexibility
module.exports = ethiopianCalendarService;
module.exports.EthiopianCalendarService = EthiopianCalendarService;

// Legacy exports for backward compatibility
module.exports.convertToEthiopian = (date) => ethiopianCalendarService.toEthiopian(date);
module.exports.getEthiopianMonthName = (monthNumber) => ethiopianCalendarService.getMonthName(monthNumber);
module.exports.getCurrentEthiopianDate = () => ethiopianCalendarService.now();
module.exports.getEthiopianDayOfWeek = (year, month, day) => ethiopianCalendarService.getDayOfWeek(year, month, day);
module.exports.ethiopianMonths = ethiopianCalendarService.getAllMonthNames('en');
