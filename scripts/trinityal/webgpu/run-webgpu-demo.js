// Serves the WebGPU demo and drives it in headless Chromium.
//
// Separate from run-webgpu-harness.js on purpose: that one validates shader
// packages against fixtures, this one runs the composed frame. A failure here
// means the FRAME is wrong - sequencing, collection, submission, resolution -
// which is a different question from whether a container translated correctly.
//
//   node scripts/trinityal/webgpu/run-webgpu-demo.js            headless, exits non-zero on failure
//   node scripts/trinityal/webgpu/run-webgpu-demo.js --headed   watch it draw
//   node scripts/trinityal/webgpu/run-webgpu-demo.js --shot out.png
//
// And the mode for a person rather than a gate - stays up on a fixed port, starts
// no browser, prints the link:
//
//   node scripts/trinityal/webgpu/run-webgpu-demo.js --serve [--port 5503]
//
// It needs tools-core serving on 5510 for the client bytes (`npm run service`
// in the tools-core checkout).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "../../..");
const PAGE = "/test/trinityal/webgpu/demo/index.html";
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

// Client resources are proxied rather than copied in. They are not ours to
// commit, and a demo needing a checked-in shader would drift from the real one
// the moment a build moved.
const TOOLS_CORE = process.env.CJS_TOOLS_CORE ?? "http://127.0.0.1:5510/eve/3498825/resources/";

const server = createServer(async (request, response) =>
{
  const requested = new URL(request.url, "http://localhost");

  if (requested.pathname.startsWith("/resource/"))
  {
    const source = TOOLS_CORE + requested.pathname.slice("/resource/".length);

    try
    {
      const upstream = await fetch(source);

      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

      response.writeHead(200, { "content-type": "application/octet-stream" });
      response.end(Buffer.from(await upstream.arrayBuffer()));
    }
    catch (error)
    {
      response.writeHead(502).end(`resource proxy: ${error.message}`);
    }

    return;
  }

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
 * Whether a canvas screenshot shows anything but the clear colour.
 *
 * By ENCODED SIZE, not by reading pixels. Two cheaper checks were tried and
 * both lied: drawImage into a 2D context yields nothing at all for a WebGPU
 * canvas, and counting distinct BYTES passed a blank frame because PNG noise
 * in a near-black gradient is plenty of distinct bytes. A flat frame
 * compresses to a fraction of a drawn one - measured, 1.9 KB against 27 KB.
 */
const DRAWN_PNG_BYTES = 8000;

void DRAWN_PNG_BYTES;

// SERVE MODE STAYS UP, AND NEVER STARTS A BROWSER. The run above binds port zero
// and closes the server when Chrome exits, which is right for a gate and useless
// for a person: there is no URL left to open. `--serve` binds a FIXED port so the
// link is stable across restarts, and leaves the process running.
if (process.argv.includes("--serve"))
{
  const PORT_INDEX = process.argv.indexOf("--port");
  const servePort = PORT_INDEX >= 0 ? Number(process.argv[PORT_INDEX + 1]) : 5503;

  await new Promise(done => server.listen(servePort, "127.0.0.1", done));

  // 5510 is tools-core's fixed port, proxied through /resource/ - so a browser
  // that can reach this page can reach the client bytes without its own CORS
  // arrangement.
  console.log(`WebGPU demo: http://127.0.0.1:${servePort}${PAGE}`);
  console.log("Resources proxied from " + TOOLS_CORE);
  console.log("Ctrl+C to stop.");
}
else
{

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

    outcome.screenshotBytes = png.length;
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
else if (!outcome.report?.litPixels)
{
  // Green intents with a uniform canvas means the frame ran and drew nothing,
  // which is the failure this demo exists to catch.
  console.error("\nDemo ran but every pixel is the clear colour: nothing was drawn.");
  process.exitCode = 1;
}
}
