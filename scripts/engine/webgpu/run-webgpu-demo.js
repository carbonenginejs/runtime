// Serves the WebGPU demo and drives it in headless Chromium.
//
// Separate from run-webgpu-harness.js on purpose: that one validates shader
// packages against fixtures, this one runs the composed frame. A failure here
// means the FRAME is wrong - sequencing, collection, submission, resolution -
// which is a different question from whether a container translated correctly.
//
//   node scripts/engine/webgpu/run-webgpu-demo.js            headless, exits non-zero on failure
//   node scripts/engine/webgpu/run-webgpu-demo.js --headed   watch it draw
//   node scripts/engine/webgpu/run-webgpu-demo.js --shot out.png
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "../../..");
const PAGE = "/test/engine/webgpu/demo/index.html";
const HEADED = process.argv.includes("--headed");
const SHOT_INDEX = process.argv.indexOf("--shot");
const SHOT = SHOT_INDEX >= 0 ? process.argv[SHOT_INDEX + 1] : null;

const TYPES = new Map([
  [ ".html", "text/html; charset=utf-8" ],
  [ ".js", "text/javascript; charset=utf-8" ],
  [ ".mjs", "text/javascript; charset=utf-8" ],
  [ ".map", "application/json; charset=utf-8" ],
  [ ".png", "image/png" ]
]);

const server = createServer(async (request, response) =>
{
  // Confined to the repository: a demo server that could read outside it would
  // be a hole in a developer's machine, not a convenience.
  const path = normalize(decodeURIComponent(new URL(request.url, "http://localhost").pathname));
  const file = join(ROOT, path);

  if (!file.startsWith(ROOT))
  {
    response.writeHead(403).end("outside the repository");
    return;
  }

  try
  {
    const body = await readFile(file);

    response.writeHead(200, { "content-type": TYPES.get(extname(file)) ?? "application/octet-stream" });
    response.end(body);
  }
  catch
  {
    response.writeHead(404).end("not found");
  }
});

/**
 * How many distinct byte values a PNG carries, as a cheap "is it uniform" test.
 * A cleared canvas compresses to very few; anything drawn carries many.
 */
function distinctPixelCount(png)
{
  const seen = new Set();

  for (const byte of png) seen.add(byte);

  return seen.size;
}

await new Promise(done => server.listen(0, "127.0.0.1", done));

const { port } = server.address();
// Uses the installed Chrome rather than a downloaded build: WebGPU needs a real
// GPU stack, and the machine already has one. --channel picks another.
const CHANNEL_INDEX = process.argv.indexOf("--channel");
const channel = CHANNEL_INDEX >= 0 ? process.argv[CHANNEL_INDEX + 1] : "chrome";

const browser = await chromium.launch({
  channel,
  headless: !HEADED,
  args: [ "--enable-unsafe-webgpu", "--enable-features=Vulkan" ]
});

const page = await browser.newPage();
const console_ = [];

page.on("console", message => console_.push(`${message.type()}: ${message.text()}`));
page.on("pageerror", error => console_.push(`pageerror: ${error.message}`));

let outcome = null;

try
{
  await page.goto(`http://127.0.0.1:${port}${PAGE}`, { waitUntil: "load" });
  try { await page.waitForFunction(() => window.__demo !== undefined, null, { timeout: 30000 }); }
  catch (error) { outcome = { ok: false, error: "page never reported: " + error.message }; }

  outcome = (await page.evaluate(() => window.__demo)) ?? outcome;

  if (SHOT) await page.locator("#view").screenshot({ path: SHOT });

  // Proof the canvas is not simply the clear colour, read from a SCREENSHOT
  // rather than from the canvas. drawImage off a WebGPU canvas yields nothing -
  // it reported a uniform black frame while the screenshot showed the blob -
  // so a readback through 2D would fail a working render.
  if (outcome.ok)
  {
    const png = await page.locator("#view").screenshot();

    outcome.pixels = distinctPixelCount(png);
  }

  if (HEADED) await page.waitForTimeout(20000);
}
finally
{
  await browser.close();
  server.close();
}

console.log(JSON.stringify(outcome, null, 2));

if (console_.length) console.log(`\nbrowser console:\n  ${console_.join("\n  ")}`);

if (!outcome?.ok)
{
  console.error("\nDemo failed.");
  process.exitCode = 1;
}
else if (outcome.pixels !== undefined && outcome.pixels < 2)
{
  // Green intents with a uniform canvas means the frame ran and drew nothing,
  // which is the failure this demo exists to catch.
  console.error("\nDemo ran but the canvas is uniform: nothing was drawn.");
  process.exitCode = 1;
}
