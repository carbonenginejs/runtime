import assert from "node:assert/strict";
import test from "node:test";

import { EveCustomMask, EveSpaceObject2, Tr2ConstantEffectParameter, Tr2Effect, Tr2Vector4Parameter, createEveSpaceObjectMainPerObjectValues, extractTr2EffectConstantValues } from "../../npm/dist/trinity/index.js";

function matrix(first)
{
  return Float32Array.from({ length: 16 }, (_value, index) => first + index);
}

function reflected(name, dimension = 4)
{
  return { name, type: 0, dimension, elements: 0 };
}

test("Tr2Effect extraction preserves dynamic rerouting, sRGB conversion, and const parameters", () =>
{
  const rerouted = new Tr2Vector4Parameter();
  rerouted.name = "Rerouted";
  rerouted.SetValue([1, 2, 3, 4]);
  const destination = new Float32Array(4);
  rerouted.SetDestination(destination);
  destination.set([5, 6, 7, 8]);

  const srgb = new Tr2Vector4Parameter();
  srgb.name = "Srgb";
  srgb.SetValue([0.5, 0.25, 0.75, 1]);
  srgb.RebuildEffectHandles({
    GetConstant(name)
    {
      return name === "Srgb" ? { isSRGB: true } : null;
    }
  });

  const fixed = new Tr2ConstantEffectParameter();
  fixed.name = "Fixed";
  fixed.value.set([9, 10, 11, 12]);
  const effect = new Tr2Effect();
  effect.parameters = [rerouted, srgb];
  effect.constParameters = [fixed];

  const values = extractTr2EffectConstantValues(effect, [
    reflected("Rerouted"),
    reflected("Srgb"),
    reflected("Fixed", 2)
  ]);

  assert.equal(Object.isFrozen(values), true);
  assert.equal(Object.isFrozen(values.Rerouted), true);
  assert.deepEqual(values.Rerouted, [5, 6, 7, 8]);
  assert.deepEqual(values.Srgb, Array.from(srgb.linearValue));
  assert.deepEqual(values.Fixed, [9, 10]);
});

test("Tr2Effect extraction fails closed on missing, duplicate, and unsupported constants", () =>
{
  const dynamic = new Tr2Vector4Parameter();
  dynamic.name = "Tint";
  const fixed = new Tr2ConstantEffectParameter();
  fixed.name = "Tint";
  const duplicate = new Tr2Effect();
  duplicate.parameters = [dynamic];
  duplicate.constParameters = [fixed];

  assert.throws(
    () => extractTr2EffectConstantValues(duplicate, [reflected("Tint")]),
    error => error.code === "CJS_TRINITY_EFFECT_CONSTANT_DUPLICATE"
  );
  assert.throws(
    () => extractTr2EffectConstantValues(new Tr2Effect(), [reflected("Missing")]),
    error => error.code === "CJS_TRINITY_EFFECT_CONSTANT_MISSING"
  );
  assert.throws(
    () => extractTr2EffectConstantValues({ parameters: [{ name: "Texture", value: "res:/texture.dds" }] }, [reflected("Texture")]),
    error => error.code === "CJS_TRINITY_EFFECT_CONSTANT_UNSUPPORTED"
  );
  assert.throws(
    () => extractTr2EffectConstantValues({ parameters: [dynamic] }, [{ ...reflected("Tint"), elements: 1 }]),
    error => error.code === "CJS_TRINITY_EFFECT_CONSTANT_LAYOUT"
  );
});

test("Tr2Effect extraction preserves reflected names as own data properties", () =>
{
  const effect = {
    parameters: [{
      name: "__proto__",
      CopyValueToEffect(_type, out)
      {
        out[0] = 42;
      }
    }]
  };
  const values = extractTr2EffectConstantValues(effect, [reflected("__proto__", 1)]);

  assert.equal(Object.hasOwn(values, "__proto__"), true);
  assert.deepEqual(values.__proto__, [42]);
  assert.equal(Object.getPrototypeOf(values), Object.prototype);
});

