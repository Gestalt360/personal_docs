/**
 * LifeOS Keep — GitHub Sync Script
 * 
 * Syncs all notes as Markdown files to a GitHub repository.
 * Uses environment variable GITHUB_PAT for authentication.
 * 
 * Usage:
 *   node git-sync.mjs <github_repo_url> <local_clone_path>
 * 
 * Example:
 *   node git-sync.mjs https://github.com/Gestalt360/lifeos-keep-notes.git ./GitHub-Keep-Notes
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { NoteStore } from './electron/db.js';

async function main() {
  const repoUrl = process.argv[2];
  const clonePath = process.argv[3];
  
  if (!repoUrl || !clonePath) {
    console.error('Usage: node git-sync.mjs <github_repo_url> <local_clone_path>');
    console.error('Example: node git-sync.mjs https://github.com/Gestalt360/lifeos-keep-notes.git ./GitHub-Keep-Notes');
    process.exit(1);
  }

  const resolvedClonePath = path.resolve(clonePath);
  const notesExportPath = path.join(resolvedClonePath, 'LifeOS-Keep-Notes');
  
  // Ensure export directory exists
  fs.mkdirSync(notesExportPath, { recursive: true });

  // Initialize or update the git repo
  if (!fs.existsSync(path.join(resolvedClonePath, '.git'))) {
    console.log(`Cloning repository ${repoUrl}...`);
    const cloneResult = spawnSync('git', ['clone', repoUrl, resolvedClonePath], { stdio: 'pipe' });
    if (cloneResult.error || cloneResult.status !== 0) {
      console.error('Failed to clone repository:', cloneResult.error || cloneResult.stderr.toString());
      process.exit(1);
    }
    console.log('✓ Repository cloned');
  } else {
    console.log(`Fetching latest changes...`);
    const fetchResult = spawnSync('git', ['fetch', 'origin'], { cwd: resolvedClonePath, stdio: 'pipe' });
    if (fetchResult.error || fetchResult.status !== 0) {
      console.error('Failed to fetch:', fetchResult.error || fetchResult.stderr.toString());
      process.exit(1);
    }
    
    const resetResult = spawnSync('git', ['reset', '--hard', 'origin/main'], { cwd: resolvedClonePath, stdio: 'pipe' });
    if (resetResult.error || resetResult.status !== 0) {
      console.error('Failed to reset to origin/main:', resetResult.error || resetResult.stderr.toString());
      process.exit(1);
    }
    console.log('✓ Repository updated');
  }

  // Export notes as markdown
  const store = new NoteStore();
  await new Promise(resolve => setTimeout(resolve, 200)); // wait for DB init
  
  try {
    await store.exportToMarkdown(notesExportPath);
    console.log(`✓ Exported ${store.getAll().length} notes to ${notesExportPath}`);
  } catch (error) {
    console.error('✗ Failed to export notes:', (error as Error).message);
    process.exit(1);
  }

  // Git add, commit, push
  console.log('Staging changes...');
  const addResult = spawnSync('git', ['add', '.'], { cwd: resolvedClonePath, stdio: 'pipe' });
  if (addResult.error || addResult.status !== 0) {
    console.error('Failed to git add:', addResult.error || addResult.stderr.toString());
    process.exit(1);
  }

  // Check if there are changes to commit
  const statusResult = spawnSync('git', ['status', '--porcelain'], { cwd: resolvedClonePath, stdio: 'pipe' });
  const hasChanges = statusResult.stdout.toString().trim() !== '';
  
  if (hasChanges) {
    console.log('Committing changes...');
    const commitResult = spawnSync('git', ['commit', '-m', 'Sync LifeOS Keep Notes'], { cwd: resolvedClonePath, stdio: 'pipe' });
    if (commitResult.error || commitResult.status !== 0) {
      console.error('Failed to git commit:', commitResult.error || commitResult.stderr.toString());
      process.exit(1);
    }
    console.log('✓ Changes committed');
    
    console.log('Pushing to GitHub...');
    // Use GITHUB_PAT for authentication if available
    const env = { ...process.env };
    if (process.env.GITHUB_PAT) {
      // Modify remote URL to include PAT for push
      const pushResult = spawnSync('git', ['push'], { 
        cwd: resolvedClonePath, 
        env: {
          ...env,
          GIT_ASKPASS: 'echo',
          GIT_USERNAME: 'Gestalt360', 
          GIT_PASSWORD: process.env.GITHUB_PAT
        },
        stdio: 'pipe'
      });
      
      if (pushResult.error || pushResult.status !== 0) {
        console.error('Failed to push:', pushResult.error || pushResult.stderr.toString());
        process.exit(1);
      }
      console.log('✓ Changes pushed to GitHub');
    } else {
      const pushResult = spawnSync('git', ['push'], { cwd: resolvedClonePath, stdio: 'pipe' });
      if (pushResult.error || pushResult.status !== 0) {
        console.error('Failed to push:', pushResult.error || pushResult.stderr.toString());
        process.exit(1);
      }
      console.log('✓ Changes pushed to GitHub');
    }
  } else {
    console.log('No changes to commit');
  }

  console.log('\nGitHub sync complete.');
}

main().catch(console.error);
