// Carbon's white stand-ins for frames without SSAO or shadows: the driver's
// GetEmptySSAO (EveSpaceSceneRenderDriver.cpp:40-46) and EveSpaceScene's
// RegisterWithVariableStore (EveSpaceScene.cpp:4253-4266). Without them the
// pixel stage samples the backend's zero dummy, which reads as fully occluded
// and fully shadowed: an unlit ship.
import test from "node:test";
import assert from "node:assert/strict";
import { EveSpaceScene, EveSpaceSceneRenderDriver } from "../../npm/dist/trinity/index.js";
import { GpuResourceHandle, Tr2GpuResourcePool, Tr2RenderContext_GetMainThreadRenderContext, Tr2VariableStore } from "../../npm/dist/trinity/core/index.js";

const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
renderContext.GetRenderContextAL().CreateDevice({ mode: { width: 64, height: 64 } });

function Pool()
{
  return new Tr2GpuResourcePool().SetRenderContext(renderContext);
}

function Global(name)
{
  return Tr2VariableStore.GlobalStore().FindVariable(name).GetValue().GetTexture();
}

const noShadows = () => ({
  shadowMap: new GpuResourceHandle(),
  cascadedShadowDepth: new GpuResourceHandle(),
  pointLightShadowMap: new GpuResourceHandle(),
  pointLightShadowDepth: new GpuResourceHandle()
});

test("getEmptySSAO is one persistent white 1x1 texture (cpp:40-46)", () =>
{
  const pool = Pool();
  const first = EveSpaceSceneRenderDriver.getEmptySSAO(pool);
  const second = EveSpaceSceneRenderDriver.getEmptySSAO(pool);

  assert.equal(first.IsValid(), true);
  assert.equal(first.Get(), second.Get());
  assert.equal(first.Get().GetWidth(), 1);
  assert.equal(first.Get().GetHeight(), 1);
});

test("registerWithVariableStore publishes the white fallbacks when no shadow pass ran (cpp:4253-4266)", () =>
{
  EveSpaceScene.registerWithVariableStore(noShadows(), Pool());

  assert.ok(Global("EveSpaceSceneShadowMap"), "EmptyShadow stands in for the screen-space shadow");
  assert.ok(Global("EveSpaceSceneDynamicShadowMap"), "EmptyShadowUint stands in for the point-light indices");
  // The depth atlases go in as they are: empty stays a typed null.
  assert.equal(Global("EveSpaceSceneCascadedShadowMap"), null);
  assert.equal(Global("ShadowMapAtlas"), null);
});

test("registerWithVariableStore publishes a real shadow map in place of the fallback", () =>
{
  const pool = Pool();
  const shadows = noShadows();
  shadows.shadowMap = EveSpaceSceneRenderDriver.getEmptySSAO(pool);

  EveSpaceScene.registerWithVariableStore(shadows, pool);

  assert.equal(Global("EveSpaceSceneShadowMap"), shadows.shadowMap.Get());
});
