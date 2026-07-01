#!/usr/bin/env npx tsx
/**
 * noesis-sync.ts
 * CLI tool to sync premium assets to R2 bucket
 * 
 * Usage: npx tsx scripts/noesis-sync.ts <personId> [--dry-run] [--preflight-only]
 * Example: npm run sync -- harshita --dry-run
 */

import { spawnSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const PREMIUM_ASSETS_BASE = '/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/.premium-assets';
const R2_BUCKET = 'noesis-packs';
const REQUIRED_PUBLIC_FILES = [
  'manifest.json',
  'audio/deep-dive-long.mp3',
  'video/video-brief.mp4',
  'reports/briefing.md',
  'reports/study-guide.md',
  'quiz/quiz.md',
  'flashcards/flashcards.md',
  'slide-decks/detailed.pdf',
  'slide-decks/preview.pdf',
  'slide-decks/vimshottari-timeline.pdf',
];

interface SyncOptions {
  dryRun: boolean;
  preflightOnly: boolean;
}

interface SyncResult {
  uploaded: string[];
  failed: string[];
  skipped: string[];
}

interface PreflightResult {
  files: string[];
  missing: string[];
  warnings: string[];
  totalBytes: number;
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath: string, basePath: string = dirPath): string[] {
  const files: string[] = [];
  
  const entries = readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name === 'local') {
        console.log(`  Skipping local/ directory (local-only files)`);
        continue;
      }
      if (entry.name.startsWith('.')) {
        continue;
      }
      files.push(...getAllFiles(fullPath, basePath));
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.')) {
        continue;
      }
      const relativePath = relative(basePath, fullPath);
      files.push(relativePath);
    }
  }
  
  return files.sort((a, b) => a.localeCompare(b));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function validateManifest(sourcePath: string, personId: string): string | null {
  const manifestPath = join(sourcePath, 'manifest.json');

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { personId?: unknown };
    if (manifest.personId !== personId) {
      return `manifest.json personId is ${String(manifest.personId)} instead of ${personId}`;
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `manifest.json could not be parsed: ${message}`;
  }
}

function runPreflight(sourcePath: string, personId: string): PreflightResult {
  const files = getAllFiles(sourcePath);
  const fileSet = new Set(files);
  const missing = REQUIRED_PUBLIC_FILES.filter((file) => !fileSet.has(file));
  const warnings: string[] = [];
  const manifestError = validateManifest(sourcePath, personId);
  const mindMaps = files.filter((file) => file.startsWith('mind-map/') && file.endsWith('.json'));

  if (manifestError) {
    missing.push('manifest.json valid personId');
    warnings.push(manifestError);
  }

  if (mindMaps.length === 0) {
    missing.push('mind-map/*.json');
  } else if (mindMaps.length > 1) {
    warnings.push(`multiple mind maps found; API will pick ${mindMaps.sort()[0]}`);
  }

  const totalBytes = files.reduce((total, file) => total + statSync(join(sourcePath, file)).size, 0);

  return {
    files,
    missing,
    warnings,
    totalBytes,
  };
}

function printPreflight(preflight: PreflightResult): void {
  console.log(`Found ${preflight.files.length} uploadable files (${formatBytes(preflight.totalBytes)}):\n`);
  preflight.files.forEach((file) => console.log(`  - ${file}`));

  if (preflight.warnings.length > 0) {
    console.log('\nWarnings:');
    preflight.warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  if (preflight.missing.length > 0) {
    console.log('\nMissing required public assets:');
    preflight.missing.forEach((file) => console.log(`  - ${file}`));
  }
}

/**
 * Upload a single file to R2
 */
function uploadFile(personId: string, sourcePath: string, relativePath: string): boolean {
  const r2Key = `${personId}/${relativePath}`;
  const filePath = join(sourcePath, relativePath);
  
  try {
    const result = spawnSync('wrangler', [
      'r2',
      'object',
      'put',
      `${R2_BUCKET}/${r2Key}`,
      '--file',
      filePath,
      '--remote',
    ], {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      const message = result.stderr || result.stdout || `wrangler exited ${result.status}`;
      console.error(`    Error: ${message.trim()}`);
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`    Error: ${errorMessage}`);
    return false;
  }
}

/**
 * Main sync function
 */
function syncPerson(personId: string, options: SyncOptions): SyncResult {
  const result: SyncResult = {
    uploaded: [],
    failed: [],
    skipped: [],
  };
  
  const sourcePath = join(PREMIUM_ASSETS_BASE, personId);
  
  // Validate source directory exists
  if (!existsSync(sourcePath)) {
    console.error(`Error: Source directory not found: ${sourcePath}`);
    process.exit(1);
  }
  
  // Validate manifest.json exists
  const manifestPath = join(sourcePath, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`Error: manifest.json not found in ${sourcePath}`);
    process.exit(1);
  }
  
  console.log(`\nSyncing premium assets for: ${personId}`);
  console.log(`Source: ${sourcePath}`);
  console.log(`Destination: r2://${R2_BUCKET}/${personId}/\n`);
  
  const preflight = runPreflight(sourcePath, personId);
  printPreflight(preflight);

  if (preflight.missing.length > 0) {
    console.error('\nPreflight failed; no files were uploaded.');
    process.exit(1);
  }

  if (options.dryRun || options.preflightOnly) {
    const label = options.preflightOnly ? 'Preflight complete' : 'Dry run complete';
    console.log(`\n${label}; no files were uploaded.`);
    return result;
  }
  
  // Upload each file
  for (const file of preflight.files) {
    process.stdout.write(`  Uploading ${file}... `);
    
    const success = uploadFile(personId, sourcePath, file);
    
    if (success) {
      console.log('done');
      result.uploaded.push(file);
    } else {
      console.log('FAILED');
      result.failed.push(file);
    }
  }
  
  return result;
}

function parseArgs(args: string[]): { personId: string | null; options: SyncOptions; help: boolean } {
  const options: SyncOptions = {
    dryRun: false,
    preflightOnly: false,
  };
  let personId: string | null = null;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      return { personId, options, help: true };
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--preflight-only') {
      options.preflightOnly = true;
      continue;
    }
    if (arg.startsWith('-')) {
      console.error(`Error: Unknown option ${arg}`);
      process.exit(1);
    }
    if (personId) {
      console.error(`Error: Unexpected extra argument ${arg}`);
      process.exit(1);
    }
    personId = arg;
  }

  return { personId, options, help: false };
}

function printUsage(): void {
  console.error('Usage: npx tsx scripts/noesis-sync.ts <personId> [--dry-run] [--preflight-only]');
  console.error('Example: npm run sync -- harshita --dry-run');
}

/**
 * CLI entry point
 */
function main(): void {
  const { personId, options, help } = parseArgs(process.argv.slice(2));
  
  if (help) {
    printUsage();
    process.exit(0);
  }

  // Basic validation
  if (!personId) {
    printUsage();
    console.error('Error: Invalid personId');
    process.exit(1);
  }
  
  // Run sync
  const result = syncPerson(personId, options);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`${options.dryRun || options.preflightOnly ? 'Preflight' : 'Sync'} complete for ${personId}`);
  console.log(`  Uploaded: ${result.uploaded.length} files`);
  console.log(`  Skipped: ${result.skipped.length} files`);
  
  if (result.failed.length > 0) {
    console.log(`  Failed: ${result.failed.length} files`);
    console.log('\nFailed files:');
    result.failed.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }
  
  if (!options.dryRun && !options.preflightOnly) {
    console.log(`\nSynced ${result.uploaded.length} files for ${personId}`);
  }
}

main();
