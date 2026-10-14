# Clickfield Radar - Automated Database Backup Script (PowerShell)
# Backs up SQLite (or Postgres if configured) into ./backups with 14-day retention.

$BackupDir = Join-Path $PSScriptRoot "..\..\backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$SourceDb = Join-Path $PSScriptRoot "..\radar.db"

if (Test-Path $SourceDb) {
    $TargetFile = Join-Path $BackupDir "radar_sqlite_$Timestamp.db"
    Copy-Item -Path $SourceDb -Destination $TargetFile -Force
    Write-Host "[+] SQLite Database snapshot saved: $TargetFile"
} else {
    Write-Warning "Source database $SourceDb not found."
}

# 14-day retention pruning
$Cutoff = (Get-Date).AddDays(-14)
Get-ChildItem -Path $BackupDir -File | Where-Object { $_.LastWriteTime -lt $Cutoff } | ForEach-Object {
    Write-Host "[!] Pruning expired backup: $($_.Name)"
    Remove-Item $_.FullName -Force
}

Write-Host "[+] Backup completed with 14-day retention policy."
