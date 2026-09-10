#!/usr/bin/env node
// Stamps a unique prerelease version onto a bleeding-edge build so each one
// is identifiable and sorts below the next stable release. CI only; it
// rewrites manifests without committing.
//
//   node scripts/stamp.mjs <short-sha>

import { currentVersion, setVersion } from "./version.mjs";

const sha = process.argv[2];

if (sha === undefined || !/^[0-9a-f]{7,40}$/.test(sha)) {
  console.error("usage: node scripts/stamp.mjs <short-sha>");
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
// The "g" prefix keeps the identifier from being read as a number, which a
// leading zero would make invalid semver.
const version = `${currentVersion()}-dev.${date}.g${sha.slice(0, 7)}`;

setVersion(version);
console.log(version);
