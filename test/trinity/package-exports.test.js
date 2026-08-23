import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const npmRoot = path.join(root, "npm");

test("published package resolves root, family, and deep generated exports", () =>
{
  const source = `
    const aggregate = await import("@carbonenginejs/runtime");
    const global = await import("@carbonenginejs/runtime/global");
    const resource = await import("@carbonenginejs/runtime/resource");
    const packageRoot = await import("@carbonenginejs/runtime/trinity");
    const eve = await import("@carbonenginejs/runtime/trinity/generated/eve");
    const generatedChild = await import("@carbonenginejs/runtime/trinity/generated/eve/child");
    const child = await import("@carbonenginejs/runtime/trinity/generated/eve/child/EveChildCloud.js");
    const eveFamily = await import("@carbonenginejs/runtime/trinity/eve");
    const renderStep = await import("@carbonenginejs/runtime/trinity/generated/renderJob/TriStepRemoteUpdate.js");
    const promoted = await import("@carbonenginejs/runtime/trinity/renderJob");
    const core = await import("@carbonenginejs/runtime/trinity/core");
    const generatedCore = await import("@carbonenginejs/runtime/trinity/generated/trinityCore");
    const postProcess = await import("@carbonenginejs/runtime/trinity/postProcess");
    const generatedPostProcess = await import("@carbonenginejs/runtime/trinity/generated/postProcess");
    const perFrame = await import("@carbonenginejs/runtime/trinity/perframe");
    const perObject = await import("@carbonenginejs/runtime/trinity/perobject");

    if (!packageRoot.Tr2Effect || !packageRoot.TriVectorSequencer || !packageRoot.TriColorSequencer ||
        !packageRoot.Tr2PostProcess || !packageRoot.EveSprite2dBracket || !packageRoot.Tr2Sprite2dRenderJob ||
        !eveFamily.EveChildRef || !eveFamily.EveChildLineSet ||
        generatedChild.EveChildCloud !== child.EveChildCloud || !renderStep.TriStepRemoteUpdate ||
        !promoted.TriStepFilterVisibilityResults || !promoted.TriStepRenderScene ||
        !perFrame.CjsPerFrameLayouts || !perObject.CjsPerObjectLayouts ||
        packageRoot.Tr2Transform !== core.Tr2Transform || "Tr2Transform" in generatedCore ||
        packageRoot.Tr2ShadowMap !== core.Tr2ShadowMap || "Tr2ShadowMap" in generatedCore ||
        packageRoot.Tr2VolumetricsRenderer !== core.Tr2VolumetricsRenderer ||
        "Tr2VolumetricsRenderer" in generatedCore ||
        packageRoot.CjsVolumetricsExecutor !== core.CjsVolumetricsExecutor ||
        packageRoot.ITr2FroxelFogSettings !== eveFamily.ITr2FroxelFogSettings ||
        packageRoot.EveProjectBracket !== eveFamily.EveProjectBracket ||
        "EveProjectBracket" in eve ||
        packageRoot.EveTacticalOverlay !== eveFamily.EveTacticalOverlay ||
        "EveTacticalOverlay" in eve ||
        packageRoot.EveChildInstanceMeshRenderer !== eveFamily.EveChildInstanceMeshRenderer ||
        "EveChildInstanceMeshRenderer" in eve ||
        packageRoot.EveSmartLightMesh !== eveFamily.EveSmartLightMesh ||
        "EveSmartLightMesh" in eve ||
        "ITr2FroxelFogSettings" in generatedCore ||
        packageRoot.AccumulatePriorityAttribute !== core.AccumulatePriorityAttribute ||
        !core.CjsShadowMapExecutor ||
        packageRoot.Tr2SSAO !== postProcess.Tr2SSAO || "Tr2SSAO" in generatedCore ||
        packageRoot.Tr2PostProcessRenderer !== postProcess.Tr2PostProcessRenderer ||
        "Tr2PostProcessRenderer" in generatedPostProcess)
    {
      throw new Error("Published package exports did not expose the expected classes");
    }
    for (const name of ["ReflectionMode", "Tr2Lod"])
    {
      if (aggregate[name] !== global[name]) throw new Error(name + " must retain global ownership");
    }
    for (const name of [
      "Tr2EffectConstant", "Tr2EffectDefine", "Tr2EffectDescription",
      "Tr2EffectLibrary", "Tr2EffectParameterAnnotation", "Tr2EffectResource",
      "Tr2EffectStageInput", "Tr2EffectTechnique", "Tr2Pass",
      "Tr2SamplerSetup", "Tr2Shader"
    ])
    {
      if (aggregate[name] !== resource[name] || packageRoot[name] !== resource[name])
      {
        throw new Error(name + " must retain resource ownership");
      }
    }
    for (const invalidName of ["_className", "ITriDevice", "ITriEffectTextureParameter", "Tr2CurveBase", "Tr2Key"])
    {
      if (invalidName in packageRoot)
      {
        throw new Error(invalidName + " must not be exported as a runtime model");
      }
    }
    for (const hiddenPath of [
      "@carbonenginejs/runtime/trinity/generated/eve/EveDamageOverlay.js",
      "@carbonenginejs/runtime/trinity/generated/eve/EveModularObjectModifier.js"
    ])
    {
      let importError = null;
      try { await import(hiddenPath); }
      catch (error) { importError = error; }
      if (importError?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED")
      {
        throw new Error(hiddenPath + " must be blocked by an exact package export");
      }
    }
  `;

  const result = spawnSync(process.execPath, [
    "--input-type=module",
    "--eval",
    source
  ], {
    cwd: npmRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, [
    result.stdout,
    result.stderr
  ].filter(Boolean).join("\n"));
  assert.equal(existsSync(path.join(npmRoot, "dist", "trinity", "generated", "eve", "EveDamageOverlay.js")), false);
  assert.equal(existsSync(path.join(npmRoot, "dist", "trinity", "generated", "eve", "EveModularObjectModifier.js")), false);
});
