import { configureResourceManager } from "../support/configuredResMan.js";
import assert from "node:assert/strict";
import { test } from "node:test";

import { BlueResMan } from "../../npm/dist/blue/resman/BlueResMan.js";
import { blue, IBlueResMan } from "../../npm/dist/blue/index.js";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { Tr2EffectRes } from "../../npm/dist/trinity/shader/index.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/index.js";
import { Tr2EffectTechniqueInputs } from "../../npm/dist/trinity/shader/material/Tr2EffectTechniqueInputs.js";
import { Tr2EffectPassParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectPassParameters.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { SetEffectPathDefaults } from "../../npm/dist/global/utils/effectPath.js";
import { CjsCarbonEffectWriter } from "../../npm/dist/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { buildSyntheticDescription } from "../resource/runtime-resource/format/carbonEffectSynthetic.js";
import "../support/frameLoop.js";

test("CjsLibrary loads an effect and retains its permutation reader", async () =>
{
  const writer = new CjsCarbonEffectWriter({
    compilerVersion: [1, 2, 6, 0], sourceHash: "0123456789abcdef0123456789abcdef"
  });
  writer.addBody(0, buildSyntheticDescription({ label: "registered" }));
  const bytes = writer.toBytes();
  let reads = 0;
  const manager = await configureResourceManager(new BlueResMan({
    source: { Read() { reads++; return bytes; } }
  }));
  const effect = await manager.FetchResource("res:/registered.sm_hi");
  assert.ok(effect instanceof Tr2EffectRes);
  assert.ok(effect.IsGood());
  const shader = effect.GetShaderByIndex(0);
  assert.ok(shader);
  assert.equal(effect.GetShaderByIndex(0), shader);
  assert.equal(await manager.FetchResource("res:/registered.sm_hi"), effect);
  assert.equal(reads, 1);
});

/**
 * Runs a body with a manager installed globally, always uninstalling after.
 *
 * The accessor is process-wide, so a leaked manager would make every later test
 * in the run acquire resources it never asked for.
 */
async function withGlobalManager(run)
{
  // A manager with no source cannot begin a read, and acquiring is meant to
  // start one. The bytes are irrelevant here - these tests assert the route and
  // the handle, not container decoding.
  const source = { Read() { return new Uint8Array(0); } };
  const resourceManager = await configureResourceManager(new BlueResMan({ source }));
  const previous = blue.resMan;
  blue.resMan = resourceManager;
  try
  {
    return run(resourceManager);
  }
  finally
  {
    blue.resMan = previous;
    SetEffectPathDefaults(null);
  }
}

test("effect path edits replace internal acquisitions and clearing releases the old resource", async () =>
{
  await withGlobalManager(() =>
  {
    const effect = new Tr2Effect();
    effect.SetEffectPathName("res:/a.sm_depth");
    const first = effect.effectResource;
    const context = new Tr2RenderContext();
    context.GetRenderContextAL().CreateDevice();
    const technique = new Tr2EffectTechniqueInputs(), pass = new Tr2EffectPassParameters();
    pass.stageInput[0].constantBuffer.Create__Size(16, context);
    pass.resourceSet.Create__Program(pass.resourceSetDesc, {}, context);
    assert.equal(pass.stageInput[0].constantBuffer.IsValid(), true);
    assert.equal(pass.resourceSet.IsValid(), true);
    technique.passes.push(pass);
    effect.parametersForPasses.push(technique);
    effect.SetEffectPathName("res:/b.sm_depth");
    assert.notEqual(effect.effectResource, first);
    assert.equal(effect.effectResource.GetPath(), "res:/b.sm_depth");
    assert.equal(pass.stageInput[0].constantBuffer.IsValid(), false);
    assert.equal(pass.resourceSet.IsValid(), false);
    assert.equal(effect.parametersForPasses.length, 0);
    const second = effect.effectResource;
    effect.SetEffectPathName("res:/b.sm_depth");
    assert.equal(effect.effectResource, second);
    effect.SetEffectPathName("");
    assert.equal(effect.effectResource, null);
    assert.equal(effect.shader, null);
  });
});

test("every compiled shader extension routes to Tr2EffectRes", async () =>
{
  const resourceManager = await configureResourceManager(new BlueResMan());

  // Carbon's nine, not three: the older compiled tiers still occur in shipped
  // trees. Plus Incarna's fxt.
  assert.equal([...Tr2EffectRes.extensions, ...Tr2EffectRes.additionalExtensions].map(x => x.toLowerCase()).length, 10);
  assert.ok([...Tr2EffectRes.extensions, ...Tr2EffectRes.additionalExtensions].map(x => x.toLowerCase()).includes("fxt"));
  for (const extension of [...Tr2EffectRes.extensions, ...Tr2EffectRes.additionalExtensions].map(x => x.toLowerCase()))
  {
    assert.equal(typeof resourceManager.GetObjectLoader(extension), "function");
  }
});

test("an authored .fx path resolves into the committed backend's tree", async () =>
{
  await withGlobalManager(() =>
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

test("Initialize acquires an effect resource through the installed manager", async () =>
{
  await withGlobalManager(() =>
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

test("the same path yields the same resource handle", async () =>
{
  await withGlobalManager(() =>
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

test("an authored path resolves and is acquired before any platform is installed", async () =>
{
  // Carbon's platform name is never absent: it is a compile-time constant, "dx11" in the headless stub build
  // (trinityal/include/TrinityALForward.h:64-68). So hydration before a backend exists resolves into that tree,
  // at our default quality, and fetches.
  await withGlobalManager(() =>
  {
    const effect = new Tr2Effect();
    effect.effectFilePath = "res:/graphics/effect/ship/main.fx";
    effect.Initialize();

    assert.equal(effect.actualEffectFilePath, "res:/graphics/effect.dx11/ship/main.sm_depth");
    assert.notEqual(effect.effectResource, null);
  });
});

test("the slot names the contract, not the implementation", async () =>
{
  // This replaces a test that asserted SetGlobal refused anything that was not
  // a BlueResMan. That check was the problem: it nailed every consumer to one
  // concrete class, so no stub, recording or alternative manager could be
  // installed without subclassing the real one. blue.resMan is typed by what
  // it must answer, which is the whole point of naming the contract.
  class MinimalResMan extends IBlueResMan
  {
    GetResource() { return null; }
  }
  // Registered, because the refusal names the class that failed the contract
  // and an unregistered one answers with its nearest registered ancestor.
  CjsSchema.define(MinimalResMan, { name: "MinimalResMan", fields: {} });

  const previous = blue.resMan;
  blue.resMan = new MinimalResMan();
  try
  {
    assert.equal(blue.resMan.GetResource("res:/x"), null);
    assert.throws(() => blue.resMan.LoadObject("res:/x.red"), /does not implement IBlueResMan\.LoadObject/u);
  }
  finally { blue.resMan = previous; }
});

test("the native effect hook rejects malformed container bytes", async () =>
{
  // The native load hook adopts the decoded reader. Tr2EffectRes derives its data from
  // bytes it must go on holding, so bytes route to DoLoad instead of being
  // rejected as a malformed payload; otherwise publication would clear the
  // retained reader and GetShaderByIndex would return null on a good resource.
  const resource = new Tr2EffectRes();

  resource._dataStream = { form: "bytes", data: new Uint8Array([ 1, 2, 3 ]) };
  assert.throws(() => resource._DoLoad());
  // Reaching DoLoad is what the throw proves: the reader rejects the bytes as
  // a container, rather than the payload validator rejecting them as an object.
});
