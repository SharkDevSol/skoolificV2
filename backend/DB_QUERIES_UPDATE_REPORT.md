# Database Queries Update Report

Generated: 2026-04-29T09:28:01.448Z

## Summary

- **Total Route Files:** 80
- **Already Using branchPool:** 0
- **Needs Update:** 3
- **No Database Queries:** 30

## Files Needing Update (3)

These files use authenticateWithBranch but still use db.query instead of req.branchPool:

| File | DB Queries | Priority |
|------|------------|----------|
| dashboardRoutes.js | 40 | 🔴 High |
| studentRoutes.js | 39 | 🔴 High |
| staffRoutes.js | 2 | 🟢 Low |

## Already Using branchPool (0)


## Update Instructions

For each route handler that uses authenticateWithBranch:

1. **Add pool variable at the start of the handler:**
   ```javascript
   router.get('/route', authenticateWithBranch, async (req, res) => {
     const pool = req.branchPool; // Add this line
     // ... rest of handler
   });
   ```

2. **Replace all db.query with pool.query:**
   ```javascript
   // OLD
   const result = await db.query('SELECT * FROM table');

   // NEW
   const result = await pool.query('SELECT * FROM table');
   ```

3. **Replace db.connect() with pool.connect():**
   ```javascript
   // OLD
   const client = await db.connect();

   // NEW
   const client = await pool.connect();
   ```

4. **Optional: Remove db import if no longer needed:**
   ```javascript
   // If all queries now use req.branchPool, you can remove:
   // const db = require('../config/db');
   ```

## Important Notes

- **Branch Context:** req.branchPool is only available in routes using authenticateWithBranch
- **Connection Pooling:** Each branch has its own connection pool managed by DatabaseConnectionManager
- **Error Handling:** Branch validation errors return 404 with clear messages
- **Testing:** Test each updated route with valid and invalid branch codes

## Manual Update Required

This is a complex transformation that requires manual review:

1. Each route handler needs individual attention
2. Some routes may use db in callbacks or nested functions
3. Transaction handling (client.query) needs special care
4. Error handling should be preserved

**Recommendation:** Update files one at a time, starting with high-priority files.
