# push_to_github.ps1
# Usage: run this in PowerShell from the repo root (or double-click in Explorer)
# It will initialize git if needed, configure the remote, add, commit and push.
# Authentication: for HTTPS, provide your GitHub username and a Personal Access Token (PAT) as the password when prompted.

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $repoRoot

Write-Host "Working in: $repoRoot"

if (-not (Test-Path -Path ".git")) {
    Write-Host "Initializing git repository..."
    git init
} else {
    Write-Host "Git repo already initialized."
}

$defaultRemote = "https://github.com/HassanBaig007/Investor_app.git"
try {
    $existing = git remote get-url origin 2>$null
} catch {
    $existing = $null
}

if ($existing) {
    Write-Host "Existing 'origin' remote: $existing"
    $ans = Read-Host "Overwrite remote 'origin' with $defaultRemote? (y/N)"
    if ($ans -match '^[Yy]') {
        git remote remove origin
        git remote add origin $defaultRemote
        Write-Host "Remote 'origin' set to $defaultRemote"
    } else {
        Write-Host "Keeping existing remote 'origin'."
    }
} else {
    git remote add origin $defaultRemote
    Write-Host "Remote 'origin' added: $defaultRemote"
}

Write-Host "Staging all files..."
git add .

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "No changes staged. Skipping commit."
} else {
    $msg = Read-Host "Commit message (press Enter for default)"
    if (-not $msg) { $msg = "Initial commit: upload full project" }
    git commit -m "$msg"
}

# Ensure branch name
git branch -M main 2>$null

Write-Host "Pushing to origin main (you may be prompted for credentials)..."
git push -u origin main

Write-Host "Done. If push failed due to authentication, create a GitHub Personal Access Token and use it as your password for HTTPS, or set up SSH keys and change the remote to git@github.com:HassanBaig007/Investor_app.git."