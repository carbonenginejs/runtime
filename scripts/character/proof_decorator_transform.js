import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rollup } from "rollup";
import { babel } from "@rollup/plugin-babel";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceScratch = path.join(root, ".scratch", "character-decorator-transform-proof");
const distScratch = path.join(root, "npm", ".scratch", "character-decorator-transform-proof");
const sourceEntry = path.join(sourceScratch, "source-entry.mjs");
const sourceBundle = path.join(sourceScratch, "source-bundle.mjs");
const distEntry = path.join(distScratch, "dist-entry.mjs");

function entryText(kind) {
  const base = kind === "source" ? "../../src/character/index.js" : "../../dist/character/index.js";
  return `
import { CjsSchema, compose } from "#schema";
import * as character from "${base}";

// The composition half of the proof (the @compose.notify spike): pins that
// Babel's 2023-11 class-decorator output applies prototype mutations to the
// SAME prototype object in both pipelines - which schema metadata cannot see.
export function captureComposition() {
  const { CjsCharacter } = character;
  const proto = CjsCharacter.prototype;
  const result = {
    ownNames: Object.getOwnPropertyNames(proto).sort(),
    // The extends is genuinely gone: nothing re-inherited the surface.
    baseIsObject: Object.getPrototypeOf(proto) === Object.prototype,
    methods: {}
  };
  for (const name of ["AddEvents", "OnEvent", "OnceEvent", "OffEvent", "EmitEvent",
    "HasEvent", "ClearEvent", "GetEventNames", "GetEventListenerCount"]) {
    const fn = proto[name];
    // fn.length catches default-parameter arity drift under transform - the
    // realistic Babel hazard for OffEvent(eventName = "*", ...).
    result.methods[name] = { type: typeof fn, length: fn?.length ?? -1, name: fn?.name ?? null };
  }

  // Behavioural round-trip, including the lazy-allocate/lazy-teardown state
  // contract no other proof covers.
  const instance = new CjsCharacter({
    libraryManager: { GetLibrary: () => null, Get: () => null },
    appearanceResolver: { resolvePaperdoll: () => null },
    constructionResolver: { Resolve: () => null }
  });
  let observed = 0;
  const listener = () => { observed += 1; };
  instance.OnEvent("probe", listener);
  instance.EmitEvent("probe");
  result.observed = observed;
  result.namesWhileSubscribed = instance.GetEventNames();
  instance.OffEvent("probe", listener);
  result.stateTornDown = instance.__state === undefined || instance.__state.events === undefined;

  // Install-if-absent: a class declaring its own OnEvent keeps it. The
  // functional form, because this entry is imported RAW on the dist side -
  // decorator SYNTAX through Babel is proven by CjsCharacter itself.
  class OwnOnEventProbe {
    OnEvent() { return "own"; }
  }
  compose.notify(OwnOnEventProbe);
  result.ownMethodSurvives = new OwnOnEventProbe().OnEvent() === "own";
  result.probeGainsRest = typeof OwnOnEventProbe.prototype.EmitEvent === "function";

  return structuredClone(result);
}

export function capture() {
  const entries = [];

  for (const [name, Class] of Object.entries(character)) {
    const schema = typeof Class === "function" ? CjsSchema.getSchema(Class) : null;

    if (!schema?.className) continue;

    const value = new Class();
    entries.push([name, {
      className: schema.className,
      family: schema.family,
      fields: schema.fields.map(field => ({
        name: field.name,
        type: field.type,
        persist: field.io?.persist === true,
        value: value[field.name]
      }))
    }]);
  }

  return JSON.parse(JSON.stringify(Object.fromEntries(entries), (_key, value) => {
    if (value instanceof Map) return Object.fromEntries(value);
    if (ArrayBuffer.isView(value)) return Array.from(value);
    return value;
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
assert.deepEqual(structuredClone(source.capture()), structuredClone(dist.capture()));
assert.deepEqual(source.captureComposition(), dist.captureComposition());
assert.equal(dist.captureComposition().baseIsObject, true, "the extends is gone in dist");
assert.equal(dist.captureComposition().observed, 1, "composed emitter dispatches in dist");
console.log("decorator transform proof passed for all decorated character classes, including the composed notify surface");
