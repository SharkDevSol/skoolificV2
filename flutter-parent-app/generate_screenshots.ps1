Add-Type -AssemblyName System.Drawing

$outDir = "C:\Users\hp\Desktop\v.2\SCHOOLS\SCHOOLS\FlutterIQRA\play_store_assets"
$logoPath = "C:\Users\hp\Desktop\v.2\SCHOOLS\SCHOOLS\FlutterIQRA\assets\images\logo.png"
$src = [System.Drawing.Image]::FromFile($logoPath)

function Make-Screen($filename, $title, $subtitle, $colorHex) {
    $bmp = New-Object System.Drawing.Bitmap(1080, 1920)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::FromArgb(245, 247, 250))

    $headerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($colorHex))
    $g.FillRectangle($headerBrush, 0, 0, 1080, 440)
    $headerBrush.Dispose()

    $titleFont = New-Object System.Drawing.Font("Arial", 46, [System.Drawing.FontStyle]::Bold)
    $subFont = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Regular)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.DrawString($title, $titleFont, $whiteBrush, 80, 140)
    $g.DrawString($subtitle, $subFont, $whiteBrush, 80, 230)
    $titleFont.Dispose()
    $subFont.Dispose()
    $whiteBrush.Dispose()

    $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($cardBrush, 70, 390, 940, 1450)
    $cardBrush.Dispose()

    $g.DrawImage($src, 440, 480, 200, 200)

    $cardFont = New-Object System.Drawing.Font("Arial", 32, [System.Drawing.FontStyle]::Bold)
    $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))
    $g.DrawString("IQRA Parent Portal", $cardFont, $darkBrush, 360, 720)

    $itemFont = New-Object System.Drawing.Font("Arial", 24, [System.Drawing.FontStyle]::Regular)
    $grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 116, 139))
    $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(226, 232, 240), 2)

    $y = 820
    for ($i = 1; $i -le 4; $i++) {
        $g.DrawLine($linePen, 110, $y, 970, $y)
        $g.DrawString("Student Academic Record - Term $i", $itemFont, $darkBrush, 130, ($y + 25))
        $g.DrawString("Status: Verified and Recorded", $itemFont, $grayBrush, 130, ($y + 70))
        $y += 140
    }

    $cardFont.Dispose()
    $itemFont.Dispose()
    $darkBrush.Dispose()
    $grayBrush.Dispose()
    $linePen.Dispose()

    $savePath = Join-Path $outDir $filename
    $bmp.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Make-Screen "screenshot_1.png" "Academic Reports" "View marks, report cards, and grades" "#1A237E"
Make-Screen "screenshot_2.png" "Daily Attendance" "Monitor presence, absence, and logs" "#0277BD"
Make-Screen "screenshot_3.png" "Announcements" "Instant school news, circulars & posts" "#00695C"
Make-Screen "screenshot_4.png" "Payments & Invoices" "Track tuition fees and invoice history" "#37474F"

$src.Dispose()
Write-Output "SUCCESS: Created 4 high-res phone screenshots"
