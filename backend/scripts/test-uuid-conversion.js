function compositeIdToUUID(compositeId) {
  const [schoolId, classId] = compositeId.split('-');
  const paddedSchoolId = schoolId.padStart(8, '0');
  const paddedClassId = classId.padStart(8, '0');
  const result = `00000000-0000-0000-${paddedSchoolId.slice(0, 4)}-${paddedSchoolId.slice(4)}${paddedClassId}`;
  console.log(`Input: ${compositeId}`);
  console.log(`  schoolId: ${schoolId}, classId: ${classId}`);
  console.log(`  paddedSchoolId: ${paddedSchoolId}, paddedClassId: ${paddedClassId}`);
  console.log(`  Result: ${result}`);
  console.log(`  Parts: ${result.split('-').length} groups`);
  console.log('');
  return result;
}

compositeIdToUUID('6-3');
compositeIdToUUID('4-1');
compositeIdToUUID('5-2');
