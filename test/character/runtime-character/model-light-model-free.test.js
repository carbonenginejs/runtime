import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { IInitialize, INotify } from "../../../npm/dist/global/blue/index.js";
import { Tr2Model, Tr2SkinnedModel, Tr2InteriorLightSource, ITr2InteriorLight, ITr2InteriorCullable } from "../../../npm/dist/character/index.js";
import { Tr2Mesh } from "../../../npm/dist/trinity/index.js";

const fixture = name => JSON.parse(readFileSync(new URL("../../support/" + name + ".json", import.meta.url), "utf8")).object;

test("real Aura lights retain derived bounds and nominal interior contracts", () =>
{
  for (const values of fixture("interiorLightsAsset"))
  {
    const light = CjsSchema.from(values._type, values);
    const expectedMin = Array.from(light.position, v => Math.fround(v - light.radius));
    const expectedMax = Array.from(light.position, v => Math.fround(v + light.radius));
    assert.deepEqual(Array.from(light._boundsMin), expectedMin);
    assert.deepEqual(Array.from(light._boundsMax), expectedMax);
    assert.equal(CjsSchema.cast(light, ITr2InteriorLight), light);
    assert.equal(CjsSchema.cast(light, ITr2InteriorCullable), light);
    assert.equal("SetValues" in light, false);
    const control = CjsSchema.from(values._type, values, { initialize: false, notify: false });
    assert.notDeepEqual(Array.from(control._boundsMin), expectedMin,
      "negative control: the authored positions do not update bounds without lifecycle calls");
  }
  assert.deepEqual(mappedInterfaces(Tr2InteriorLightSource), new Set([Tr2InteriorLightSource, IInitialize, INotify, ITr2InteriorLight]));
});

test("real character model retains typed meshes without a model transport base", () =>
{
  const values = fixture("skinnedModelAsset");
  const model = CjsSchema.from(values._type, values);
  assert.ok(model instanceof Tr2Model);
  assert.ok(model instanceof Tr2SkinnedModel);
  assert.equal(model.name, "male");
  assert.equal(model.skeletonName, "Root");
  assert.equal(model.meshes.length, 14);
  assert.ok(model.meshes.every(mesh => mesh instanceof Tr2Mesh));
  assert.equal("SetValues" in model, false);
  assert.equal("GetValues" in model, false);
  const control = new Tr2SkinnedModel();
  CjsSchema.setValuesFromSchema(control, values);
  assert.equal(control.meshes[0] instanceof Tr2Mesh, false,
    "negative control: scalar transport does not construct typed mesh children");
  assert.deepEqual(mappedInterfaces(Tr2Model), new Set([Tr2Model]));
  assert.deepEqual(mappedInterfaces(Tr2SkinnedModel), new Set([Tr2SkinnedModel, IInitialize, INotify, Tr2Model]));
});
