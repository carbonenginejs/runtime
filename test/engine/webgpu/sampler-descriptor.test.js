import assert from "node:assert/strict";
import test from "node:test";

import {
  CarbonSamplerDescriptor,
  IsEmulatedAddressMode
} from "../../../npm/dist/engine/webgpu/internal.js";

/**
 * The authored state of `s0` in a real quadv5.sm_hi, copied verbatim. Every
 * sampler a ship binds goes through this shape.
 */
const QUADV5_S0 = Object.freeze({
  comparison: false,
  minFilter: 3,
  magFilter: 2,
  mipFilter: 2,
  addressU: 1,
  addressV: 1,
  addressW: 3,
  mipLODBias: 0,
  maxAnisotropy: 16,
  comparisonFunc: 1,
  borderColor: [ 0, 0, 0, 0 ],
  minLOD: -3.4028234663852886e+38,
  maxLOD: 3.4028234663852886e+38,
  isDynamic: false
});

test("a real quadv5 sampler translates whole", () =>
{
  const descriptor = CarbonSamplerDescriptor(QUADV5_S0);

  assert.deepEqual(descriptor, {
    addressModeU: "repeat",
    addressModeV: "repeat",
    addressModeW: "clamp-to-edge",
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    lodMinClamp: 0,
    lodMaxClamp: 32,
    maxAnisotropy: 16
  });
});

test("the open LOD ends do not reach the device as FLT_MAX", () =>
{
  // WebGPU rejects them outright, so an author's "unbounded" has to land on
  // WebGPU's own bounds rather than on the float that expressed it.
  const { lodMinClamp, lodMaxClamp } = CarbonSamplerDescriptor(QUADV5_S0);

  assert.equal(lodMinClamp, 0);
  assert.equal(lodMaxClamp, 32);
});

test("no mip filter is expressed in the LOD clamp, not the filter", () =>
{
  // TF_NONE means no mipmapping. WebGPU cannot say that in the filter, so both
  // ends pin to zero and only the top level is ever sampled.
  const descriptor = CarbonSamplerDescriptor({ ...QUADV5_S0, mipFilter: 0 });

  assert.equal(descriptor.lodMinClamp, 0);
  assert.equal(descriptor.lodMaxClamp, 0);
});

test("anisotropy is dropped when the filters cannot back it", () =>
{
  // The device refuses anisotropy without linear on all three, so asking for
  // both is honoured only where it is expressible.
  const descriptor = CarbonSamplerDescriptor({ ...QUADV5_S0, magFilter: 1 });

  assert.equal(descriptor.magFilter, "nearest");
  assert.equal(descriptor.maxAnisotropy, 1);
});

test("border and mirror-once are flattened only at the descriptor", () =>
{
  // WebGPU has neither, and no extension for either. They may be substituted
  // here because the shader emulates them from the AUTHORED mode - which is
  // why the authored value must still be recognisable as emulated.
  const border = CarbonSamplerDescriptor({ ...QUADV5_S0, addressU: 4 });
  const mirrorOnce = CarbonSamplerDescriptor({ ...QUADV5_S0, addressU: 5 });

  assert.equal(border.addressModeU, "clamp-to-edge");
  assert.equal(mirrorOnce.addressModeU, "clamp-to-edge");

  assert.equal(IsEmulatedAddressMode(4), true);
  assert.equal(IsEmulatedAddressMode(5), true);
  assert.equal(IsEmulatedAddressMode(3), false);
});

test("mirror is native and is not flattened", () =>
{
  // Flattening this one too is the mistake that erased the distinction in
  // ccpwgl: mirrored repeat is native and must reach the device as itself.
  assert.equal(CarbonSamplerDescriptor({ ...QUADV5_S0, addressU: 2 }).addressModeU, "mirror-repeat");
});

test("a comparison sampler carries its compare function", () =>
{
  const descriptor = CarbonSamplerDescriptor({ ...QUADV5_S0, comparison: true, comparisonFunc: 4 });

  assert.equal(descriptor.compare, "less-equal");
});

test("an unknown authored value refuses rather than substituting", () =>
{
  // Substituting a default here would draw a wrong picture rather than fail.
  assert.throws(() => CarbonSamplerDescriptor({ ...QUADV5_S0, addressU: 9 }), /address mode/);
  assert.throws(() => CarbonSamplerDescriptor({ ...QUADV5_S0, minFilter: 9 }), /filter/);
  assert.throws(() => CarbonSamplerDescriptor(null), /no authored state/);
});
