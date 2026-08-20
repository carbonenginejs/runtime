import assert from "node:assert/strict";
import test from "node:test";
import { MediaType, PayloadType } from "@carbonenginejs/runtime-utils/media";
import * as formats from "../src/formats/index.js";
// CjsFormat pulls in decorated probe code - test the consumer output.
import { CjsFormat } from "../npm/dist/index.js";

// Vocabulary conformance: runtime-utils owns the shared media
// vocabulary; formats declare against it. This test pins the canonical set so
// a format (including the dependency-free standalone packages mirrored here)
// can never drift to an unshared token.

const CANONICAL_MEDIA = new Set(Object.values(MediaType));

test("CjsFormat exposes the runtime-utils vocabulary objects by identity", () =>
{
  assert.equal(CjsFormat.MediaType, MediaType, "CjsFormat.MediaType is the runtime-utils object, not a copy");
  assert.equal(CjsFormat.Type, MediaType, "CjsFormat.Type shares the same object");
  assert.equal(CjsFormat.OutputType.AUDIO, PayloadType.AUDIO);
  assert.equal(CjsFormat.OutputType.RAW, PayloadType.RAW);
});

test("every format declares type and mediaTypes from the canonical vocabulary", () =>
{
  const formatClasses = Object.entries(formats)
    .filter(([ name, value ]) => /^Cjs.+Format$/.test(name) && typeof value === "function");
  assert.ok(formatClasses.length >= 20, `expected the full format registry, saw ${formatClasses.length}`);
  for (const [ name, Format ] of formatClasses)
  {
    for (const token of Format.type ?? [])
    {
      assert.ok(CANONICAL_MEDIA.has(token), `${name}.type token "${token}" is not canonical MediaType vocabulary`);
    }
    for (const token of Format.mediaTypes ?? [])
    {
      assert.ok(CANONICAL_MEDIA.has(token), `${name}.mediaTypes token "${token}" is not canonical MediaType vocabulary`);
    }
    assert.ok((Format.type ?? []).length > 0, `${name} declares no type`);
    assert.ok((Format.mediaTypes ?? []).length > 0, `${name} declares no mediaTypes`);
  }
});


// Extension declarations. Adding these is what lets a resource own its handler
// registry without a parallel extension table, so the shape has to hold.
// See /docs/internal/decisions/resource-population.md.

test("a declared extension is dotted, lowercase, and unique within its format", () =>
{
  for (const [ name, Format ] of Object.entries(formats))
  {
    const declared = Format?.extensions;
    if (!Array.isArray(declared) || declared.length === 0) continue;

    assert.ok(Object.isFrozen(declared), `${name}.extensions is frozen`);
    const seen = new Set();
    for (const ext of declared)
    {
      assert.equal(typeof ext, "string", `${name} extension is a string`);
      assert.ok(ext.startsWith("."), `${name} extension "${ext}" carries its dot`);
      assert.equal(ext, ext.toLowerCase(), `${name} extension "${ext}" is lowercase`);
      assert.ok(!seen.has(ext), `${name} declares "${ext}" once`);
      seen.add(ext);
    }
  }
});


test("no two formats claim the same extension, except the .static router pair", () =>
{
  // `.static` names a role rather than a format: CjsStaticFormat identifies
  // which of three unrelated containers a file holds, and CjsSchemaBoundFormat
  // reads one of them. That overlap is the routing case, not a collision.
  const owners = new Map();
  const collisions = [];
  for (const [ name, Format ] of Object.entries(formats))
  {
    for (const ext of (Array.isArray(Format?.extensions) ? Format.extensions : []))
    {
      if (owners.has(ext)) collisions.push(`${ext}: ${owners.get(ext)} and ${name}`);
      else owners.set(ext, name);
    }
  }
  assert.deepEqual(
    collisions.filter(entry => !entry.startsWith(".static:")),
    [],
    "an extension resolving to two formats cannot be routed"
  );
});


test("a format whose inputs are not file suffixes declares no extensions", () =>
{
  // webgl/webgpu take already-built containers and dxbc takes a bytecode blob;
  // their `inputTypes` are logical input names. Populating `extensions` to look
  // complete would claim a file route that does not exist.
  for (const name of [ "CjsWebglFormat", "CjsWebgpuFormat", "CjsDxbcFormat" ])
  {
    const Format = formats[name];
    if (!Format) continue;
    assert.deepEqual(
      Array.isArray(Format.extensions) ? Format.extensions : [],
      [],
      `${name} must not claim a file extension`
    );
  }
});