test("space-object Main extraction maps object aliases, shared values, and custom masks", () =>
{
  const object = new EveSpaceObject2();
  object.worldTransform = matrix(1);
  object.lastWorldTransform = matrix(101);
  object.inverseWorldTransform = matrix(201);
  object.clipSphereCenter.set([3, 4, 5]);
  object.clipSphereFactor2 = 0.25;
  object.clipSphereFactor = 0.5;

  const mask = new EveCustomMask();
  mask.materialIndex = 3;
  mask.clampU = true;
  mask.targetMaterials.set([0, 1, 0, 1]);
  object.customMasks = [mask];

  // EveSpacePerObjectData is retired as a class; the extractor consumes plain
  // shared values, so the fixture is one.
  const shared = {
    clipSphereCenter: new Float32Array(3),
    boneOffsets: [0, 0, 0, 0],
    customData: new Float32Array(4),
    shLighting: Array.from({ length: 7 }, () => new Float32Array(4)),
    customMaskData: [new Float32Array(4), new Float32Array(4)],
    customMaskMaterialIDs: [new Float32Array(4), new Float32Array(4)],
    customMaskTargets: [new Float32Array(4), new Float32Array(4)],
    customMaskClamps: new Float32Array(4),
    clipRadiusSq: 0,
    clipSphereFactor: 0,
    clipSphereFactor2: 0
  };
  // clipSphereCenter now lives on the shared record (matching Carbon's
  // EveSpacePerObjectData struct), so the shared value is the one consumed.
  shared.clipSphereCenter.set([3, 4, 5]);
  shared.boneOffsets = [7, 8, 9, 10];
  shared.customData.set([11, 12, 13, 14]);
  shared.shLighting[0].set([15, 16, 17, 18]);
  shared.clipRadiusSq = 19;
  shared.clipSphereFactor2 = 0.75;
  shared.clipSphereFactor = 0.875;
  // The mask now fills GPU-form RawData records, while this extractor consumes
  // the plain shared value record, so the mask's contribution is set directly.
  shared.customMaskData[0].set([1, mask.isMirrored ? 1 : 0, 0, 0]);
  shared.customMaskMaterialIDs[0].set([mask.materialIndex, 0, 0, 0]);
  shared.customMaskTargets[0].set(mask.targetMaterials);
  shared.customMaskClamps[0] = mask.clampU ? 1 : 0;
  const shipData = [20, 21, 22, 23];

  const result = createEveSpaceObjectMainPerObjectValues({
    object,
    shared,
    shipData,
    vsOverrides: { activeMorphTargetsCount: 2 },
    psOverrides: { screenSize: [24, 25, 26, 27] }
  });

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.perObjectVS), true);
  assert.deepEqual(result.perObjectVS.worldTransform, Array.from(object.worldTransform));
  assert.deepEqual(result.perObjectVS.worldTransformLast, Array.from(object.lastWorldTransform));
  assert.deepEqual(result.perObjectVS.invWorldTransform, Array.from(object.inverseWorldTransform));
  assert.deepEqual(result.perObjectVS.shipData, shipData);
  assert.deepEqual(result.perObjectVS.boneOffsets, [7, 8, 9, 10]);
  assert.equal(result.perObjectVS.activeMorphTargetsCount, 2);
  assert.equal(result.perObjectVS.customMaskData[0][0], 1);
  assert.deepEqual(result.perObjectPS.clipSphereCenter, [3, 4, 5]);
  assert.equal(result.perObjectPS.clipSphereFactor2, 0.75);
  assert.equal(result.perObjectPS.clipSphereFactor, 0.875);
  assert.deepEqual(result.perObjectPS.shLightingCoefficients[0], [15, 16, 17, 18]);
  assert.equal(result.perObjectPS.customMaskMaterialIDs[0][0], 3);
  assert.deepEqual(result.perObjectPS.customMaskTargets[0], [0, 1, 0, 1]);
  assert.equal(result.perObjectPS.customMaskClamps[0], 1);
  assert.deepEqual(result.perObjectPS.customData, [11, 12, 13, 14]);
  assert.deepEqual(result.perObjectPS.screenSize, [24, 25, 26, 27]);

  object.worldTransform[0] = -1;
  shared.shLighting[0][0] = -2;
  shipData[0] = -3;
  assert.equal(result.perObjectVS.worldTransform[0], 1);
  assert.equal(result.perObjectPS.shLightingCoefficients[0][0], 15);
  assert.equal(result.perObjectVS.shipData[0], 20);
});

test("space-object Main extraction requires explicit ship data and rejects semantic typos", () =>
{
  const object = new EveSpaceObject2();
  assert.throws(
    () => createEveSpaceObjectMainPerObjectValues({ object }),
    /shipData must contain exactly 4 values/u
  );
  assert.throws(
    () => createEveSpaceObjectMainPerObjectValues({
      object,
      shipData: [0, 0, 0, 0],
      psOverrides: { shipDatum: [1, 2, 3, 4] }
    }),
    /shipDatum is not a supported Main semantic/u
  );
});
