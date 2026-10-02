import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { blue } from "../../npm/dist/global/blue/index.js";
import { CJS_ENUM_NAME } from "../../npm/dist/global/blue/enums/CjsBlueEnumRegistry.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const inputs = JSON.parse(await readFile(new URL("../../scripts/trinity/enum-registration-inputs.json", import.meta.url), "utf8"));
for (const module of inputs.modules)
test("generated definition registers without domain classes: " + module.file, () =>
{
  const file = module.file.replace("src/", "npm/dist/");
  const guard = String.raw`export async function load(url, context, nextLoad) {
    if (/\/dist\/(?:trinity|audio|sof|character)\//.test(url) && !url.endsWith(${JSON.stringify(file.slice(4))}))
      throw new Error("Enum definition imported a domain implementation: " + url);
    return nextLoad(url, context);
  }`;
  const result = spawnSync(process.execPath, [
    "--experimental-loader", "data:text/javascript," + encodeURIComponent(guard), "--input-type=module", "--eval",
    `import assert from "node:assert/strict";
      import {blueEnums, CJS_ENUM_NAME} from "./npm/dist/global/blue/enums/CjsBlueEnumRegistry.js";
      for (const name of ["fetch", "setTimeout", "setInterval", "requestAnimationFrame"])
        globalThis[name] = () => { throw new Error("Enum import activated " + name); };
      const module = ${JSON.stringify(module)};
      const exports = await import(${JSON.stringify("./" + file)});
      assert.deepEqual(Object.keys(exports).sort(), module.selectors.map(s => s.name).sort());
      for (const selector of module.selectors) {
        const values = exports[selector.name], registration = module.registrations.find(r => r.exportName === selector.name);
        assert.equal(Object.isFrozen(values), true);
        assert.ok(Object.values(values).every(Number.isInteger));
        assert.equal(values[CJS_ENUM_NAME], registration?.name);
        if (registration) {
          assert.equal(blueEnums.Get(registration.name), values);
          assert.equal(Object.getOwnPropertyDescriptor(values, CJS_ENUM_NAME).enumerable, false);
          const expected = structuredClone(registration.definition), info = blueEnums.GetEnumInfo(registration.name);
          for (const key of ["members", "chooser"]) if (expected[key]) expected[key] = expected[key].map(({member, ...rest}) => ({name: rest.name, value: values[member], ...(rest.description === undefined ? {} : {description: rest.description})}));
          for (const [key, value] of Object.entries(expected)) assert.deepEqual(info[key], value);
        }
      }
    `
  ], {cwd: root, encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

const aliases = [
  [
    "trinity/core/lighting/Tr2KelvinColor.js",
    "trinity.Tr2StandardIlluminant",
    "Tr2KelvinColor.Tr2StandardIlluminant"
  ],
  [
    "trinity/core/Tr2Transform.js",
    "trinity.Tr2TransformModifier",
    "Tr2Transform.Tr2TransformModifier"
  ],
  [
    "trinity/core/volumetrics/Tr2VolumetricsRenderer.js",
    "trinity.Tr2VolumerticQuality",
    "Tr2VolumetricsRenderer.Tr2VolumerticQuality"
  ],
  [
    "trinity/eve/child/EveChildContainer.js",
    "trinity.EveSpaceObjectChild.Origin",
    "EveChildContainer.Origin"
  ],
  [
    "trinity/eve/child/EveChildEffectPropagator.js",
    "trinity.EveChildEffectPropagator.PropagationType",
    "EveChildEffectPropagator.PropagationType"
  ],
  [
    "trinity/eve/child/EveChildEffectPropagator.js",
    "trinity.EveChildEffectPropagator.TriggerType",
    "EveChildEffectPropagator.TriggerType"
  ],
  [
    "trinity/eve/child/EveChildInstanceMeshRenderer.js",
    "trinity.EveChildInstanceMeshRenderer.RotationalConstraints",
    "EveChildInstanceMeshRenderer.RotationalConstraints"
  ],
  [
    "trinity/eve/effect/multiEffect/EveMultiEffectParameter.js",
    "trinity.EveMultiEffectParameter.ParameterType",
    "EveMultiEffectParameter.ParameterType"
  ],
  [
    "trinity/eve/EveImpactOverlay.js",
    "trinity.ITriTargetable.ImpactConfiguration",
    "EveImpactOverlay.ImpactConfiguration"
  ],
  [
    "trinity/eve/renderable/stretch/EveLocalPositionCurve.js",
    "trinity.EveLocalPositionCurve.LocalPositionBehavior",
    "EveLocalPositionCurve.LocalPositionBehavior"
  ],
  [
    "trinity/eve/scene/EveSpaceScene.js",
    "trinity.EveSpaceScene.EveVisualizeMethod",
    "EveSpaceScene.EveVisualizeMethod"
  ],
  [
    "trinity/eve/scene/EveSpaceSceneRenderDriver.js",
    "trinity.EveSpaceSceneRenderDriver.AmbientOcclusionQuality",
    "EveSpaceSceneRenderDriver.AmbientOcclusionQuality"
  ],
  [
    "trinity/eve/scene/EveSpaceSceneRenderDriver.js",
    "trinity.EveSpaceSceneRenderDriver.AntiAliasingQuality",
    "EveSpaceSceneRenderDriver.AntiAliasingQuality"
  ],
  [
    "trinity/eve/scene/EveSpaceSceneRenderDriver.js",
    "trinity.ShadowQuality",
    "EveSpaceSceneRenderDriver.ShadowQuality"
  ],
  [
    "trinity/postProcess/effect/Tr2PPTaaEffect.js",
    "trinity.Tr2PPTaaEffect.Debug",
    "Tr2PPTaaEffect.Debug"
  ],
  [
    "trinity/renderJob/step/TriStepFilterVisibilityResults.js",
    "trinity.TriStepFilterVisibilityResults.FilterType",
    "TriStepFilterVisibilityResults.FilterType"
  ],
  [
    "trinity/renderJob/step/TriStepRenderPass.js",
    "trinity.ITr2MultiPassScene.PassType",
    "TriStepRenderPass.PassType"
  ],
  [
    "trinity/renderJob/TriRenderJob.js",
    "trinity.TriRenderJobStatus",
    "TriRenderJob.Status"
  ],
  [
    "trinity/sprite2d/Tr2SpriteObjectBase.js",
    "trinity.Tr2SpriteObjectPickState",
    "Tr2SpriteObjectBase.Tr2SpriteObjectPickState"
  ]
];
for (const [file, name, exported] of aliases)
test("generated enum retains consumer alias: " + exported, async () =>
{
  let value = await import("../../npm/dist/" + file);
  for (const member of exported.split(".")) value = value[member];
  assert.equal(value, blue.enums.Get(name));
  assert.equal(value[CJS_ENUM_NAME], name);
});
