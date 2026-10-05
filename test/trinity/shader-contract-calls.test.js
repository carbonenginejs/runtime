import test from "node:test";
import assert from "node:assert/strict";
import { Tr2RuntimeTextureParameter, Tr2Material, TriTransformParameter, Tr2RenderContext, TriVariableParameter, TriVariable } from "../../npm/dist/trinity/index.js";
import { Tr2ResourceSetDescriptionAL } from "../../npm/dist/trinityal/index.js";

test("runtime texture changes require attached materials to invalidate resource sets", () =>
{
  const parameter = new Tr2RuntimeTextureParameter();
  const material = new Tr2Material();
  parameter.OnAddedToMaterial(material);
  material.InvalidateResourceSets = undefined;
  assert.throws(() => parameter.OnModified("texture"), /InvalidateResourceSets/);
  let calls = 0;
  material.InvalidateResourceSets = () => calls++;
  parameter.OnModified("texture");
  assert.equal(calls, 1);
});

test("non-fixed transform parameters require the inverse-view getter and its result", () =>
{
  const parameter = new TriTransformParameter();
  parameter.transformBase = 1;
  const context = new Tr2RenderContext();
  const dest = new Float32Array(16);
  context.GetInverseViewTransform = undefined;
  assert.throws(() => parameter.CopyValueToEffect(0, dest, 64, context), /GetInverseViewTransform/);
  context.GetInverseViewTransform = () => null;
  assert.throws(() => parameter.CopyValueToEffect(0, dest, 64, context), TypeError);
});

test("fixed transform parameters need no render context", () =>
{
  const parameter = new TriTransformParameter();
  const dest = new Float32Array(16);
  parameter.CopyValueToEffect(0, dest, 64, null);
  assert.deepEqual(Array.from(dest), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
});

for (const method of ["CopyToResourceSet", "ApplyUav"])
{
  test(`variable parameters return the present variable's ${method} result directly`, () =>
  {
    const parameter = new TriVariableParameter();
    parameter.variable = new TriVariable();
    parameter.variable[method] = () => undefined;
    assert.equal(parameter[method](new Tr2ResourceSetDescriptionAL(), 0, 2), undefined);
  });
}

test("unbound variables preserve the native empty resource and UAV branches", () =>
{
  const parameter = new TriVariableParameter();
  const desc = new Tr2ResourceSetDescriptionAL();
  const calls = [];
  desc.SetUav_TextureAL = (...args) => { calls.push(args); return true; };
  assert.equal(parameter.CopyToResourceSet(desc, 0, 2), false);
  assert.equal(parameter.ApplyUav(desc, 1, 3), true);
  assert.deepEqual(calls, [[1, 3, null]]);
});

