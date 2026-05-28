# Run from project root when styles break: .\scripts\fix-utf8.ps1
$utf8 = New-Object System.Text.UTF8Encoding $false
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$extensions = @(".ts", ".tsx", ".css", ".json", ".mjs")

Get-ChildItem -Path $root -Recurse -File |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\|\\.next\\" -and ($extensions -contains $_.Extension)
  } |
  ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $isUtf16Bom = $bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE
    $isUtf16Le = $bytes.Length -ge 4 -and $bytes[1] -eq 0 -and $bytes[0] -ne 0
    if ($isUtf16Bom -or $isUtf16Le) {
      $content = if ($isUtf16Bom) {
        [System.Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2)
      } else {
        [System.Text.Encoding]::Unicode.GetString($bytes)
      }
      [System.IO.File]::WriteAllText($_.FullName, $content, $utf8)
      Write-Host "Fixed: $($_.Name)"
    }
  }

Write-Host "Done. Delete .next and run: npm run dev"
