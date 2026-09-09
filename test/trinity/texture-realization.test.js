import assert from "node:assert/strict";
import test from "node:test";

import { CreateTexture, DescribeTexturePayload, RealizeTexture } from "../../npm/dist/trinity/core/Tr2ImageIOHelpers.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { TriTextureParameter } from "../../npm/dist/trinity/index.js";
import { ResourceFlags } from "../../npm/dist/trinity/shader/index.js";
import { TriTextureRes } from "../../npm/dist/resource/texture/TriTextureRes.js";
import { Tr2ResourceSetDescriptionAL, Tr2TextureALStub } from "../../npm/dist/trinityal/index.js";
import { PixelFormat, TextureType, Tr2ColorSpace } from "../../npm/dist/global/consts/renderContext/index.js";

// Carbon's TriTextureRes creates its Tr2TextureAL in DoPrepare from the decoded
// bitmap (TriTextureRes.cpp:662-705) through Tr2ImageIOHelpers::CreateTexture,
// one Tr2SubresourceData per (mip, layer) indexed mip + layer * mipCount
// (Tr2ImageIOHelpers.cpp:104-128), and stores it with SetTexture. Ours makes it
// at first bind through the binding context and stores it in the same place.

/** A BC1 texture payload: 8x8 with two mips, one layer. */
function bc1Payload()
{
  const data = new Uint8Array(40);

  data.fill(1, 0, 32);
  data.fill(2, 32, 40);

  return {
    payloadType: "texture",
    width: 8,
    height: 8,
    dimension: "2d",
    pixelFormat: "bc1-rgba-unorm-srgb",
    isCompressed: true,
    mipCount: 2,
    arraySize: 1,
    data,
    subresources: [
      { mip: 0, layer: 0, offset: 0, byteLength: 32, width: 8, height: 8, rowPitch: 16, slicePitch: 32 },
      { mip: 1, layer: 0, offset: 32, byteLength: 8, width: 4, height: 4, rowPitch: 8, slicePitch: 8 }
    ]
  };
}

test("a texture payload describes Carbon's bitmap dimensions and subresource array", () =>
{
  const described = DescribeTexturePayload(bc1Payload());

  assert.equal(described.desc.GetFormat(), PixelFormat.PIXEL_FORMAT_BC1_UNORM_SRGB, "the canonical string became Carbon's enum");
  assert.equal(described.desc.GetType(), TextureType.TEX_TYPE_2D);
  assert.equal(described.desc.GetMipCount(), 2);
  assert.equal(described.initialData.length, 2);
  assert.deepEqual([ described.initialData[0].sysMemPitch, described.initialData[0].sysMem.byteLength ], [ 16, 32 ]);
  assert.equal(described.initialData[1].sysMem[0], 2, "the second mip's bytes, not the first's");

  // A cube's subresources land at mip + layer * mipCount.
  const cube = DescribeTexturePayload({
    payloadType: "texture", width: 2, height: 2, dimension: "cube", pixelFormat: "rgba8unorm", isCompressed: false,
    mipCount: 1, arraySize: 6, data: new Uint8Array(96),
    subresources: Array.from({ length: 6 }, (_, layer) => ({ mip: 0, layer, offset: layer * 16, byteLength: 16, width: 2, height: 2, rowPitch: 8, slicePitch: 16 }))
  });

  assert.equal(cube.desc.GetType(), TextureType.TEX_TYPE_CUBE);
  assert.equal(cube.desc.GetArraySize(), 6);
  assert.equal(cube.initialData.length, 6);

  // An RGBA payload is one mip of RGBA8, sRGB when it says so.
  const rgba = DescribeTexturePayload({ payloadType: "rgba", width: 2, height: 1, pixelFormat: "rgba8unorm", data: new Uint8Array(8), strideBytes: 8, origin: "top-left", colorSpace: "srgb", alphaMode: "straight" });

  assert.equal(rgba.desc.GetFormat(), PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB);
  assert.equal(rgba.initialData[0].sysMemPitch, 8);

  assert.equal(DescribeTexturePayload({ payloadType: "video" }), null);
  assert.equal(DescribeTexturePayload({ payloadType: "texture", pixelFormat: "rgb8unorm", dimension: "2d", width: 1, height: 1 }), null, "a format Carbon cannot spell");
});

test("RealizeTexture makes the resource's texture once it is prepared, and stores it on the resource", () =>
{
  // Carbon's textures are made through a context whose device exists.
  const context = new Tr2RenderContext();

  context.GetRenderContextAL().CreateDevice();
  const resource = new TriTextureRes();

  assert.equal(RealizeTexture(resource, context), null, "nothing before the payload arrives");
  assert.equal(resource.GetTexture(), null);

  resource.SetPayload(bc1Payload());
  resource.SetState(TriTextureRes.State.PREPARED);

  const texture = RealizeTexture(resource, context);

  assert.ok(texture instanceof Tr2TextureALStub, "the applying context's kind of texture");
  assert.equal(resource.GetTexture(), texture, "Carbon's m_texture");
  assert.equal(RealizeTexture(resource, context), texture, "made once");
  assert.equal(texture.GetFormat(), PixelFormat.PIXEL_FORMAT_BC1_UNORM_SRGB);
  assert.equal(texture.GetMipCount(), 2);

  // Dropping the payload drops the texture made from it.
  resource.SetPayload(null);
  assert.equal(resource.GetTexture(), null);
  assert.equal(RealizeTexture({ id: "not a texture resource" }, context), null);
  assert.equal(CreateTexture(new TriTextureRes(), context), null);
});

test("a texture parameter binds the realized texture, or the resource until it is ready, and re-dirties on completion", () =>
{
  // Carbon's textures are made through a context whose device exists.
  const context = new Tr2RenderContext();

  context.GetRenderContextAL().CreateDevice();
  const resource = new TriTextureRes();
  const parameter = new TriTextureParameter();
  const description = new Tr2ResourceSetDescriptionAL();
  const dirtied = [];

  parameter.resource = resource;
  parameter.OnAddedToMaterial({ ResourceChanged: () => dirtied.push("changed"), MarkConstantBuffersDirty() {} });

  // Not ready: the RESOURCE stands in, which a backend reads as the fallback.
  assert.equal(parameter.CopyToResourceSet(description, 1, 3, 0, context), true);
  assert.equal(description.Get("srv", 1, 3).resource, resource);

  resource.SetPayload(bc1Payload());
  resource.SetState(TriTextureRes.State.PREPARED);

  assert.ok(dirtied.length >= 1, "completion re-dirtied the material, as Carbon's m_onTextureChange does");
  assert.equal(parameter.CopyToResourceSet(description, 1, 3, ResourceFlags.RESOURCE_FLAG_SRGB, context), true, "the slot changed: texture replaces resource");

  const bound = description.Get("srv", 1, 3);

  assert.ok(bound.resource instanceof Tr2TextureALStub);
  assert.equal(bound.colorSpace, Tr2ColorSpace.COLOR_SPACE_SRGB);
});
