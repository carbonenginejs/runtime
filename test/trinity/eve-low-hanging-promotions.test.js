import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import {
  EveEffectRoot2,
  EveMultiEffectParameter,
  EvePickingContext,
  EveSpaceObject2,
  EveTacticalOverlayTrackObject,
  EveTurretFiringFX,
  EveTurretSet,
} from "../../npm/dist/trinity/index.js";


test("EvePickingContext retains Carbon's latest result", () => {
  const context = new EvePickingContext();
  const object = {};
  context.UpdateResult(4, 5, object, 6);

  assert.equal(context.lastPickedX, 4);
  assert.equal(context.lastPickedY, 5);
  assert.equal(context.GetObject(), object);
  assert.equal(context.GetArea(), 6);
});

test("EveMultiEffectParameter validates Carbon parameter types and owner notifications", () => {
  const parameter = new EveMultiEffectParameter();
  let rebinds = 0;
  parameter.SetOwner({ Rebind: () => rebinds++ });
  parameter.name = "Target";

  parameter.type = EveMultiEffectParameter.ParameterType.TYPE_EVESPACEOBJECT;
  parameter.SetParameterObject(new EveSpaceObject2());
  assert.equal(parameter.IsValid(), true);

  parameter.type = EveMultiEffectParameter.ParameterType.TYPE_EVEEFFECTROOT;
  parameter.SetParameterObject(new EveEffectRoot2());
  assert.equal(parameter.IsValid(), true);

  parameter.type = EveMultiEffectParameter.ParameterType.TYPE_ANYTHING;
  parameter.SetParameterObject({});
  assert.equal(parameter.IsValid(), true);
  assert.equal(parameter.GetParameterObject(), parameter.object);
  assert.equal(parameter.GetName(), "Target");
  assert.equal(parameter.OnModified(), true);
  assert.equal(rebinds, 1);

  parameter.type = EveMultiEffectParameter.ParameterType.TYPE_UNDEFINED;
  assert.equal(parameter.IsValid(), false);
});

test("EveTacticalOverlayTrackObject samples position and velocity curves", () => {
  const calls = [];
  const tracked = new EveTacticalOverlayTrackObject();
  tracked.translationCurve = {
    GetValueDotAt(time, out)
    {
      calls.push(["velocity", time]);
      out.set([1, 2, 3]);
      return out;
    },
    GetValueAt(time, out)
    {
      calls.push(["position", time]);
      out.set([4, 5, 6]);
      return out;
    }
  };
  tracked.radius = 7;
  tracked.isAggressive = true;
  tracked.showVelocity = false;

  tracked.UpdatePosition({ GetTime: () => 8 });
  assert.deepEqual(calls, [["velocity", 8], ["position", 8]]);
  assert.deepEqual(Array.from(tracked.GetVelocity()), [1, 2, 3]);
  assert.deepEqual(Array.from(tracked.GetPosition()), [4, 5, 6]);
  assert.equal(tracked.GetRadius(), 7);
  assert.equal(tracked.IsAggressive(), true);
  assert.equal(tracked.ShowVelocity(), false);
});

test("turret enums live on their Carbon owner classes", () => {
  assert.deepEqual(EveTurretSet.LOD, {
    LOD_INVALID: 0,
    LOD_EMPTY: 1,
    LOD_HIGHEST: 2,
    LOD_DISABLED: 3,
  });
  assert.equal(EveTurretSet.SystemBones.SYSBONE_PITCH, 5);
  assert.equal(EveTurretSet.SystemBones.SYSBONE_MAX, 15);
  assert.deepEqual(EveTurretFiringFX.MaxMuzzleCount, { MUZZLECOUNT_MAX: 12 });
  assert.equal(EveTurretFiringFX.MUZZLE_COUNT_MAX, 12);
  assert.equal(CjsSchema.getField(EveTurretSet, "lodLevel")?.enum?.enumType, "LOD");
});

test("completed low-hanging classes and turret enums are absent from generated", () => {
  const promoted = [
    ["eve/child/modifiers", "EveChildModifierAttachToBone"],
    ["eve/child/modifiers", "EveChildModifierBillboard3D"],
    ["eve/child/modifiers", "EveChildModifierStretch"],
    ["eve/child/modifiers", "EveChildModifierTranslateWithCamera"],
    ["eve/child", "EveChildSpherePin"],
    ["eve/child/behaviors", "CollisionAvoidance"],
    ["eve/child/behaviors", "InclusionVolume"],
    ["eve/child/behaviors", "Wander"],
    ["eve/effect", "EveMultiEffectParameter"],
    ["eve", "EveEntity"],
    ["eve/fxAttributes", "EveCameraFxAttributes"],
    ["eve/fxAttributes", "EveSpaceObjectFxAttributes"],
    ["eve/scene", "EvePickingContext"],
    ["eve/scene", "EveSceneStaticParticles"],
    ["eve/scene", "TriShadowFrustum"],
    ["eve/scene", "TriShadowOrthoFrustum"],
    ["eve/ui", "EveTacticalOverlayTrackObject"],
  ];
  for (const [family, className] of promoted)
  {
    assert.equal(
      existsSync(new URL(`../../src/trinity/generated/${family}/${className}.js`, import.meta.url)),
      false,
      className
    );
  }
  assert.equal(
    existsSync(new URL("../../src/trinity/generated/eve/attachment/turrets/enums.js", import.meta.url)),
    false
  );

  const summary = JSON.parse(readFileSync(new URL("../../src/trinity/generated/summary.json", import.meta.url), "utf8"));
  const skipped = summary.skipped.filter(entry => promoted.some(([, className]) => entry.className === className));
  assert.deepEqual(
    skipped.map(entry => entry.className).sort(),
    promoted.map(([, className]) => className).sort()
  );
  assert.equal(skipped.every(entry => entry.reason === "hand-maintained source exists"), true);
});

test("EveSpaceObjectDecal lives in the maintained attachment subtree", () => {
  assert.equal(
    existsSync(new URL("../../src/trinity/eve/attachment/decal/EveSpaceObjectDecal.js", import.meta.url)),
    true
  );
  assert.equal(
    existsSync(new URL("../../src/trinity/eve/EveSpaceObjectDecal.js", import.meta.url)),
    false
  );
});
