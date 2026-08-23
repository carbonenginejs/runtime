import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GRAPH_CLASSES = [
  "AudActionLogCB", "AudActionRecord", "AudActionRecordPostEvent",
  "AudEmitter", "AudEventCurve", "AudEventKey", "AudGameObjResource",
  "AudGeometry",
  "AudListener", "AudManager", "AudMusicPlayer", "AudParameter", "AudSettings",
  "AudPosition", "AudStaticDataRepository", "AudUIPlayer", "AudioCurveSetDriver",
  "SoundPrioritization", "SpatialAudioSettings", "StretchAudio",
  "Tr2AudioStretchAuto", "Tr2AudioStretchBase", "Tr2AudGeometryData"
];

async function walkJsFiles(directory)
{
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true }))
  {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory())
    {
      files.push(...await walkJsFiles(full));
    }
    else if (entry.name.endsWith(".js"))
    {
      files.push(full);
    }
  }
  return files;
}


// node --test runs this file in its own process: nothing else has imported the
// package here, so what this entry evaluates is exactly what a graph-only
// consumer (runtime-sof) would evaluate.
test("the ./trinity entry exposes the graph classes with no backend leakage or device side effects", async () =>
{
  assert.equal(typeof globalThis.AudioContext, "undefined", "plain Node process has no AudioContext");

  const graph = await import("../npm/dist/trinity/index.js");
  const names = Object.keys(graph);
  for (const expected of GRAPH_CLASSES)
  {
    assert.ok(names.includes(expected), `graph class ${expected} is exported`);
  }
  assert.ok(!names.includes("CjsAudioBackend"), "no WebAudio backend on the graph-only entry");
  assert.ok(!names.includes("CjsAudioSystem"), "no realization system on the graph-only entry");
  assert.ok(!names.includes("audioMetadataFromSoundbanksInfo"), "metadata factory stays on its own subpath");

  assert.equal(typeof globalThis.AudioContext, "undefined", "importing the graph created no audio device global");
  const instance = new graph.AudEmitter();
  assert.ok(instance, "graph classes construct headless");

  // preserveModules keeps the module graph 1:1 with src: the published
  // trinity tree must not reference the realization modules at all.
  for (const file of await walkJsFiles(path.join(root, "npm", "dist", "trinity")))
  {
    const text = await fs.readFile(file, "utf8");
    assert.ok(!text.includes("CjsAudioBackend") && !text.includes("CjsAudioSystem"),
      `${path.relative(root, file)} must not reference realization modules`);
  }
});


test("dev and published manifests agree on the export map and the published targets exist", async () =>
{
  const dev = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const published = JSON.parse(await fs.readFile(path.join(root, "npm.package.json"), "utf8"));
  const copied = JSON.parse(await fs.readFile(path.join(root, "npm", "package.json"), "utf8"));

  assert.deepEqual(Object.keys(dev.exports).sort(), Object.keys(published.exports).sort(),
    "dev and published exports expose the same subpaths");
  assert.deepEqual(copied.exports, published.exports, "build_npm copies the published exports verbatim");
  assert.equal(dev.exports["./trinity"], "./src/trinity/index.js");
  assert.equal(published.exports["./trinity"], "./dist/trinity/index.js");

  for (const [subpath, target] of Object.entries(published.exports))
  {
    await fs.access(path.join(root, "npm", target)).catch(() =>
    {
      assert.fail(`published target for ${subpath} (${target}) missing from npm/`);
    });
  }
});
