// EveSpaceObject2's notify hook and Carbon's byte FNV-1, which it seeds the
// impact overlay with (EveSpaceObject2.cpp:2455-2496, core/CcpHash.cpp:17-30).
import assert from "node:assert/strict";
import test from "node:test";

import { EveSpaceObject2 } from "../../npm/dist/trinity/index.js";
import { ccpHashFnv1, FNV1_INITIAL } from "../../npm/dist/global/utils/index.js";

test("ccpHashFnv1 is Carbon's CcpHashFNV1: bytes read as int8, strings as UTF-8", () =>
{
  // Hand-folded: hash *= prime; hash ^= (int8)byte.
  const fold = (hash, byte) => (Math.imul(hash, 16777619) ^ byte) >>> 0;

  assert.equal(ccpHashFnv1(""), FNV1_INITIAL);
  assert.equal(ccpHashFnv1("a"), fold(FNV1_INITIAL, 0x61));
  // 0xC3 0xA9 ("é" in UTF-8) fold in sign-extended, as Carbon's int8_t does.
  assert.equal(ccpHashFnv1("é"), fold(fold(FNV1_INITIAL, 0xC3 - 256), 0xA9 - 256));
  // Chaining as CcpHashFNV1(input, length, inputHash) does.
  assert.equal(ccpHashFnv1("Test", ccpHashFnv1("Hash")), ccpHashFnv1("HashTest"));
});

test("a clip factor crossing zero switches SPACE_OBJECT_CLIPPING on everything the hull draws", () =>
{
  // A cloak binds clipSphereFactor; without this switch the hull shaders keep
  // their non-clipping permutation and the ship never dissolves.
  const object = new EveSpaceObject2();
  const options = [];
  object.SetShaderOption = (name, value) => options.push(`${name}=${value}`);

  object.clipSphereFactor = 0.25;
  object.OnModified("clipSphereFactor");
  object.clipSphereFactor = 0.5;
  object.OnModified("clipSphereFactor");
  object.clipSphereFactor = 0;
  object.OnModified("clipSphereFactor");

  assert.deepEqual(options, [ "SPACE_OBJECT_CLIPPING=SOC_ENABLED", "SPACE_OBJECT_CLIPPING=SOC_DISABLED" ],
    "only the crossings switch (cpp:2463-2468)");
});

test("SetShaderOption reaches the mesh, overlays, decals, attachments and effect children", () =>
{
  const object = new EveSpaceObject2();
  const seen = [];
  const target = name => ({ SetShaderOption: (option, value) => seen.push(`${name}:${option}=${value}`) });

  object.mesh = target("mesh");
  object.overlayEffects.push(target("overlay"));
  object.decals.push(target("decal"));
  object.attachments.push(target("attachment"));
  object.effectChildren.push(target("child"));
  object.SetShaderOption("SPACE_OBJECT_CLIPPING", "SOC_ENABLED");

  assert.deepEqual(seen, [ "mesh", "overlay", "decal", "attachment", "child" ].map(name => `${name}:SPACE_OBJECT_CLIPPING=SOC_ENABLED`));
});
