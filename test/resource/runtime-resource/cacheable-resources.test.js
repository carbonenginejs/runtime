// Every resource class Carbon makes ICacheable maps it here too, and reports the
// memory use Carbon's GetMemoryUsage does, so MotherLode can size it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { ICacheable, IRoot } from "../../../npm/dist/global/blue/index.js";
import { HostBitmap } from "../../../npm/dist/global/imageio/index.js";
import { PixelFormat } from "../../../npm/dist/global/consts/renderContext/index.js";
import { CjsCarbonEffectWriter } from "../../../npm/dist/resource/format/index.js";
import {
  Tr2EffectRes,
  Tr2GrannyStateRes,
  Tr2ImageRes,
  Tr2LightProfileRes,
  TriGeometryRes,
  TriGrannyRes,
  TriTextureRes
} from "../../../npm/dist/resource/index.js";
import { Tr2AtlasTexture } from "../../../npm/dist/trinity/core/index.js";
import { buildSyntheticDescription, SYNTHETIC_PERMUTATIONS } from "./format/carbonEffectSynthetic.js";

/** Carbon's `MAP_INTERFACE( ICacheable )` and base list, as MotherLode queries them. */
function assertCacheable(instance)
{
  assert.equal(IRoot.prototype.QueryInterface.call(instance, ICacheable, 0x1), instance);
  assert.equal(CjsSchema.cast(instance, ICacheable), instance);
}

/** A four-body synthetic effect container. */
function effectContainer(label)
{
  const writer = new CjsCarbonEffectWriter({ compilerVersion: [ 1, 2, 6, 0 ], sourceHash: "0".repeat(32) });
  for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
  for (const index of [ 0, 1, 2, 3 ]) writer.addBody(index, buildSyntheticDescription({ label }));
  return writer.toBytes();
}

test("every Carbon ICacheable resource class maps ICacheable", () =>
{
  for (const Resource of [
    Tr2EffectRes,
    TriTextureRes,
    TriGeometryRes,
    TriGrannyRes,
    Tr2GrannyStateRes,
    Tr2ImageRes,
    Tr2LightProfileRes,
    Tr2AtlasTexture
  ])
  {
    assertCacheable(new Resource());
  }
});

test("Tr2EffectRes reports its container and each translated container once", () =>
{
  const bytes = effectContainer("A");
  const effect = new Tr2EffectRes().Initialize("res:/graphics/effect.dx11/quad/quadv5.sm_hi");

  assert.equal(effect.GetMemoryUsage(), 0);
  effect.DoLoad(bytes);
  assert.equal(effect.IsMemoryUsageKnown(), true);
  assert.equal(effect.GetMemoryUsage(), bytes.byteLength, "Tr2EffectRes.cpp:379-384: m_data.size()");

  // One translation carrying two permutations is held once.
  const translated = effectContainer("B");
  let translations = 0;
  effect.SetPermutationTranslator(() =>
  {
    translations += 1;
    return { bytes: translated, indices: [ 1, 2 ] };
  }, [ 0 ]);
  effect.GetShaderByIndex(1);
  effect.GetShaderByIndex(2);

  assert.equal(translations, 1);
  assert.equal(effect.GetMemoryUsage(), bytes.byteLength + translated.byteLength);

  effect.ReleasePayload();
  assert.equal(effect.GetMemoryUsage(), 0);
});

test("TriTextureRes estimates every mip times the array size, and forgets it with the bitmap", () =>
{
  const texture = new TriTextureRes().Initialize("res:/synthetic/size.dds");
  const bitmap = new HostBitmap();
  bitmap.Create(4, 4, 3, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);

  texture.SetPayload(bitmap);

  // TriTextureRes.cpp:1182-1189: 4x4, 2x2 and 1x1 at four bytes a pixel.
  assert.equal(texture.GetMemoryUsage(), 64 + 16 + 4);
  texture.ReleasePayload();
  assert.equal(texture.GetMemoryUsage(), 0);
});

test("Tr2LightProfileRes reports the profile strip once good, and nothing is known while loading", () =>
{
  const profile = new Tr2LightProfileRes().Initialize("res:/synthetic/profile.ies");

  profile.MarkLoading();
  assert.equal(profile.IsMemoryUsageKnown(), false);
  assert.equal(profile.GetMemoryUsage(), 0);
  profile.MarkPrepared();
  assert.equal(profile.IsMemoryUsageKnown(), true);
  assert.equal(profile.GetMemoryUsage(), 1024, "Tr2LightProfileRes.cpp:58-61: PROFILE_LIGHTMAP_SIZE");
});

test("Tr2GrannyStateRes reports Carbon's no-file 1024 for a document decoded elsewhere", () =>
{
  const state = new Tr2GrannyStateRes().Initialize("res:/synthetic/state.gsf");

  state.DoLoad({ stateMachine: {}, animationSets: [] });
  assert.equal(state.GetMemoryUsage(), 1024);
});

test("TriGrannyRes has no load path yet, so it reports nothing and is never cached", () =>
{
  assert.equal(new TriGrannyRes().GetMemoryUsage(), 0);
});
