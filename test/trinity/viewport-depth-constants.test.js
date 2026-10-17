import assert from "node:assert/strict";
import { test } from "node:test";
import { Tr2Effect, Tr2RenderContext, Tr2VariableStore } from "../../npm/dist/trinity/index.js";
import { TriVariableContentType } from "../../npm/dist/trinity/generated/trinityCore/enums.js";
import { StubContext } from "../support/stubContext.js";

test("soft booster depth coordinates receive live ViewportSize constants", () =>
{
  const context = StubContext();
  const manager = context.GetEffectStateManager();
  const variable = Tr2VariableStore.globalStore().FindVariable("ViewportSize");
  assert.ok(variable, "Tr2EffectStateManager.cpp:633 registers ViewportSize before material mapping");
  assert.equal(variable.GetType(), TriVariableContentType.TRIVARIABLE_FLOAT4);
  assert.deepEqual(Array.from(variable.GetValue()), [ 0, 0, 1, 0 ]);

  // BoosterGlowAnimated.sm_depth, build 3615610, Main VS: b0[0] is
  // ViewportSize, not AutoRegister. Instruction 45 divides 0.5 by its xy
  // lanes before offsetting the DepthMap sampling coordinates. A missing
  // variable therefore freezes this material at zeros and produces infinity.
  const stage = {
    exists: true,
    constants: [{ name: "ViewportSize", offset: 0, size: 16, isAutoregister: false }],
    resources: new Map(), uavs: new Map(), samplers: new Map(),
    constantValues: new Uint8Array(0), GetConstantBufferSize: () => 16
  };
  const effect = new Tr2Effect();
  effect.shader = {
    GetEffect: () => ({ techniques: [{ passes: [{ stageInputs: [ stage ],
      resourceSetDesc: null, renderStateValues: [], stageOrder: [] }] }] }),
    ProcessEffect() {}
  };
  effect.RebuildCachedData();
  const input = effect.parametersForPasses[0].passes[0].stageInput[0];
  const uploaded = () =>
  {
    effect.ApplyConstants(0, input, false, context);
    return Array.from(new Float32Array(input.constantMirror.buffer));
  };

  manager.UpdateRenderTargetViewport(1280, 720);
  assert.deepEqual(uploaded(), [ 1280, 720, 1280, 720 ]);
  assert.equal(input.shaderParameters[0].sourceValue, variable);
  assert.equal(0.5 / uploaded()[0], 0.5 / 1280);

  manager.SetViewport({ x: 1000, y: 500, width: 800, height: 600 });
  assert.equal(manager.GetDeviceViewport().width, 280);
  assert.deepEqual(uploaded(), [ 800, 600, 1280, 720 ],
    "Tr2EffectStateManager.cpp:1242 publishes authored size, not the clipped size");

  manager.UpdateRenderTargetViewport(1920, 1080);
  assert.deepEqual(uploaded(), [ 1920, 1080, 1920, 1080 ],
    "target changes update the existing material without remapping it");
});

test("context construction preserves a previously reserved ViewportSize variable", () =>
{
  const store = Tr2VariableStore.globalStore();
  store.UnregisterVariable("ViewportSize");
  const reserved = store.GetVariable("ViewportSize");
  const context = new Tr2RenderContext();
  assert.equal(store.FindVariable("ViewportSize"), reserved);
  assert.equal(reserved.GetType(), TriVariableContentType.TRIVARIABLE_FLOAT4);
  context.GetEffectStateManager().SetViewport({ width: 640, height: 480 });
  assert.deepEqual(Array.from(reserved.GetValue()), [ 640, 480, 0, 0 ]);
});
