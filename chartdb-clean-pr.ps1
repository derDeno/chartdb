param(
  [string]$BaseBranch = "main",
  [string]$SourceBranch = "dev",
  [string]$NewBranchPrefix = "dev-to-main-no-workflows",
  [string]$PrTitle = "Dev → Main (workflows stripped)",
  [string]$PrBody  = "This PR was generated from dev while dropping .github/workflows changes."
)

# Fail on errors
$ErrorActionPreference = "Stop"

git fetch origin

git switch $SourceBranch
git pull --ff-only

$runId = [string](Get-Date -Format "yyyyMMddHHmmss")
$newBranch = "$NewBranchPrefix-$runId"

git switch -c $newBranch

# Make sure we have latest main
git fetch origin $BaseBranch:`refs/remotes/origin/$BaseBranch`

# 1) Remove all workflow files coming from dev
git rm -r --quiet --ignore-unmatch .github/workflows 2>$null

# 2) Restore main’s versions (if any)
git checkout origin/$BaseBranch -- .github/workflows 2>$null

# 3) Stage and commit only if there are changes
git add -A .github/workflows 2>$null
$hasStaged = (git diff --cached --quiet); $exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
  git commit -m "Drop workflow changes for main (restore from origin/$BaseBranch)"
} else {
  Write-Host "No workflow diffs to commit."
}

# Push branch
git push -u origin $newBranch

# Create PR (requires GitHub CLI `gh` and you logged in: gh auth login)
gh pr create --base $BaseBranch --head $newBranch --title $PrTitle --body $PrBody
