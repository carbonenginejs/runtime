import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Copier, DictReader } from "../../npm/dist/global/blue/index.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2SamplerOverrideData, Tr2SamplerOverride, Tr2Effect } from "../../npm/dist/trinity/index.js";

test("sampler records are plain native structs without query or model behavior", () =>
{
  for (const Type of [Tr2SamplerOverrideData, Tr2SamplerOverride])
  {
    assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
    assert.deepEqual([...mappedInterfaces(Type)], []);
    for (const method of ["SetValues", "UpdateValues", "OnEvent", "Initialize", "Traverse", "GetResources"])
      assert.equal(method in new Type(), false, Type.name + "." + method);
  }
});

test("sampler override record follows unsigned native structure fields and defaults", () =>
{
  const info = CjsSchema.getSchema(Tr2SamplerOverride), row = new Tr2SamplerOverride();
  const names = ["name", "addressU", "addressV", "addressW", "filter", "mipFilter", "lodBias", "maxMipLevel", "maxAnisotropy"];
  assert.deepEqual(info.members.map(field => field.name), names);
  for (const field of info.members)
  {
    assert.equal(field.type.kind, field.name === "name" ? "string" : field.name === "lodBias" ? "float32" : "uint32");
    assert.equal(field.edit.persist, true);
  }
  assert.deepEqual(names.map(name => row[name]), ["", 1, 1, 1, 2, 2, 0, 0, 4]);
  assert.equal(CjsSchema.getField(Tr2SamplerOverride, "sampler"), null);
  assert.equal(Tr2SamplerOverride.byteSize, 56);
});

test("sampler data retains opaque AL value semantics without resource traversal", () =>
{
  const row = new Tr2SamplerOverrideData(), members = CjsSchema.getSchema(Tr2SamplerOverrideData).members;
  assert.deepEqual(members.map(field => field.name), ["registerIndex", "sampler"]);
  assert.equal(members[0].type.kind, "uint32");
  assert.equal(members[1].type.kind, "rawStruct");
  assert.equal(members[1].type.className, "Tr2SamplerStateAL");
  assert.notEqual(members[1].type.runtimeOnly, true);
  assert.equal(row.registerIndex, 0);
  assert.equal(row.sampler, null);
  row.sampler = { isResource: true };
  assert.deepEqual(GetResources(row), [], "opaque sampler state is not a declared Blue resource edge");
});

test("sampler declared reader and Copier preserve full unsigned authored values", () =>
{
  const row = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2SamplerOverride", name: "Sampler", addressU: 0xffffffff, filter: 0xfffffffe, lodBias: 1.5 });
  assert.equal(row.addressU, 0xffffffff);
  assert.equal(row.filter, 0xfffffffe);
  const copy = new Copier().CopyTo(row);
  assert.equal(copy.addressU, 0xffffffff);
  assert.equal(copy.filter, 0xfffffffe);
  assert.equal(copy.lodBias, 1.5);
  copy.addressU = 3;
  assert.equal(row.addressU, 0xffffffff);
});

test("actual effect owner keeps signed scalar edits separate from native record types", context =>
{
  const effect = new Tr2Effect();
  const rebuild = context.mock.method(effect, "RebuildCachedDataInternal", () => {});
  assert.equal(effect.SetSamplerOverrides({ Sampler: { addressU: 0xffffffff, filter: "2" } }), true);
  const row = effect.samplerOverrides[0];
  assert.equal(row.constructor, Tr2SamplerOverride);
  assert.equal(row.addressU, -1, "held authored API coercion remains signed");
  assert.equal(row.filter, 2);
  assert.equal(rebuild.mock.callCount(), 1);
  assert.equal(effect.SetSamplerOverrides({ Sampler: { addressU: -1, filter: 2 } }), false);
  assert.equal(rebuild.mock.callCount(), 1);
  const replacement = new Tr2SamplerOverride();
  assert.equal(effect.SetSamplerOverrides({ Sampler: replacement }), true);
  assert.equal(effect.samplerOverrides[0], replacement);
  assert.equal(effect.SetSamplerOverrides({ Sampler: null }), true);
  assert.equal(effect.samplerOverrides.length, 0);
});
