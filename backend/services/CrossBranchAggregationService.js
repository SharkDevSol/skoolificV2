// CrossBranchAggregationService.js - Super Admin Cross-Branch Data Aggregation
// Aggregates data from multiple branch databases for consolidated reporting

const dbManager = require('./DatabaseConnectionManager');

class CrossBranchAggregationService {
  constructor() {
    console.log('✅ CrossBranchAggregationService initialized');
  }

  /**
   * Get all active branches for a school
   * @returns {Promise<Array>} List of branch configurations
   */
  async getAllBranches() {
    try {
      const branches = await dbManager.getAllBranches();
      return branches;
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      throw new Error(`Failed to fetch branches: ${error.message}`);
    }
  }

  /**
   * Aggregate student enrollment data across all branches
   * @returns {Promise<Object>} Aggregated enrollment data
   */
  async aggregateStudentEnrollment() {
    try {
      const branches = await this.getAllBranches();
      const aggregatedData = {
        totalStudents: 0,
        byBranch: [],
        byGrade: {},
        byGender: { male: 0, female: 0 },
        byStatus: { active: 0, inactive: 0, graduated: 0 },
        timestamp: new Date().toISOString()
      };

      for (const branch of branches) {
        try {
          const pool = await dbManager.getPool(branch.branch_code);
          
          // Get total students for this branch
          const totalResult = await pool.query(
            `SELECT COUNT(*) as count FROM students WHERE status = 'active'`
          );
          const totalStudents = parseInt(totalResult.rows[0].count);

          // Get students by grade
          const gradeResult = await pool.query(
            `SELECT class_name, COUNT(*) as count 
             FROM students 
             WHERE status = 'active' 
             GROUP BY class_name 
             ORDER BY class_name`
          );

          // Get students by gender
          const genderResult = await pool.query(
            `SELECT gender, COUNT(*) as count 
             FROM students 
             WHERE status = 'active' 
             GROUP BY gender`
          );

          // Get students by status
          const statusResult = await pool.query(
            `SELECT status, COUNT(*) as count 
             FROM students 
             GROUP BY status`
          );

          // Aggregate branch data
          const branchData = {
            branchCode: branch.branch_code,
            branchName: branch.branch_name,
            totalStudents: totalStudents,
            byGrade: gradeResult.rows.reduce((acc, row) => {
              acc[row.class_name] = parseInt(row.count);
              return acc;
            }, {}),
            byGender: genderResult.rows.reduce((acc, row) => {
              acc[row.gender.toLowerCase()] = parseInt(row.count);
              return acc;
            }, { male: 0, female: 0 }),
            byStatus: statusResult.rows.reduce((acc, row) => {
              acc[row.status.toLowerCase()] = parseInt(row.count);
              return acc;
            }, { active: 0, inactive: 0, graduated: 0 })
          };

          aggregatedData.byBranch.push(branchData);
          aggregatedData.totalStudents += totalStudents;

          // Aggregate gender data
          aggregatedData.byGender.male += branchData.byGender.male || 0;
          aggregatedData.byGender.female += branchData.byGender.female || 0;

          // Aggregate status data
          aggregatedData.byStatus.active += branchData.byStatus.active || 0;
          aggregatedData.byStatus.inactive += branchData.byStatus.inactive || 0;
          aggregatedData.byStatus.graduated += branchData.byStatus.graduated || 0;

          // Aggregate grade data
          Object.keys(branchData.byGrade).forEach(grade => {
            if (!aggregatedData.byGrade[grade]) {
              aggregatedData.byGrade[grade] = 0;
            }
            aggregatedData.byGrade[grade] += branchData.byGrade[grade];
          });

        } catch (branchError) {
          console.error(`❌ Error aggregating enrollment for branch ${branch.branch_code}:`, branchError);
          // Continue with other branches even if one fails
          aggregatedData.byBranch.push({
            branchCode: branch.branch_code,
            branchName: branch.branch_name,
            error: branchError.message
          });
        }
      }

      return aggregatedData;
    } catch (error) {
      console.error('❌ Error in aggregateStudentEnrollment:', error);
      throw new Error(`Failed to aggregate student enrollment: ${error.message}`);
    }
  }

