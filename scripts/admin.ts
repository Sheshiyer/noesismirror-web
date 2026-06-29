#!/usr/bin/env npx tsx
/**
 * admin.ts
 * Terminal-first admin CLI for the Noesis Mirror project.
 *
 * Usage:
 *   npx tsx scripts/admin.ts persons
 *   npx tsx scripts/admin.ts world <personId>
 *   npx tsx scripts/admin.ts grants <email>
 *   npx tsx scripts/admin.ts grant <email> <personId>
 *   npx tsx scripts/admin.ts --help
 *   npx tsx scripts/admin.ts --reference
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/* ─────────────────────────── Configuration ─────────────────────────── */

const API_URL = process.env.API_URL ?? 'http://localhost:8787';

/** Load ADMIN_SECRET from process.env or a local .env file. */
function loadAdminSecret(): string | undefined {
  if (process.env.ADMIN_SECRET) {
    return process.env.ADMIN_SECRET;
  }

  // Try local .env files (project root and scripts/)
  const candidates = ['.env', join('scripts', '.env')];
  for (const file of candidates) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^ADMIN_SECRET=(.*)$/);
        if (match) {
          const value = match[1].trim();
          // Remove surrounding quotes if present
          const secret = value.replace(/^["'](.*)["']$/, '$1');
          process.env.ADMIN_SECRET = secret;
          return secret;
        }
      }
    }
  }

  return undefined;
}

/* ─────────────────────────── Helpers ───────────────────────────────── */

/** Print an error object to stderr and exit with code 1. */
function die(message: string): never {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

/** Perform an authenticated fetch against the admin API. */
async function apiFetch(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const url = `${API_URL}${path}`;
  const headers: Record<string, string> = {
    'X-Admin-Token': process.env.ADMIN_SECRET!,
    Accept: 'application/json',
  };

  const init: RequestInit = {
    method,
    headers,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    die(`Request failed: ${msg}`);
  }

  let data: unknown;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const errorMsg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : `HTTP ${response.status}`;
    die(`API error: ${errorMsg}`);
  }

  return data;
}

/* ─────────────────────────── Commands ──────────────────────────────── */

async function cmdPersons(): Promise<void> {
  const data = await apiFetch('GET', '/api/admin/persons');
  console.log(JSON.stringify(data));
}

async function cmdWorld(personId: string): Promise<void> {
  const data = await apiFetch('GET', `/api/admin/world/${encodeURIComponent(personId)}`);
  console.log(JSON.stringify(data));
}

async function cmdGrants(email: string): Promise<void> {
  const data = await apiFetch('GET', `/api/admin/grants/${encodeURIComponent(email)}`);
  console.log(JSON.stringify(data));
}

async function cmdGrant(email: string, personId: string): Promise<void> {
  const data = await apiFetch('POST', '/api/admin/grants', { email, personId });
  console.log(JSON.stringify(data));
}

/* ─────────────────────────── Help & Reference ──────────────────────── */

function printHelp(): void {
  console.log(
    JSON.stringify({
      description: 'Noesis Mirror Admin CLI',
      usage: 'npx tsx scripts/admin.ts <command> [args]',
      commands: [
        {
          command: 'persons',
          description: 'List all person IDs',
          example: 'npx tsx scripts/admin.ts persons',
        },
        {
          command: 'world <personId>',
          description: 'Fetch world config for a person',
          example: 'npx tsx scripts/admin.ts world harshita',
        },
        {
          command: 'grants <email>',
          description: 'List grants for an email',
          example: 'npx tsx scripts/admin.ts grants sheshnarayan.iyer@gmail.com',
        },
        {
          command: 'grant <email> <personId>',
          description: 'Grant access to a person for an email',
          example: 'npx tsx scripts/admin.ts grant sheshnarayan.iyer@gmail.com harshita',
        },
      ],
      flags: [
        { flag: '--help', description: 'Show this help message' },
        { flag: '--reference', description: 'Print JSON schema of all commands' },
      ],
      environment: {
        ADMIN_SECRET: 'Admin token (required). Read from env or .env file.',
        API_URL: `API base URL. Default: ${API_URL}`,
      },
    }),
  );
}

function printReference(): void {
  console.log(
    JSON.stringify({
      schema: {
        commands: {
          persons: {
            method: 'GET',
            path: '/api/admin/persons',
            args: [],
            output: { type: 'array', items: { type: 'string' } },
          },
          world: {
            method: 'GET',
            path: '/api/admin/world/{personId}',
            args: [
              { name: 'personId', type: 'string', required: true },
            ],
            output: { type: 'object' },
          },
          grants: {
            method: 'GET',
            path: '/api/admin/grants/{email}',
            args: [
              { name: 'email', type: 'string', required: true },
            ],
            output: { type: 'array', items: { type: 'string' } },
          },
          grant: {
            method: 'POST',
            path: '/api/admin/grants',
            args: [
              { name: 'email', type: 'string', required: true },
              { name: 'personId', type: 'string', required: true },
            ],
            body: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                personId: { type: 'string' },
              },
            },
            output: { type: 'object' },
          },
        },
        headers: {
          'X-Admin-Token': { required: true, source: 'ADMIN_SECRET' },
        },
        env: {
          ADMIN_SECRET: { type: 'string', required: true },
          API_URL: { type: 'string', default: 'http://localhost:8787' },
        },
      },
    }),
  );
}

/* ─────────────────────────── Entry Point ───────────────────────────── */

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  // Handle flags first (these do NOT require ADMIN_SECRET)
  const command = args[0];
  
  if (command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === '--reference') {
    printReference();
    process.exit(0);
  }

  // Load admin secret before running commands
  const secret = loadAdminSecret();
  if (!secret) {
    die('ADMIN_SECRET is not set. Provide it via process.env.ADMIN_SECRET or a .env file.');
  }

  // Dispatch commands
  void (async (): Promise<void> => {
    switch (command) {
      case 'persons':
        if (args.length !== 1) die('Usage: npx tsx scripts/admin.ts persons');
        await cmdPersons();
        break;

      case 'world':
        if (args.length !== 2) die('Usage: npx tsx scripts/admin.ts world <personId>');
        await cmdWorld(args[1]);
        break;

      case 'grants':
        if (args.length !== 2) die('Usage: npx tsx scripts/admin.ts grants <email>');
        await cmdGrants(args[1]);
        break;

      case 'grant':
        if (args.length !== 3) die('Usage: npx tsx scripts/admin.ts grant <email> <personId>');
        await cmdGrant(args[1], args[2]);
        break;

      default:
        die(`Unknown command: ${command}. Use --help for usage.`);
    }
  })();
}

main();
