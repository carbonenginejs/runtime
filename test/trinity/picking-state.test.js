import assert from "node:assert/strict";
import test from "node:test";
import { ITr2PickableScene, Tr2PrimitiveScene, Tr2PrimitiveSet, Tr2RenderContext,
  TriProjection, TriView, TriViewport } from "../../npm/dist/trinity/index.js";
import { ALResult, Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/index.js";
import { ShaderType } from "../../npm/dist/global/consts/renderContext/index.js";

// A REGISTERED program, so a bind can be told from the default-constructed
// program BeginManagedRendering binds to unbind (Tr2EffectStateManager.cpp:674).
// Registered after the backend is installed: one backend exists at a time, and
// installing it is a device replacement that releases every registration made
// before it (ReleaseDeviceResources, TriDevice.cpp:528).
function registerProgram()
{
  return Tr2EffectStateManager.registerShaderProgram([
    Tr2EffectStateManager.registerShader(ShaderType.PIXEL_SHADER, new Uint8Array([ 0x9C, 1 ]))
  ]);
}

for (const managed of [false, true])
{
  for (const fail of [false, true])
  {
    test(`primitive picks isolate cached bindings (managed=${managed}, failure=${fail})`, async t =>
    {
      const context = new Tr2RenderContext(), al = new Tr2RenderContextALStub();
      context.SetRenderContextAL(al);
      al.CreateDevice();
      const program = registerProgram();
      const esm = context.GetEffectStateManager(), scene = new Tr2PrimitiveScene();
      const object = new Tr2PrimitiveSet(), projection = new TriProjection(), view = new TriView(), viewport = new TriViewport();
      viewport.width = 800; viewport.height = 600;
      projection.PerspectiveFov(Math.PI / 4, 4 / 3, 1, 10000);
      view.SetLookAtPosition([700, 500, 1000], [0, 0, 0], [0, 1, 0]);
      t.after(() => { scene.Destruct(); esm.EndManagedRendering(); });
      t.mock.method(scene, "GetPickingObjectsToRender", () => [object]);
      t.mock.method(scene, "GetBatches", () => {});
      t.mock.method(scene, "GetRequiredPasses", () => [1, 4]);
      t.mock.method(scene, "SetPerFrameDataForPicking", () => {});
      t.mock.method(scene._pickBuffer, "PrepareResources", () => true);
      const data = new Uint8Array(new Float32Array([1, 1, 1, 0]).buffer);
      t.mock.method(scene._pickBuffer, "MapForReading", async () => ({ result: ALResult.S_OK, data }));
      t.mock.method(scene._pickBuffer, "UnmapForReading", () => {});
      // Any repeated handle exercises the real ESM's redundancy cache. The
      // backend sentinel models WebGPU unbinding its program at EndScene.
      let bound = false;
      t.mock.method(context, "SetShaderProgram", value => { bound = value.IsValid(); });
      t.mock.method(context, "EndScene", () => { bound = false; return ALResult.S_OK; });
      t.mock.method(scene, "RenderPicking", () =>
      {
        esm.ApplyShaderProgram(program);
        assert.equal(bound, true, "each picking pass must rebind its shader");
        if (fail) throw new Error("draw failed");
        return true;
      });
      if (managed) esm.BeginManagedRendering();
      else esm.EndManagedRendering();
      esm.ApplyShaderProgram(program);
      bound = false;
      for (let attempt = 0; attempt < 2; attempt++)
      {
        const results = { components: 5 };
        const pending = ITr2PickableScene.prototype.PickObject.call(scene, context, 400, 300, projection, view, viewport, results);
        assert.equal(esm.IsManagedRendering(), managed, "restore before awaiting readback");
        if (fail) await assert.rejects(pending, /draw failed/u);
        else { await pending; assert.equal(results.object, object); }
        assert.equal(bound, false, "submission cleared the backend binding");
        esm.ApplyShaderProgram(program);
        assert.equal(bound, true, "the caller must also rebind after picking");
        bound = false;
      }
    });
  }
}

