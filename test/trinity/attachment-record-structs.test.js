// The attachment sets' nested Carbon record structs: each is a registered
// class naming its donor, and each member starts at Carbon's value or, where
// Carbon leaves it unset, the type's neutral value.
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import {
  EvePlaneSetVolatileData,
  EveSpotlightSetSpotlightData,
  EveTurretFiringFXPerMuzzleData,
  EveTurretSetAnimationRequest,
  EveTurretSetSingleTurretData
} from "../../npm/dist/trinity/index.js";

const IDENTITY = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];

/** Registered name and donor declaration. */
function assertRegistration(Class, className, donor)
{
  assert.equal(CjsSchema.getClassName(Class), className);
  assert.deepEqual(CjsSchema.getSchema(Class).donors, [ donor ]);
}

test("EveTurretSet::SingleTurretData (EveTurretSet.h:323-347)", () =>
{
  assertRegistration(EveTurretSetSingleTurretData, "EveTurretSetSingleTurretData", "EveTurretSet::SingleTurretData");

  const data = new EveTurretSetSingleTurretData();
  assert.equal(data.valid, false);
  assert.equal(data.visible, false);
  assert.deepEqual(Array.from(data.localPosition), [ 0, 0, 0, 0 ]);
  assert.deepEqual(Array.from(data.localQuaternion), [ 0, 0, 0, 1 ]);
  assert.deepEqual(Array.from(data.localMatrix), IDENTITY);
  assert.deepEqual(Array.from(data.worldMatrix), IDENTITY);
  assert.equal(data.grnSkeleton, null);
  assert.equal(data.grnModelInstance, null);
  assert.equal(data.grnLocalPose, null);
  assert.equal(data.grnWorldPose, null);
  assert.equal(data.sequencer, null);
  assert.equal(data.pose, null);
  assert.deepEqual(data.worldTransforms, []);
  assert.equal(data.rtMesh, null);
  assert.equal(data.rtMeshArea, null);
  assert.ok(data.rtPerObjectData, "rtPerObjectData is embedded by value");
  assert.notEqual(new EveTurretSetSingleTurretData().worldMatrix, data.worldMatrix, "each record owns its matrices");
});

test("EveTurretSet::AnimationRequest (EveTurretSet.h:399-404)", () =>
{
  assertRegistration(EveTurretSetAnimationRequest, "EveTurretSetAnimationRequest", "EveTurretSet::AnimationRequest");

  const request = new EveTurretSetAnimationRequest();
  assert.equal(request.turretIndex, 0);
  assert.equal(request.animName, "");
  assert.equal(request.animNameIdle, "");
});

test("EveTurretFiringFX::PerMuzzleData (EveTurretFiringFX.h:185-197)", () =>
{
  assertRegistration(EveTurretFiringFXPerMuzzleData, "EveTurretFiringFXPerMuzzleData", "EveTurretFiringFX::PerMuzzleData");

  const data = new EveTurretFiringFXPerMuzzleData();
  assert.equal(data.started, false);
  assert.equal(data.readyToStart, false);
  assert.equal(data.muzzlePositionBoneID, 0);
  assert.deepEqual(Array.from(data.muzzleTransform), IDENTITY);
  assert.equal(data.currentStartDelay, 0);
  assert.equal(data.constantDelay, 0);
  assert.equal(data.elapsedTime, 0);
});

test("EvePlaneSet::VolatileData (EvePlaneSet.h:140-144)", () =>
{
  assertRegistration(EvePlaneSetVolatileData, "EvePlaneSetVolatileData", "EvePlaneSet::VolatileData");

  const data = new EvePlaneSetVolatileData();
  assert.deepEqual(Array.from(data.transform), IDENTITY);
  assert.deepEqual(Array.from(data.color), [ 0, 0, 0, 0 ]);
});

test("EveSpotlightSet::SpotlightData (EveSpotlightSet.h:143-148)", () =>
{
  assertRegistration(EveSpotlightSetSpotlightData, "EveSpotlightSetSpotlightData", "EveSpotlightSet::SpotlightData");

  const data = new EveSpotlightSetSpotlightData();
  assert.deepEqual(Array.from(data.transform), IDENTITY);
  assert.equal(data.boneIndex, 0);
  assert.equal(data.boosterGainInfluence, 0);
});
