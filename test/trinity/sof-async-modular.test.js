import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";
import { composeStubResMan } from "../support/stubResMan.js";
import { EveSOF } from "../../npm/dist/sof/index.js";
import { EveStation2, EveChildPartData, EveChildMesh, EveModularObjectModifier, CreateModularObject } from "../../npm/dist/trinity/eve/index.js";
composeStubResMan();

function deferred()
{
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function data()
{
  return {
    generic: {},
    hull: [{ name: "part", buildClass: 0, opaqueAreas: [], boundingSphere: [0, 0, 0, 2] }],
    faction: [{ name: "neutral" }], race: [{ name: "neutral" }], material: [], pattern: [], layout: []
  };
}
const POSITION = [0, 0, 0], ROTATION = [0, 0, 0, 1], SCALE = [1, 1, 1];
function add(modifier)
{
  return modifier.AddHull("part", "neutral", "neutral", POSITION, ROTATION, SCALE);
}
function parts(object)
{
  return object.effectChildren.find(child => child instanceof EveChildPartData).parts;
}

test("concurrent modular sessions retain both parts and allocate distinct IDs after cold SOF acquisition", { timeout: 5000 }, async () => {
  const ready = deferred();
  let reads = 0;
  const sof = (await new EveSOF().Register({ dataPath: "res:/sof/data.black", resources: { getObject: async () => { reads++; await ready.promise; return data(); } } }));
  const owner = new EveStation2();
  owner.Initialize();
  const first = new EveModularObjectModifier().Create(owner, sof);
  const second = new EveModularObjectModifier().Create(owner, sof);
  const a = add(first), b = add(second);
  await nextTurn();
  assert.equal(parts(owner).length, 0, "no edits while data is pending");
  assert.throws(() => first.Create(new EveStation2(), sof), /edit is pending/);
  ready.resolve();
  assert.deepEqual(await Promise.all([a, b]), [1, 2]);
  assert.deepEqual(parts(owner).map(part => part.partId), [1, 2]);
  assert.equal(reads, 1);
});

test("a rejected modular edit does not publish a part or poison the next queued edit", { timeout: 5000 }, async () => {
  const ready = deferred();
  let reads = 0;
  const sof = (await new EveSOF().Register({ dataPath: "res:/sof/data.black", resources: { getObject: async () => {
    if (++reads === 1) { await ready.promise; throw new Error("unavailable"); }
    return data();
  } } }));
  const owner = new EveStation2();
  owner.Initialize();
  const modifier = new EveModularObjectModifier().Create(owner, sof);
  const first = assert.rejects(add(modifier), /failed to resolve sofData/);
  const second = add(modifier);
  await nextTurn();
  assert.equal(parts(owner).length, 0);
  ready.resolve();
  await first;
  assert.equal(await second, 1);
  assert.deepEqual(parts(owner).map(part => part.partId), [1]);
});

test("promise child acquisition shares the modular owner order", { timeout: 5000 }, async () => {
  const ready = deferred();
  const sof = new EveSOF();
  sof.dataMgr.SetData(data());
  const owner = new EveStation2();
  owner.Initialize();
  const modifier = new EveModularObjectModifier().Create(owner, sof, { LoadChild: async () => { await ready.promise; return new EveChildMesh(); } });
  const child = modifier.AddChild("res:/child.red", POSITION, ROTATION, SCALE);
  const hull = add(modifier);
  await nextTurn();
  assert.equal(parts(owner).length, 0);
  ready.resolve();
  assert.deepEqual(await Promise.all([child, hull]), [1, 2]);
  assert.deepEqual(parts(owner).map(part => part.partId), [1, 2]);
});

test("CreateModularObject waits for the injected SOF catalog", async () => {
  const ready = deferred();
  const sof = (await new EveSOF().Register({ dataPath: "res:/sof/data.black", resources: { getObject: async () => { await ready.promise; return data(); } } }));
  let settled = false;
  const pending = CreateModularObject(sof, "neutral", "neutral").then(value => { settled = true; return value; });
  await nextTurn();
  assert.equal(settled, false);
  ready.resolve();
  const [owner, modifier] = await pending;
  assert.equal(await add(modifier), 1);
  assert.equal(parts(owner).length, 1);
});

test("earlier sessions read, move and remove the live records after another session composes", async () => {
  const sof = new EveSOF();
  sof.dataMgr.SetData(data());
  const owner = new EveStation2();
  owner.Initialize();
  const first = new EveModularObjectModifier().Create(owner, sof);
  const second = new EveModularObjectModifier().Create(owner, sof);
  const a = await add(first), b = await add(second);
  assert.deepEqual(Array.from(first.GetPosition(b)), POSITION);
  first.SetTransform(a, [3, 4, 5], ROTATION, SCALE);
  assert.deepEqual(Array.from(parts(owner).find(part => part.partId === a).position), [3, 4, 5]);
  first.Remove(a);
  assert.deepEqual(parts(owner).map(part => part.partId), [b]);
  assert.deepEqual(Array.from(second.GetPosition(b)), POSITION);
  assert.throws(() => second.GetPosition(a), /Unknown modular part/);
});

for (const method of ["AddHull", "AddChild"])
{
  test(method + " captures mutable transforms at invocation before acquisition or queue waits", async () => {
    const ready = deferred(), entered = deferred();
    const sof = new EveSOF();
    sof.dataMgr.SetData(data());
    const owner = new EveStation2();
    owner.Initialize();
    const modifier = new EveModularObjectModifier().Create(owner, sof, {
      LoadChild: async () => { entered.resolve(); await ready.promise; return new EveChildMesh(); }
    });
    const leading = modifier.AddChild("res:/first.red", POSITION, ROTATION, SCALE);
    const position = [1, 2, 3], rotation = [0, 0, 0, 1], scale = [2, 2, 2];
    const pending = method === "AddHull"
      ? modifier.AddHull("part", "neutral", "neutral", position, rotation, scale)
      : modifier.AddChild("res:/next.red", position, rotation, scale);
    position.fill(9); rotation.fill(0); scale.fill(7);
    await entered.promise;
    ready.resolve();
    await leading;
    const id = await pending;
    assert.deepEqual(Array.from(modifier.GetPosition(id)), [1, 2, 3]);
    assert.deepEqual(Array.from(modifier.GetRotation(id)), [0, 0, 0, 1]);
    assert.deepEqual(Array.from(modifier.GetScale(id)), [2, 2, 2]);
  });
}
