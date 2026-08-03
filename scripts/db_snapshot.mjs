#!/usr/bin/env node
/**
 * db_snapshot.mjs — take a pg_dump of a Supabase database before a migration.
 *
 * This is the rollback lifeline for the SaaS migration. Every destructive
 * migration (Phase 2c onward) runs immediately after a successful snapshot, no
 * exceptions. If the production project has no PITR, this script is the *only*
 * thing standing between a bad migration and permanent data loss.
 *
 * Usage:
 *   node scripts/db_snapshot.mjs --env prod   --label pre-org-id
 *   node scripts/db_snapshot.mjs --env staging --label pre-backfill
 *   node scripts/db_snapshot.mjs --env prod   --label pre-drop --verify
 *
 * Connection string is read from the environment, never from a flag, so it does
 * not land in shell history:
 *   SUPABASE_DB_URL_PROD     — production pooler/direct connection string
 *   SUPABASE_DB_URL_STAGING  — staging project connection string
 *
 * Get these from: Supabase dashboard -> Project Settings -> Database ->
 * Connection string -> URI. Use the *direct* connection (port 5432), not the
 * transaction pooler (6543) — pg_dump needs session-level features.
 *
 * Output: backups/<env>/<utc-timestamp>__<label>.dump  (custom format, -Fc)
 * Restore with:
 *   pg_restore --clean --if-exists --no-owner --no-privileges \
 *              -d "$SUPABASE_DB_URL_STAGING" backups/prod/<file>.dump
 */

import { execFileSync as run } from "node:child_process";
import { mkdirSync, statSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ENV_VARS = {
  prod: "SUPABASE_DB_URL_PROD",
  staging: "SUPABASE_DB_URL_STAGING",
};

function parseArgs(argv) {
  const args = { env: null, label: null, verify: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--env") args.env = argv[++i];
    else if (a === "--label") args.label = argv[++i];
    else if (a === "--verify") args.verify = true;
    else die(`Unknown argument: ${a}`);
  }
  return args;
}

function die(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

/** Redact the password so a connection string is never echoed in full. */
function redact(url) {
  return url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:****@");
}

function requireTool(name) {
  try {
    run(name, ["--version"], { stdio: "pipe" });
  } catch {
    die(
      `\`${name}\` not found on PATH.\n\n` +
        `    Install the PostgreSQL client tools (v15+, to match the Supabase server;\n` +
        `    an older pg_dump refuses to dump a newer server).\n\n` +
        `    Windows: https://www.postgresql.org/download/windows/ — you only need\n` +
        `    "Command Line Tools", not the server. Then add to PATH:\n` +
        `      C:\\Program Files\\PostgreSQL\\<ver>\\bin\n\n` +
        `    Alternative without installing anything, if Docker Desktop is running:\n` +
        `      npx supabase db dump --db-url "$SUPABASE_DB_URL_PROD" -f backup.sql\n` +
        `    That produces plain SQL rather than a -Fc archive, so it cannot be\n` +
        `    restored selectively and --verify does not apply. Prefer real pg_dump.`
    );
  }
}

const { env, label, verify } = parseArgs(process.argv.slice(2));

if (!env || !ENV_VARS[env]) {
  die(
    `--env must be one of: ${Object.keys(ENV_VARS).join(", ")}\n` +
      `    e.g. node scripts/db_snapshot.mjs --env prod --label pre-org-id`
  );
}
if (!label || !/^[a-z0-9][a-z0-9-]*$/.test(label)) {
  die(
    `--label is required and must be kebab-case (a-z, 0-9, -).\n` +
      `    It goes in the filename and is how you will find this dump in six\n` +
      `    weeks. "pre-org-id" is useful; "backup2" is not.`
  );
}

const envVar = ENV_VARS[env];
const dbUrl = process.env[envVar];
if (!dbUrl) {
  die(
    `${envVar} is not set.\n` +
      `    Supabase dashboard -> Project Settings -> Database -> Connection string\n` +
      `    -> URI. Use the DIRECT connection (port 5432), not the pooler (6543).\n` +
      `    Then:  export ${envVar}='postgresql://postgres:...@...:5432/postgres'`
  );
}

requireTool("pg_dump");
if (verify) requireTool("pg_restore");

const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
const outDir = resolve(process.cwd(), "backups", env);
const outFile = join(outDir, `${stamp}__${label}.dump`);

mkdirSync(outDir, { recursive: true });

console.log(`\n  Snapshotting  ${env}  (${redact(dbUrl)})`);
console.log(`  ->  ${outFile}\n`);

const started = Date.now();
try {
  run(
    "pg_dump",
    [
      dbUrl,
      "--format=custom", // -Fc: compressed, restorable selectively with pg_restore
      "--no-owner", // Supabase roles differ between projects; do not bake ownership in
      "--no-privileges", // GRANTs are recreated by migrations, not by the dump
      "--verbose",
      "--file",
      outFile,
    ],
    { stdio: ["ignore", "inherit", "inherit"] }
  );
} catch {
  die(
    `pg_dump failed. The snapshot is NOT usable — do not run the migration.\n` +
      `    Common causes: wrong port (use 5432 direct, not 6543 pooler), the\n` +
      `    project is paused (free tier pauses after ~7 days idle), or a\n` +
      `    pg_dump version older than the server.`
  );
}

const { size } = statSync(outFile);
const seconds = ((Date.now() - started) / 1000).toFixed(1);

if (size < 1024) {
  die(
    `Dump is only ${size} bytes — almost certainly empty or truncated.\n` +
      `    Treat this as a FAILED snapshot. Do not run the migration.`
  );
}

console.log(`\n  ✓ ${(size / 1024 / 1024).toFixed(1)} MB in ${seconds}s`);

if (verify) {
  // A dump that pg_restore cannot even list its own table of contents for is not
  // a backup. This is cheap and catches truncation that a size check misses.
  console.log(`  Verifying archive is readable...`);
  try {
    const toc = run("pg_restore", ["--list", outFile], { stdio: "pipe" }).toString();
    const tables = (toc.match(/^\d+;.*TABLE DATA/gm) ?? []).length;
    if (tables === 0) die(`Archive lists zero TABLE DATA entries — nothing was captured.`);
    console.log(`  ✓ archive readable, ${tables} tables with data`);
  } catch (err) {
    if (err?.status === 1 && !err.stdout) die(`pg_restore could not read the archive.`);
    throw err;
  }
}

const kept = readdirSync(outDir).filter((f) => f.endsWith(".dump")).length;
console.log(`  ${kept} snapshot(s) now in backups/${env}/\n`);
console.log(`  Restore into staging with:`);
console.log(
  `    pg_restore --clean --if-exists --no-owner --no-privileges \\\n` +
    `      -d "$SUPABASE_DB_URL_STAGING" "${outFile}"\n`
);
