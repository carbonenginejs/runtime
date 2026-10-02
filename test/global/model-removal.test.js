import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import * as model from "../../npm/dist/global/model/index.js";
import * as schema from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import "../../npm/dist/trinity/index.js";

test("the deleted model class, state, brand and registration cannot leak through the built package", () =>
{
  for (const name of ["CjsModel", "CjsModelState"])
  {
    assert.equal(name in model, false);
    assert.equal(schema.CjsSchema.GetConstructor(name), null);
    for (const prefix of ["src", "npm/dist"])
      assert.equal(existsSync(new URL("../../" + prefix + "/global/model/" + name + ".js", import.meta.url)), false);
  }
  assert.equal("CJS_MODEL_BRAND" in schema, false);
  assert.equal("isModelInstance" in schema.CjsSchema, false);
});

const tables = {
  "EveCamera": [
    "EveCamera",
    "INotify"
  ],
  "EveDistanceField": [
    "EveDistanceField",
    "IListNotify",
    "INotify"
  ],
  "EveDistributionPlacementGeneratorParentLocators": [
    "EveDistributionPlacementGeneratorParentLocators",
    "IEveDistributionPlacementGenerators",
    "INotify"
  ],
  "EveDistributionSpawnerControllerTrigger": [
    "EveDistributionSpawnerControllerTrigger",
    "IEveDistributionSpawner",
    "INotify"
  ],
  "EveEllipseDefinition": [
    "EveEllipseDefinition",
    "INotify"
  ],
  "EveMultiEffectParameter": [
    "INotify"
  ],
  "EveProceduralMethodAttributeMap": [
    "EveProceduralMethodAttributeMap",
    "IEveProceduralSelectionMethod",
    "INotify"
  ],
  "EveProceduralMethodCycling": [
    "EveProceduralMethodCycling",
    "IEveProceduralSelectionMethod",
    "INotify"
  ],
  "EveSphereVolume": [
    "EveSphereVolume",
    "IEveVolume",
    "INotify"
  ],
  "EveVirtualCameraBehaviourFloatBase": [
    "INotify"
  ],
  "EveVirtualCameraBehaviourVector3Base": [
    "INotify"
  ],
  "FollowASpline": [
    "FollowASpline",
    "INotify"
  ],
  "Tr2Denoiser": [
    "Tr2Denoiser",
    "INotify"
  ],
  "Tr2ReflectionProbe": [
    "Tr2ReflectionProbe",
    "INotify"
  ],
  "Tr2ShadowMap": [
    "Tr2ShadowMap",
    "INotify"
  ],
  "EveEllipsoidVolume": [
    "EveEllipsoidVolume",
    "IEveVolume",
    "INotify"
  ],
  "SplineTunnelGroup": [
    "SplineTunnelGroup",
    "INotify"
  ]
};
test("native notification exposure survives removal of the implicit model callback", () =>
{
  for (const [name, expected] of Object.entries(tables))
  {
    const Constructor = schema.CjsSchema.GetConstructor(name);
    assert.ok(Constructor, name);
    assert.deepEqual([...mappedInterfaces(Constructor)].map(Type => schema.CjsSchema.getClassName(Type)), expected, name);
  }
});
