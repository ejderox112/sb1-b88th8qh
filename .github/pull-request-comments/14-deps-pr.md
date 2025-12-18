PR: fix/dependabot-updates

**Summary**: Add latest `npm audit` report and (if needed) updated `package-lock.json` so CI can re-run security scans. This branch was created by automation. Please open a PR on GitHub if it wasn't created automatically.

**What I changed**n- Added `npm-audit-latest.json` and `npm-audit-latest-pretty.json` (audit output)
- Committed `package-lock.json` if npm made changes locally

**Next steps**:
1. Review CI results for this branch.
2. If GitHub still reports vulnerabilities, run `npm update <package>` or update affected package versions manually and commit. 
3. When ready, open a PR from `fix/dependabot-updates` to `main` and request review.

**Note**: I cannot create GitHub comments or PRs directly without an authenticated `gh` CLI or token. The remote already suggests creating the PR here: https://github.com/ejderox112/sb1-b88th8qh/pull/new/fix/dependabot-updates

@copilot