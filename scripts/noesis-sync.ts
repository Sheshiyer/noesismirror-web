#!/usr/bin/env npx tsx
/**
 * noesis-sync.ts
 * CLI tool to sync premium assets to R2 bucket
 * 
 * Usage: npx tsx scripts/noesis-sync.ts <personId>
 * Example: npm run sync harshita
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const PREMIUM_ASSETS_BASE = '/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/.premium-assets';
const R2_BUCKET = 'noesis-packs';

interface SyncResult {
  uploaded: string[];
  failed: string[];
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
      // Skip 'local' directory - those are local-only files
      if (entry.name === 'local') {
        console.log(`  Skipping local/ directory (local-only files)`);
        continue;
      }
      files.push(...getAllFiles(fullPath, basePath));
    } else if (entry.isFile()) {
      // Get relative path from base
      const relativePath = relative(basePath, fullPath);
      files.push(relativePath);
    }
  }
  
  return files;
}

/**
 * Upload a single file to R2
 */
function uploadFile(personId: string, sourcePath: string, relativePath: string): boolean {
  const r2Key = `${personId}/${relativePath}`;
  const filePath = join(sourcePath, relativePath);
  
  try {
    const cmd = `wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${filePath}" --remote`;
    execSync(cmd, { 
      stdio: 'pipe',
      encoding: 'utf-8'
    });
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
function syncPerson(personId: string): SyncResult {
  const result: SyncResult = {
    uploaded: [],
    failed: []
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
  
  // Get all files to upload
  const files = getAllFiles(sourcePath);
  
  console.log(`Found ${files.length} files to sync:\n`);
  
  // Upload each file
  for (const file of files) {
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

/**
 * CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/noesis-sync.ts <personId>');
    console.error('Example: npm run sync harshita');
    process.exit(1);
  }
  
  const personId = args[0];
  
  // Basic validation
  if (!personId || personId.startsWith('-')) {
    console.error('Error: Invalid personId');
    process.exit(1);
  }
  
  // Run sync
  const result = syncPerson(personId);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Sync complete for ${personId}`);
  console.log(`  Uploaded: ${result.uploaded.length} files`);
  
  if (result.failed.length > 0) {
    console.log(`  Failed: ${result.failed.length} files`);
    console.log('\nFailed files:');
    result.failed.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }
  
  console.log(`\nSynced ${result.uploaded.length} files for ${personId}`);
}

main();
