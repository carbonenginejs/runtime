import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2Mesh, Tr2ActionSetValue } from "../../npm/dist/trinity/index.js";
import { EveSOFDataTexture } from "../../npm/dist/sof/index.js";
import { CjsBlueReader } from "../../src/resource/format/CjsBlueReader.js";
import { CjsBlackBinaryReader } from "../../src/resource/formats/black/core/CjsBlackBinaryReader.js";
import { CjsBlackPropertyReaders } from "../../src/resource/formats/black/core/CjsBlackPropertyReaders.js";
import { CjsBlackSchemaRegistry } from "../../src/resource/formats/black/core/CjsBlackSchemaRegistry.js";

function readField(Type, name, value, pathHandler)
{
  const context = new CjsBlueReader({ pathHandler });
  context.info = { strings: [value] };
  const cursor = new CjsBlackBinaryReader(new DataView(new Uint8Array([0, 0]).buffer), context);
  const field = CjsSchema.getField(Type, name);
  const wire = CjsBlackSchemaRegistry.fromDeclaredType(field.type);
  const result = CjsBlackPropertyReaders.readValue(cursor, { ...wire, name });
  assert.equal(cursor.remaining, 0);
  return result;
}

test("resource declarations enter the shared Black path handler; graph lookup strings do not", () =>
{
  const authored = "r:/Authored/Mixed.GR2";
  const calls = [];
  const handler = value => { calls.push(value); return "res:" + value.slice(2); };
  assert.equal(readField(Tr2Mesh, "geometryResPath", authored, handler), "res:/Authored/Mixed.GR2");
  assert.equal(readField(EveSOFDataTexture, "resFilePath", authored, handler), "res:/Authored/Mixed.GR2");
  assert.equal(readField(Tr2ActionSetValue, "path", authored, handler), authored);
  assert.deepEqual(calls, [authored, authored]);
});

test("resource metadata alone neither rewrites authored paths nor changes string-reference storage", () =>
{
  const authored = "Res:/Authored/Mixed.DDS";
  assert.equal(readField(EveSOFDataTexture, "resFilePath", authored, null), authored);
  const address = CjsBlackSchemaRegistry.fromDeclaredType(CjsSchema.getField(Tr2Mesh, "geometryResPath").type);
  const lookup = CjsBlackSchemaRegistry.fromDeclaredType(CjsSchema.getField(Tr2ActionSetValue, "path").type);
  assert.equal(address.black.beType, lookup.black.beType);
  assert.equal(new EveSOFDataTexture().resFilePath, "");
});
