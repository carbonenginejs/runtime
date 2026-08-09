import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmRoot = path.join(root, "npm");

test("published package resolves root, family, and deep generated exports", () =>
{
  const source = `
    const packageRoot = await import("@carbonenginejs/runtime-trinity");
    const eve = await import("@carbonenginejs/runtime-trinity/generated/eve");
    const child = await import("@carbonenginejs/runtime-trinity/generated/eve/child/EveChildLineSet.js");
    const renderStep = await import("@carbonenginejs/runtime-trinity/generated/renderJob/TriStepRemoteUpdate.js");
    const promoted = await import("@carbonenginejs/runtime-trinity/renderJob");
    const perFrame = await import("@carbonenginejs/runtime-trinity/perframe");
    const perObject = await import("@carbonenginejs/runtime-trinity/perobject");

    if (!packageRoot.Tr2Effect || !packageRoot.TriVectorSequencer || !packageRoot.TriColorSequencer ||
        !packageRoot.Tr2PostProcess || !packageRoot.EveSprite2dBracket || !eve.EveChildRef ||
        !child.EveChildLineSet || !renderStep.TriStepRemoteUpdate ||
        !promoted.TriStepFilterVisibilityResults || !promoted.TriStepRenderScene ||
        !perFrame.CjsPerFrameLayouts || !perObject.CjsPerObjectLayouts)
    {
      throw new Error("Published package exports did not expose the expected classes");
    }
    for (const invalidName of ["_className", "ITriDevice", "ITriEffectTextureParameter", "Tr2CurveBase", "Tr2Key"])
    {
      if (invalidName in packageRoot)
      {
        throw new Error(invalidName + " must not be exported as a runtime model");
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
});
