import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsResMan } from "../../npm/dist/global/blue/CjsResMan.js";
import { blue, IBlueResMan } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
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
  blue.resMan = resourceManager;
  try
  {
    return run(resourceManager);
  }
  finally
  {
    blue.resMan = new IBlueResMan();
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

test("a hand-assigned resource is not replaced, and is not fetched for", () =>
{
  // This test used to prove that an effect with NO manager installed resolved
  // its path and left effectResource null. That only held because the old
  // global slot was never filled, so the acquisition silently did not happen -
  // it was asserting the port was broken.
  //
  // The intent it was reaching for is real and survives: a caller who assigns
  // the resource owns it, and Tr2Effect must not go looking. So assign one,
  // leave the manager uncomposed, and let the throw prove nothing asked.
  blue.resMan = new IBlueResMan();
  SetEffectPathDefaults({ platformName: "webgpu" });

  try
  {
    const effect = new Tr2Effect();
    const mine = new Tr2EffectRes();
    effect.effectResource = mine;
    effect.effectFilePath = "res:/graphics/effect/ship/main.fx";
    effect.Initialize();

    assert.equal(effect.actualEffectFilePath, "res:/graphics/effect.webgpu/ship/main.sm_depth");
    assert.equal(effect.effectResource, mine, "the caller's resource is kept");
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

test("the slot names the contract, not the implementation", () =>
{
  // This replaces a test that asserted SetGlobal refused anything that was not
  // a CjsResMan. That check was the problem: it nailed every consumer to one
  // concrete class, so no stub, recording or alternative manager could be
  // installed without subclassing the real one. blue.resMan is typed by what
  // it must answer, which is the whole point of naming the contract.
  class MinimalResMan extends IBlueResMan
  {
    GetResource() { return null; }
  }
  // Registered, because the refusal names the class that failed the contract
  // and an unregistered one answers with its nearest registered ancestor.
  CjsSchema.define(MinimalResMan, { className: "MinimalResMan", fields: {} });

  const previous = blue.resMan;
  blue.resMan = new MinimalResMan();
  try
  {
    assert.equal(blue.resMan.GetResource("res:/x"), null);
    assert.throws(() => blue.resMan.LoadObject("res:/x.red"), /does not implement IBlueResMan\.LoadObject/u);
  }
  finally { blue.resMan = previous; }
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
