$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$targetPath = "C:\Users\Нитро 5\.gemini\antigravity\scratch\oshxona-pos\start-pos.bat"
$workingDir = "C:\Users\Нитро 5\.gemini\antigravity\scratch\oshxona-pos"
$shortcutPath = Join-Path -Path $desktopPath -ChildPath "Oshxona Kassa.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.WorkingDirectory = $workingDir
$Shortcut.Description = "OshxonaPOS - Restoran Kassa Tizimi"
$Shortcut.IconLocation = "shell32.dll, 21"
$Shortcut.Save()

Write-Host "✅ Ish stoliga yorliq muvaffaqiyatli yaratildi: $shortcutPath"
