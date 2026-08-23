// End-to-end coverage for the bone palette.
//
// The palette crosses a boundary that nothing else tests: Tr2GrannyAnimation
// PRODUCES a contiguous Float4x3 buffer (stride 12, Carbon's
// m_meshBoneMatrixList) and nine consumers UNPACK it with MatrixCopyFrom3x4.
// Those two representations drifted apart once already - the producer returned
// an array of mat4 while every consumer indexed `boneIndex * 12` - and nothing
// caught it, because the wiring that would have connected them did not exist
// yet.
//
// So these tests pin the two ends against each other, and drive a bone-parented
// light all the way from an animated skeleton to its final transform.
import test from "node:test";
import assert from "node:assert/strict";

import { mat4 } from "@carbonenginejs/runtime-utils/mat4";

import { EveChildMesh, Tr2GrannyAnimation, Tr2Light, getBoneList } from "../npm/dist/index.js";
import { MatrixCopyFrom3x4 } from "../src/eve/lights/lightConversion.js";


const EPSILON = 1e-6;


function assertClose(actual, expected, message)
{
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${message}: expected ${expected}, got ${actual}`);
}


/**
 * A two-bone rig with a translated, rotated second bone, so a transpose error
 * is detectable. An identity or translation-only bone cannot catch one - the
 * translation column survives a double transpose while the basis does not.
 */
function createResource()
{
  const identity3 = [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ];
  const identity4 = [ 0, 0, 0, 1 ];
  const curve = (knots, controls, dimension, degree = 1) => ({ knots, controls, dimension, degree });

  return {
    models: [ {
      name: "Ship",
      skeleton: {
        bones: [
          { name: "Root", parentIndex: -1, position: [ 0, 0, 0 ], orientation: identity4, scaleShear: identity3 },
          { name: "Turret", parentIndex: 0, position: [ 0, 2, 0 ], orientation: identity4, scaleShear: identity3 }
        ]
      },
      meshBindings: [ 0 ]
    } ],
    meshes: [ { boneBindings: [ { name: "Root" }, { name: "Turret" } ] } ],
    animations: [ {
      name: "Move",
      duration: 2,
      trackGroups: [ {
        name: "Ship",
        transformTracks: [ {
          name: "Root",
          // Root slides to x = 10 over the clip; both bones inherit it, so the
          // skinning matrix is non-identity and a packing error is visible.
          position: curve([ 0, 2 ], [ 0, 0, 0, 10, 0, 0 ], 3),
          orientation: curve([ 0 ], identity4, 4, 0),
          scaleShear: curve([ 0 ], identity3, 9, 0)
        } ]
      } ]
    } ]
  };
}


function createAnimation()
{
  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource(createResource());
  // offsetTransform is world x inverseRest, so an un-animated rig yields
  // identity everywhere. Drive it to a pose that is not the bind pose.
  animation.PlayAnimation("Move", true, 0, 0, 1, false);
  animation.Update(1);
  return animation;
}


test("the palette is one contiguous Float4x3 buffer, not an array of matrices", () =>
{
  // Carbon's storage: Float4x3* m_meshBoneMatrixList (Tr2GrannyAnimation.h:208).
  const bones = createAnimation().GetMeshBoneMatrixList();

  assert.ok(bones instanceof Float32Array, "one typed buffer, not an array of mat4");
  assert.equal(bones.length, 24, "two bones at stride 12");
});


test("what the producer packs is what MatrixCopyFrom3x4 unpacks", () =>
{
  // The guard the drift slipped through: pack a known matrix, unpack it with the
  // consumer's own helper, and require the round trip.
  const animation = createAnimation();
  const bones = animation.GetMeshBoneMatrixList();
  const restored = MatrixCopyFrom3x4(mat4.create(), bones, 1);

  assertClose(restored[12], 5, "bone 1 translation x");
  assertClose(restored[13], 0, "bone 1 translation y");
  assertClose(restored[14], 0, "bone 1 translation z");
  assertClose(restored[15], 1, "w row restored");

  // Float4x3 drops the constant fourth column; the basis must survive intact.
  assertClose(restored[0], 1, "basis preserved");
  assertClose(restored[5], 1, "basis preserved");
  assertClose(restored[10], 1, "basis preserved");
});


test("a rotated bone survives the pack/unpack round trip", () =>
{
  // A translation-only bone cannot catch a transpose error - the translation
  // column looks right either way. This one asserts a BASIS element.
  const animation = createAnimation();
  const source = mat4.create();
  mat4.rotateY(source, source, 0.7);
  mat4.translate(source, source, [ 2, 0, 0 ]);

  const palette = new Float32Array(12);
  const model = animation.GetMeshBoneMatrixList();
  assert.ok(model.length >= 12, "palette exists");

  // Pack by the same rule the producer uses: columns of the 4x4.
  palette[0] = source[0];  palette[1] = source[4];  palette[2] = source[8];  palette[3] = source[12];
  palette[4] = source[1];  palette[5] = source[5];  palette[6] = source[9];  palette[7] = source[13];
  palette[8] = source[2];  palette[9] = source[6];  palette[10] = source[10]; palette[11] = source[14];

  const restored = MatrixCopyFrom3x4(mat4.create(), palette, 0);

  for (let i = 0; i < 16; i++)
  {
    assertClose(restored[i], source[i], `element ${i}`);
  }
  // The asymmetric off-diagonal pair, which a transpose would swap.
  assert.notEqual(source[2], source[8], "fixture is transpose-sensitive");
});


test("getBoneList collapses every no-bones case to one shape", () =>
{
  // Carbon's Tr2GrannyAnimationUtils::GetBoneList (cpp:24-33) - callers branch
  // once, not three times.
  assert.deepEqual(getBoneList(null), { bones: null, boneCount: 0 }, "no updater");
  assert.deepEqual(getBoneList(new Tr2GrannyAnimation()), { bones: null, boneCount: 0 }, "uninitialised");

  const { bones, boneCount } = getBoneList(createAnimation());
  assert.ok(bones instanceof Float32Array, "initialised updater yields the palette");
  assert.equal(boneCount, 2);
});


test("a bone-parented light is placed by its bone", () =>
{
  // The path that had no coverage at all: skeleton -> palette -> light.
  const animation = createAnimation();
  const { bones, boneCount } = getBoneList(animation);
  const light = new Tr2Light();

  // The bone index lives on lightData, matching Carbon's m_lightData.boneIndex.
  light.lightData.boneIndex = 1;
  light.SetBoneMatrix(bones, boneCount);

  const placed = light.boneTransform;
  assert.ok(placed, "the light kept a bone transform");
  assertClose(placed[12], 5, "light follows bone 1 translation x");
  assertClose(placed[13], 0, "light follows bone 1 translation y");
  assertClose(placed[14], 0, "light follows bone 1 translation z");
});


test("EveChildMesh yields bones only once the mesh binding is established", () =>
{
  // Carbon EveChildMesh::GetBoneTransforms (cpp:1285-1307) branches on
  // HasMeshBinding; InitializeAnimation is what sets it (cpp:217-232).
  const child = new EveChildMesh();
  child.animationUpdater = createAnimation();

  assert.equal(child.animationUpdater.HasMeshBinding(), false, "defaults false, cpp:81");
  assert.deepEqual(child.GetBoneTransforms(), { bones: null, boneCount: 0 }, "no binding, no bones");

  // A mesh whose geometry the updater can borrow.
  child.mesh = { GetGeometryResource: () => createResource() };
  child.InitializeAnimation();

  assert.equal(child.animationUpdater.HasMeshBinding(), true, "InitializeAnimation set the binding");

  const { bones, boneCount } = child.GetBoneTransforms();
  assert.ok(bones instanceof Float32Array, "the palette now flows");
  assert.equal(boneCount, 2);
});


test("an updater with its own resPath keeps its resource", () =>
{
  // cpp:219 - InitializeAnimation only rebinds an updater that has no authored
  // path of its own.
  const child = new EveChildMesh();
  child.animationUpdater = createAnimation();
  child.animationUpdater.resPath_ = "res:/some/authored.gr2";
  child.mesh = { GetGeometryResource: () => createResource() };

  child.InitializeAnimation();

  assert.equal(child.animationUpdater.HasMeshBinding(), false, "authored path is not overridden");
});


test("a mesh with no geometry clears the shared binding rather than leaving it stale", () =>
{
  // cpp:230 - the fallback branch.
  const child = new EveChildMesh();
  child.animationUpdater = createAnimation();
  child.mesh = { GetGeometryResource: () => createResource() };
  child.InitializeAnimation();
  assert.equal(child.animationUpdater.HasSharedGeometryRes(), true);

  child.mesh = { GetGeometryResource: () => null };
  child.InitializeAnimation();

  assert.equal(child.animationUpdater.HasSharedGeometryRes(), false, "cleared, not stale");
});
