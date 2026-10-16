import assert from "node:assert/strict";
import test from "node:test";
import { EveTransform, EveRootTransform, EveMissileWarhead } from "../../npm/dist/trinity/index.js";
import { RawData } from "../../npm/dist/trinity/core/rawData/RawData.js";

test("transform renderables return picking identity alongside their matrix payload", () =>
{
  for (const Type of [EveTransform, EveRootTransform, EveMissileWarhead])
  {
    const object = new Type();
    object.worldTransform[12] = 42;
    const record = object.GetPerObjectData({ Alloc: name => RawData.create(name) });
    record.SetUserData(7);
    record.SetPickingPointer(0x123456789n);
    assert.equal(record.GetUserData(), 7);
    assert.equal(record.GetPickingPointer(), 0x123456789n);
    assert.equal(record.GetPayloads()[0], record.vs);
    assert.equal(record.vs.Get("world")[3], 42);
  }
});


test("child and swarm gathering retain payloads but own independent picking identity", async () =>
{
  const { EveChildMesh, EveChildContainer, EveSwarmRenderable } = await import("../../npm/dist/trinity/index.js");
  for (const Type of [EveChildMesh, EveChildContainer, EveSwarmRenderable])
  {
    const object = new Type();
    const first = object.GetPerObjectData();
    const second = object.GetPerObjectData();
    first.SetUserData(7);
    second.SetUserData(12);
    first.SetPickingPointer(0x123456789n);
    assert.equal(first.GetUserData(), 7, Type.name);
    assert.equal(second.GetUserData(), 12, Type.name);
    assert.equal(first.GetPickingPointer(), 0x123456789n, Type.name);
    assert.equal(first.vs, second.vs, Type.name);
    assert.equal(first.ps, second.ps, Type.name);
    assert.deepEqual(first.GetPayloads(), [first.vs, first.ps], Type.name);
  }
});
