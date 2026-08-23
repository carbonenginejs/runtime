import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rollup } from "rollup";
import { babel } from "@rollup/plugin-babel";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, ".scratch", "decorator-transform-proof");
const sourceEntry = path.join(scratch, "source-entry.mjs");
const sourceBundle = path.join(scratch, "source-bundle.mjs");
const distEntry = path.join(scratch, "dist-entry.mjs");

function entryText(kind) {
  const base = kind === "source" ? "../../src/index.js" : "../../npm/dist/index.js";
  return `
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import * as character from "${base}";

export function capture() {
  const entries = [];

  for (const [name, Class] of Object.entries(character)) {
    const schema = CjsSchema.getSchema(Class);

    if (!schema.className) continue;

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
  await fs.mkdir(scratch, { recursive: true });
  await fs.writeFile(sourceEntry, entryText("source"), "utf8");
  await fs.writeFile(distEntry, entryText("dist"), "utf8");
}

async function buildSourceBundle() {
  const bundle = await rollup({
    input: sourceEntry,
    external: id => id.startsWith("@carbonenginejs/"),
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
assert.deepEqual(source.capture(), dist.capture());
console.log("decorator transform proof passed for all decorated character classes");
