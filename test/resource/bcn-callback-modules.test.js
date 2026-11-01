import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { BCN_CALLBACK_MODULES, compressBitmapAsync } from "../../src/resource/codecs/bcn/index.js";
import { IMAGE_DECODE_CALLBACK_MODULES } from "../../src/resource/imageio/imageDecodeCallbacks.js";
import workerBundles from "../../rollup.workers.config.mjs";

// BeCallbackMan imports each registered callback module by URL, in a worker
// and on the main thread. A module missing from the published files or from a
// bundled build only shows up at runtime, as a rejected job, so it is checked
// here. This file never starts BeCallbackMan, as a bare codec user would not.

const ROOT = new URL("../../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("package.json", ROOT), "utf8"));
const published = new Set(Object.values(manifest.exports).filter(value => typeof value === "string"));
const bundled = new Set(workerBundles.map(config => config.input.replaceAll("\\", "/")));

test("every registered callback module (bcn, image decode) exists, exports its callback, and is published and bundled", async () =>
{
  const entry = "./src/blue/blue/worker/blueCallbackManWorkerEntry.js";
  assert.ok(published.has(entry), "the default worker entry is a package export");
  assert.ok([ ...bundled ].some(input => input.endsWith("npm/dist/blue/blue/worker/blueCallbackManWorkerEntry.js")), "the worker build bundles the worker entry");

  for (const [ name, url ] of Object.entries({ ...BCN_CALLBACK_MODULES, ...IMAGE_DECODE_CALLBACK_MODULES }))
  {
    const file = fileURLToPath(url);
    assert.ok(existsSync(file), `${name}: ${file} exists`);
    const module = await import(url);
    assert.equal(typeof module.callbacks[name], "function", `${name}: exported as a callback`);
    const source = "./" + file.replaceAll("\\", "/").slice(fileURLToPath(ROOT).replaceAll("\\", "/").length);
    assert.ok(published.has(source), `${name}: ${source} is a package export`);
    const dist = source.replace("./src/", "npm/dist/");
    assert.ok([ ...bundled ].some(input => input.endsWith(dist)), `${name}: the worker build bundles ${dist}`);
  }
});

test("a codec user who never started BeCallbackMan is told to compress synchronously", async () =>
{
  const packet = { description: { type: 0, width: 4, height: 4, depth: 1, mipCount: 1, arraySize: 1, format: 28 }, data: new Uint8Array(64) };
  await assert.rejects(compressBitmapAsync(packet, 7), /compress synchronously with compressBitmap or compressSurface/);
});
