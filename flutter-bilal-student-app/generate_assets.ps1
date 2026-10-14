Add-Type -AssemblyName System.Drawing

$logoPath = "C:\Users\hp\Desktop\v.2\SCHOOLS\SCHOOLS\FlutterIQRA\assets\images\logo.png"
$outDir = "C:\Users\hp\Desktop\v.2\SCHOOLS\SCHOOLS\FlutterIQRA\play_store_assets"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

# 1. Generate 512x512 App Icon
$src = [System.Drawing.Image]::FromFile($logoPath)
$icon = New-Object System.Drawing.Bitmap(512, 512)
$gIcon = [System.Drawing.Graphics]::FromImage($icon)
$gIcon.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gIcon.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gIcon.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gIcon.Clear([System.Drawing.Color]::White)
$gIcon.DrawImage($src, 16, 16, 480, 480)
$iconPath = Join-Path $outDir "app_icon_512x512.png"
$icon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$gIcon.Dispose()
$icon.Dispose()

# 2. Generate 1024x500 Feature Graphic
$feat = New-Object System.Drawing.Bitmap(1024, 500)
$gFeat = [System.Drawing.Graphics]::FromImage($feat)
$gFeat.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFeat.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(1024, 500)),
    ([System.Drawing.Color]::FromArgb(26, 35, 126)),
    ([System.Drawing.Color]::FromArgb(15, 23, 42))
)
$gFeat.FillRectangle($brush, 0, 0, 1024, 500)
$brush.Dispose()

$logoSize = 320
$logoX = 80
$logoY = 90
$cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$gFeat.FillEllipse($cardBrush, $logoX, $logoY, $logoSize, $logoSize)
$cardBrush.Dispose()
$gFeat.DrawImage($src, ($logoX + 20), ($logoY + 20), ($logoSize - 40), ($logoSize - 40))

$fontTitle = New-Object System.Drawing.Font("Arial", 42, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Regular)
$textBrushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$textBrushGold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 215, 0))

$gFeat.DrawString("IQRA PARENT", $fontTitle, $textBrushGold, 440, 160)
$gFeat.DrawString("Guardian Portal & Student Tracking", $fontSub, $textBrushWhite, 440, 240)

$featPath = Join-Path $outDir "feature_graphic_1024x500.png"
$feat.Save($featPath, [System.Drawing.Imaging.ImageFormat]::Png)

$gFeat.Dispose()
$fontTitle.Dispose()
$fontSub.Dispose()
$textBrushWhite.Dispose()
$textBrushGold.Dispose()
$feat.Dispose()
$src.Dispose()

Write-Output "SUCCESS: Created $iconPath and $featPath"
