import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

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
    if (entry.isDirectory()) files.push(...await walkJsFiles(full));
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

test("the audio/trinity entry exposes graph classes without device side effects", async () =>
{
  assert.equal(typeof globalThis.AudioContext, "undefined");

  const graph = await import("../../../npm/dist/audio/trinity/index.js");
  const names = Object.keys(graph);
  for (const expected of GRAPH_CLASSES)
  {
    assert.ok(names.includes(expected), `graph class ${expected} is exported`);
  }
  assert.ok(!names.includes("CjsAudioBackend"));
  assert.ok(!names.includes("CjsAudioSystem"));
  assert.ok(!names.includes("audioMetadataFromSoundbanksInfo"));
  assert.equal(typeof globalThis.AudioContext, "undefined");
  assert.ok(new graph.AudEmitter());

  for (const file of await walkJsFiles(path.join(root, "npm", "dist", "audio", "trinity")))
  {
    const text = await fs.readFile(file, "utf8");
    assert.ok(!text.includes("CjsAudioBackend") && !text.includes("CjsAudioSystem"),
      `${path.relative(root, file)} must not reference realization modules`);
  }
});

test("source and generated manifests agree on the audio export map", async () =>
{
  const source = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const published = JSON.parse(await fs.readFile(path.join(root, "npm", "package.json"), "utf8"));
  const audioEntries = Object.entries(source.exports)
    .filter(([ subpath ]) => subpath === "./audio" || subpath.startsWith("./audio/"));

  for (const [ subpath, target ] of audioEntries)
  {
    const expected = target.replace(/^\.\/src\//u, "./dist/");
    assert.equal(published.exports[subpath], expected, `${subpath} is rewritten for npm`);
    if (!expected.includes("*")) await fs.access(path.join(root, "npm", expected));
  }
});
