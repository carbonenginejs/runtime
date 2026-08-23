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

const fields = [
  "boneIndex",
  "position",
  "rotation",
  "scaling",
];

const lightSetItemFields = [
  "flags",
  "boneIndex",
  "position",
  "radius",
  "noiseOctaves",
];

function entryText(kind) {
  const sofBase = kind === "source" ? "../../src/sof" : "../../npm/dist/sof";
  const hullBase = `${sofBase}/hull`;
  const sharedBase = hullBase.replace("/hull", "/shared");
  return `
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { EveSOFDataTransform } from "${sharedBase}/EveSOFDataTransform.js";
import { EveSOFDataMgr } from "${sofBase}/EveSOFDataMgr.js";
import { EveSOFDataHullLightSetItem } from "${hullBase}/EveSOFDataHullLightSetItem.js";

const fields = ${JSON.stringify(fields, null, 2)};
const lightSetItemFields = ${JSON.stringify(lightSetItemFields, null, 2)};

function valueOf(value) {
  if (value instanceof Set) return [...value];
  if (ArrayBuffer.isView(value)) return [...value];
  if (value && typeof value === "object" && value.constructor === Object) return { ...value };
  return value;
}

function fieldRecord(Constructor, instance, fieldName) {
  const field = CjsSchema.getField(Constructor, fieldName);
  return {
    name: fieldName,
    type: field?.type || null,
    io: field?.io || null,
    schema: field?.schema || null,
    value: valueOf(instance[fieldName]),
  };
}

export function capture() {
  const transform = new EveSOFDataTransform();
  const mgr = new EveSOFDataMgr();
  const lightSetItem = new EveSOFDataHullLightSetItem();
  return {
    transformClass: CjsSchema.getSchema(EveSOFDataTransform),
    mgrClass: {
      className: CjsSchema.getSchema(EveSOFDataMgr).className,
      family: CjsSchema.getSchema(EveSOFDataMgr).family,
    },
    lightSetItemClass: {
      className: CjsSchema.getSchema(EveSOFDataHullLightSetItem).className,
      family: CjsSchema.getSchema(EveSOFDataHullLightSetItem).family,
    },
    fields: Object.fromEntries(fields.map((field) => [
      field,
      fieldRecord(EveSOFDataTransform, transform, field),
    ])),
    lightSetItemFields: Object.fromEntries(lightSetItemFields.map((field) => [
      field,
      fieldRecord(EveSOFDataHullLightSetItem, lightSetItem, field),
    ])),
  };
}
`;
}

function stable(value) {
  return JSON.stringify(sortValue(value), null, 2);
}

function sortValue(value) {
  if (value instanceof Set) return [...value].map(sortValue);
  if (ArrayBuffer.isView(value)) return [...value];
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortValue(value[key])]),
  );
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
  const sourceJson = stable(sourceSnapshot);
  const distJson = stable(distSnapshot);

  if (sourceJson !== distJson) {
    console.error("decorator transform proof failed: source transform and npm/dist metadata differ");
    console.error("--- source");
    console.error(sourceJson);
    console.error("--- dist");
    console.error(distJson);
    process.exitCode = 1;
    return;
  }

  console.log("decorator transform proof passed");
  console.log(JSON.stringify(sourceSnapshot, null, 2));
}

await main();
