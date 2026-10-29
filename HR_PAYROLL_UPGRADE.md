# HR / Payroll upgrade — IQRA (stage 1)

Status: **Phase 1 + additive schema applied to IQRA branches only.** Bilal is untouched.

## Backups (before any change)
- DB dumps: `/root/backups/hr-20261029/iqrab{1..5}.dump` (`pg_dump -Fc`)
- Code backup of the replaced files: `/root/backups/hr-code-20261029-0919/`

Restore a branch DB if needed:
```bash
pg_restore -U iqra -h localhost -d iqrabX --clean --if-exists /root/backups/hr-20261029/iqrabX.dump
```

## Schema migration (idempotent, additive)
File: `backend/scripts/sql/hr_upgrade.sql` — applied to `iqrab1..iqrab5`
(`psql -v ON_ERROR_STOP=1 --single-transaction -f ...`).

Adds (no drops/renames, safe defaults):
- `hr_complete_salaries`: bank name/account, tax on-off/type/value, paid months (JSONB), stop/reactivate flags
- `hr_attendance_time_settings`: `standard_check_in`, `standard_check_out`, `minimum_work_hours`, `grace_period_minutes`, `connect_to_salary` (these were missing on IQRA and broke saving)
- `hr_staff_specific_times`: `anytime_check`, `connect_to_salary`, `absent_deducts`
- `hr_ethiopian_attendance`: `source` (AUTO/MANUAL), `created_by`, `updated_by`
- `hr_attendance_permissions`: review status, reason/deduction fields, audit fields
- New tables: `hr_tips`, `hr_staff_credits`, `hr_debt_plans`, `hr_debt_plan_items`, `hr_credit_repayments`, `hr_payroll_runs`, `hr_payroll_items`, `hr_payroll_settings`, `hr_attendance_audit_log`
- `public.expenses`: `reference_type`, `reference_id`, `cancelled` (for tips/credits)
- Base tables created where missing (iqrab2/4/5)

To apply to another branch/school later:
```bash
PGPASSWORD=... psql -h localhost -U <user> -d <db> -v ON_ERROR_STOP=1 --single-transaction -f hr_upgrade.sql
```

## Phase 1 fixes (deployed to IQRA backend, tested)
| Fix | Result |
|---|---|
| `GET /api/staff` no longer selects/returns `password` | 200, `hasPassword=false` |
| `GET /api/hr/stats` (used by HR Dashboard) | 200 with real totals |
| `GET /api/hr/dashboard/summary` | 200 real data (was hardcoded stubs) |
| `GET /api/reports/hr/summary` | 200 (existing route) |
| `GET /api/hr/reports/:report` + `/export` (HR Reports page) | 200; Excel export works |
| `GET /api/hr/attendance/summary` now reads `hr_ethiopian_attendance` | 200, 170 rows |
| `POST /api/hr/attendance/time-settings` | 200 (was failing on IQRA — missing columns) |
| `hr_attendance_permissions` on bilal | already existed — nothing to do |
| `/api/finance/payroll` mounted | 200 |

## Decisions applied (from the review)
1. Tips/credits are recorded **directly** as `public.expenses` rows (`source='tips'|'credit'`, `reference_type/reference_id`), **not** in the approval queue.
2. Deductions above salary are **capped at a % of gross** (`hr_payroll_settings.max_deduction_percent`, default 100, editable). Anything above the cap stays owed.
3. `Done` locks a payroll month; an **admin unlock** (reason + audit) will allow backfilling past months.
4. Tips can have **no staff** (general school expense); types are admin-editable.

## Requirement 1 — Salary setup (done, IQRA)
- `POST /api/hr/salary/add-complete` / `PUT /api/hr/salary/update-complete/:id` now store **bank name, bank account, tax on/off + type (PERCENT/FIXED) + value, paid months (1–13)** and compute tax/net **server-side**.
- `POST /api/hr/salary/:id/stop` and `/:id/reactivate` — history kept, payroll skips stopped staff.
- `GET /api/hr/salary/all-salaries` returns the new fields.
- Payroll `/api/hr/payroll/generate` now: excludes stopped staff, honours paid months, applies tax, ignores manual "Tax" rows while salary tax is on, applies the `max_deduction_percent` cap, and fixes the allowances/deductions month filter (it compared a month **name** to an integer month, so they never matched).
- UI: Add/Edit Salary modal has bank fields, optional tax, a 13-month paid-months picker and a live net preview; the salary table shows bank/tax/months + **Stop/Reactivate**.
- Tested: 10% tax on 10,000 → net 9,000; stopped → excluded; month not in paid months → excluded.

## Next (requirements 2–7)
Connect-to-salary + staff-specific/any-time tabs, AUTO/MANUAL + P→L + source/creator, leave review Done/A→V + audit, Tips & Credit tabs + debt plans, payroll persist/Done/export, new report page.

## Behaviour changes to be aware of
- `/api/staff` and `/api/staff/data/...` no longer return password fields (any UI relying on them will get `undefined`).
- `/api/hr/attendance/summary` now counts Ethiopian attendance marks (different numbers than before — the old table was usually empty).
- HR Dashboard stats are real (previously hardcoded 42/39/2/1).
- `GET /api/finance/payroll` now exists (was 404).
