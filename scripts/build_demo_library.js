// Emits demo/audio-library.json - the COMMITTABLE demo copy of the audio
// library with every optional culling-enrichment field stripped.
//
// Kept (SoundbanksInfo / resfileindex / bank-derived): event ids + bank
// membership, wem file ids, bank/media storage paths, embeddedMedia (with
// mediaType), eventMedia edges, and the music graph.
// Stripped (optional audio metadata enrichment): per-event culling metadata
// (maxRadiusAttenuation, isLoop, is2D, isVital, eventsStoppedBy) and
// per-bank essential flags. The demo degrades gracefully without them:
// sounds play, loops become one-shots, culling is less informed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const libraryPath = ReadOption("--library") ?? process.env.AUDIO_LIBRARY_PATH;

if (!libraryPath)
{
  throw new Error("Pass --library <audio_v2.json> or set AUDIO_LIBRARY_PATH");
}

const library = JSON.parse(fs.readFileSync(libraryPath, "utf8"));

if (library.schema !== "carbonenginejs.audioLibrary" || library.schemaVersion !== 2)
{
  throw new Error(`Unsupported audio library schema: ${library.schema ?? "<missing>"} v${library.schemaVersion ?? "<missing>"}`);
}

const events = {};
for (const [ name, record ] of Object.entries(library.metadata?.Events ?? {}))
{
  events[name] = { eventID: record.eventID, soundbanks: record.soundbanks };
}
const soundBanks = {};
for (const name of Object.keys(library.metadata?.SoundBanks ?? {}))
{
  soundBanks[name] = {};
}

const demoLibrary = {
  schema: library.schema,
  schemaVersion: library.schemaVersion,
  sourceTarget: library.sourceTarget,
  sourceGame: library.sourceGame,
  sourceProvider: library.sourceProvider,
  sourceBuild: library.sourceBuild,
  generatedAt: library.generatedAt,
  hasOptionalEnrichment: false,
  metadata: {
    Events: events,
    SoundBanks: soundBanks,
    WemFileIDs: library.metadata?.WemFileIDs ?? {}
  },
  media: library.media,
  banks: library.banks,
  eventMedia: library.eventMedia,
  eventMediaLanguage: library.eventMediaLanguage,
  embeddedMedia: library.embeddedMedia,
  music: library.music
};

const outPath = path.resolve(ReadOption("--out") ?? path.join(root, "demo", "audio-library.json"));
const json = Buffer.from(JSON.stringify(demoLibrary));
const gzipPath = `${outPath}.gz`;
const gzip = gzipSync(json, { level: 9, mtime: 0 });

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, json);
fs.writeFileSync(gzipPath, gzip);
console.log("wrote", outPath, `${(json.byteLength / 1048576).toFixed(2)} MB`);
console.log("wrote", gzipPath, `${(gzip.byteLength / 1048576).toFixed(2)} MB`);

// Safety: the committed file must carry no optional enrichment keys.
const text = fs.readFileSync(outPath, "utf8");
for (const banned of [ "maxRadiusAttenuation", "isLoop", "is2D", "isVital", "eventsStoppedBy", "EssentialSoundBank" ])
{
  if (text.includes(`"${banned}"`)) throw new Error(`Optional enrichment field leaked into demo library: ${banned}`);
}
console.log("verified: no optional enrichment fields present");

function ReadOption(name)
{
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
