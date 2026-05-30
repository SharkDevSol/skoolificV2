# Mark List Lock Persistence Bugfix Design

## Overview

This bugfix addresses the issue where mark input fields become editable after page refresh, even though marks are saved in the database. The root cause is a dual-condition lock check that requires both database values (`hasValue`) AND browser memory state (`savedMarkStudents.has(student.id)`). Since `savedMarkStudents` is reset to an empty Set on line 706 during page load, the lock condition fails after refresh.

The fix simplifies the lock logic to depend solely on database values, eliminating the fragile browser memory dependency. This ensures lock state persists across page refreshes and browser sessions.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a student has saved marks in the database (any mark component > 0) and the page is refreshed
- **Property (P)**: The desired behavior - mark input fields should remain locked after refresh based on database values
- **Preservation**: Existing functionality that must remain unchanged - unlocked inputs for students with no marks, admin override capability, mark entry and save functionality
- **savedMarkStudents**: A React state Set in `StaffProfile.jsx` that tracks which students have saved marks in browser memory (gets reset on page load)
- **hasValue**: A boolean check that determines if a mark component has a value > 0 in the database
- **inputIsLocked**: The computed boolean that determines if a mark input field should be disabled
- **loadMarkListData**: The function on lines 700-735 that fetches mark list data from the backend and initializes component state
- **isAdmin**: A boolean check that determines if the current user has admin staff type (admins can always edit marks)

## Bug Details

### Bug Condition

The bug manifests when a teacher saves marks for a student, then refreshes the page. The mark input fields become editable even though the marks exist in the database. The lock logic on lines 2343 and 2324 requires THREE conditions to lock an input: `hasValue && savedMarkStudents.has(student.id) && !isAdmin`. After page refresh, `savedMarkStudents` is reset to an empty Set (line 706), causing the second condition to fail.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { studentId: number, markComponents: object, pageRefreshed: boolean }
  OUTPUT: boolean
  
  RETURN input.pageRefreshed == true
         AND EXISTS component IN input.markComponents WHERE component.value > 0
         AND savedMarkStudents.has(input.studentId) == false
         AND currentUser.staffType != 'admin'
END FUNCTION
```

### Examples

- **Example 1**: Teacher enters marks for Student A (Quiz: 8/10, Midterm: 15/20), clicks Save. Marks are saved to database. Teacher refreshes page. Input fields for Student A become editable again (BUG - should be locked).

- **Example 2**: Teacher enters marks for Student B (Quiz: 10/10), clicks Save. Teacher closes browser and returns next day. Opens mark list page. Input fields for Student B are editable (BUG - should be locked).

- **Example 3**: Teacher enters marks for Student C (Midterm: 18/20), clicks Save. Without refreshing, teacher tries to edit Student C's marks. Input fields are locked (CORRECT - this works before refresh).

- **Edge Case**: Admin user opens mark list with saved marks after page refresh. All input fields should be editable regardless of database values (CORRECT - admin override should work).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Students with no marks in the database (all components are 0 or empty) must continue to have unlocked input fields
- Admin users must continue to have full edit access to all marks regardless of database state
- Teachers must continue to be able to enter new marks for students with no previous marks
- The save functionality must continue to work correctly and update the database
- Success messages and progress indicators must continue to display after saving marks
- The mark list filtering and search functionality must continue to work
- The one-by-one mode navigation must continue to work

**Scope:**
All inputs that do NOT involve page refresh or browser restart should be completely unaffected by this fix. This includes:
- Initial mark entry for students with no previous marks
- Admin editing of any marks
- Mark list loading and display
- Save operation and success feedback
- Navigation between students in one-by-one mode

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Dual-Condition Lock Logic**: The lock check on lines 2343 and 2324 requires BOTH `hasValue` (database check) AND `savedMarkStudents.has(student.id)` (browser memory check). This creates a fragile dependency on browser state.

2. **State Reset on Load**: Line 706 explicitly resets `savedMarkStudents` to an empty Set: `setSavedMarkStudents(new Set())`. This happens every time `loadMarkListData` is called, which occurs on page load and when changing mark list selections.

3. **Inconsistent State Initialization**: Although lines 718-731 attempt to repopulate `savedMarkStudents` from database values, the lock logic still requires the Set to contain the student ID. After refresh, there's a timing issue or the logic doesn't properly sync.

4. **Unnecessary Complexity**: The `savedMarkStudents` Set was likely intended to track "just saved" students for UI feedback, but it became entangled with the lock logic. The database already stores the authoritative lock state (any mark > 0), making the Set redundant for lock determination.

## Correctness Properties

Property 1: Bug Condition - Lock Persistence After Refresh

_For any_ student where at least one mark component has a value > 0 in the database, the mark input fields SHALL remain locked after page refresh for non-admin users, preventing unintended edits to saved marks.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Unlocked Inputs for New Marks

_For any_ student where all mark components are 0 or empty in the database, the mark input fields SHALL remain unlocked for non-admin users, allowing teachers to enter new marks.

**Validates: Requirements 3.1, 3.3**

Property 3: Preservation - Admin Override

_For any_ user with staffType === 'admin', all mark input fields SHALL remain unlocked regardless of database values, preserving admin edit capabilities.

**Validates: Requirements 3.2**

## Fix Implementation

### Changes Required

**File**: `APP/src/COMPONENTS/StaffProfile.jsx`

**Change 1: Remove State Reset (Line 706)**

Remove or comment out the line that resets `savedMarkStudents` on load:

```javascript
// BEFORE (Line 706):
setSavedMarkStudents(new Set()); // reset locks on new load

