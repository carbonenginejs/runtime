import assert from "node:assert/strict";
import test from "node:test";
import { EveSOF } from "../../../npm/dist/sof/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { BeObjectMetadata } from "../../../npm/dist/global/blue/BlueObjectMetadata.js";
import { EveShip2, EveChildContainer } from "../../../npm/dist/trinity/index.js";
import { composeStubResMan } from "../../support/stubResMan.js";

const manager = composeStubResMan();
const patch = { lists: "patch" };

async function Fixture()
{
  const sof = await new EveSOF().Register({ editorMode: true });
  sof.dataMgr.SetData({
    hull: [{ name: "hull", buildClass: 0, geometryResFilePath: "res:/hull.gr2", opaqueAreas: [],
      decalSets: [{ visibilityGroup: "primary", items: [1, 2].map(x => ({
        name: "same name", usage: 0, position: [x, 0.1, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1],
        boneIndex: -1, meshIndex: -1, parameters: [], textures: [],
        indexBuffers: [{ indexBuffer: new Uint32Array([0, 1, 70000]) }], multiHullIndexBuffers: []
      })) }] }],
    faction: [{ name: "faction", visibilityGroupSet: { visibilityGroups: [{ str: "primary" }] } }],
    race: [{ name: "race" }], material: [], pattern: [], layout: [],
    generic: { decalShaderLocation: "res:/decal", shaderPrefix: "static_", decalShaders: [] }
  });
  const values = await sof.BuildValuesFromDNA("hull:faction:race");
  for (const decal of values.decals)
  {
    decal.decalEffect.effectFilePath = "res:/decal/a.sm_depth";
    decal.decalEffect.constParameters = [{ _type: "Tr2ConstantEffectParameter", name: "Color", value: [0.1, 0.2, 0.3, 1] }];
    decal.decalEffect.parameters = [{ _type: "Tr2FloatParameter", name: "Amount", value: 0.1 }];
    decal.decalEffect.resources = [{ _type: "TriTextureParameter", name: "Map", resourcePath: "res:/texture.dds" }];
  }
  const ship = CjsSchema.from("EveShip2", { decals: values.decals });
  const vfx = new EveChildContainer(), child = new EveChildContainer();
  vfx.SetOwner(ship);
  vfx.objects.push(child);
  vfx.RegisterChildren(vfx.objects);
  child.name = "user edited VFX";
  BeObjectMetadata.Set(vfx, "sof_source_id", "attached-vfx-source");
  ship.effectChildren.push(vfx);
  // Even supplied excluded values must not be read, constructed or assigned.
  Object.defineProperty(values, "effectChildren", { enumerable: true, get() { throw new Error("VFX read"); } });
  const checkVfx = () =>
  {
    assert.equal(ship.effectChildren[0], vfx);
    assert.equal(vfx.objects[0], child);
    assert.equal(child.name, "user edited VFX");
    assert.equal(child.GetParent(), vfx);
    assert.equal(child.GetOwner(), ship);
  };
  return { ship, values, checkVfx };
}

test("identical SOF decal patches return false and preserve decal and effect objects", async () =>
{
  const { ship, values, checkVfx } = await Fixture();
  const decals = ship.decals.slice(), effects = decals.map(x => x.decalEffect);
  const parameters = effects.map(x => x.parameters[0]);
  const requests = manager.requests.length;
  const input = structuredClone(values.decals);
  assert.equal(ship.SetValues(values, patch), false);
  assert.deepEqual(ship.decals, decals);
  for (let i = 0; i < decals.length; i++)
  {
    assert.equal(ship.decals[i], decals[i]);
    assert.equal(ship.decals[i].decalEffect, effects[i]);
    assert.equal(effects[i].parameters[0], parameters[i]);
  }
  assert.equal(manager.requests.length, requests);
  assert.deepEqual(values.decals, input, "applying desired values never mutates their source");
  checkVfx();
});

test("one changed decal updates in place; reorder and partial lists never remove or reorder existing decals", async () =>
{
  const { ship, values, checkVfx } = await Fixture();
  const [first, second] = ship.decals;
  const secondEffect = second.decalEffect;
  assert.equal(ship.SetValues({ decals: values.decals.slice().reverse() }, patch), false);
  assert.equal(ship.decals[0], first);
  assert.equal(ship.decals[1], second);
  values.decals[0].position = [9, 0.1, 0];
  assert.equal(ship.SetValues({ decals: [values.decals[0]] }, patch), true);
  assert.equal(ship.decals[0], first);
  assert.equal(ship.decals[1], second);
  assert.equal(second.decalEffect, secondEffect);
  assert.equal(first.position[0], 9);
  assert.equal(second.position[0], 2);
  assert.equal(ship.SetValues({ decals: [] }, patch), false);
  assert.equal(ship.SetValues({}, patch), false);
  checkVfx();
});

