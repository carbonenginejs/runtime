import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rollup } from "rollup";
import { babel } from "@rollup/plugin-babel";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceScratch = path.join(root, ".scratch", "audio-decorator-transform-proof");
const distScratch = path.join(root, "npm", ".scratch", "audio-decorator-transform-proof");
const sourceEntry = path.join(sourceScratch, "source-entry.mjs");
const sourceBundle = path.join(sourceScratch, "source-bundle.mjs");
const distEntry = path.join(distScratch, "dist-entry.mjs");

function entryText(kind) {
  const base = kind === "source" ? "../../src/audio/index.js" : "../../dist/audio/index.js";
  return `
import { CjsSchema } from "#schema";
import * as audio from "${base}";

export function capture() {
  return Object.fromEntries(Object.entries(audio).flatMap(([name, Class]) => {
    const schema = typeof Class === "function" ? CjsSchema.getSchema(Class) : null;
    // getSchema returns an export shape for ANY function; a non-null className
    // is the schema-registration signal that marks a model constructor. Plain
    // factory exports (audioMetadataFromSoundbanksInfo) must not be new-ed.
    if (!schema?.className) return [];
    const value = new Class();
    return [[name, {
      className: schema.className,
      family: schema.family,
      fields: schema.fields.map(field => ({
        name: field.name,
        type: field.type,
        persist: field.io?.persist === true,
        value: value[field.name]
      }))
    }]];
  }));
}
`;
}

async function writeEntries() {
  await fs.mkdir(sourceScratch, { recursive: true });
  await fs.mkdir(distScratch, { recursive: true });
  await fs.writeFile(sourceEntry, entryText("source"), "utf8");
  await fs.writeFile(distEntry, entryText("dist"), "utf8");
}

async function buildSourceBundle() {
  const bundle = await rollup({
    input: sourceEntry,
    external: id => id.startsWith("#"),
    plugins: [
      babel({
        babelHelpers: "bundled",
        extensions: [".js", ".mjs"],
        babelrc: false,
        configFile: false,
        plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]]
      })
    ]
  });

  await bundle.write({ file: sourceBundle, format: "esm", sourcemap: false });
  await bundle.close();
}

await writeEntries();
await buildSourceBundle();

const source = await import(pathToFileURL(sourceBundle));
const dist = await import(pathToFileURL(distEntry));
// Default model values may themselves be class instances from the source and
// dist module graphs. The proof compares their data, not constructor identity.
assert.deepEqual(structuredClone(source.capture()), structuredClone(dist.capture()));
console.log("decorator transform proof passed for all audio classes");
