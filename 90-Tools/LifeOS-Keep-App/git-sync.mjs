/**
 * git-sync.mjs — LifeOS Keep Git Auto-Sync
 *
 * Pulls the latest from GitHub, commits any local changes,
 * and pushes back. Designed to run as a Hermes cron job.
 *
 * Environment variables:
 *   GITHUB_PAT — required for auth against GitHub
 *   PERSONAL_DOCS — defaults to ~/source/personal_docs
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const home = process.env.USERPROFILE || process.env.HOME || '.';
const DOCS_ROOT = path.resolve(
  process.env.PERSONAL_DOCS || path.join(home, 'source', 'personal_docs')
);
const REMOTE = process.env.GIT_REMOTE || 'origin';
const BRANCH = process.env.GIT_BRANCH || 'main';
const DATE_STR = new Date().toISOString().split('T')[0];
const TIME_STR = new Date().toTimeString().slice(0, 5);
const COMMIT_MSG = `LifeOS Keep sync ${DATE_STR} ${TIME_STR}`;

const GITHUB_USER = 'Gestalt360';
const GITHUB_REPO = 'personal_docs';

function shell(cmd, fatal = true) {
  try {
    const out = execSync(cmd, { cwd: DOCS_ROOT, timeout: 60000, stdio: 'pipe' });
    return out.toString().trim();
  } catch (e) {
    if (fatal) {
      console.error(`[FATAL] ${e.stderr?.toString() || e.message}`);
      process.exit(1);
    }
    return null;
  }
}

async function main() {
  console.log(`\n[git-sync] LifeOS Keep — Git Sync`);
  console.log(`[git-sync] Target: ${DOCS_ROOT}`);

  // 1. Check GITHUB_PAT
  const pat = process.env.GITHUB_PAT;
  if (!pat || pat.length < 10) {
    console.error(`[git-sync] ❌ GITHUB_PAT is missing or too short. Set it in your environment.`);
    process.exit(1);
  }
  console.log(`[git-sync] ✅ GITHUB_PAT found (${pat.length} chars)`);

  // 2. Ensure the directory exists
  if (!fs.existsSync(DOCS_ROOT)) {
    console.log(`[git-sync] 📁 ${DOCS_ROOT} does not exist. Cloning...`);
    const parent = path.dirname(DOCS_ROOT);
    fs.mkdirSync(parent, { recursive: true });
    const cloneUrl = `https://${pat}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git`;
    shell(`git clone "${cloneUrl}" "${DOCS_ROOT}"`);
    console.log(`[git-sync] ✅ Cloned ${GITHUB_USER}/${GITHUB_REPO}`);
  } else if (!fs.existsSync(path.join(DOCS_ROOT, '.git'))) {
    console.log(`[git-sync] 📁 ${DOCS_ROOT} exists but is not a git repo. Initializing...`);
    shell(`cd "${DOCS_ROOT}" && git init -b ${BRANCH}`);
    const cloneUrl = `https://${pat}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git`;
    shell(`cd "${DOCS_ROOT}" && git remote add ${REMOTE} "${cloneUrl}"`);
    shell(`cd "${DOCS_ROOT}" && git config user.email "lifeos@sipho.dev"`);
    shell(`cd "${DOCS_ROOT}" && git config user.name "LifeOS Keep"`);
    // Pull latest
    shell(`cd "${DOCS_ROOT}" && git pull ${REMOTE} ${BRANCH} --rebase --autostash`, false);
    console.log(`[git-sync] ✅ Repo initialized`);
  }

  // 3. Configure git identity and credentials for this session
  shell(`cd "${DOCS_ROOT}" && git config user.email "lifeos@sipho.dev"`);
  shell(`cd "${DOCS_ROOT}" && git config user.name "LifeOS Keep"`);
  shell(`cd "${DOCS_ROOT}" && git config credential.helper '!f() { echo "password=${pat}"; }; f'`);

  // 4. Check if remote exists
  const remotes = shell(`cd "${DOCS_ROOT}" && git remote`);
  if (!remotes?.includes(REMOTE)) {
    const cloneUrl = `https://${pat}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git`;
    shell(`cd "${DOCS_ROOT}" && git remote add ${REMOTE} "${cloneUrl}"`);
  }

  // 5. Pull latest
  console.log(`[git-sync] ⬇️  Pulling latest from ${REMOTE}/${BRANCH}...`);
  const pullResult = shell(`cd "${DOCS_ROOT}" && git pull ${REMOTE} ${BRANCH} --rebase --autostash`, false);
  if (pullResult === null) {
    console.warn(`[git-sync] ⚠️  Pull failed. Continuing with local state.`);
  } else {
    console.log(`[git-sync] ✅ Pulled latest changes`);
  }

  // 6. Check for changes
  const status = shell(`cd "${DOCS_ROOT}" && git status --porcelain`, false);
  if (!status) {
    console.log(`[git-sync] ✅ Everything up to date. Nothing to commit.`);
    return;
  }

  const lines = status.split('\n').filter(l => l.trim());
  if (lines.length === 0) {
    console.log(`[git-sync] ✅ Everything up to date. Nothing to commit.`);
    return;
  }

  console.log(`[git-sync] 📝 ${lines.length} file(s) changed:`);
  lines.slice(0, 10).forEach(l => console.log(`  ${l}`));
  if (lines.length > 10) console.log(`  ... and ${lines.length - 10} more`);

  // 7. Stage, commit, push
  shell(`cd "${DOCS_ROOT}" && git add -A`);
  shell(`cd "${DOCS_ROOT}" && git commit -m "${COMMIT_MSG}"`, false);
  console.log(`[git-sync] ✅ Committed: "${COMMIT_MSG}"`);

  console.log(`[git-sync] ⬆️  Pushing to ${REMOTE}/${BRANCH}...`);
  const pushResult = shell(`cd "${DOCS_ROOT}" && git push ${REMOTE} ${BRANCH}`, false);

  if (pushResult === null) {
    console.log(`[git-sync] 🔄 Push failed. Pulling latest and retrying...`);
    shell(`cd "${DOCS_ROOT}" && git pull ${REMOTE} ${BRANCH} --rebase --autostash`);
    const retry = shell(`cd "${DOCS_ROOT}" && git push ${REMOTE} ${BRANCH}`, false);
    if (retry === null) {
      console.error(`[git-sync] ❌ Push failed after retry. Manual intervention may be needed.`);
    } else {
      console.log(`[git-sync] ✅ Push successful on retry.`);
    }
  } else {
    console.log(`[git-sync] ✅ Push successful.`);
  }

  console.log(`[git-sync] ✅ Sync complete as of ${DATE_STR} ${TIME_STR}`);
}

main().catch(e => {
  console.error(`[git-sync] Fatal:`, e.message);
  process.exit(1);
});
