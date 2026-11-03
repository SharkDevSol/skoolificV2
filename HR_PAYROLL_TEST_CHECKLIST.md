# HR / Payroll update — test checklist

## IQRA (`https://iqra.skoolific.com`) — deployed
Login as an admin/HR user.

### 1. Salary setup (`HR → Salary`)
- Add a salary: bank name, bank account, base salary.
- Turn tax ON: percent (e.g. 10) and fixed; check the net preview; save.
- Pick paid months (e.g. only Tikimt + Hidar); save; the row shows the months.
- **Stop** a staff → row shows STOPPED; **Reactivate** → back to normal.
- Generate payroll for a month the staff is NOT paid → they are excluded.

### 2. Time & shift (`HR → Attendance Time Settings`)
- Global tab: set check-in/out; turn **Connect to Salary** ON → the 4 amount inputs appear (A/L/H/*); save.
- **Staff Specific Time** tab: add a staff with custom times, an **Any time** staff, its own **Connect to salary** and **Absence deducts**; edit/delete.
- Check salary preview shows the attendance deduction (Leave review preview / payroll detail).

### 3. Attendance (`HR → Attendance System`)
- Click a cell → **P / A / L / H / * / V** buttons + **Current time / Set time**.
- Mark **P** with a time after the check-in → saved as **L** (any-time staff stay P).
- The record shows **Source: MANUAL · <user>**.
- AI06 scan → Source AUTO.

### 4. Leave review (`HR → Leave Management → Attendance Issues`)
- **Yes — Done (no deduction)**: reason saved; if the mark was A it becomes **V**.
- **No — Apply deduction**: the configured amount is added to that staff's payroll month under **Attendance**.

### 5. Salary → **Tips** and **Credit** tabs
- Tips: add a tip (optionally with no staff); it appears in **Finance → Expenses** (category Tips); it never appears in payroll; delete removes the expense too.
- Credit: give a credit → expense (category Staff Credit); create a repayment plan (e.g. 900 over 3 months → 300/month, last month remainder); stop plan.
- Try to cancel/delete a credit that has repayments → blocked.

### 6. Payroll (`HR → Payroll System`)
- Generate a month; check the breakdown column and the totals.
- **Done (lock month)** → LOCKED badge; generating again returns the locked data.
- Change a salary/deduction afterwards → the locked month does not change.
- **Unlock** with a reason → month reopens and credit balances are reversed.
- Export **Excel / PDF / Word**.
- If deductions exceed the cap → net is red with “cap applied”.

### 7. Reports (`HR → HR Reports`)
- Select **Payroll Detail (month)**, **Tips & Credit**, **Stopped Staff**; pick the Ethiopian month/year; Generate.
- Export PDF and Excel.

## BILAL (`https://bilal.skoolific.com`) — pending
The same checklist applies after:
1. Run `backend/scripts/sql/hr_upgrade.sql` on the bilal DB (`school_management10`) and the `fix_empty_machine_id.sql` normalization.
2. Deploy the backend files (`routes/hr/*`, `services/attendanceDeduction.js`) and the frontend dist.
3. Verify the same items above (Bilal has its own DB).

## Rollback
- DB: `/root/backups/hr-20261029/` (full dumps per branch).
- Code: `/root/backups/hr-code-*/` snapshots taken before each deploy.
- Frontend: `APP/dist.prev` (safe-deploy rollback).