test("decal shader-path patch keeps the effect and replaces its acquired resource", async () =>
{
  const { ship, values, checkVfx } = await Fixture();
  const decal = ship.decals[0], effect = decal.decalEffect, old = effect.effectResource;
  let detached = 0;
  const remove = old.RemoveNotifyTarget.bind(old);
  old.RemoveNotifyTarget = target => { if (target === effect) detached++; return remove(target); };
  values.decals[0].decalEffect.effectFilePath = "res:/decal/b.sm_depth";
  assert.equal(ship.SetValues(values, patch), true);
  assert.equal(ship.decals[0], decal);
  assert.equal(decal.decalEffect, effect);
  assert.notEqual(effect.effectResource, old);
  assert.equal(effect.effectResource.GetPath(), "res:/decal/b.sm_depth");
  assert.equal(detached, 1);
  assert.equal(ship.decals[1].decalEffect.effectResource, old);
  assert.equal(ship.SetValues(values, patch), false);
  checkVfx();
});

test("missing, duplicate and ambiguous decal IDs refuse the whole patch before writes", async () =>
{
  for (const invalid of ["missing incoming", "duplicate incoming", "missing existing", "duplicate existing", "wrong type"])
  {
    const { ship, values, checkVfx } = await Fixture();
    const first = ship.decals[0], second = ship.decals[1], effect = first.decalEffect;
    const originalName = first.name;
    values.decals[0].name = "must not change";
    values.decals[0].decalEffect.effectFilePath = "res:/decal/rejected.sm_depth";
    if (invalid === "missing incoming") delete values.decals[1].__bluemetadata__.sof_source_id;
    if (invalid === "duplicate incoming") values.decals[1].__bluemetadata__.sof_source_id = values.decals[0].__bluemetadata__.sof_source_id;
    if (invalid === "missing existing") BeObjectMetadata.Delete(second, "sof_source_id");
    if (invalid === "duplicate existing") BeObjectMetadata.Set(second, "sof_source_id", BeObjectMetadata.Get(first, "sof_source_id"));
    if (invalid === "wrong type") values.decals.push({ _type: "Tr2Effect", __bluemetadata__: { sof_source_id: "new" } });
    const requests = manager.requests.length;
    assert.throws(() => ship.SetValues(values, patch), /Patch/u, invalid);
    assert.equal(first.name, originalName);
    assert.equal(first.decalEffect, effect);
    assert.equal(effect.effectFilePath, "res:/decal/a.sm_depth");
    assert.equal(ship.decals.length, 2);
    assert.equal(manager.requests.length, requests);
    checkVfx();
  }
});

test("added decals use owner list notifications and retain their populated effect", async () =>
{
  const { ship, values, checkVfx } = await Fixture();
  const first = ship.decals[0];
  const addition = structuredClone(values.decals[0]);
  addition.__bluemetadata__.sof_source_id = "opaque-new-source";
  addition.name = "new decal";
  assert.equal(ship.SetValues({ decals: [addition] }, patch), true);
  assert.equal(ship.decals.length, 3);
  assert.equal(ship.decals[0], first);
  assert.equal(ship.decals[2].decalEffect.effectFilePath, addition.decalEffect.effectFilePath);
  assert.equal(ship.decals[2].decalEffect.parameters[0].name, "Amount");
  assert.equal(ship.decals[2]._priority, 2);
  assert.equal(ship.SetValues({ decals: [addition] }, patch), false);
  checkVfx();
});

test("metadata-only decal patch returns false; default values still replace lists", async () =>
{
  const { ship, values, checkVfx } = await Fixture();
  const first = ship.decals[0];
  const metadata = { ...values.decals[0].__bluemetadata__, SofDna: "changed bookkeeping" };
  assert.equal(ship.SetValues({ decals: [{ __bluemetadata__: metadata }] }, patch), false);
  assert.equal(BeObjectMetadata.Get(first, "SofDna"), "changed bookkeeping");
  checkVfx();
  assert.equal(ship.SetValues({ decals: [values.decals[0]] }), true);
  assert.equal(ship.decals.length, 1);
  assert.notEqual(ship.decals[0], first);
  assert.equal(new EveShip2().SetValues({ decals: [] }), false);
});
