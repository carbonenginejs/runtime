// type.wpath: a path held in a std::wstring. Black keeps narrow and wide
// string tables, and a member's declaration alone decides which one its
// 2-byte index reads (STDWSTRING reads the wide one).
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { CjsBlackSchemaRegistry } from "../../npm/dist/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { EveSOFDataHullLightSetTexturedPointLight } from "../../npm/dist/sof/index.js";
import { clientResources } from "../support/clientResources.js";

const sofData = await clientResources();

test("wpath maps to STDWSTRING and keeps its path meaning", () =>
{
  // EveSOFData_Blue.cpp:1094 maps m_data.texturePath, a std::wstring.
  const field = CjsSchema.getField(EveSOFDataHullLightSetTexturedPointLight, "texturePath");
  assert.deepEqual(field.type, { kind: "wpath", accepts: [ "TriTextureRes" ] });
  const black = CjsBlackSchemaRegistry.fromDeclaredType(field.type);
  assert.equal(black.black.beType, "STDWSTRING");
  assert.equal(black.jsType.kind, "wpath");
  assert.equal(CjsBlackSchemaRegistry.fromDeclaredType({ kind: "path", accepts: [] }).black.beType, "STDSTRING");
});

test("the client's data.black textured point light path reads from the wide table", { skip: sofData.skip ?? false }, async () =>
{
  const bytes = await sofData.Read("res:/dx9/model/spaceobjectfactory/data.black");
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const lights = [];
  const seen = new Set(), stack = [ CjsBlackFormat.readRuntime(buffer, { schema: null }).root ];
  while (stack.length)
  {
    const value = stack.pop();
    if (!value || typeof value !== "object" || ArrayBuffer.isView(value) || seen.has(value)) continue;
    seen.add(value);
    if (value instanceof EveSOFDataHullLightSetTexturedPointLight) lights.push(value);
    for (const item of value instanceof Map ? value.values() : Object.values(value)) stack.push(item);
  }
  assert.ok(lights.length > 0, "textured point lights in data.black");
  const paths = new Set(lights.map(light => light.texturePath));
  // Wide index 16; the narrow table's index 16 is "EveSOFDataGenericString".
  assert.ok(paths.has("dynamic:/hangarvideos"), [ ...paths ].join(", "));
  assert.equal(paths.has("EveSOFDataGenericString"), false);
});
