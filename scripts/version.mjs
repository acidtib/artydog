// Shared version rewriting. Every manifest that carries the app version has
// to move together or the bundler and the updater disagree about what is
// installed.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function run(command, args) {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

/// Rewrites the first `version` field only: dependency versions further down
/// these files must not be touched.
function replaceFirst(path, pattern, replacement) {
  const file = join(ROOT, path);
  const before = readFileSync(file, "utf8");
  const after = before.replace(pattern, replacement);
  if (after === before) {
    throw new Error(`no version field matched in ${path}`);
  }
  writeFileSync(file, after);
}

export function currentVersion() {
  return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
}

export function setVersion(version) {
  replaceFirst("package.json", /"version": "[^"]+"/, `"version": "${version}"`);
  replaceFirst("src-tauri/tauri.conf.json", /"version": "[^"]+"/, `"version": "${version}"`);
  replaceFirst("src-tauri/Cargo.toml", /^version = "[^"]+"$/m, `version = "${version}"`);
  run("cargo", ["update", "--manifest-path", "src-tauri/Cargo.toml", "-p", "artydog"]);
}
