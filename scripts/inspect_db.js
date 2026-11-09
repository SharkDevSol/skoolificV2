const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '/var/www/iqra.skoolific.com/backend/.env' });
const { JWT_SECRET } = require('/var/www/iqra.skoolific.com/backend/middleware/jwtValidator');

(async () => {
  const token = jwt.sign(
    { id: 1, username: 'khalif', role: 'super_admin', fullName: 'Khalif' },
    JWT_SECRET,
    { expiresIn: '24h', issuer: 'school-management-system', audience: 'school-app' }
  );
  const headers = { Authorization: `Bearer ${token}` };

  console.log('\n--- 1. Testing Attendance Monthly ---');
  const attRes = await axios.get('http://localhost:6005/api/super-admin/report/attendance?viewMode=month&year=2019&month=2', { headers });
  console.log('Attendance Monthly Summary:', {
    grandTotal: attRes.data.data.grandTotal,
    grandPresent: attRes.data.data.grandPresent,
    grandLate: attRes.data.data.grandLate,
    grandAbsent: attRes.data.data.grandAbsent,
    grandPermission: attRes.data.data.grandPermission,
    grandRate: attRes.data.data.grandRate
  });
  for (const b of attRes.data.data.byBranch) {
    console.log(`  ${b.branchName}: Total=${b.total}, Present=${b.present}, Absent=${b.absent}, Permission=${b.permission}, Rate=${b.rate}%`);
    console.log(`    Most Absent (top 2):`, b.mostAbsent?.slice(0, 2));
    console.log(`    Most Present (top 2):`, b.mostPresent?.slice(0, 2));
    console.log(`    Most Late (top 2):`, b.mostLate?.slice(0, 2));
    console.log(`    Most Permission (top 2):`, b.mostPermission?.slice(0, 2));
  }

  console.log('\n--- 2. Testing Attendance Weekly ---');
  const attWeek = await axios.get('http://localhost:6005/api/super-admin/report/attendance?viewMode=week&year=2019&month=2&week=1', { headers });
  console.log('Weekly Total:', attWeek.data.data.grandTotal, 'Rate:', attWeek.data.data.grandRate + '%');

  console.log('\n--- 3. Testing Attendance Daily (by date) ---');
  const attDay = await axios.get('http://localhost:6005/api/super-admin/report/attendance?viewMode=date&year=2019&month=2&day=10', { headers });
  console.log('Daily Total (Day 10):', attDay.data.data.grandTotal, 'Rate:', attDay.data.data.grandRate + '%');

  console.log('\n--- 4. Testing Marks Term 1 ---');
  const mkRes = await axios.get('http://localhost:6005/api/super-admin/report/marks?term=1', { headers });
  console.log('Marks Summary:', {
    grandGradedStudents: mkRes.data.data.grandGradedStudents,
    grandSubjectsCount: mkRes.data.data.grandSubjectsCount,
    grandAvgScore: mkRes.data.data.grandAvgScore
  });
  for (const b of mkRes.data.data.byBranch) {
    console.log(`  ${b.branchName}: ${b.totalGradedStudents} graded students, ${b.classes?.length || 0} classes`);
    if (b.classes && b.classes.length > 0) {
      console.log(`    Top Class (${b.classes[0].className}): Top Student:`, b.classes[0].topStudents?.[0]);
      console.log(`    Top Subject in Class (${b.classes[0].className}):`, b.classes[0].topBySubject?.[0]?.subject, b.classes[0].topBySubject?.[0]?.topStudents?.[0]);
    }
  }

  process.exit(0);
})();
