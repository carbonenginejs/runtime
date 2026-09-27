import test from "node:test";
import assert from "node:assert/strict";
import { Tr2GrannyAnimation } from "../../npm/dist/trinity/core/animation/Tr2GrannyAnimation.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";

function close(actual, expected)
{
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-5, `${index}: ${value} != ${expected[index]}`));
}

function bone(name, parentIndex = -1, values = {})
{
  return { name, parentIndex, position: [0, 0, 0], orientation: [0, 0, 0, 1], scaleShear: [1, 0, 0, 0, 1, 0, 0, 0, 1], ...values };
}

function animation(bones)
{
  const result = new Tr2GrannyAnimation();
  result.SetGrannyResource({ models: [{ name: "Ship", skeleton: { bones }, meshBindings: [] }], meshes: [], animations: [] });
  return result;
}

test("aiming replaces sampled rotation, matches names without case, and persists after DisableAimBone", () =>
{
  const value = animation([bone("Root", -1, { orientation: [0, 0, Math.SQRT1_2, Math.SQRT1_2] })]);
  value.AimBone("rOoT", 10, 0, 0, 0, 0, 1);
  for (let i = 0; i < 3; i++)
  {
    value.Update(0);
    close(Array.from(value.GetBoneWorldTransform("Root").slice(8, 11)), [1, 0, 0]);
  }
  // Carbon never rest-poses m_pose per frame (Tr2GrannyAnimation.cpp:1704-1717;
  // cmf AnimationSequencer::Sample writes only active players' bones,
  // mesh/src/cmf/animation.cpp:810-819): an unanimated bone keeps the aim.
  value.DisableAimBone();
  value.Update(0);
  close(Array.from(value.GetBoneWorldTransform("Root").slice(8, 11)), [1, 0, 0]);
  value.AimBone("missing", 10, 0, 0, 0, 0, 1);
  value.Update(0);
  close(Array.from(value.GetBoneWorldTransform("Root").slice(8, 11)), [1, 0, 0]);
  // Only a rebuild rest-poses again (cmf::RestPose at setup, cpp:624).
  value.RebuildCachedData();
  close(Array.from(value.GetBoneWorldTransform("Root").slice(8, 11)), [0, 0, 1]);
});

test("UpdateAimingBone is Carbon-private (Tr2GrannyAnimation.h:175,191)", () =>
{
  const value = animation([bone("Root")]);
  assert.equal(value.UpdateAimingBone, undefined);
  assert.equal(typeof value._UpdateAimingBone, "function");
  assert.equal(CjsSchema.getMethod(Tr2GrannyAnimation, "UpdateAimingBone")?.carbon?.method, undefined);
  assert.equal(CjsSchema.getMethod(Tr2GrannyAnimation, "_UpdateAimingBone")?.carbon?.method, undefined);
});

test("aiming preserves Carbon parent-transpose behavior under nonuniform scale", () =>
{
  const value = animation([
    bone("Root", -1, { position: [10, 20, 30], orientation: [0, 0, Math.SQRT1_2, Math.SQRT1_2], scaleShear: [2, 0, 0, 0, 1, 0, 0, 0, 1] }),
    bone("Child", 0, { position: [1, 0, 0] })
  ]);
  value.AimBone("Child", 11, 23, 30, 0, 0, 1);
  value.Update(0);
  const matrix = value.GetBoneWorldTransform("Child");
  close(Array.from(matrix.slice(12, 15)), [10, 22, 30]);
  close(Array.from(matrix.slice(8, 11)), [1 / Math.sqrt(5), 4 / Math.sqrt(5), 0]);
});

test("pose modifier sees aiming before offsets and final world composition", () =>
{
  const value = animation([bone("Root")]);
  value.AimBone("Root", 10, 0, 0, 0, 0, 1);
  value.SetPoseModifier({
    ModifyPose(skeleton, pose)
    {
      close(Array.from(pose.boneTransforms[0].rotation), [0, Math.SQRT1_2, 0, Math.SQRT1_2]);
      pose.boneTransforms[0].rotation.set([0, 0, 0, 1]);
      pose.boneTransforms[0].position.set([2, 0, 0]);
    }
  });
  value.boneOffset.SetOffset("Root", 3, 0, 0);
  for (let i = 0; i < 2; i++)
  {
    // Carbon restores m_sampledPose before sampling (cpp:1704-1709), so
    // neither the modifier nor the offsets compound frame over frame.
    value.Update(0);
    const matrix = value.GetBoneWorldTransform("Root");
    close(Array.from(matrix.slice(8, 11)), [0, 0, 1]);
    close(Array.from(matrix.slice(12, 15)), [5, 0, 0]);
  }
});

test("bone offsets compound on an unanimated bone without a pose modifier (Carbon quirk)", () =>
{
  // Tr2GrannyAnimation.cpp:1727-1742 applies GrannyBoneOffset::ApplyToLocal
  // (GrannyBoneOffset.cpp:195-196) onto the persistent m_pose; nothing
  // rewrites an unanimated bone, so the offset accumulates.
  const value = animation([bone("Root")]);
  value.boneOffset.SetOffset("Root", 3, 0, 0);
  value.Update(0);
  close(Array.from(value.GetBoneWorldTransform("Root").slice(12, 15)), [3, 0, 0]);
  value.Update(0);
  close(Array.from(value.GetBoneWorldTransform("Root").slice(12, 15)), [6, 0, 0]);
});

test("rotation arc preserves native antiparallel fallback and degenerate directions", () =>
{
  const result = quat.create();
  close(Array.from(quat.rotationArc(result, [0, 0, 4], [7, 0, 0])), [0, Math.SQRT1_2, 0, Math.SQRT1_2]);
  close(Array.from(quat.rotationArc(result, [1, 0, 0], [-1, 0, 0])), [1, 0, 0, 0]);
  close(Array.from(quat.rotationArc(result, [0, 0, 1], [0.001, 0, -1])), [0, 1, 0, 0]);
  close(Array.from(quat.rotationArc(result, [0, 0, 0], [0, 0, 1])), [0, 0, 0, 1]);
  const value = animation([bone("Root")]);
  value.AimBone("Root", 0, 0, 0, 0, 0, 1);
  value.Update(0);
  close(Array.from(value.GetBoneWorldTransform("Root").slice(8, 11)), [0, 0, 1]);
});
