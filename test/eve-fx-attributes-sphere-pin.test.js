import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import {
  EveCameraFxAttributes,
  EveChildSpherePin,
  EveChildSpherePinPerObjectData,
  EveShip2,
  EveSpaceObject2,
  EveSpaceObjectFxAttributes,
} from "../npm/dist/index.js";


function closeArray(actual, expected, epsilon = 1e-6)
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= epsilon,
      `index ${index}: expected ${expected[index]}, received ${actual[index]}`
    );
  }
}


test("EveCameraFxAttributes uses Carbon matrix slots and child-parent precedence", () =>
{
  const attributes = new EveCameraFxAttributes();
  const view = mat4.create();
  view[2] = 2;
  view[6] = 3;
  view[10] = 4;
  view[8] = 98;
  view[9] = 99;

  const childTransform = mat4.create();
  childTransform[2] = 7;
  childTransform[6] = 8;
  childTransform[10] = 9;
  childTransform[12] = 10;
  childTransform[13] = 20;
  childTransform[14] = 30;

  const objectTransform = mat4.create();
  objectTransform[2] = 11;
  objectTransform[6] = 12;
  objectTransform[10] = 13;

  const updateContext = {
    renderContext: {
      GetViewPosition: () => vec3.fromValues(1, 2, 3),
      GetViewTransform: () => view,
    },
  };
  const params = {
    spaceObjectParent: {
      GetModelCenterWorldPosition(out)
      {
        vec3.set(out, 4, 6, 8);
      },
    },
    childParent: {
      GetLocalToWorldTransform: () => childTransform,
    },
    localToWorldTransform: objectTransform,
  };

  attributes.UpdateAsyncronous(updateContext, params);

  const vectorToObject = vec3.fromValues(9, 18, 27);
  const distance = vec3.length(vectorToObject);
  assert.equal(attributes.distanceToCamera, distance);
  assert.equal(attributes.lookAngleToObject, -(2 * 9 + 3 * 18 + 4 * 27) / distance);
  assert.deepEqual(Array.from(attributes.rotationWithChildTransform), [7, 8, 9]);
  assert.deepEqual(Array.from(attributes.objectRotation), [11, 12, 13]);
  assert.deepEqual(Array.from(attributes.cameraRotation), [2, 3, 4]);

  params.childParent = null;
  attributes.UpdateAsyncronous(updateContext, params);
  assert.deepEqual(
    Array.from(attributes.rotationWithChildTransform),
    [7, 8, 9],
    "Carbon retains the prior child-parent rotation when no child parent is present"
  );
});


test("EveCameraFxAttributes preserves Carbon's zero-distance NaN", () =>
{
  const attributes = new EveCameraFxAttributes();
  const view = mat4.create();
  attributes.UpdateAsyncronous(
    {
      renderContext: {
        GetViewPosition: () => vec3.fromValues(3, 4, 5),
        GetViewTransform: () => view,
      },
    },
    {
      spaceObjectParent: {
        GetModelCenterWorldPosition(out)
        {
          vec3.set(out, 3, 4, 5);
        },
      },
      localToWorldTransform: mat4.create(),
    }
  );

  assert.equal(attributes.distanceToCamera, 0);
  assert.equal(Number.isNaN(attributes.lookAngleToObject), true);
});


class TestShip extends EveShip2
{
  testCenter = vec3.fromValues(3, 4, 12);

  testRadius = 7;

  testTransform = mat4.fromValues(
    0, 2, 0, 0,
    -2, 0, 0, 0,
    0, 0, 2, 0,
    20, 30, 40, 1
  );

  shapeCalls = 0;

  GetShapeEllipsoid(outCenter, outRadii)
  {
    this.shapeCalls++;
    vec3.set(outCenter, 1, 2, 3);
    vec3.set(outRadii, 4, 5, 6);
  }

  GetBoundingSphere(out)
  {
    vec4.set(out, this.testCenter[0], this.testCenter[1], this.testCenter[2], this.testRadius);
    return true;
  }

  GetModelCenterWorldPosition(out)
  {
    vec3.copy(out, this.testCenter);
  }

  GetLocalToWorldTransform()
  {
    return this.testTransform;
  }

  GetActiveTurretCount()
  {
    return 4;
  }

  GetKillCounterValue()
  {
    return 9;
  }
}


test("EveSpaceObjectFxAttributes preserves one-shot, stale-value, and scaled-rotation behavior", () =>
{
  const attributes = new EveSpaceObjectFxAttributes();
  const ship = new TestShip();

  attributes.UpdateAsyncronous(null, {
    spaceObjectParent: ship,
    activationStrength: 0.25,
  });

  assert.equal(ship.shapeCalls, 1);
  assert.deepEqual(Array.from(attributes.generatedShapeEllipsoidCenter), [1, 2, 3]);
  assert.deepEqual(Array.from(attributes.generatedShapeEllipsoidRadius), [4, 5, 6]);
  assert.deepEqual(Array.from(attributes.parentWorldTranslation), [3, 4, 12]);
  assert.equal(attributes.activationStrength, 0.25);
  assert.equal(attributes.ship, 13);
  assert.equal(attributes.boundingSphereRadius, 7);
  assert.equal(attributes.activeTurretCount, 4);
  assert.equal(attributes.killCount, 9);
  closeArray(attributes.parentWorldRotation, [0, 0, 2 / Math.sqrt(3), Math.sqrt(3) / 2]);

  ship.testRadius = 2;
  attributes.UpdateAsyncronous(null, {
    spaceObjectParent: ship,
    activationStrength: 0.5,
  });
  assert.equal(ship.shapeCalls, 1);
  assert.equal(attributes.ship, 6, "Carbon subtracts the previous frame's radius");
  assert.equal(attributes.boundingSphereRadius, 2);

  const nonShip = new EveSpaceObject2();
  nonShip.boundingSphereCenter.set([1, 2, 3]);
  nonShip.boundingSphereRadius = 1;
  attributes.UpdateAsyncronous(null, {
    spaceObjectParent: nonShip,
    activationStrength: 1,
  });
  assert.equal(attributes.activeTurretCount, 4);
  assert.equal(attributes.killCount, 9);

  const snapshot = attributes.GetValues();
  attributes.UpdateAsyncronous(null, {});
  assert.deepEqual(attributes.GetValues(), snapshot);
});


