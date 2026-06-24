#!/usr/bin/env node
// Analyze source file sizes and flag files over a line threshold.
//
// Usage:
//   node .claude/skills/senior-refactor/scripts/analyze-file-sizes.mjs
//   node .claude/skills/senior-refactor/scripts/analyze-file-sizes.mjs --threshold 250
//   node .claude/skills/senior-refactor/scripts/analyze-file-sizes.mjs --json
//
// Scans common source roots, ignores build/vendor dirs, and lists files over
// the threshold sorted by line count (descending). Marks likely component
// files (.tsx/.jsx) vs likely logic files (.ts/.js).

import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const THRESHOLD = Number(getFlag("--threshold", "300"));
const AS_JSON = args.includes("--json");

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "app", "pages", "components", "lib", "hooks", "utils", "features"];
const IGNORE_DIRS = new Set([
  "node_modules", ".next", "dist", "build", "coverage", ".git",
  ".turbo", ".vercel", "out", ".cache", ".vite",
]);
const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const COMPONENT_EXT = new Set([".tsx", ".jsx"]);

/** Recursively collect source files under a directory. */
async function walk(dir, acc) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") {
      if (IGNORE_DIRS.has(entry.name)) continue;
    }
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (entry.isFile() && SOURCE_EXT.has(path.extname(entry.name))) {
      acc.push(full);
    }
  }
  return acc;
}

async function countLines(file) {
  const content = await readFile(file, "utf8");
  if (content.length === 0) return 0;
  // Count newlines + 1 for the trailing line without a newline.
  let lines = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) lines++;
  }
  // If file ends with newline, the last counted "line" is empty.
  if (content.charCodeAt(content.length - 1) === 10) lines--;
  return lines;
}

function classify(ext) {
  if (COMPONENT_EXT.has(ext)) return "component";
  return "logic";
}

async function main() {
  // Pick scan roots that actually exist; fall back to repo root if none match.
  const roots = SCAN_DIRS
    .map((d) => path.join(ROOT, d))
    .filter((p) => existsSync(p));
  const scanRoots = roots.length > 0 ? roots : [ROOT];

  const files = [];
  const seen = new Set();
  for (const root of scanRoots) {
    const found = await walk(root, []);
    for (const f of found) {
      if (!seen.has(f)) {
        seen.add(f);
        files.push(f);
      }
    }
  }

  const rows = [];
  for (const file of files) {
    try {
      const s = await stat(file);
      if (!s.isFile()) continue;
      const lines = await countLines(file);
      if (lines >= THRESHOLD) {
        const ext = path.extname(file);
        rows.push({
          file: path.relative(ROOT, file).split(path.sep).join("/"),
          lines,
          kind: classify(ext),
        });
      }
    } catch {
      /* ignore unreadable files */
    }
  }

  rows.sort((a, b) => b.lines - a.lines);

  if (AS_JSON) {
    console.log(JSON.stringify({ threshold: THRESHOLD, count: rows.length, files: rows }, null, 2));
    return;
  }

  console.log(`\nFiles >= ${THRESHOLD} lines (scanned: ${scanRoots.map((r) => path.relative(ROOT, r) || ".").join(", ")})\n`);
  if (rows.length === 0) {
    console.log("  None. Codebase is within the line threshold. ✅\n");
    return;
  }

  const w = Math.max(...rows.map((r) => r.file.length), 4);
  console.log(`  ${"LINES".padStart(6)}  ${"KIND".padEnd(9)}  FILE`);
  console.log(`  ${"-".repeat(6)}  ${"-".repeat(9)}  ${"-".repeat(w)}`);
  for (const r of rows) {
    const mark = r.kind === "component" ? "⚛ component" : "⚙ logic";
    console.log(`  ${String(r.lines).padStart(6)}  ${mark.padEnd(11)}  ${r.file}`);
  }
  console.log(`\n  ${rows.length} file(s) over threshold. Largest first.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
