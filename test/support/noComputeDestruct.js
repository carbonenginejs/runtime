import assert from "node:assert/strict";
import { Tr2GpuParticleSystem, Tr2RenderContext, Tr2Effect } from "../../npm/dist/trinity/index.js";
import { Tr2GpuParticleSystemNoCompute } from "../../npm/dist/trinity/particle/Tr2GpuParticleSystemNoCompute.js";
import { Tr2ConstantBufferAL, Tr2TextureAL } from "../../npm/dist/trinityal/index.js";

export function assertNoComputeTeardown(t, throughSystem)
{
  const context = new Tr2RenderContext();
  context.GetRenderContextAL().CreateDevice();
  const system = new Tr2GpuParticleSystem();
  system.maxParticles = 4;
  const helper = new Tr2GpuParticleSystemNoCompute(system);
  system._noCompute = helper;
  assert.equal(helper.Prepare(1048576, context), true);
  const textures = [...helper._state.flat(), helper._params];
  const texturePeers = textures.map(texture => new Tr2TextureAL({ copy: texture }));
  const constants = [helper._updateCB, helper._emitCB, helper._drawCB];
  const constantPeers = constants.map(buffer =>
  {
    buffer.Create__Size(16, context);
    return new Tr2ConstantBufferAL({ copy: buffer });
  });
  const effects = ["_updateEffect", "_emitEffect", "_drawEffect"].map(field =>
  {
    helper[field] = new Tr2Effect();
    return t.mock.method(helper[field], "Destruct");
  });
  try
  {
    for (let repeat = 0; repeat < 2; repeat++)
    {
      if (throughSystem) system.Destruct();
      else helper.Destroy();
      for (const texture of textures) assert.equal(texture.IsValid(), false);
      for (const texture of texturePeers) assert.equal(texture.IsValid(), true);
      for (const buffer of constants) assert.equal(buffer.IsValid(), false);
      for (const buffer of constantPeers) assert.equal(buffer.IsValid(), true);
    }
    // The system's second Destruct answers false; the helper's own Destroy repeats.
    for (const effect of effects) assert.equal(effect.mock.callCount(), throughSystem ? 1 : 2);
    assert.equal(system._noCompute, helper);
    assert.equal(helper.system, system);
  }
  finally
  {
    for (const texture of texturePeers) texture.Destroy();
    for (const buffer of constantPeers) buffer.Destroy();
  }
}
