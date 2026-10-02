import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Copier, DictReader } from "../../npm/dist/global/blue/index.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { ITr2InstanceDataInstanceData, ITr2ImpostorSourceImpostorHash, ITr2InstanceData, ITr2ImpostorSource, Tr2RuntimeInstanceData } from "../../npm/dist/trinity/core/index.js";

test("nested mesh records retain flattened identities without inheriting their enclosing interfaces", () =>
{
  for (const [Type, Owner] of [[ITr2InstanceDataInstanceData, ITr2InstanceData], [ITr2ImpostorSourceImpostorHash, ITr2ImpostorSource]])
  {
    assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
    assert.equal(CjsSchema.GetConstructor(Type.name), Type);
    assert.deepEqual([...mappedInterfaces(Type)], []);
    assert.equal(CjsSchema.cast(new Type(), Owner), null);
    for (const method of ["SetValues", "UpdateValues", "OnEvent", "Initialize", "Traverse", "GetResources"])
      assert.equal(method in new Type(), false, Type.name + "." + method);
  }
});

test("nested record fields preserve native order and remain nonpersistent", () =>
{
  const instance = CjsSchema.getSchema(ITr2InstanceDataInstanceData).members;
  assert.deepEqual(instance.map(field => field.name), ["buffer", "offset", "stride", "count"]);
  assert.equal(instance[0].type.kind, "rawStruct");
  assert.equal(instance[0].type.className, "Tr2BufferAL");
  assert.deepEqual(instance.slice(1).map(field => field.type.kind), ["uint32", "uint32", "uint32"]);
  const hash = CjsSchema.getSchema(ITr2ImpostorSourceImpostorHash).members;
  assert.deepEqual(hash.map(field => [field.name, field.type.kind]), [["viewDir", "vec3"], ["upDir", "vec3"]]);
  for (const member of [...instance, ...hash])
  {
    assert.notEqual(member.edit?.persist, true);
    assert.notEqual(member.edit?.notify, true);
  }
});

test("instance record defaults and borrowed opaque storage survive model removal", () =>
{
  const record = new ITr2InstanceDataInstanceData();
  assert.deepEqual([record.buffer, record.offset, record.stride, record.count], [null, 0, 0, 0]);
  const borrowed = { isResource: true };
  record.buffer = borrowed;
  record.count = 3;
  assert.equal(record.buffer, borrowed);
  assert.deepEqual(GetResources(record), [], "opaque AL storage does not become a Blue resource edge");
  const copy = new Copier().CopyTo(record);
  assert.deepEqual([copy.buffer, copy.offset, copy.stride, copy.count], [null, 0, 0, 0], "runtime record slots do not persist");
});

test("impostor record keeps independent mutable vectors for each instance and direction", () =>
{
  const first = new ITr2ImpostorSourceImpostorHash(), second = new ITr2ImpostorSourceImpostorHash();
  assert.deepEqual(Array.from(first.viewDir), [0, 0, 0]);
  assert.deepEqual(Array.from(first.upDir), [0, 0, 0]);
  first.viewDir.set([1, 2, 3]);
  assert.deepEqual(Array.from(first.upDir), [0, 0, 0]);
  assert.deepEqual(Array.from(second.viewDir), [0, 0, 0]);
  const copy = new Copier().CopyTo(first);
  assert.deepEqual(Array.from(copy.viewDir), [0, 0, 0], "runtime camera state does not persist");
  assert.notEqual(copy.viewDir, first.viewDir);
});

test("declared reader uses the existing nested record names and unsigned fields", () =>
{
  const reader = new DictReader({ declarations: true });
  const instance = reader.CreateObject({ _type: "ITr2InstanceDataInstanceData", offset: 0xffffffff, stride: 16, count: 5 });
  assert.equal(instance.constructor, ITr2InstanceDataInstanceData);
  assert.equal(instance.offset, 0xffffffff);
  assert.equal(instance.stride, 16);
  const hash = reader.CreateObject({ _type: "ITr2ImpostorSourceImpostorHash", viewDir: [1, 0, 0], upDir: [0, 1, 0] });
  assert.equal(hash.constructor, ITr2ImpostorSourceImpostorHash);
  assert.deepEqual(Array.from(hash.viewDir), [1, 0, 0]);
  assert.deepEqual(Array.from(hash.upDir), [0, 1, 0]);
});

test("runtime instance-data owner reuses its plain borrowed record after CPU publication", () =>
{
  const owner = new Tr2RuntimeInstanceData();
  const empty = owner.GetInstanceData();
  assert.equal(empty.constructor, ITr2InstanceDataInstanceData);
  assert.deepEqual([empty.buffer, empty.offset, empty.stride, empty.count], [null, 0, 0, 0]);
  owner.SetElementLayout([[4, 0, 4]]);
  owner.SetData([[[1, 2, 3, 4]], [[5, 6, 7, 8]]]);
  owner.UpdateData();
  const data = owner.GetInstanceData();
  assert.equal(data, empty, "owner returns its existing record");
  assert.equal(data.buffer, owner.GetData().buffer);
  assert.deepEqual([data.offset, data.stride, data.count], [0, 16, 2]);
  assert.equal("SetValues" in data, false);
});
