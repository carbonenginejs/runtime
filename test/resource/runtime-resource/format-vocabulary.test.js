import assert from "node:assert/strict";
import test from "node:test";
import { MediaType, PayloadType } from "#consts/media";
import * as formats from "../../../src/resource/formats/index.js";
import { CjsFormat } from "../../../src/resource/format/CjsFormat.js";
import { CjsFsd32Format } from "../../../src/resource/formats/fsd/32/index.js";
import { CjsFsd64Format } from "../../../src/resource/formats/fsd/64/index.js";

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

test("every format is a CjsFormat with one canonical frozen contract", () =>
{
  const formatClasses = [
    ...Object.entries(formats)
      .filter(([ name, value ]) => /^Cjs.+Format$/.test(name) && typeof value === "function"),
    [ "CjsFsd32Format", CjsFsd32Format ],
    [ "CjsFsd64Format", CjsFsd64Format ]
  ];
  assert.ok(formatClasses.length >= 20, `expected the full format registry, saw ${formatClasses.length}`);
  const ids = new Set();
  for (const [ name, Format ] of formatClasses)
  {
    CjsFormat.validateContract(Format);
    assert.equal(Format.prototype instanceof CjsFormat, true, `${name} extends CjsFormat`);
    assert.equal(ids.has(Format.id), false, `${name}.id is unique`);
    ids.add(Format.id);
    for (const token of Format.mediaTypes)
    {
      assert.ok(CANONICAL_MEDIA.has(token), `${name}.mediaTypes token "${token}" is not canonical MediaType vocabulary`);
    }
    assert.ok(Format.mediaTypes.length > 0, `${name} declares mediaTypes`);
    assert.equal(typeof Format.requestResponseType, "string", `${name} declares requestResponseType`);
    assert.ok(Format.requestResponseType.length > 0, `${name}.requestResponseType is non-empty`);
    for (const retired of [ "type", "inputTypes", "outputTypes", "debugOutputTypes", "implementationStatus" ])
    {
      assert.equal(Object.hasOwn(Format, retired), false, `${name} does not redeclare retired ${retired}`);
    }
    for (const [ output, capability ] of Object.entries(Format.outputs))
    {
      assert.equal(capability.output, output);
      assert.equal(capability.verified, undefined, "declarations do not claim runtime proof");
    }
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
  // WebGL takes an already-built container and DXBC takes a bytecode blob.
  // Populating `extensions` would claim a file route that does not exist.
  for (const name of [ "CjsWebglFormat", "CjsDxbcFormat" ])
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
