# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Lock Persistence After Refresh
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that for any student where at least one mark component has value > 0 in database, mark input fields remain locked after page refresh for non-admin users
  - Simulate: Save marks for a student (e.g., Quiz=8, Midterm=15), refresh page, check if inputs are locked
  - The test assertions should verify: `inputIsLocked === true` and `inputElement.disabled === true`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: After refresh, `savedMarkStudents` is empty, causing lock condition to fail even when `hasValue` is true
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unlocked Inputs and Admin Override
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Students with no marks (all components 0 or empty) have unlocked inputs
    - Admin users have unlocked inputs regardless of database values
    - New mark entry and save functionality works correctly
  - Write property-based tests capturing observed behavior patterns:
    - Property: For any student where all mark components are 0 or empty, inputs SHALL remain unlocked for non-admin users
    - Property: For any user with staffType === 'admin', all inputs SHALL remain unlocked regardless of database values
    - Property: Teachers can enter and save new marks for students with no previous marks
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix for mark list lock persistence bug

  - [x] 3.1 Remove savedMarkStudents state reset on line 706
    - Remove or comment out: `setSavedMarkStudents(new Set()); // reset locks on new load`
    - This line causes the bug by clearing browser memory state on every page load
    - _Bug_Condition: isBugCondition(input) where input.pageRefreshed == true AND EXISTS component WHERE component.value > 0 AND savedMarkStudents.has(input.studentId) == false_
    - _Expected_Behavior: Lock state should persist across page refreshes based solely on database values_
    - _Preservation: Students with no marks continue to have unlocked inputs; admin override continues to work_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 3.2 Simplify lock logic in student card rendering (line 2324)
    - Change: `const isLocked = hasAnyMarks && savedMarkStudents.has(student.id) && !isAdmin;`
    - To: `const isLocked = hasAnyMarks && !isAdmin;`
    - Remove the `savedMarkStudents.has(student.id)` condition
    - Lock state should depend only on database values (`hasAnyMarks`) and user role (`!isAdmin`)
    - _Bug_Condition: Dual-condition lock logic requires both database check AND browser memory check_
    - _Expected_Behavior: Lock logic depends solely on database values and user role_
    - _Preservation: Admin users continue to have full edit access; students with no marks continue to have unlocked inputs_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 3.3 Simplify lock logic in input field rendering (line 2343)
    - Change: `const inputIsLocked = hasValue && savedMarkStudents.has(student.id) && !isAdmin;`
    - To: `const inputIsLocked = hasValue && !isAdmin;`
    - Remove the `savedMarkStudents.has(student.id)` condition
    - Lock state should be determined by database values only
    - _Bug_Condition: Input lock check requires both database value AND browser memory state_
    - _Expected_Behavior: Input lock check depends only on database value and user role_
    - _Preservation: New mark entry functionality continues to work; admin override continues to work_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.4 (Optional) Update console log on line 733
    - Change: `console.log('🔒 Locked students:', Array.from(studentsWithMarks));`
    - To: `console.log('📊 Students with existing marks:', Array.from(studentsWithMarks));`
    - Clarify that this Set tracks students with marks, not lock state
    - _Requirements: 2.1, 2.2_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Lock Persistence After Refresh
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that after page refresh, inputs remain locked for students with saved marks
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Unlocked Inputs and Admin Override
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation properties still hold:
      - Students with no marks have unlocked inputs
      - Admin users have full edit access
      - New mark entry and save functionality works
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Verify bug condition test passes (lock persists after refresh)
  - Verify preservation tests pass (no regressions)
  - Run manual testing scenarios:
    - Save marks, refresh page, verify inputs are locked
    - Test with students who have no marks, verify inputs are unlocked
    - Test as admin user, verify all inputs are editable
    - Test browser restart scenario (close and reopen browser)
  - Ask the user if questions arise or if ready to deploy
