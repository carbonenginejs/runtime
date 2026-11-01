// Prepare hooks and state binding ported from Carbon: Tr2ImageRes::DoPrepare (Tr2ImageRes.cpp:50-53),
// Tr2RaycastGeometryRes::DoPrepare (TriGeometryRes.cpp:130-133), Tr2EffectRes::DoPrepare / OnPrepareResources /
// GetDescription (Tr2EffectRes.cpp:316-372), Tr2Shader::ApplyRenderStates / ApplyShaderOverride
// (Shader/Tr2Shader.cpp:173-190). Expected values are written from the Carbon source.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Tr2ImageRes, Tr2RaycastGeometryRes } from "../../../npm/dist/resource/index.js";
import { Tr2EffectRes, Tr2Shader } from "../../../npm/dist/trinity/shader/index.js";

test("Tr2ImageRes::DoPrepare has nothing to prepare and answers true", () =>
{
  assert.strictEqual(new Tr2ImageRes()._DoPrepare(), true);
});

test("Tr2RaycastGeometryRes::DoPrepare has nothing to prepare and answers true", () =>
{
  assert.strictEqual(new Tr2RaycastGeometryRes()._DoPrepare(), true);
});

test("Tr2EffectRes::DoPrepare drops every built shader (cpp:318)", () =>
{
  const effect = new Tr2EffectRes();
  effect._shaders.set(1, {});
  effect._shaders.set(2, {});

  assert.strictEqual(effect._DoPrepare(), true);
  assert.strictEqual(effect._shaders.size, 0);
});

test("Tr2EffectRes::GetDescription names the path (cpp:366-372)", () =>
{
  const effect = new Tr2EffectRes();
  // Carbon's m_path (BlueAsyncRes.h:153) is exposed read-only as "path"
  // (BlueAsyncRes_Blue.cpp:13) and set only by Initialize, which would start a
  // load here; the description needs only the member.
  effect._path = "res:/graphics/effect.fx";

  assert.strictEqual(effect.GetDescription(), "Tr2EffectRes: 'res:/graphics/effect.fx'");
});

test("Tr2EffectRes::OnPrepareResources needs Tr2Renderer, which the resource layer cannot reach", () =>
{
  assert.throws(() => new Tr2EffectRes()._OnPrepareResources(), /Tr2Renderer/);
});

/** A render context whose state manager records what it is asked to apply. */
function recordingContext()
{
  const calls = [];
  const manager = {
    ApplyRenderStates: states => calls.push([ "states", states ]),
    ApplyShaderProgram: program => calls.push([ "program", program ])
  };

  return { calls, context: { GetEffectStateManager: () => manager } };
}

test("Tr2Shader::ApplyRenderStates applies only the pass's render states (cpp:184-190)", () =>
{
  const shader = new Tr2Shader();
  const first = { renderStates: 11, shaderProgram: 101 };
  const second = { renderStates: 22, shaderProgram: 202 };
  shader.effect.techniques = [ { passes: [ first ] }, { passes: [ first, second ] } ];

  const { calls, context } = recordingContext();
  const result = shader.ApplyRenderStates(1, 1, context);

  assert.strictEqual(result, undefined);
  assert.deepEqual(calls, [ [ "states", 22 ] ]);
});

test("Tr2Shader::ApplyRenderStates on a missing technique faults as Carbon's indexing would", () =>
{
  const shader = new Tr2Shader();
  shader.effect.techniques = [];

  assert.throws(() => shader.ApplyRenderStates(0, 0, recordingContext().context), TypeError);
});

test("Tr2Shader::ApplyShaderOverride needs RegisterShaderProgramOverride, which is not ported", () =>
{
  const shader = new Tr2Shader();
  const { calls, context } = recordingContext();

  assert.throws(() => shader.ApplyShaderOverride(0, 0, new Tr2Shader(), 0, context), /RegisterShaderProgramOverride/);
  assert.deepEqual(calls, []);
});
