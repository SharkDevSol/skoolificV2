# Deploy all changes to iqra + bilal
# Run this when server is reachable: powershell -ExecutionPolicy Bypass -File DEPLOY-ALL.ps1
$ErrorActionPreference = "Continue"
$repo = "C:\Users\hp\Desktop\v.2\skoolificV2-git"

Write-Host "=== Step 1: Test server ===" -ForegroundColor Cyan
$alive = ssh -o ConnectTimeout=15 iqra-vps "echo alive" 2>&1
if ($alive -notmatch "alive") { Write-Host "Server unreachable. Try again later." -ForegroundColor Red; exit 1 }
Write-Host "Server alive" -ForegroundColor Green

Write-Host "=== Step 2: Deploy backend files ===" -ForegroundColor Cyan
$backendFiles = @(
  "routes\classTeacherRoutes.js",
  "routes\studentListRoutes.js",
  "routes\markListRoutes.js",
  "routes\staffRoutes.js",
  "routes\academic\studentAttendance.js",
  "routes\subAccountRoutes.js",
  "config\db.js",
  "services\DatabaseConnectionManager.js"
)
foreach ($f in $backendFiles) {
  $local = Join-Path "$repo\backend" $f
  $remote = "/var/www/iqra.skoolific.com/backend/$($f -replace '\\','/')"
  Write-Host "  Uploading $f..."
  scp -o ConnectTimeout=15 $local "iqra-vps:$remote" 2>&1
}
Write-Host "Backend files uploaded" -ForegroundColor Green

Write-Host "=== Step 3: Deploy frontend ===" -ForegroundColor Cyan
scp -o ConnectTimeout=15 "$repo\APP\build.tgz" iqra-vps:/tmp/web-build.tgz 2>&1
ssh -o ConnectTimeout=15 iqra-vps "deploy-iqra /tmp/web-build.tgz" 2>&1
scp -o ConnectTimeout=15 "$repo\APP\build.tgz" iqra-vps:/tmp/web-build-bilal.tgz 2>&1
ssh -o ConnectTimeout=15 iqra-vps "deploy-bilal-web /tmp/web-build-bilal.tgz" 2>&1
Write-Host "Frontend deployed" -ForegroundColor Green

Write-Host "=== Step 4: Restart backends ===" -ForegroundColor Cyan
ssh -o ConnectTimeout=15 iqra-vps "pm2 restart iqra-backend && pm2 restart bilal-backend && pm2 restart iqrab3-backend" 2>&1
Write-Host "Backends restarted" -ForegroundColor Green

Write-Host "=== Step 5: Create academic_student_attendance on all branch DBs ===" -ForegroundColor Cyan
ssh -o ConnectTimeout=15 iqra-vps @"
for db in iqrab1 iqrab2 iqrab3 iqrab4 iqrab5 school_management10; do
  echo \"--- Ensuring academic_student_attendance in \$db ---\"
  psql -U postgres -d \$db -c 'CREATE TABLE IF NOT EXISTS academic_student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(255) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    smachine_id VARCHAR(50),
    date DATE,
    ethiopian_year INTEGER NOT NULL,
    ethiopian_month INTEGER NOT NULL,
    ethiopian_day INTEGER NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    week_number INTEGER NOT NULL,
    check_in_time TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT ''PRESENT'',
    notes TEXT,
    shift_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_name, ethiopian_year, ethiopian_month, ethiopian_day)
  )' 2>&1
  psql -U postgres -d \$db -c 'ALTER TABLE academic_student_attendance ADD COLUMN IF NOT EXISTS date DATE' 2>&1
  psql -U postgres -d \$db -c 'ALTER TABLE academic_student_attendance ADD COLUMN IF NOT EXISTS shift_number INTEGER DEFAULT 1' 2>&1
done
"@ 2>&1
Write-Host "All done!" -ForegroundColor Green
