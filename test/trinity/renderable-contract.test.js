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
  assert.equal(new EveEntity() instanceof ITr2Renderable, false);
  assert.equal(new Tr2Transform() instanceof ITr2Renderable, true);
  assert.equal(new EveSpaceObject2() instanceof ITr2Renderable, true);
  assert.equal(new EveChildCloud() instanceof ITr2Renderable, true);
  assert.equal(new Tr2InteriorPlaceable() instanceof ITr2Renderable, true);
  assert.equal(new Tr2SkinnedObject() instanceof ITr2Renderable, true);
  assert.equal({ GetBatches() {} } instanceof ITr2Renderable, false);
});

test("batch collection calls the owned renderable contract directly", () =>
{
  const map = new TriRenderBatchMap([]);
  assert.throws(() => map.CollectFromRenderables([ {} ]), /GetPerObjectData/u);
});
