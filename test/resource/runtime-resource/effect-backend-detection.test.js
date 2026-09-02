// The loader knows which tree its bytes came from, because backend selection is
// by resource path. Before this, nothing could read that back, so every body was
// parsed twice on the chance it carried a per-pass backend block - a fallback the
// reader documents for bytes arriving with no context at all.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EffectCarriesBackendBlock,
  EffectPlatformFromPath,
  ResolveEffectPath,
  TranslatedEffectPlatforms
} from "../../../npm/dist/global/utils/index.js";

test("the platform is read back out of a resolved path", () =>
{
  assert.equal(EffectPlatformFromPath("res:/graphics/effect.webgpu/quad/quadv5.sm_hi"), "webgpu");
  assert.equal(EffectPlatformFromPath("res:/graphics/effect.webgl/quad/quadv5.sm_hi"), "webgl");
  assert.equal(EffectPlatformFromPath("res:/graphics/effect.dx11/quad/quadv5.sm_hi"), "dx11");
});

test("it is exactly the inverse of the resolver", () =>
{
  // Whatever ResolveEffectPath substitutes in, this reads back out.
  for (const platformName of [ "webgpu", "webgl", "dx11" ])
  {
    const resolved = ResolveEffectPath("res:/graphics/effect/quad/quadv5.fx", { platformName });

    assert.equal(EffectPlatformFromPath(resolved), platformName);
  }
});

test("an unresolved or foreign path names no tree", () =>
{
  // The authored path has no tree yet; a geometry path never had one.
  assert.equal(EffectPlatformFromPath("res:/graphics/effect/quad/quadv5.fx"), null);
  assert.equal(EffectPlatformFromPath("res:/dx9/model/ship/amarr/frigate/af1/af1_t1.gr2"), null);
  assert.equal(EffectPlatformFromPath(""), null);
  assert.equal(EffectPlatformFromPath(null), null);
});

test("our trees carry a backend block and Carbon's do not", () =>
{
  // The block records what translation decided - data textures, merged detail
  // maps, packed local lights - none of it derivable from the shader. A stock
  // Carbon body has nothing to record.
  assert.equal(EffectCarriesBackendBlock("res:/graphics/effect.webgpu/quad/quadv5.sm_hi"), true);
  assert.equal(EffectCarriesBackendBlock("res:/graphics/effect.webgl/quad/quadv5.sm_hi"), true);
  assert.equal(EffectCarriesBackendBlock("res:/graphics/effect.webgl2/quad/quadv5.sm_hi"), true);

  assert.equal(EffectCarriesBackendBlock("res:/graphics/effect.dx11/quad/quadv5.sm_hi"), false);
  assert.equal(EffectCarriesBackendBlock("res:/graphics/effect.dx12/quad/quadv5.sm_hi"), false);
  assert.equal(EffectCarriesBackendBlock("res:/graphics/effect.metal/quad/quadv5.sm_hi"), false);
});

test("no path means DETECT, not guess", () =>
{
  // Tooling, caches and inspection legitimately arrive without a path, and the
  // reader's own probe is right for them. Answering true or false on their
  // behalf would turn a correct probe into a wrong assumption.
  assert.equal(EffectCarriesBackendBlock("res:/graphics/effect/quad/quadv5.fx"), null);
  assert.equal(EffectCarriesBackendBlock(null), null);
});

test("every translated platform the resolver can produce is covered", () =>
{
  // A tree added to the platform list without being classified here would fall
  // to `false` and be read as stock Carbon, misparsing every body in it.
  for (const platform of TranslatedEffectPlatforms)
  {
    assert.equal(
      EffectCarriesBackendBlock(`res:/graphics/effect.${platform}/quad/quadv5.sm_hi`),
      true,
      `${platform} must be recognised as translated`
    );
  }
});

test("a loaded resource records what its path handed it", async () =>
{
  const { CjsCarbonEffectWriter } = await import("../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js");
  const { buildSyntheticDescription, SYNTHETIC_PERMUTATIONS } =
    await import("./format/carbonEffectSynthetic.js");
  const { Tr2EffectRes } = await import("../../../src/resource/shader/Tr2EffectRes.js");

  const writer = new CjsCarbonEffectWriter({ compilerVersion: [ 1, 2, 6, 0 ], sourceHash: "0".repeat(32) });
  for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
  for (const index of [ 0, 1, 2, 3 ]) writer.addBody(index, buildSyntheticDescription({ label: "A" }));
  const bytes = writer.toBytes();

  // A stock Carbon tree: no per-pass block to expect.
  const carbon = new Tr2EffectRes().Initialize("res:/graphics/effect.dx11/quad/quadv5.sm_hi");
  carbon.DoLoad(bytes);
  assert.equal(carbon.CarriesBackendBlock(), false);

  // One of ours: translated, so a block is expected without probing for it.
  const translated = new Tr2EffectRes().Initialize("res:/graphics/effect.webgpu/quad/quadv5.sm_hi");
  translated.DoLoad(bytes);
  assert.equal(translated.CarriesBackendBlock(), true);

  // No path: the reader detects, which is what its fallback is for.
  const unknown = new Tr2EffectRes();
  unknown.DoLoad(bytes);
  assert.equal(unknown.CarriesBackendBlock(), null);
});
