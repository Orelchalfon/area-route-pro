// Supabase REST plumbing shared by the customer-cleanup scripts.
// Uses the secret key from .env (RLS restricts writes), so these run from the
// command line without dashboard access. Read-only unless a script asks to write.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
export const repo = join(__dir, '..');
export const OUT_DIR = join(repo, 'scripts', 'import', 'out');

function readEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(join(repo, file), 'utf8')
        .split(/\r?\n/)
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...readEnv('.env'), ...process.env };
const URL_BASE = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY (checked .env and the environment).');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function request(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  }
  return res;
}

/** Page through a table 1000 rows at a time (mirrors useCustomers.ts:153-186). */
export async function fetchAll(table, select, query = '') {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const q = `${table}?select=${select}${query}&order=id&offset=${offset}&limit=1000`;
    const batch = await (await request(q)).json();
    out.push(...batch);
    if (batch.length < 1000) return out;
  }
}

export async function patchRow(table, id, body) {
  await request(`${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

export async function deleteRow(table, id) {
  await request(`${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
}

/** Re-insert whole rows, preserving their ids so embedded job_key uuids stay valid. */
export async function insertRows(table, rows) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 200) {
    await request(table, {
      method: 'POST',
      headers: { Prefer: 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify(rows.slice(i, i + 200)),
    });
  }
}

export const stamp = () =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

export function writeOut(name, contents) {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, name);
  writeFileSync(path, contents, 'utf8');
  return path;
}

/** UTF-8 BOM so Excel opens the Hebrew columns right-to-left instead of as mojibake. */
export function writeCsv(name, header, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  return writeOut(name, `﻿${body}\r\n`);
}

export function readCsvFile(path) {
  return readFileSync(path, 'utf8');
}

/**
 * The undo a transaction cannot give you after commit: the full prior row for
 * everything about to change or be deleted. Written BEFORE the first write.
 */
export function writeSnapshot(name, payload) {
  return writeOut(name, JSON.stringify(payload, null, 2));
}

export function loadSnapshot(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
