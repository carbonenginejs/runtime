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

/** One program and one layout, as Carbon keys them by pointer. */
const PROGRAM = { IsValid: () => true, id: "program" };
const LAYOUT = { GetDefinition: () => [ { stream: 0 } ] };

/** Stream strides with stream 0 at the given stride. */
function strides(first)
{
  const values = new Uint32Array(16);

  values[0] = first;

  return values;
}

/** A description complete enough to resolve. */
function description(overrides = {})
{
  const pso = new CjsWebgpuPsoDescription();

  pso.shaderProgram = PROGRAM;
  pso.vertexLayout = LAYOUT;
  pso.streamStrides = strides(24);
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
  // Carbon's operator== (PsoDescription.cpp:68-71): the program and layout by
  // pointer, the rest by the block's content.
  assert.equal(description().Equals(description()), true);
  assert.equal(description().GetKey(), description().GetKey());

  // One negative control per slot of the hashable block.
  const cases = [
    [ "shader program", { shaderProgram: { IsValid: () => true, id: "other" } } ],
    [ "vertex layout", { vertexLayout: { GetDefinition: () => [ { stream: 0 } ] } } ],
    [ "topology", { topology: Topology.TOP_TRIANGLES } ],
    [ "render-state content", { renderStateSetup: Object.assign(emptySetup(), { cull: "cw" }) } ],
    [ "inverted depth test", { renderStateOverrides: { invertedDepthTest: true } } ],
    [ "inverted cull mode", { renderStateOverrides: { invertedCullMode: true } } ],
    [ "colour format", { colorFormats: [ "rgba8unorm" ] } ],
    [ "second colour target", { colorFormats: [ "bgra8unorm", "rg16float" ] } ],
    [ "depth format", { depthFormat: "depth32float" } ],
    [ "sample count", { sampleCount: 4 } ],
    [ "UNORM stand-in", { unormTargets: [ true ] } ],
    [ "unclipped depth", { unclippedDepth: true } ],
    [ "coverage discard", { coverageDiscard: 1 } ],
    [ "strip index format", { stripIndexFormat: "uint16" } ],
    [ "stride of a stream the layout reads", { streamStrides: strides(32) } ]
  ];

  for (const [ name, changed ] of cases)
  {
    assert.equal(description().Equals(description(changed)), false, `${name} must split the key`);
  }
});

test("what does not change the pipeline does not split the key", () =>
{
  // The setup keys by CONTENT, as DX12's block holds resolved descriptors: two
  // setups interpreted from the same states are one pipeline.
  assert.equal(description().Equals(description({ renderStateSetup: emptySetup() })), true, "a second setup, same states");

  // Only streams the layout reads are keyed (Metal's stream mask, :1512-1531).
  const unread = strides(24);
  unread[3] = 64;
  assert.equal(description().Equals(description({ streamStrides: unread })), true, "a stride on an unread stream");

  // The buffer layouts are derived from what is keyed, and built on a miss.
  assert.equal(description().Equals(description({ vertexBufferLayouts: [ { arrayStride: 99, attributes: [] } ] })), true);

  // The wireframe override is not a pipeline input here.
  assert.equal(description().Equals(description({ renderStateOverrides: { wireframe: true } })), true);
});

