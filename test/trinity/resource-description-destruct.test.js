import assert from "node:assert/strict";
import test from "node:test";
import { Tr2RegisterMapAL, Tr2ResourceSetDescriptionAL, Tr2RenderContextALStub, Tr2BufferDescriptionAL, Tr2BitmapDimensions } from "../../npm/dist/trinityal/index.js";
import { Tr2GpuUsage, Tr2CpuUsage, PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("resource-description teardown handles moved arrays and releases owned handles without damaging a copy", () =>
{
  const context = new Tr2RenderContextALStub();
  context.CreateDevice();
  const registers = new Tr2RegisterMapAL({ stage: 1, signature: { registers: [
    { registerType: 36, registerIndex: 3 },
    { registerType: 64, registerIndex: 4 },
    { registerType: 1, registerIndex: 2 }
  ] } });
  const description = new Tr2ResourceSetDescriptionAL({ registers });
  const buffer = context.CreateBuffer(Tr2BufferDescriptionAL.create__Stride(4, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE));
  const texture = context.CreateTexture(Tr2BitmapDimensions.create__WidthHeightMipCountFormat(4, 4, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM), { gpuUsage: Tr2GpuUsage.RENDER_TARGET });
  const sampler = context.CreateSamplerState({ minFilter: 2, magFilter: 2, mipFilter: 2, addressU: 1, addressV: 1, addressW: 1 });
  description.SetSrv__TextureAL(1, 3, texture);
  description.SetSrv__BufferAL(1, 3, buffer);
  description.SetUav__TextureAL(1, 4, texture);
  description.SetUav__BufferAL(1, 4, buffer);
  description.SetSampler(1, 2, sampler);
  const peer = new Tr2ResourceSetDescriptionAL({ copy: description });
  const moved = new Tr2ResourceSetDescriptionAL({ move: description });
  try
  {
    CjsGraph.finalDelete(description);
    CjsGraph.finalDelete(description);
    assert.equal(moved._srv[0].buffer.IsValid(), true);
    CjsGraph.finalDelete(moved);
    CjsGraph.finalDelete(moved);
    assert.equal(moved._srv[0].buffer.IsValid(), false);
    assert.equal(moved._uav[0].buffer.IsValid(), false);
    assert.equal(moved._srv[0].texture.IsValid(), false);
    assert.equal(moved._uav[0].texture.IsValid(), false);
    assert.equal(moved._samplers[0].sampler.IsValid(), false);
    assert.equal(peer._srv[0].buffer.IsValid(), true);
    assert.equal(peer._uav[0].buffer.IsValid(), true);
    assert.equal(peer._srv[0].texture.IsValid(), true);
    assert.equal(peer._uav[0].texture.IsValid(), true);
    assert.equal(peer._samplers[0].sampler.IsValid(), true);
    assert.equal(buffer.IsValid(), true);
    assert.equal(texture.IsValid(), true);
    assert.equal(sampler.IsValid(), true);
  }
  finally
  {
    CjsGraph.finalDelete(peer);
    CjsGraph.finalDelete(moved);
    buffer.Destroy();
    texture.Destroy();
    sampler.Destroy();
    context.Destroy();
  }
});
