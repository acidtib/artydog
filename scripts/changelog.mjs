#!/usr/bin/env node
// Reads and stamps CHANGELOG.md. Entries not yet released sit above the newest
// version heading.
//
//   node scripts/changelog.mjs unreleased
//   node scripts/changelog.mjs section <version>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./version.mjs";

export const CHANGELOG = join(ROOT, "CHANGELOG.md");

const HEADING = /^## ArtyDog (\S+) \((.+)\) ##$/gm;

function headings(text) {
  return [...text.matchAll(HEADING)];
}

export function unreleased(text) {
  const [first] = headings(text);

  return text.slice(0, first?.index ?? text.length).trim();
}

export function section(text, version) {
  const found = headings(text);
  const at = found.findIndex((match) => match[1] === version);

  if (at === -1) {
    throw new Error(`CHANGELOG.md has no section for ${version}`);
  }
  const start = found[at].index + found[at][0].length;
  const end = found[at + 1]?.index ?? text.length;

  return text.slice(start, end).trim();
}

/// Rails spells the day with two digits: "November 07, 2024".
export function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function stamp(text, version, date) {
  if (unreleased(text) === "") {
    throw new Error("CHANGELOG.md has no unreleased entries to release");
  }

  return `## ArtyDog ${version} (${formatDate(date)}) ##\n\n${text.trimStart()}`;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, version] = process.argv.slice(2);
  const text = readFileSync(CHANGELOG, "utf8");

  try {
    if (command === "unreleased") {
      console.log(unreleased(text));
    } else if (command === "section" && version !== undefined) {
      console.log(section(text, version));
    } else {
      console.error("usage: node scripts/changelog.mjs unreleased | section <version>");
      process.exit(1);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
