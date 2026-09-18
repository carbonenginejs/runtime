import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import {
  ITr2Renderable,
  Tr2Transform,
  TriRenderBatchMap
} from "../../npm/dist/trinity/core/index.js";
import {
  EveChildCloud,
  EveEntity,
  EveSpaceObject2
} from "../../npm/dist/trinity/eve/index.js";
import {
  Tr2InteriorPlaceable,
  Tr2SkinnedObject
} from "../../npm/dist/character/index.js";


test("ITr2Renderable publishes Carbon's default and throwing required surface", () =>
{
  const renderable = new ITr2Renderable();
  assert.equal(CjsSchema.GetConstructor("ITr2Renderable"), ITr2Renderable);
  assert.equal(renderable.IsVisible({}), true);
  assert.throws(() => renderable.GetBatches(), /ITr2Renderable\.GetBatches/u);
  assert.throws(() => renderable.HasTransparentBatches(), /ITr2Renderable\.HasTransparentBatches/u);
  assert.throws(() => renderable.GetSortValue(), /ITr2Renderable\.GetSortValue/u);
  assert.throws(() => renderable.GetPerObjectData(), /ITr2Renderable\.GetPerObjectData/u);

  for (const method of [ "GetBatches", "HasTransparentBatches", "GetSortValue", "GetPerObjectData" ])
  {
    assert.equal(CjsSchema.getMethod(ITr2Renderable, method)?.impl?.status, "abstract");
  }
});

test("only Carbon renderable providers inherit the nominal identity", () =>
{
  assert.equal(CjsSchema.cast(new EveEntity(), ITr2Renderable) !== null, false);
  assert.equal(CjsSchema.cast(new Tr2Transform(), ITr2Renderable) !== null, true);
  assert.equal(CjsSchema.cast(new EveSpaceObject2(), ITr2Renderable) !== null, true);
  assert.equal(CjsSchema.cast(new EveChildCloud(), ITr2Renderable) !== null, true);
  assert.equal(CjsSchema.cast(new Tr2InteriorPlaceable(), ITr2Renderable) !== null, true);
  assert.equal(CjsSchema.cast(new Tr2SkinnedObject(), ITr2Renderable) !== null, true);
  assert.equal(CjsSchema.cast({ GetBatches() {} }, ITr2Renderable) !== null, false);
});

test("batch collection calls the owned renderable contract directly", () =>
{
  const map = new TriRenderBatchMap([]);
  assert.throws(() => map.CollectFromRenderables([ {} ]), /GetPerObjectData/u);
});