  /**
   * Aggregate financial data across all branches
   * @param {Object} options - Filter options (startDate, endDate, academicYear)
   * @returns {Promise<Object>} Aggregated financial data
   */
  async aggregateFinancialData(options = {}) {
    try {
      const branches = await this.getAllBranches();
      const { startDate, endDate, academicYear } = options;

      const aggregatedData = {
        totalRevenue: 0,
        totalExpenses: 0,
        totalPending: 0,
        netIncome: 0,
        byBranch: [],
        byMonth: {},
        byFeeType: {},
        timestamp: new Date().toISOString()
      };

      for (const branch of branches) {
        try {
          const pool = await dbManager.getPool(branch.branch_code);
          
          // Build date filter
          let dateFilter = '';
          const params = [];
          if (startDate && endDate) {
            dateFilter = 'AND payment_date BETWEEN $1 AND $2';
            params.push(startDate, endDate);
          } else if (academicYear) {
            dateFilter = 'AND academic_year = $1';
            params.push(academicYear);
          }

          // Get total revenue (completed payments)
          const revenueQuery = `
            SELECT COALESCE(SUM(amount_paid), 0) as total 
            FROM monthly_payments 
            WHERE payment_status = 'paid' ${dateFilter}
          `;
          const revenueResult = await pool.query(revenueQuery, params);
          const totalRevenue = parseFloat(revenueResult.rows[0].total);

          // Get total pending payments
          const pendingQuery = `
            SELECT COALESCE(SUM(amount_due - amount_paid), 0) as total 
            FROM monthly_payments 
            WHERE payment_status IN ('pending', 'partial') ${dateFilter}
          `;
          const pendingResult = await pool.query(pendingQuery, params);
          const totalPending = parseFloat(pendingResult.rows[0].total);

          // Get total expenses
          const expensesQuery = `
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE status = 'approved' ${dateFilter.replace('payment_date', 'expense_date')}
          `;
          const expensesResult = await pool.query(expensesQuery, params);
          const totalExpenses = parseFloat(expensesResult.rows[0].total);

          // Get revenue by month
          const monthlyQuery = `
            SELECT 
              TO_CHAR(payment_date, 'YYYY-MM') as month,
              SUM(amount_paid) as total
            FROM monthly_payments 
            WHERE payment_status = 'paid' ${dateFilter}
            GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
            ORDER BY month
          `;
          const monthlyResult = await pool.query(monthlyQuery, params);

          // Get revenue by fee type
          const feeTypeQuery = `
            SELECT 
              fee_type,
              SUM(amount_paid) as total
            FROM monthly_payments 
            WHERE payment_status = 'paid' ${dateFilter}
            GROUP BY fee_type
          `;
          const feeTypeResult = await pool.query(feeTypeQuery, params);

          const branchData = {
            branchCode: branch.branch_code,
            branchName: branch.branch_name,
            totalRevenue: totalRevenue,
            totalExpenses: totalExpenses,
            totalPending: totalPending,
            netIncome: totalRevenue - totalExpenses,
            byMonth: monthlyResult.rows.reduce((acc, row) => {
              acc[row.month] = parseFloat(row.total);
              return acc;
            }, {}),
            byFeeType: feeTypeResult.rows.reduce((acc, row) => {
              acc[row.fee_type] = parseFloat(row.total);
              return acc;
            }, {})
          };

          aggregatedData.byBranch.push(branchData);
          aggregatedData.totalRevenue += totalRevenue;
          aggregatedData.totalExpenses += totalExpenses;
          aggregatedData.totalPending += totalPending;

          // Aggregate monthly data
          Object.keys(branchData.byMonth).forEach(month => {
            if (!aggregatedData.byMonth[month]) {
              aggregatedData.byMonth[month] = 0;
            }
            aggregatedData.byMonth[month] += branchData.byMonth[month];
          });

          // Aggregate fee type data
          Object.keys(branchData.byFeeType).forEach(feeType => {
            if (!aggregatedData.byFeeType[feeType]) {
              aggregatedData.byFeeType[feeType] = 0;
            }
            aggregatedData.byFeeType[feeType] += branchData.byFeeType[feeType];
          });

        } catch (branchError) {
          console.error(`❌ Error aggregating financial data for branch ${branch.branch_code}:`, branchError);
          aggregatedData.byBranch.push({
            branchCode: branch.branch_code,
            branchName: branch.branch_name,
            error: branchError.message
          });
        }
      }

      aggregatedData.netIncome = aggregatedData.totalRevenue - aggregatedData.totalExpenses;

      return aggregatedData;
    } catch (error) {
      console.error('❌ Error in aggregateFinancialData:', error);
      throw new Error(`Failed to aggregate financial data: ${error.message}`);
    }
  }

