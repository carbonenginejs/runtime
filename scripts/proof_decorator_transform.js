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
import { CjsSchema } from "@carbonenginejs/core-types/schema";
import { CjsResource, CjsResourceState } from "${base}";

export function capture() {
  const resource = new CjsResource().Initialize("res:/Texture/Ship.DDS");
  return {
    className: CjsSchema.getSchema(CjsResource).className,
    family: CjsSchema.getSchema(CjsResource).family,
    pathType: CjsSchema.getField(CjsResource, "path")?.type?.kind,
    extType: CjsSchema.getField(CjsResource, "ext")?.type?.kind,
    stateType: CjsSchema.getField(CjsResource, "state")?.type?.kind,
    path: resource.GetPath(),
    ext: resource.GetExt(),
    state: resource.state,
    prepared: resource.IsPrepared(),
    good: resource.SetState(CjsResourceState.PREPARED).IsGood(),
  };
}
`;
}

function stable(value) {
  return JSON.stringify(value, Object.keys(value).sort(), 2);
}

async function writeEntries() {
  await fs.mkdir(scratch, { recursive: true });
  await fs.writeFile(sourceEntry, entryText("source"), "utf8");
  await fs.writeFile(distEntry, entryText("dist"), "utf8");
}

async function buildSourceBundle() {
  const bundle = await rollup({
    input: sourceEntry,
    external: (id) => id.startsWith("@carbonenginejs/"),
    plugins: [
      babel({
        babelHelpers: "bundled",
        extensions: [".js", ".mjs"],
        babelrc: false,
        configFile: false,
        plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]],
      }),
    ],
  });

  await bundle.write({
    file: sourceBundle,
    format: "esm",
    sourcemap: false,
  });
  await bundle.close();
}

async function main() {
  await writeEntries();
  await buildSourceBundle();

  const source = await import(pathToFileURL(sourceBundle));
  const dist = await import(pathToFileURL(distEntry));
  const sourceSnapshot = source.capture();
  const distSnapshot = dist.capture();

  assert.equal(stable(sourceSnapshot), stable(distSnapshot));
  console.log("decorator transform proof passed");
  console.log(JSON.stringify(sourceSnapshot, null, 2));
}

await main();
