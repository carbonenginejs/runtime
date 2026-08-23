import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import * as core from "../../npm/dist/trinity/core/index.js";
import * as eve from "../../npm/dist/trinity/eve/index.js";
import * as generatedEve from "../../npm/dist/trinity/generated/eve/index.js";
import * as trinity from "../../npm/dist/trinity/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";


function assertArrayNear(actual, expected, message, epsilon = 1e-5)
{
  assert.equal(actual.length, expected.length, `${message} length`);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `${message}[${index}]: expected ${expected[index]}, received ${actual[index]}`);
  }
}


test("EveCurveLineSet is a maintained Tr2CurveLineSet with Carbon graph defaults", () =>
{
  const lines = new eve.EveCurveLineSet();
  assert.ok(lines instanceof core.Tr2CurveLineSet);
  assert.equal(trinity.EveCurveLineSet, eve.EveCurveLineSet);
  assert.equal("EveCurveLineSet" in generatedEve, false);
  assert.equal(
    existsSync(new URL("../../src/trinity/generated/eve/ui/EveCurveLineSet.js", import.meta.url)),
    false
  );
  assert.equal(lines.lineEffect.GetEffectPathName(),
    "res:/Graphics/Effect/Managed/Space/SpecialFX/Lines3D.fx");
  assert.equal(lines.pickEffect.GetEffectPathName(),
    "res:/Graphics/Effect/Managed/Space/SpecialFX/Lines3DPicking.fx");
  assert.equal(lines.isVisible, false);
  assert.equal(lines.HasTransparentBatches(), true);
  assert.equal(new core.Tr2CurveLineSet().GetPerObjectData({}), null,
    "the base intentionally supplies no constants");
  assert.throws(() => lines.GetBatches(), /engine line-stream realization/u);
});


test("Tr2CurveLineSet submission rebuilds Carbon's incremental CPU bounds", () =>
{
  const lines = new core.Tr2CurveLineSet();
  lines.AddStraightLine([ 1, 0, 0 ], vec4.create(), [ 3, 0, 0 ], vec4.create(), 1);
  lines.AddCurvedLineCrt([ 0, 0, 0 ], vec4.create(), [ 0, 2, 0 ], vec4.create(),
    [ 2, 1, 0 ], 1, 4);
  assert.equal(lines.SubmitChanges(), true);
  assert.equal(lines.currentSubmittedLineCount, 5);
  assert.ok(lines.boundingSphere[3] > 1.25, "the Hermite interior expands the straight-line bound");
  const first = vec4.clone(lines.boundingSphere);
  assert.equal(lines.SubmitChanges(), true);
  assertArrayNear(lines.boundingSphere, first, "repeat submission is deterministic");

  lines.ClearLines();
  lines.SubmitChanges();
  assertArrayNear(lines.boundingSphere, [ 0, 0, 0, 0 ], "empty submission resets bounds");
});


test("EveCurveLineSet composes parent and local SRT before visibility and packing", () =>
{
  const lines = new eve.EveCurveLineSet();
  lines.AddStraightLine([ -1, 0, 0 ], vec4.create(), [ 2, 0, 0 ], vec4.create(), 1);
  lines.SubmitChanges();
  vec3.set(lines.scaling, 2, 3, 4);
  quat.setAxisAngle(lines.rotation, [ 0, 0, 1 ], Math.PI / 3);
  vec3.set(lines.translation, 5, -2, 1);

  const parent = mat4.create();
  mat4.fromRotationTranslationScale(parent,
    quat.setAxisAngle(quat.create(), [ 0, 1, 0 ], -0.4),
    [ 7, 8, 9 ],
    [ 1.5, 0.75, 2 ]);
  const local = mat4.create();
  mat4.fromRotationTranslationScale(local, lines.rotation, lines.translation, lines.scaling);
  const expectedWorld = mat4.multiply(mat4.create(), parent, local);

  const seenSphere = vec4.create();
  const updateContext = {
    GetFrustum()
    {
      return {
        IsSphereVisible(sphere)
        {
          vec4.copy(seenSphere, sphere);
          return true;
        }
      };
    }
  };
  lines.UpdateVisibility(updateContext, parent);
  assert.equal(lines.isVisible, true);
  assertArrayNear(lines.worldTransform, expectedWorld, "parent times local world matrix");
  assert.ok(seenSphere[3] > lines.boundingSphere[3], "largest world basis scales the bound");
  assert.deepEqual(lines.GetRenderables([]), [ lines ]);

  const store = makePerObjectStore();
  const data = lines.GetPerObjectData(store);
  const packed = new Float32Array(16);
  data.vs.Copy("WorldMat", packed);
  assert.equal(packed[1], expectedWorld[4], "RawData applies the sole terminal transpose");
  data.ps.Copy("WorldMat", packed);
  assert.equal(packed[2], expectedWorld[8], "VS and PS receive the same logical matrix");

  const identity = mat4.fromTranslation(mat4.create(), [ 1, 2, 3 ]);
  lines.GetLocalToWorldTransform(identity);
  assertArrayNear(identity, mat4.create(), "Carbon's IEveTransform identity result");
  assert.equal(lines.GetLODLevel(), eve.EveCurveLineSet.Tr2Lod.TR2_LOD_HIGH);
});


test("EveCurveLineSet display and frustum gates fail or collect directly", () =>
{
  const lines = new eve.EveCurveLineSet();
  lines.display = false;
  lines.UpdateVisibility({ GetFrustum() { throw new Error("must not run"); } }, mat4.create());
  assert.equal(lines.isVisible, false);
  assert.deepEqual(lines.GetRenderables([]), []);

  lines.display = true;
  assert.throws(() => lines.UpdateVisibility({}, mat4.create()), /GetFrustum/u);
  assert.throws(() => lines.GetSortValue(), /GetViewPosition/u);
});