  /**
   * Aggregate attendance data across all branches
   * @param {Object} options - Filter options (startDate, endDate, academicYear)
   * @returns {Promise<Object>} Aggregated attendance data
   */
  async aggregateAttendanceData(options = {}) {
    try {
      const branches = await this.getAllBranches();
      const { startDate, endDate, academicYear } = options;

      const aggregatedData = {
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalExcused: 0,
        attendanceRate: 0,
        byBranch: [],
        byDate: {},
        byGrade: {},
        timestamp: new Date().toISOString()
      };

      for (const branch of branches) {
        try {
          const pool = await dbManager.getPool(branch.branch_code);
          
          // Build date filter
          let dateFilter = '';
          const params = [];
          if (startDate && endDate) {
            dateFilter = 'WHERE date BETWEEN $1 AND $2';
            params.push(startDate, endDate);
          } else if (academicYear) {
            dateFilter = 'WHERE academic_year = $1';
            params.push(academicYear);
          }

          // Get attendance summary
          const summaryQuery = `
            SELECT 
              status,
              COUNT(*) as count
            FROM student_attendance 
            ${dateFilter}
            GROUP BY status
          `;
          const summaryResult = await pool.query(summaryQuery, params);

          // Get attendance by date
          const dateQuery = `
            SELECT 
              date,
              status,
              COUNT(*) as count
            FROM student_attendance 
            ${dateFilter}
            GROUP BY date, status
            ORDER BY date
          `;
          const dateResult = await pool.query(dateQuery, params);

          // Get attendance by grade
          const gradeQuery = `
            SELECT 
              s.class_name,
              sa.status,
              COUNT(*) as count
            FROM student_attendance sa
            JOIN students s ON sa.student_id = s.id
            ${dateFilter}
            GROUP BY s.class_name, sa.status
          `;
          const gradeResult = await pool.query(gradeQuery, params);

          const branchData = {
            branchCode: branch.branch_code,
            branchName: branch.branch_name,
            totalPresent: 0,
            totalAbsent: 0,
            totalLate: 0,
            totalExcused: 0,
            attendanceRate: 0,
            byDate: {},
            byGrade: {}
          };

          // Process summary data
          summaryResult.rows.forEach(row => {
            const count = parseInt(row.count);
            switch (row.status.toLowerCase()) {
              case 'present':
                branchData.totalPresent = count;
                aggregatedData.totalPresent += count;
                break;
              case 'absent':
                branchData.totalAbsent = count;
                aggregatedData.totalAbsent += count;
                break;
              case 'late':
                branchData.totalLate = count;
                aggregatedData.totalLate += count;
                break;
              case 'excused':
                branchData.totalExcused = count;
                aggregatedData.totalExcused += count;
                break;
            }
          });

          // Calculate branch attendance rate
          const totalRecords = branchData.totalPresent + branchData.totalAbsent + branchData.totalLate + branchData.totalExcused;
          if (totalRecords > 0) {
            branchData.attendanceRate = ((branchData.totalPresent + branchData.totalLate) / totalRecords * 100).toFixed(2);
          }

          // Process date data
          dateResult.rows.forEach(row => {
            const date = row.date.toISOString().split('T')[0];
            if (!branchData.byDate[date]) {
              branchData.byDate[date] = { present: 0, absent: 0, late: 0, excused: 0 };
            }
            if (!aggregatedData.byDate[date]) {
              aggregatedData.byDate[date] = { present: 0, absent: 0, late: 0, excused: 0 };
            }
            const count = parseInt(row.count);
            const status = row.status.toLowerCase();
            branchData.byDate[date][status] = count;
            aggregatedData.byDate[date][status] += count;
          });

          // Process grade data
          gradeResult.rows.forEach(row => {
            const grade = row.class_name;
            if (!branchData.byGrade[grade]) {
              branchData.byGrade[grade] = { present: 0, absent: 0, late: 0, excused: 0 };
            }
            if (!aggregatedData.byGrade[grade]) {
              aggregatedData.byGrade[grade] = { present: 0, absent: 0, late: 0, excused: 0 };
            }
            const count = parseInt(row.count);
            const status = row.status.toLowerCase();
            branchData.byGrade[grade][status] = count;
            aggregatedData.byGrade[grade][status] += count;
          });

          aggregatedData.byBranch.push(branchData);

        } catch (branchError) {
          console.error(`❌ Error aggregating attendance for branch ${branch.branch_code}:`, branchError);
          aggregatedData.byBranch.push({
            branchCode: branch.branch_code,
            branchName: branch.branch_name,
            error: branchError.message
          });
        }
      }

      // Calculate overall attendance rate
      const totalRecords = aggregatedData.totalPresent + aggregatedData.totalAbsent + aggregatedData.totalLate + aggregatedData.totalExcused;
      if (totalRecords > 0) {
        aggregatedData.attendanceRate = ((aggregatedData.totalPresent + aggregatedData.totalLate) / totalRecords * 100).toFixed(2);
      }

      return aggregatedData;
    } catch (error) {
      console.error('❌ Error in aggregateAttendanceData:', error);
      throw new Error(`Failed to aggregate attendance data: ${error.message}`);
    }
  }