test("EveSpaceObjectFxAttributes initializes the ellipsoid cast only once", () =>
{
  const attributes = new EveSpaceObjectFxAttributes();
  const plainParent = {
    GetBoundingSphere(out)
    {
      vec4.set(out, 0, 0, 0, 1);
      return true;
    },
    GetModelCenterWorldPosition(out)
    {
      vec3.set(out, 0, 0, 0);
    },
    GetLocalToWorldTransform: () => mat4.create(),
  };
  const ship = new TestShip();

  attributes.UpdateAsyncronous(null, { spaceObjectParent: plainParent });
  attributes.UpdateAsyncronous(null, { spaceObjectParent: ship });

  assert.equal(ship.shapeCalls, 0);
  assert.deepEqual(Array.from(attributes.generatedShapeEllipsoidCenter), [0, 0, 0]);
  assert.deepEqual(Array.from(attributes.generatedShapeEllipsoidRadius), [0, 0, 0]);
});


test("EveSpaceObject2 exposes Carbon's model-center and shape-ellipsoid queries", () =>
{
  const object = new EveSpaceObject2();
  object.boundingSphereCenter.set([1, 2, 3]);
  object.worldTransform.set(mat4.fromTranslation(mat4.create(), [10, 20, 30]));
  object.shapeEllipsoidCenter.set([4, 5, 6]);
  object.shapeEllipsoidRadius.set([7, 8, 9]);

  const worldCenter = vec3.create();
  object.GetModelCenterWorldPosition(worldCenter);
  assert.deepEqual(Array.from(worldCenter), [11, 22, 33]);

  const center = vec3.create();
  const radii = vec3.create();
  object.GetShapeEllipsoid(center, radii);
  assert.deepEqual(Array.from(center), [4, 5, 6]);
  assert.deepEqual(Array.from(radii), [7, 8, 9]);
});


test("EveChildSpherePin aliases its Blue colors and fills the Carbon per-object record", () =>
{
  const pin = new EveChildSpherePin();
  assert.equal(pin.GetID(17), pin);
  assert.equal(pin.color, pin.pinColor);
  pin.color = [0.1, 0.2, 0.3, 0.4];
  closeArray(pin.pinColor, [0.1, 0.2, 0.3, 0.4]);
  pin.SetValues({ pinColor: [0.5, 0.6, 0.7, 0.8] });
  closeArray(pin.color, [0.5, 0.6, 0.7, 0.8]);
  pin.SetValues({ color: [0.1, 0.2, 0.3, 0.4] });
  const values = pin.GetValues();
  assert.deepEqual(values.color, values.pinColor);
  assert.equal(CjsSchema.getField(EveChildSpherePin, "color")?.type?.kind, "color");
  assert.equal(CjsSchema.getField(EveChildSpherePin, "pinColor")?.type?.kind, "color");
  assert.equal(
    CjsSchema.getField(EveChildSpherePinPerObjectData, "pinRotation")?.type?.kind,
    "vec4"
  );

  const curveUpdates = [];
  pin.curveSets.push({
    Update: (from, to) => curveUpdates.push([from, to]),
  });
  const world = mat4.fromRotationTranslationScale(
    mat4.create(),
    [0, 0, Math.sin(Math.PI / 8), Math.cos(Math.PI / 8)],
    [3, 4, 5],
    [2, 3, 4]
  );
  pin.UpdateAsyncronous(
    { GetTime: () => 12 },
    { localToWorldTransform: world, activationStrength: 1 }
  );
  assert.deepEqual(curveUpdates, [[12, 12]]);

  pin.centerNormal.set([6, 7, 8]);
  pin.pinRadius = 0.25;
  pin.pinRotation = 0.75;
  pin.pinAlphaThreshold = 0.5;
  const data = pin.GetPerObjectData({
    Allocate(Type)
    {
      assert.equal(Type, EveChildSpherePinPerObjectData);
      return new Type();
    },
  });

  const transposedWorld = mat4.transpose(mat4.create(), pin.worldTransform);
  closeArray(data.worldMatrix, transposedWorld);
  closeArray(data.pinPosition, [6, 7, 8, 0.25]);
  closeArray(data.pinRotation, [0.75, 0, 0, 0]);
  closeArray(data.pinColor, [0.1, 0.2, 0.3, 0.4]);
  closeArray(data.pinThreshold, [0.5, 0, 0, 0]);
  closeArray(data.pinRadiusPrecalc, [
    Math.sin(0.25),
    Math.cos(0.25),
    Math.sin(0.75),
    Math.cos(0.75),
  ]);
  closeArray(data.pinUV, [1, 1, 0, 0]);
});
