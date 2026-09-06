import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuPsoDescription } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { Tr2RenderStateSetup } from "../../../npm/dist/resource/shader/index.js";
import { Topology } from "../../../npm/dist/global/consts/renderContext/index.js";

// Carbon's backend describes a pipeline incrementally and resolves it at the
// draw against a DEVICE-side cache (Tr2RenderContextDx12.cpp:793-807). These
// pin the description half: what it needs, what it projects to, and that two
// equal descriptions key the same - which is what makes two hundred objects
// through one material create one pipeline.

/** A setup with no authored states: RM_ANY's genuinely empty list. */
function emptySetup()
{
  return Tr2RenderStateSetup.fromKeyValues([]);
}

/** A description complete enough to resolve. */
function description(overrides = {})
{
  const pso = new CjsWebgpuPsoDescription();

  pso.shaderProgram = { IsValid: () => true, id: "program" };
  pso.renderStateSetup = emptySetup();
  pso.topology = Topology.TOP_TRIANGLE_STRIP;
  pso.colorFormats = [ "bgra8unorm" ];
  pso.depthFormat = "depth24plus";
  pso.vertexBufferLayouts = [ { arrayStride: 24, attributes: [] } ];

  return Object.assign(pso, overrides);
}

test("an incomplete description names what is missing rather than half-building", () =>
{
  // Carbon returns null from GetPipelineState and fails SetAllState
  // (cpp:847-851) rather than creating a partial pipeline. Saying WHICH piece
  // is missing is the part worth adding: the caller is a draw, and "no
  // pipeline" is not a diagnosis.
  const pso = new CjsWebgpuPsoDescription();

  assert.match(pso.GetMissing(), /shader program/u);
  assert.equal(pso.GetKey(), null);

  pso.shaderProgram = { IsValid: () => true };
  assert.match(pso.GetMissing(), /render-state setup/u);

  pso.renderStateSetup = emptySetup();
  assert.match(pso.GetMissing(), /topology/u);

  // A fan is the specific topology WebGPU has no primitive for, and Carbon's
  // own header already calls the value invalid on DX11.
  pso.topology = Topology.TOP_TRIANGLE_FAN;
  assert.match(pso.GetMissing(), /topology/u);

  pso.topology = Topology.TOP_TRIANGLES;
  assert.match(pso.GetMissing(), /attachment/u);

  pso.colorFormats = [ "bgra8unorm" ];
  assert.equal(pso.GetMissing(), null);
});

test("the recipe carries topology, layouts, targets and sample count", () =>
{
  const recipe = description().BuildRecipe();

  assert.equal(recipe.primitive.topology, "triangle-strip");
  assert.deepEqual(recipe.vertex.buffers, [ { arrayStride: 24, attributes: [] } ]);
  assert.deepEqual(recipe.fragment.targets.map(target => target.format), [ "bgra8unorm" ]);
  assert.equal(recipe.multisample.count, 1);

  // The state half comes from the projection, not from this class - it is the
  // one that knows how to read an interpreted setup.
  assert.notEqual(recipe.depthStencil, undefined);
  assert.equal(recipe.depthStencil.format, "depth24plus");
});

test("two equal descriptions key the same, and any difference splits them", () =>
{
  assert.equal(description().Equals(description()), true);

  const cases = [
    [ "topology", { topology: Topology.TOP_TRIANGLES } ],
    [ "colour format", { colorFormats: [ "rgba8unorm" ] } ],
    [ "depth format", { depthFormat: "depth32float" } ],
    [ "sample count", { sampleCount: 4 } ],
    [ "vertex layout", { vertexBufferLayouts: [ { arrayStride: 32, attributes: [] } ] } ]
  ];

  for (const [ name, changed ] of cases)
  {
    assert.equal(description().Equals(description(changed)), false, `${name} must split the key`);
  }
});

test("an override changes the key, so the two variants are distinct entries", () =>
{
  // Carbon applies overrides by substituting into the state list, which changes
  // the PSO and therefore the cache entry. Ours applies them in the projection,
  // so the recipe differs and the key differs - same outcome, and the reason a
  // per-setup cache would be redundant here.
  const plain = description();
  const inverted = description({ renderStateOverrides: { invertedCullMode: true } });

  assert.notEqual(plain.GetKey(), inverted.GetKey());
});

test("a different shader program splits the key even with identical state", () =>
{
  const first = description();
  const second = description({ shaderProgram: { IsValid: () => true, id: "other" } });

  assert.notEqual(first.GetKey(), second.GetKey());
});

test("a fill mode WebGPU cannot rasterize refuses at the projection", () =>
{
  // This is where wireframe lands. The flag reaches a backend that says it
  // cannot honour it, rather than being quietly dropped and drawing solid.
  const setup = emptySetup();

  setup.fill = "wireframe";

  assert.throws(() => description({ renderStateSetup: setup }).BuildRecipe(), /fill mode/u);
});