  /**
   * Aggregate academic performance data across all branches
   * @param {Object} options - Filter options (term, academicYear, subject)
   * @returns {Promise<Object>} Aggregated academic performance data
   */
  async aggregateAcademicPerformance(options = {}) {
    try {
      const branches = await this.getAllBranches();
      const { term, academicYear, subject } = options;

      const aggregatedData = {
        averageScore: 0,
        totalStudents: 0,
        passingRate: 0,
        byBranch: [],
        byGrade: {},
        bySubject: {},
        performanceBands: {
          excellent: 0,  // 90-100
          veryGood: 0,   // 80-89
          good: 0,       // 70-79
          satisfactory: 0, // 60-69
          needsImprovement: 0 // below 60
        },
        timestamp: new Date().toISOString()
      };

      for (const branch of branches) {
        try {
          const pool = await dbManager.getPool(branch.branch_code);
          
          // Build filters
          let filters = [];
          const params = [];
          let paramIndex = 1;

          if (term) {
            filters.push(`term = $${paramIndex++}`);
            params.push(term);
          }
          if (academicYear) {
            filters.push(`academic_year = $${paramIndex++}`);
            params.push(academicYear);
          }
          if (subject) {
            filters.push(`subject = $${paramIndex++}`);
            params.push(subject);
          }

          const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

          // Get average scores and student count
          const avgQuery = `
            SELECT 
              AVG(total_marks) as avg_score,
              COUNT(DISTINCT student_id) as student_count,
              COUNT(CASE WHEN total_marks >= 50 THEN 1 END) as passing_count
            FROM mark_lists 
            ${whereClause}
          `;
          const avgResult = await pool.query(avgQuery, params);

          // Get performance by grade
          const gradeQuery = `
            SELECT 
              s.class_name,
              AVG(ml.total_marks) as avg_score,
              COUNT(DISTINCT ml.student_id) as student_count
            FROM mark_lists ml
            JOIN students s ON ml.student_id = s.id
            ${whereClause}
            GROUP BY s.class_name
          `;
          const gradeResult = await pool.query(gradeQuery, params);

          // Get performance by subject
          const subjectQuery = `
            SELECT 
              subject,
              AVG(total_marks) as avg_score,
              COUNT(DISTINCT student_id) as student_count
            FROM mark_lists 
            ${whereClause}
            GROUP BY subject
          `;
          const subjectResult = await pool.query(subjectQuery, params);

          // Get performance bands
          const bandsQuery = `
            SELECT 
              CASE 
                WHEN total_marks >= 90 THEN 'excellent'
                WHEN total_marks >= 80 THEN 'veryGood'
                WHEN total_marks >= 70 THEN 'good'
                WHEN total_marks >= 60 THEN 'satisfactory'
                ELSE 'needsImprovement'
              END as band,
              COUNT(*) as count
            FROM mark_lists 
            ${whereClause}
            GROUP BY band
          `;
          const bandsResult = await pool.query(bandsQuery, params);

          const avgScore = parseFloat(avgResult.rows[0].avg_score) || 0;
          const studentCount = parseInt(avgResult.rows[0].student_count) || 0;
          const passingCount = parseInt(avgResult.rows[0].passing_count) || 0;
          const passingRate = studentCount > 0 ? (passingCount / studentCount * 100).toFixed(2) : 0;

          const branchData = {
            branchCode: branch.branch_code,
            branchName: branch.branch_name,
            averageScore: avgScore.toFixed(2),
            totalStudents: studentCount,
            passingRate: passingRate,
            byGrade: gradeResult.rows.reduce((acc, row) => {
              acc[row.class_name] = {
                avgScore: parseFloat(row.avg_score).toFixed(2),
                studentCount: parseInt(row.student_count)
              };
              return acc;
            }, {}),
            bySubject: subjectResult.rows.reduce((acc, row) => {
              acc[row.subject] = {
                avgScore: parseFloat(row.avg_score).toFixed(2),
                studentCount: parseInt(row.student_count)
              };
              return acc;
            }, {}),
            performanceBands: bandsResult.rows.reduce((acc, row) => {
              acc[row.band] = parseInt(row.count);
              return acc;
            }, { excellent: 0, veryGood: 0, good: 0, satisfactory: 0, needsImprovement: 0 })
          };

          aggregatedData.byBranch.push(branchData);
          aggregatedData.totalStudents += studentCount;

          // Aggregate performance bands
          Object.keys(branchData.performanceBands).forEach(band => {
            aggregatedData.performanceBands[band] += branchData.performanceBands[band];
          });

          // Aggregate grade data
          Object.keys(branchData.byGrade).forEach(grade => {
            if (!aggregatedData.byGrade[grade]) {
              aggregatedData.byGrade[grade] = { totalScore: 0, studentCount: 0, avgScore: 0 };
            }
            const gradeData = branchData.byGrade[grade];
            aggregatedData.byGrade[grade].totalScore += parseFloat(gradeData.avgScore) * gradeData.studentCount;
            aggregatedData.byGrade[grade].studentCount += gradeData.studentCount;
          });

          // Aggregate subject data
          Object.keys(branchData.bySubject).forEach(subj => {
            if (!aggregatedData.bySubject[subj]) {
              aggregatedData.bySubject[subj] = { totalScore: 0, studentCount: 0, avgScore: 0 };
            }
            const subjData = branchData.bySubject[subj];
            aggregatedData.bySubject[subj].totalScore += parseFloat(subjData.avgScore) * subjData.studentCount;
            aggregatedData.bySubject[subj].studentCount += subjData.studentCount;
          });

        } catch (branchError) {
          console.error(`❌ Error aggregating academic performance for branch ${branch.branch_code}:`, branchError);
          aggregatedData.byBranch.push({
            branchCode: branch.branch_code,
            branchName: branch.branch_name,
            error: branchError.message
          });
        }
      }

      // Calculate overall average score
      let totalScore = 0;
      let totalCount = 0;
      aggregatedData.byBranch.forEach(branch => {
        if (!branch.error) {
          totalScore += parseFloat(branch.averageScore) * branch.totalStudents;
          totalCount += branch.totalStudents;
        }
      });
      aggregatedData.averageScore = totalCount > 0 ? (totalScore / totalCount).toFixed(2) : 0;

      // Calculate overall passing rate
      const totalPassing = aggregatedData.performanceBands.excellent + 
                          aggregatedData.performanceBands.veryGood + 
                          aggregatedData.performanceBands.good + 
                          aggregatedData.performanceBands.satisfactory;
      const totalRecords = Object.values(aggregatedData.performanceBands).reduce((sum, val) => sum + val, 0);
      aggregatedData.passingRate = totalRecords > 0 ? (totalPassing / totalRecords * 100).toFixed(2) : 0;

      // Calculate average scores for grades
      Object.keys(aggregatedData.byGrade).forEach(grade => {
        const gradeData = aggregatedData.byGrade[grade];
        gradeData.avgScore = gradeData.studentCount > 0 
          ? (gradeData.totalScore / gradeData.studentCount).toFixed(2) 
          : 0;
        delete gradeData.totalScore; // Remove intermediate calculation
      });

      // Calculate average scores for subjects
      Object.keys(aggregatedData.bySubject).forEach(subj => {
        const subjData = aggregatedData.bySubject[subj];
        subjData.avgScore = subjData.studentCount > 0 
          ? (subjData.totalScore / subjData.studentCount).toFixed(2) 
          : 0;
        delete subjData.totalScore; // Remove intermediate calculation
      });

      return aggregatedData;
    } catch (error) {
      console.error('❌ Error in aggregateAcademicPerformance:', error);
      throw new Error(`Failed to aggregate academic performance: ${error.message}`);
    }
  }
}

// Export singleton instance
const crossBranchService = new CrossBranchAggregationService();

module.exports = crossBranchService;
