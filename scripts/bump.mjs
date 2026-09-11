#!/usr/bin/env node
// Bumps the release version, commits and tags. Pushing is deliberately left
// to the caller: pushing the tag is what publishes a release, so it should be
// a decision rather than a side effect.
//
//   node scripts/bump.mjs patch|minor|major [--dry-run]

import { currentVersion, run, setVersion } from "./version.mjs";

const LEVELS = ["patch", "minor", "major"];
const level = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!LEVELS.includes(level)) {
  console.error(`usage: node scripts/bump.mjs ${LEVELS.join("|")} [--dry-run]`);
  process.exit(1);
}

function bumped(version, level) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (match === null) {
    throw new Error(`cannot bump non-release version "${version}"`);
  }
  const [major, minor, patch] = match.slice(1).map(Number);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

if (run("git", ["status", "--porcelain"]) !== "") {
  console.error("working tree is dirty, commit or stash first");
  process.exit(1);
}

const from = currentVersion();
const version = bumped(from, level);
const tag = `app-v${version}`;

if (run("git", ["tag", "--list", tag]) !== "") {
  console.error(`tag ${tag} already exists`);
  process.exit(1);
}

console.log(`${from} -> ${version}`);
setVersion(version);

if (dryRun) {
  console.log("dry run: manifests rewritten, nothing committed");
  process.exit(0);
}

run("git", ["add", "apps/desktop/package.json", "apps/desktop/src-tauri/tauri.conf.json", "apps/desktop/src-tauri/Cargo.toml", "apps/desktop/src-tauri/Cargo.lock"]);
run("git", ["commit", "-m", `config: bump version to ${version}`]);
run("git", ["tag", tag]);

const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
console.log(`committed and tagged ${tag}`);
console.log(`publish it with: git push origin ${branch} ${tag}`);
