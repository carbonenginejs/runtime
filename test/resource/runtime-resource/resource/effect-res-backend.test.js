import test from "node:test";
import assert from "node:assert/strict";

import { CjsCarbonEffectWriter } from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { buildSyntheticDescription, SYNTHETIC_PERMUTATIONS } from "../format/carbonEffectSynthetic.js";
import { Tr2EffectRes } from "../../../../src/trinity/shader/Tr2EffectRes.js";

// The orchestrator commits, once, the tree shipped containers come from, the
// backend they are prepared for and the translator between them. DoLoad then
// translates a container whose path is in the source tree; the target's own
// tree loads as stored; any other tree is read as it is. The commitment is
// process-wide, so this file commits once and every test shares it.

/** A container whose four indices carry bodies labelled by `labels`. */
function container(labels)
{
  const writer = new CjsCarbonEffectWriter({ compilerVersion: [ 1, 2, 6, 0 ], sourceHash: "0123456789abcdef0123456789abcdef" });
  for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
  labels.forEach((label, index) => writer.addBody(index, buildSyntheticDescription({ label })));
  return writer.toBytes();
}

const SHIPPED = container([ "S", "S", "S", "S" ]);
const TRANSLATED = container([ "T", "T", "T", "T" ]);
const calls = [];
const translator = {
  buildEffect(bytes, options)
  {
    calls.push({ bytes, options });
    return {
      bytes: TRANSLATED,
      metadata: { bodyIndex: 0 },
      permutationGraph: { variants: [ 0, 1, 0, 2 ].map((body, permutationIndex) => ({ permutationIndex, bodyKey: `body${body}` })) }
    };
  }
};

/** Loads SHIPPED into a resource at `path` and reports what happened. */
function Load(path)
{
  calls.length = 0;
  const res = path === null ? new Tr2EffectRes() : new Tr2EffectRes().Initialize(path);
  res.DoLoad(SHIPPED);
  return { res, calls: [ ...calls ] };
}

test("the commitment is validated, and holds once", () =>
{
  assert.equal(Tr2EffectRes.GetBackend(), null);
  assert.throws(() => Tr2EffectRes.CommitBackend({ source: "dx11", target: "webgpu" }), /need a translator/u);
  assert.throws(() => Tr2EffectRes.CommitBackend({ source: "dx11", target: "webgpu", translator: {} }), /buildEffect/u);
  assert.throws(() => Tr2EffectRes.CommitBackend({ source: "dx11", target: "web gpu", translator }), /effect tree name/u);
  assert.throws(() => Tr2EffectRes.CommitBackend({ source: "dx11", target: "webgpu", translator, permutations: "some" }), /permutations/u);

  Tr2EffectRes.CommitBackend({ source: "dx11", target: "webgpu", translator });
  Tr2EffectRes.CommitBackend({ source: "dx11", target: "webgpu", translator });
  assert.deepEqual(Tr2EffectRes.GetBackend(), { source: "dx11", target: "webgpu", translator, permutations: "onDemand" });

  // effect.dx11/ can only ever hold one translation per instance.
  assert.throws(() => Tr2EffectRes.CommitBackend({ source: "dx11", target: "webgl2", translator }), /committed to dx11 -> webgpu/u);
  assert.throws(() => Tr2EffectRes.CommitBackend({ source: "dx12", target: "webgpu", translator }), /new instance/u);
});

test("a source-tree container is translated on load and keeps its source path", () =>
{
  const { res, calls: made } = Load("res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_hi");

  assert.equal(made.length, 1, "on demand, the load translates the default permutation only");
  assert.equal(made[0].bytes, SHIPPED);
  assert.equal(made[0].options.source, "res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_hi");
  assert.deepEqual(made[0].options.permutation, []);
  assert.equal(res.GetPath(), "res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_hi");
  assert.equal(res.GetContainerBytes(), TRANSLATED, "the translation is what is read");
  assert.equal(res.CarriesBackendBlock(), true, "translated, so its bodies carry the target's block");
  assert.deepEqual([ ...res._translatedIndices ], [ 0, 2 ], "indices sharing the translated body need no more translation");
});

test("an Incarna dx11 .fxt is the same source tree; its dx9 and gles2 siblings are not", () =>
{
  const fxt = Load("res:/graphics/shaders/compiled/dx11/incarnadetailedtransparent.fxt");
  assert.equal(fxt.calls.length, 1);
  assert.equal(fxt.res.CarriesBackendBlock(), true);

  for (const platform of [ "dx9", "gles2" ])
  {
    const other = Load(`res:/graphics/shaders/compiled/${platform}/incarnadetailedtransparent.fxt`);
    assert.equal(other.calls.length, 0, `${platform} is neither source nor target`);
    assert.equal(other.res.GetContainerBytes(), SHIPPED);
    assert.equal(other.res.CarriesBackendBlock(), false);
  }
});

test("the target's own tree loads as stored", () =>
{
  const { res, calls: made } = Load("res:/graphics/effect.webgpu/cjs/selection/selectionmask.sm_depth");

  assert.equal(made.length, 0);
  assert.equal(res.GetContainerBytes(), SHIPPED);
  assert.equal(res.CarriesBackendBlock(), true, "a stored webgpu container carries its block");
});

test("other trees and pathless bytes are read as they are", () =>
{
  const dx12 = Load("res:/graphics/effect.dx12/managed/space/quad/quadv5.sm_hi");
  assert.equal(dx12.calls.length, 0);
  assert.equal(dx12.res.CarriesBackendBlock(), false);

  const pathless = Load(null);
  assert.equal(pathless.calls.length, 0);
  assert.equal(pathless.res.CarriesBackendBlock(), null, "no path: the reader detects for itself");
});

test("a reload as stored drops the previous translator and block answer", () =>
{
  const res = new Tr2EffectRes();
  res.SetPermutationTranslator(() => { throw new Error("stale translator ran"); }, [ 2 ]);
  res.DoLoad(SHIPPED);

  assert.equal(res._translatePermutation, null);
  assert.equal(res.CarriesBackendBlock(), null);
  assert.equal(res.GetShaderByIndex(1).effect.techniques[0].passes[0].stageInputs[0].constants[0].name, "SConstant");
});