test("equal hashes alone never match: the block is compared", () =>
{
  const first = description();
  const second = description({ topology: Topology.TOP_TRIANGLES });

  first.UpdateHash();
  second.UpdateHash();

  assert.equal(first.BlockEquals(first.CopyBlock()), true);
  assert.equal(second.BlockEquals(first.CopyBlock()), false, "different blocks, whatever their hashes");
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

test("the authored blend and colour write mask reach every colour target", () =>
{
  // RM_ALPHA_ADDITIVE's shape: one + one, add. Until 2026-09-26 both pipeline
  // builders read `projected.blend`, which the projection never sets (it is
  // `projected.target.blend`), so every WebGPU pipeline was opaque with all
  // channels written. God rays' additive composite replaced the scene instead.
  const setup = emptySetup();

  setup.blend = {
    color: { src: "one", dst: "one", op: "add" },
    alpha: { src: "one", dst: "one", op: "add" },
    constant: null
  };
  setup.colorWrite = { red: true, green: true, blue: true, alpha: false };

  const recipe = description({ renderStateSetup: setup, colorFormats: [ "rgba16float", null, "r32float" ] }).BuildRecipe();
  const [ first, gap, third ] = recipe.fragment.targets;
  const additive = { srcFactor: "one", dstFactor: "one", operation: "add" };

  assert.deepEqual(first, { format: "rgba16float", writeMask: 0x7, blend: { color: additive, alpha: additive } });
  assert.equal(gap, null);
  assert.equal(third.format, "r32float");
  assert.equal("target" in recipe, false, "the projection's target is folded into the targets");

  // An opaque setup writes all channels and has no blend.
  const opaque = description().BuildRecipe().fragment.targets[0];
  assert.deepEqual(opaque, { format: "bgra8unorm", writeMask: 0xf });

  // And the keys differ because the pipelines differ.
  assert.notEqual(description({ renderStateSetup: setup }).GetKey(), description().GetKey());
});

test("a bound target the pixel shader does not write gets writeMask 0", () =>
{
  // The velocity scope: colour at 0, velocity at 1. A decal writes only
  // SV_Target0; D3D11 leaves RTV 1 untouched, WebGPU needs its mask at 0.
  const decal = { IsValid: () => true, GetIdentity: () => "decal", GetFragmentOutputs: () => [ 0 ] };
  const quadV5 = { IsValid: () => true, GetIdentity: () => "quadv5", GetFragmentOutputs: () => [ 0, 1 ] };
  const formats = [ "rgba16float", "rg16float" ];

  const [ decalColour, decalVelocity ] = description({ shaderProgram: decal, colorFormats: formats }).BuildRecipe().fragment.targets;
  assert.deepEqual(decalColour, { format: "rgba16float", writeMask: 0xf });
  assert.deepEqual(decalVelocity, { format: "rg16float", writeMask: 0 }, "same format, nothing written");

  const [ , quadVelocity ] = description({ shaderProgram: quadV5, colorFormats: formats }).BuildRecipe().fragment.targets;
  assert.deepEqual(quadVelocity, { format: "rg16float", writeMask: 0xf }, "a writer takes target 0's state");
});

test("a float stand-in for a UNORM target sets the shader's UNORM override for its slot", () =>
{
  // D3D stores a float written to R16G16B16A16_UNORM clamped to [0, 1], NaN as
  // 0; WebGPU renders it into rgba16float. TAA's history kept a NaN forever
  // (the operator's AA-then-post black screen) until the pipeline told the
  // shader to store as UNORM does.
  const program = {
    IsValid: () => true,
    id: "program",
    GetFragmentOutputs: () => [ 0, 1 ],
    GetUnormTargetOverrides: () => [ 0 ]
  };
  const pso = description({ shaderProgram: program, colorFormats: [ "rgba16float", "rgba16float" ] });

  // No stand-in bound: no constants.
  assert.equal(pso.BuildRecipe().fragment.constants, undefined);

  // Both slots stand-ins, but only slot 0's override is declared.
  pso.unormTargets = [ true, true ];
  assert.deepEqual(pso.BuildRecipe().fragment.constants, { cjsUnormTarget0: 1 });

  // The constants are part of the pipeline's identity.
  assert.notEqual(pso.GetKey(), description({ shaderProgram: program, colorFormats: [ "rgba16float", "rgba16float" ] }).GetKey());

  // A hand-written program declares none, so none is set.
  pso.shaderProgram = { IsValid: () => true, id: "hand", GetFragmentOutputs: () => [ 0 ], GetUnormTargetOverrides: () => [] };
  assert.equal(pso.BuildRecipe().fragment.constants, undefined);
});

test("the depth-of-field layer pass's coverage discard is a pipeline constant, set only where declared", () =>
{
  // Not Carbon (after ccpwgl 89973207): a transparent (1) or additive (2)
  // material run with this set discards invisible output, so its layer depth
  // is written only where it shows.
  const program = {
    IsValid: () => true,
    id: "program",
    GetFragmentOutputs: () => [ 0 ],
    GetUnormTargetOverrides: () => [],
    HasCoverageDiscardOverride: () => true
  };
  const pso = description({ shaderProgram: program });

  assert.equal(pso.BuildRecipe().fragment.constants, undefined, "off by default: the shader is unchanged");

  pso.coverageDiscard = 2;
  assert.deepEqual(pso.BuildRecipe().fragment.constants, { cjsCoverageDiscard: 2 });
  assert.notEqual(pso.GetKey(), description({ shaderProgram: program }).GetKey(), "a distinct pipeline");

  pso.shaderProgram = { ...program, HasCoverageDiscardOverride: () => false };
  assert.equal(pso.BuildRecipe().fragment.constants, undefined, "a module without it gets none");
});
