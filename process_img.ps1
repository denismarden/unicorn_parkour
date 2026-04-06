Add-Type -AssemblyName System.Drawing
param (
    [string]$inputFile = "$PSScriptRoot\unicorn_spritesheet_1775014939695.png",
    [string]$outputFile = "$PSScriptRoot\unicorn.png",
    [string]$jsFile = "$PSScriptRoot\unicorn_data.js"
)

Write-Host "Loading image..."
$img = [System.Drawing.Image]::FromFile($inputFile)
$bmp = New-Object System.Drawing.Bitmap($img)
$img.Dispose()

Write-Host "Processing Chroma Key (Green Background)..."
for($x = 0; $x -lt $bmp.Width; $x++) {
    for($y = 0; $y -lt $bmp.Height; $y++) {
        $color = $bmp.GetPixel($x, $y)
        # Chroma key pure or near-pure green background without killing yellow/gold
        if ($color.G -gt 150 -and $color.R -lt 150 -and $color.B -lt 150) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        }
    }
}

Write-Host "Saving transparent PNG..."
$bmp.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Converting to Base64 JS..."
$bytes = [System.IO.File]::ReadAllBytes($outputFile)
$base64 = [System.Convert]::ToBase64String($bytes)
$js = "const unicornData = 'data:image/png;base64," + $base64 + "';"
Set-Content -Path $jsFile -Value $js

Write-Host "Done!"
