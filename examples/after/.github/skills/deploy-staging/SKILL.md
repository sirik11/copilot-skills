---
name: deploy-staging
description: Deploys the current branch to the staging environment and posts the URL. Use when asked to deploy, ship, or put a branch on staging.
disable-model-invocation: true
---
Run [scripts/deploy.sh](scripts/deploy.sh) with the branch name, then post the staging URL.
Copilot asks before running it, because this skill does not pre-approve the shell.
