#!/usr/bin/env node
// Writes the rendered page into dist/index.html after the client build, so
// crawlers and link previews that do not run JavaScript still see the content.
// The client then hydrates that markup.

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "dist/index.html");
const SERVER = join(ROOT, "dist-ssr");
const SITE = "https://artydog.win/";

const { render } = await import(pathToFileURL(join(SERVER, "entry-server.js")).href);
const { version } = JSON.parse(
  readFileSync(join(ROOT, "../desktop/package.json"), "utf8"),
);

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ArtyDog",
  description:
    "Artillery calculator for WARDOGS: distance, azimuth and mil elevation for the L81 Mortar and SPH-2.",
  url: SITE,
  applicationCategory: "GameApplication",
  operatingSystem: "Windows, Linux",
  softwareVersion: version,
  downloadUrl: "https://github.com/acidtib/artydog/releases/latest",
  license: "https://opensource.org/licenses/MIT",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: "acidtib", url: "https://github.com/acidtib" },
};

function replaceOnce(text, marker, replacement) {
  if (!text.includes(marker)) {
    throw new Error(`dist/index.html is missing ${marker}`);
  }
  // A function replacement keeps "$" in the markup from being read as a pattern.
  return text.replace(marker, () => replacement);
}

let page = readFileSync(PAGE, "utf8");
page = replaceOnce(page, '<div id="root"></div>', `<div id="root">${render()}</div>`);
page = replaceOnce(
  page,
  "<!--app-head-->",
  // Escaping "<" stops a string in the data from closing the script tag.
  `<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>`,
);
writeFileSync(PAGE, page);
rmSync(SERVER, { recursive: true, force: true });

console.log(`prerendered dist/index.html for v${version}`);
