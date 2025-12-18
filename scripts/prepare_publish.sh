#!/usr/bin/env bash
set -euo pipefail

echo "Preparing repository for publish..."

echo "1) Ensure you have a clean working tree"
git status --porcelain

echo "2) Remove sensitive files from the index (won't delete your local files)"
git rm --cached -r web-build || true
git rm --cached -r logs || true
git rm --cached expo-start.log || true
git rm --cached tmp_bundle_head.txt || true

echo "3) Commit the removals"
git add .gitignore .env.local.example app.json
git commit -m "chore: remove build artifacts and redact secrets before publish" || true

echo "4) (Optional) Remove secrets from history (recommended for previously-committed secrets)"
echo "   Use 'git filter-repo' or the BFG Repo-Cleaner. Example with git filter-repo (must be installed):"
echo "   git filter-repo --path web-build --path logs --invert-paths"
echo "   OR: bfg --delete-files web-build --delete-files logs"

echo "5) Push to remote origin (create remote first if needed)"
echo "   git remote add origin https://github.com/<user>/<repo>.git"
echo "   git push -u origin main"

echo "Done. Make sure .env.local is listed in .gitignore and do NOT push it."
