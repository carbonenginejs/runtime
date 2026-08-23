import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AssertFormatFeature,
  FullMipLevelCount,
  LevelLayout,
  MipSize,
  PlanTextureUpload,
  TEXTURE_FORMATS
} from "../src/core/textureLayout.js";

test("LevelLayout counts block rows, not pixel rows", () =>
{
  const bc3 = TEXTURE_FORMATS.get("bc3-rgba-unorm");
  const rgba = TEXTURE_FORMATS.get("rgba8unorm");

  // 256x256 BC3: 64 blocks across at 16 bytes each, 64 block rows.
  const compressed = LevelLayout(bc3, 256, 256, 0);
  assert.deepEqual(
    [ compressed.bytesPerRow, compressed.rowsPerImage, compressed.byteLength ],
    [ 1024, 64, 65536 ]
  );

  // The same image uncompressed is four times the size, and its rowsPerImage
  // is the pixel height. Passing that pixel height for the BC texture is the
  // classic bug: it uploads four times the rows that exist and reads garbage.
  const plain = LevelLayout(rgba, 256, 256, 0);
  assert.deepEqual([ plain.bytesPerRow, plain.rowsPerImage ], [ 1024, 256 ]);
  assert.equal(plain.byteLength, compressed.byteLength * 4);
});

test("LevelLayout rounds a block-compressed mip tail up to a whole block", () =>
{
  const bc1 = TEXTURE_FORMATS.get("bc1-rgba-unorm");

  // 8x8 -> 4x4 -> 2x2 -> 1x1. The last three levels are all one 8-byte block,
  // because a partial block still occupies a whole one. Computing a level's
  // footprint from its pixel size alone under-counts every one of them.
  assert.deepEqual([ 0, 1, 2, 3 ].map(level => LevelLayout(bc1, 8, 8, level).byteLength), [ 32, 8, 8, 8 ]);
  assert.deepEqual([ 0, 1, 2, 3 ].map(level => LevelLayout(bc1, 8, 8, level).rowsPerImage), [ 2, 1, 1, 1 ]);

  // A non-multiple-of-four size rounds up too: 5 texels is two blocks.
  assert.equal(LevelLayout(bc1, 5, 5, 0).bytesPerRow, 16);
  assert.equal(LevelLayout(bc1, 5, 5, 0).rowsPerImage, 2);
});

test("MipSize and FullMipLevelCount floor at one texel", () =>
{
  assert.deepEqual([ 0, 1, 2, 3, 4 ].map(level => MipSize(8, level)), [ 8, 4, 2, 1, 1 ]);
  assert.equal(FullMipLevelCount(256, 256), 9);
  assert.equal(FullMipLevelCount(256, 64), 9, "the longer edge decides the chain length");
  assert.equal(FullMipLevelCount(1, 1), 1);
});

test("PlanTextureUpload lays a mip chain out layer-major, as DDS stores it", () =>
{
  const plan = PlanTextureUpload({
    format: "bc3-rgba-unorm",
    width: 8,
    height: 8,
    layers: 2,
    mipLevelCount: 2
  });

  // Each layer's complete chain, then the next layer - not each level across
  // layers. That is DDS's order, and reading it any other way would need a
  // repack for no reason.
  assert.deepEqual(plan.writes.map(write => [ write.layer, write.level, write.offset ]), [
    [ 0, 0, 0 ],
    [ 0, 1, 64 ],
    [ 1, 0, 80 ],
    [ 1, 1, 144 ]
  ]);
  assert.equal(plan.byteLength, 160);
  assert.equal(plan.viewDimension, "2d-array");
});

test("PlanTextureUpload knows a cube is six square layers", () =>
{
  const plan = PlanTextureUpload({
    format: "rgba8unorm",
    width: 4,
    height: 4,
    layers: 6,
    viewDimension: "cube"
  });

  assert.equal(plan.layers, 6);
  assert.equal(plan.byteLength, 4 * 4 * 4 * 6);

  assert.throws(
    () => PlanTextureUpload({ format: "rgba8unorm", width: 4, height: 4, layers: 3, viewDimension: "cube" }),
    /requires exactly 6 layers/
  );
  assert.throws(
    () => PlanTextureUpload({ format: "rgba8unorm", width: 8, height: 4, layers: 6, viewDimension: "cube" }),
    /must be square/
  );
  // A cube array is a multiple of six.
  assert.equal(
    PlanTextureUpload({ format: "rgba8unorm", width: 4, height: 4, layers: 12, viewDimension: "cube-array" }).layers,
    12
  );
  assert.throws(
    () => PlanTextureUpload({ format: "rgba8unorm", width: 4, height: 4, layers: 7, viewDimension: "cube-array" }),
    /multiple of 6/
  );
});

test("PlanTextureUpload refuses a chain longer than the image has", () =>
{
  assert.throws(
    () => PlanTextureUpload({ format: "rgba8unorm", width: 8, height: 8, mipLevelCount: 5 }),
    /exceeds the 4 levels/
  );
  assert.throws(() => PlanTextureUpload({ format: "not-a-format", width: 4, height: 4 }), /is not supported/);
  assert.throws(() => PlanTextureUpload({ format: "rgba8unorm", width: 0, height: 4 }), /width must be a positive/);
  assert.throws(
    () => PlanTextureUpload({ format: "rgba8unorm", width: 4, height: 4, viewDimension: "3d" }),
    /viewDimension 3d is not supported/
  );
});

test("AssertFormatFeature names the feature a compressed format needs", () =>
{
  const compressed = PlanTextureUpload({ format: "bc7-rgba-unorm", width: 4, height: 4 });
  const plain = PlanTextureUpload({ format: "rgba8unorm", width: 4, height: 4 });

  // Named before anything is created, so the caller knows what to request
  // rather than getting an unsupported-format error out of createTexture.
  assert.throws(
    () => AssertFormatFeature(compressed, { features: new Set() }),
    /requires the texture-compression-bc device feature/
  );
  assert.equal(AssertFormatFeature(compressed, { features: new Set([ "texture-compression-bc" ]) }), true);

  // An uncompressed format needs no feature, so it passes even on a device
  // that reports none at all.
  assert.equal(AssertFormatFeature(plain, {}), true);
});

test("TEXTURE_FORMATS covers the block sizes the BC family actually uses", () =>
{
  // BC1 and BC4 are eight bytes a block; every other BC format is sixteen.
  // Getting one of these wrong halves or doubles every upload of that format.
  const bytes = (name) => TEXTURE_FORMATS.get(name).blockBytes;
  assert.deepEqual([ bytes("bc1-rgba-unorm"), bytes("bc4-r-unorm") ], [ 8, 8 ]);
  assert.deepEqual(
    [ "bc2-rgba-unorm", "bc3-rgba-unorm", "bc5-rg-unorm", "bc6h-rgb-float", "bc7-rgba-unorm" ].map(bytes),
    [ 16, 16, 16, 16, 16 ]
  );

  for (const [ name, format ] of TEXTURE_FORMATS)
  {
    const compressed = name.startsWith("bc");
    assert.equal(format.blockWidth, compressed ? 4 : 1, `${name} block width`);
    assert.equal(format.blockHeight, compressed ? 4 : 1, `${name} block height`);
    assert.equal(Boolean(format.feature), compressed, `${name} feature gate`);
  }
});