// AFTER:
// Remove this line entirely, or comment it out
```

**Rationale**: This line causes the bug by clearing browser memory state on every load. Since we're moving to database-only lock logic, this reset is unnecessary.

**Change 2: Simplify Lock Logic in Student Card Rendering (Line 2324)**

Remove the `savedMarkStudents.has(student.id)` condition from the card-level lock check:

```javascript
// BEFORE (Line 2324):
const isLocked = hasAnyMarks && savedMarkStudents.has(student.id) && !isAdmin;

// AFTER:
const isLocked = hasAnyMarks && !isAdmin;
```

**Rationale**: Lock state should depend only on database values (`hasAnyMarks`) and user role (`!isAdmin`), not browser memory.

**Change 3: Simplify Lock Logic in Input Field Rendering (Line 2343)**

Remove the `savedMarkStudents.has(student.id)` condition from the input-level lock check:

```javascript
// BEFORE (Line 2343):
const inputIsLocked = hasValue && savedMarkStudents.has(student.id) && !isAdmin;

// AFTER:
const inputIsLocked = hasValue && !isAdmin;
```

**Rationale**: Same as Change 2 - lock state should be determined by database values only.

**Change 4: Optional - Remove or Repurpose savedMarkStudents (Lines 236, 731, 796-806)**

The `savedMarkStudents` Set may no longer be needed for lock logic. Options:

**Option A (Recommended)**: Keep the Set for UI feedback purposes only (e.g., showing which students were just saved in the current session), but remove it from lock logic (already done in Changes 2-3).

**Option B**: Remove the Set entirely if it serves no other purpose:
- Remove state declaration (line 236)
- Remove initialization in `loadMarkListData` (lines 718-731)
- Remove updates in `saveMarkListMarks` (lines 796-806)

**Recommendation**: Choose Option A to preserve potential UI feedback functionality while fixing the lock bug. The Set can still track "recently saved" students for visual indicators without affecting lock state.

**Change 5: Update Console Log (Line 733)**

If keeping `savedMarkStudents` for UI purposes, update the console log to clarify its purpose:

```javascript
// BEFORE (Line 733):
console.log('🔒 Locked students:', Array.from(studentsWithMarks));

// AFTER:
console.log('📊 Students with existing marks:', Array.from(studentsWithMarks));
```

**Rationale**: The log message should reflect that this Set is for tracking students with marks, not for determining lock state.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the dual-condition lock logic fails after page refresh.

**Test Plan**: Write tests that simulate saving marks, refreshing the page, and checking input lock state. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Basic Refresh Test**: Save marks for a student, refresh page, verify inputs are editable (will fail on unfixed code - inputs should be locked)
2. **Multiple Students Test**: Save marks for 3 students, refresh page, verify all 3 have editable inputs (will fail on unfixed code)
3. **Partial Marks Test**: Save only Quiz marks (not Midterm), refresh page, verify Quiz input is editable (will fail on unfixed code)
4. **Admin Override Test**: Login as admin, refresh page with saved marks, verify inputs are editable (should pass on unfixed code - admin override works)

**Expected Counterexamples**:
- After refresh, `savedMarkStudents` is empty, causing `savedMarkStudents.has(student.id)` to return false
- Lock condition `hasValue && savedMarkStudents.has(student.id) && !isAdmin` evaluates to false even when `hasValue` is true
- Inputs become editable despite database containing saved marks

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (student has saved marks and page is refreshed), the fixed function produces the expected behavior (inputs remain locked).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderMarkInput_fixed(input)
  ASSERT result.inputIsLocked == true
  ASSERT result.inputElement.disabled == true
END FOR
```

**Test Cases**:
1. **Single Component Lock**: Student has Quiz=8, refresh page, verify Quiz input is locked
2. **Multiple Components Lock**: Student has Quiz=8 and Midterm=15, refresh page, verify both inputs are locked
3. **Mixed Lock State**: Student A has marks (locked), Student B has no marks (unlocked), refresh page, verify correct lock states
4. **Browser Restart**: Save marks, close browser, reopen, verify inputs are locked

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (student has no marks, or user is admin), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderMarkInput_original(input) = renderMarkInput_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for students with no marks and admin users, then write property-based tests capturing that behavior.

**Test Cases**:
1. **No Marks Preservation**: Student has no marks (all 0 or empty), refresh page, verify inputs remain unlocked
2. **Admin Preservation**: Admin user views mark list with saved marks, refresh page, verify all inputs remain unlocked
3. **New Mark Entry Preservation**: Teacher enters new marks for student with no previous marks, verify save functionality works
4. **Save Success Preservation**: Save marks, verify success message displays and progress indicator updates
5. **Search and Filter Preservation**: Use search and filter features, verify they continue to work correctly

### Unit Tests

- Test `loadMarkListData` function to verify it correctly identifies students with marks from database
- Test lock logic with various combinations: hasValue=true/false, isAdmin=true/false
- Test edge cases: all marks are 0, some marks are 0, marks are decimal values
- Test that removing `savedMarkStudents` from lock logic doesn't break other functionality

### Property-Based Tests

- Generate random mark configurations (0 to max value for each component) and verify lock state is determined correctly by database values
- Generate random user roles (admin, teacher) and verify admin override works consistently
- Test that page refresh doesn't change lock state for any valid mark configuration

### Integration Tests

- Test full workflow: login as teacher, load mark list, enter marks, save, refresh, verify locks persist
- Test switching between mark lists (different subjects/classes) and verify lock state is correct for each
- Test one-by-one mode with page refresh to ensure navigation and lock state work together
- Test that visual indicators (checkmarks, disabled styling) display correctly after refresh
