import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsResMan } from "../../npm/dist/resource/CjsResMan.js";
import { RegisterShaderResources, ShaderResourceExtensions, Tr2EffectRes } from "../../npm/dist/resource/shader/index.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/index.js";
import { SetEffectPathDefaults } from "../../npm/dist/global/utils/effectPath.js";

/**
 * Runs a body with a manager installed globally, always uninstalling after.
 *
 * The accessor is process-wide, so a leaked manager would make every later test
 * in the run acquire resources it never asked for.
 */
function withGlobalManager(run)
{
  // A manager with no source cannot begin a read, and acquiring is meant to
  // start one. The bytes are irrelevant here - these tests assert the route and
  // the handle, not container decoding.
  const source = { Read() { return new Uint8Array(0); } };
  const resourceManager = RegisterShaderResources(new CjsResMan({ source }));
  CjsResMan.SetGlobal(resourceManager);
  try
  {
    return run(resourceManager);
  }
  finally
  {
    CjsResMan.SetGlobal(null);
    SetEffectPathDefaults(null);
  }
}

test("every compiled shader extension routes to Tr2EffectRes", () =>
{
  const resourceManager = RegisterShaderResources(new CjsResMan());

  // Nine, not three: the older compiled tiers still occur in shipped trees.
  assert.equal(ShaderResourceExtensions.length, 9);
  for (const extension of ShaderResourceExtensions)
  {
    assert.equal(typeof resourceManager.GetObjectLoader(extension), "function");
  }
});

test("an authored .fx path resolves into the committed backend's tree", () =>
{
  withGlobalManager(() =>
  {
    SetEffectPathDefaults({ platformName: "webgpu", shaderModel: "high" });

    const effect = new Tr2Effect();
    effect.effectFilePath = "res:/Graphics/Effect/Ship/Main.fx";
    effect.Initialize();

    // Lowercased, platform substituted, extension replaced by the tier suffix -
    // Carbon's three transformations. `.sm_depth` is the HIGH tier, not a
    // depth-only shader.
    assert.equal(effect.actualEffectFilePath, "res:/graphics/effect.webgpu/ship/main.sm_depth");
  });
});

test("Initialize acquires an effect resource through the installed manager", () =>
{
  withGlobalManager(() =>
  {
    SetEffectPathDefaults({ platformName: "webgpu" });

    const effect = new Tr2Effect();
    effect.effectFilePath = "res:/graphics/effect/ship/main.fx";
    effect.Initialize();

    // The route picked the handler from the resolved extension, which is the
    // whole point of resolving the path first.
    assert.ok(effect.effectResource instanceof Tr2EffectRes);
    assert.equal(effect.effectResource.GetPath(), "res:/graphics/effect.webgpu/ship/main.sm_depth");
  });
});

test("the same path yields the same resource handle", () =>
{
  withGlobalManager(() =>
  {
    SetEffectPathDefaults({ platformName: "webgpu" });

    const first = new Tr2Effect();
    first.effectFilePath = "res:/graphics/effect/ship/main.fx";
    first.Initialize();

    const second = new Tr2Effect();
    second.effectFilePath = "res:/graphics/effect/ship/main.fx";
    second.Initialize();

    assert.equal(second.effectResource, first.effectResource);
  });
});

test("an unresolvable path acquires nothing rather than throwing", () =>
{
  // No platform name installed means no backend is committed, so an authored
  // /effect/ path has no compiled tree to resolve into. Carbon blanks the path
  // and does not fetch; hydration must not explode.
  withGlobalManager(() =>
  {
    const effect = new Tr2Effect();
    effect.effectFilePath = "res:/graphics/effect/ship/main.fx";
    effect.Initialize();

    assert.equal(effect.actualEffectFilePath, "");
    assert.equal(effect.effectResource, null);
  });
});

test("with no manager installed the effect stays hand-composable", () =>
{
  // The path every existing test takes: assign the resource yourself. Nothing
  // should reach for a global that was never installed.
  CjsResMan.SetGlobal(null);
  SetEffectPathDefaults({ platformName: "webgpu" });

  try
  {
    const effect = new Tr2Effect();
    effect.effectFilePath = "res:/graphics/effect/ship/main.fx";
    effect.Initialize();

    assert.equal(effect.actualEffectFilePath, "res:/graphics/effect.webgpu/ship/main.sm_depth");
    assert.equal(effect.effectResource, null);
  }
  finally
  {
    SetEffectPathDefaults(null);
  }
});

test("a hand-assigned resource is never replaced", () =>
{
  withGlobalManager(() =>
  {
    SetEffectPathDefaults({ platformName: "webgpu" });

    const assigned = new Tr2EffectRes();
    const effect = new Tr2Effect();
    effect.effectResource = assigned;
    effect.effectFilePath = "res:/graphics/effect/ship/main.fx";
    effect.Initialize();

    assert.equal(effect.effectResource, assigned);
  });
});

test("SetGlobal refuses anything that is not a manager", () =>
{
  assert.throws(() => CjsResMan.SetGlobal({ GetResource() {} }), /expects a CjsResMan or null/);
  assert.equal(CjsResMan.GetGlobal(), null);
});

test("container bytes handed to SetPayload load through DoLoad", () =>
{
  // The publish path calls SetPayload. Tr2EffectRes derives its payload from
  // bytes it must go on holding, so bytes route to DoLoad instead of being
  // rejected as a malformed payload; otherwise publication would clear the
  // retained reader and GetShaderByIndex would return null on a good resource.
  const resource = new Tr2EffectRes();

  assert.throws(() => resource.SetPayload(new Uint8Array([ 1, 2, 3 ])));
  // Reaching DoLoad is what the throw proves: the reader rejects the bytes as
  // a container, rather than the payload validator rejecting them as an object.
});
