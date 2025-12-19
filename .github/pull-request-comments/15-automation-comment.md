Automated dependency remediation and migration summary

- Branch: `fix/dependabot-updates`
- Action: Ran `npm install --legacy-peer-deps` and `npm audit fix --force` on branch; no remaining local vulnerabilities were found by `npm audit`.
- Notes: GitHub security still reports alerts for the default branch — please open a PR from `fix/dependabot-updates` to `main` (link: https://github.com/ejderox112/sb1-b88th8qh/pull/new/fix/dependabot-updates) and run CI. If alerts persist in GitHub, update the specific packages `glob`, `jws`, and `js-yaml` (or their parents) and re-run `npm install`.

Automation: This file was added to provide the PR comment text when creating the PR via the web UI or `gh` CLI.

@copilot