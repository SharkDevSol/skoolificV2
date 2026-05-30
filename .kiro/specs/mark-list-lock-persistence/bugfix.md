# Bugfix Requirements Document

## Introduction

Teachers can edit and update student marks even after saving them and refreshing the page. The mark input fields should be locked after marks are saved, and this lock should persist across page refreshes by checking the database values, not browser storage.

The bug occurs because the `savedMarkStudents` Set is stored in React component state (browser memory) and gets reset to empty on every page load. Even though the code checks database values to populate this Set, the lock logic requires BOTH conditions: `hasAnyMarks` (database check) AND `savedMarkStudents.has(student.id)` (browser memory check). After refresh, `savedMarkStudents` is empty, so inputs become editable even when marks exist in the database.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a teacher saves marks for a student and then refreshes the page THEN the system resets the `savedMarkStudents` Set to empty and unlocks all mark input fields, allowing previously saved marks to be edited

1.2 WHEN the page loads and `loadMarkListData` executes THEN the system calls `setSavedMarkStudents(new Set())` on line 706, clearing all lock state from browser memory

1.3 WHEN rendering mark input fields THEN the system evaluates `inputIsLocked = hasValue && savedMarkStudents.has(student.id) && !isAdmin`, which becomes false after refresh because `savedMarkStudents` is empty, even though `hasValue` is true from database

### Expected Behavior (Correct)

2.1 WHEN a teacher saves marks for a student and then refreshes the page THEN the system SHALL keep mark input fields locked based solely on database values (if any mark component > 0)

2.2 WHEN the page loads and `loadMarkListData` executes THEN the system SHALL NOT reset the `savedMarkStudents` Set, or SHALL eliminate dependency on this Set entirely for lock state

2.3 WHEN rendering mark input fields THEN the system SHALL evaluate lock state based only on database values: `inputIsLocked = hasValue && !isAdmin`, without requiring `savedMarkStudents.has(student.id)`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a student has no marks saved in the database (all mark components are 0 or empty) THEN the system SHALL CONTINUE TO display unlocked input fields that allow mark entry

3.2 WHEN a user with admin staff type views the mark list THEN the system SHALL CONTINUE TO display unlocked input fields regardless of whether marks exist in the database

3.3 WHEN a teacher enters new marks for a student who has no previous marks THEN the system SHALL CONTINUE TO allow mark entry and save functionality

3.4 WHEN marks are saved successfully THEN the system SHALL CONTINUE TO display the success message and update the progress indicator
