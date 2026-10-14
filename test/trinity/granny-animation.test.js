import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2GrannyAnimation } from "../../npm/dist/trinity/core/animation/Tr2GrannyAnimation.js";
import { GrannyBoneOffset } from "../../npm/dist/trinity/core/index.js";


const identity3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const identity4 = [0, 0, 0, 1];


function explicitCurve(knots, controls, dimension, degree = 1)
{
  return { knots, controls, dimension, degree };
}


function createResource()
{
  return {
    models: [{
      name: "Ship",
      skeleton: {
        bones: [{
          name: "Root",
          parentIndex: -1,
          position: [0, 0, 0],
          orientation: identity4,
          scaleShear: identity3
        }, {
          name: "Child",
          parentIndex: 0,
          position: [0, 2, 0],
          orientation: identity4,
          scaleShear: identity3
        }]
      },
      meshBindings: [0]
    }],
    meshes: [{
      boneBindings: [{ name: "Root" }, { name: "Child" }]
    }],
    animations: [{
      name: "Move",
      duration: 2,
      trackGroups: [{
        name: "Ship",
        transformTracks: [{
          name: "Root",
          position: explicitCurve([0, 2], [0, 0, 0, 10, 0, 0], 3),
          orientation: explicitCurve([0], identity4, 4, 0),
          scaleShear: explicitCurve([0], identity3, 9, 0)
        }]
      }, {
        name: "root",
        vectorTracks: [{
          name: "Smile",
          dimension: 1,
          valueCurve: explicitCurve([0, 2], [0, 1], 1)
        }]
      }]
    }]
  };
}


function float32Bytes(values)
{
  return Array.from(new Uint8Array(new Float32Array(values).buffer));
}


function morphAnimation(name, value)
{
  return {
    name,
    duration: 2,
    trackGroups: [{
      name: "root",
      vectorTracks: [{
        name: "Mood",
        dimension: 1,
        valueCurve: explicitCurve([0], [value], 1, 0)
      }]
    }]
  };
}


test("Tr2GrannyAnimation builds and samples browser bone matrices", () =>
{
  const animation = new Tr2GrannyAnimation();
  assert.equal(animation.resPath, "");
  assert.equal(animation.model, "");
  animation.model_ = "Ship";
  assert.equal(animation.model, "Ship");
  assert.equal(animation.SetGrannyResource(createResource()), true);
  assert.equal(animation.IsInitialized(), true);
  assert.ok(animation.boneOffset instanceof GrannyBoneOffset);
  assert.equal(animation.GetMeshBoneCount(), 2);
  assert.deepEqual(animation.GetAnimationBoneList(), ["Root", "Child"]);
  assert.deepEqual(animation.GetAnimationNames(), ["Move"]);

  assert.equal(animation.PlayAnimation("Move", true, 0, 0, 1, false), true);
  assert.equal(animation.Update(1), true);
  const bones = animation.GetMeshBoneMatrixList();
  assert.equal(bones.length, 24, "two bones, Float4x3 stride 12");
  assert.ok(Math.abs(bones[3] - 5) < 1e-6, "bone 0 translation x");
  assert.ok(Math.abs(bones[15] - 5) < 1e-6, "bone 1 translation x");
  assert.ok(Math.abs(animation.GetMorphAnimations().get("Smile") - 0.5) < 1e-6);

  assert.equal(CjsSchema.getMethod(Tr2GrannyAnimation, "PlayAnimation")?.carbon?.method, true);
  assert.equal(CjsSchema.getMethod(Tr2GrannyAnimation, "PlayAnimationOnce")?.carbon?.method, undefined);
});


test("Tr2GrannyAnimation applies post-sample bone offsets before world composition", () =>
{
  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource(createResource());
  animation.boneOffset.SetOffset("Root", 2, 0, 0);
  animation.PlayAnimation("Move", true, 0, 0, 1, false);
  animation.Update(1);

  const bones = animation.GetMeshBoneMatrixList();
  assert.ok(Math.abs(bones[3] - 7) < 1e-6, "bone 0 translation x");
  assert.ok(Math.abs(bones[15] - 7) < 1e-6, "bone 1 translation x");

  animation.boneOffset.ClearTransforms();
  animation.Update(0);
  assert.ok(Math.abs(animation.GetMeshBoneMatrixList()[3] - 5) < 1e-6);
});


test("Tr2GrannyAnimation samples Carbon morph channels and returns detached snapshots", () =>
{
  const resource = createResource();
  resource.animations.push({
    name: "ModernMorph",
    duration: 2,
    channels: [
      { target: "Brow", targetType: "MorphTarget", curveIndex: 0 },
      { target: "Blink", targetType: "MorphTarget", curveIndex: 1 }
    ],
    curves: [{
      valueDimension: 1,
      interpolation: "Linear",
      knotType: "Float32",
      valueType: "Float32",
      knotCount: 2,
      knots: float32Bytes([0, 2]),
      values: float32Bytes([0, 2])
    }, {
      valueDimension: 1,
      interpolation: "Step",
      knotType: "Float32",
      valueType: "Float32",
      knotCount: 2,
      knots: float32Bytes([0, 2]),
      values: float32Bytes([0.25, 0.75])
    }]
  });

  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource(resource);
  animation.PlayAnimation("ModernMorph", true, 0, 0, 1, false);
  animation.Update(1);

  const morphs = animation.GetMorphAnimations();
  assert.ok(Math.abs(morphs.get("Brow") - 1) < 1e-6);
  assert.ok(Math.abs(morphs.get("Blink") - 0.25) < 1e-6);
  morphs.set("Brow", 99);
  assert.ok(Math.abs(animation.GetMorphAnimations().get("Brow") - 1) < 1e-6);

  animation.ClearAnimations();
  animation.Update(0);
  assert.equal(animation.GetMorphAnimations().size, 0);
});


test("Tr2GrannyAnimation samples layers in native lexical order for morph replacement", () =>
{
  const resource = createResource();
  resource.animations.push(morphAnimation("AMood", 3), morphAnimation("ZMood", 2));

  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource(resource);
  animation.AddAnimationLayer("z-layer", 0.5);
  animation.AddAnimationLayer("a-layer", 1);
  animation.PlayLayerAnimation("z-layer", "ZMood", true, 0, 0, 1, false);
  animation.PlayLayerAnimation("a-layer", "AMood", true, 0, 0, 1, false);
  animation.Update(0.5);
  assert.equal(animation.GetMorphAnimations().get("Mood"), 1,
    "z-layer is sampled after a-layer and replaces it");

  animation.SetAdditiveBlendMode(true);
  animation.Update(0);
  assert.equal(animation.GetMorphAnimations().get("Mood"), 4);
});


test("Tr2GrannyAnimation freezes a negative-speed clip, and handles paused and masked-layer playback", () =>
{
  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource(createResource());
  // cmf AnimationPlayer::SetSpeed clamps to 0 (animation.cpp:634-638): a negative speed holds the first frame for ever.
  animation.PlayAnimation("Move", true, 0, 0, -1, false);
  animation.Update(0.5);
  assert.ok(Math.abs(animation.GetMeshBoneMatrixList()[3]) < 1e-6);
  assert.equal(animation.GetAnimationLayer(null).GetAnimationRemainingTime(), Infinity);

  animation.PlayAnimation("Move", true, 0, 0, 1, false);
  animation.Update(0.5);
  assert.ok(Math.abs(animation.GetMeshBoneMatrixList()[3] - 2.5) < 1e-6);
  animation.TogglePauseAnimations(true);
  animation.Update(1);
  assert.ok(Math.abs(animation.GetMeshBoneMatrixList()[3] - 2.5) < 1e-6);
  animation.TogglePauseAnimations(false);

  animation.AddAnimationLayer("upper", 0.5);
  animation.AddAnimationLayerBone("upper", "Child");
  assert.equal(animation.PlayLayerAnimation("upper", "Move", true, 0, 0, 1, false), true);
  assert.equal(animation.GetLayerWeight("upper"), 0.5);
  animation.RemoveAnimationLayerBone("upper", "Child");
  animation.ClearAnimationLayers();
  assert.equal(animation.GetLayerWeight("upper"), 0);
});


test("Tr2GrannyAnimation layer bone masks follow Carbon's single weight array", () =>
{
  const resource = createResource();
  // A Granny track mask is a numeric extended-data member of its name on each bone.
  resource.models[0].skeleton.bones[1].extendedData = { Upper: 0.5 };
  const mask = (animation, name) => Array.from(animation.GetAnimationLayer(name).boneMask);

  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  // Before the rig: names are recorded, AddAllBones finds no bones.
  animation.AddAnimationLayer("early", 1);
  animation.AddAnimationLayerBone("early", "Child");
  animation.AddAnimationLayer("all", 1);
  animation.AddAnimationLayerAllBones("all");
  assert.equal(animation.GetAnimationLayer("early").boneMask, null);
  animation.SetGrannyResource(resource);

  // Building the rig sets named bones to the layer's default weight, 0 for an
  // added layer (Tr2GrannyAnimationLayer.cpp:112-119), so "early" moves nothing.
  assert.deepEqual(mask(animation, "early"), [0, 0]);
  assert.deepEqual(mask(animation, "all"), [0, 0]);
  assert.deepEqual(Array.from(animation.GetAnimationLayer(null).boneMask), [1, 1]);

  // After the rig: AddBone and AddAllBones set weight 1.
  animation.AddAnimationLayer("late", 1);
  animation.AddAnimationLayerBone("late", "Child");
  assert.deepEqual(mask(animation, "late"), [0, 1]);
  animation.AddAnimationLayerAllBones("all");
  assert.deepEqual(mask(animation, "all"), [1, 1]);

  // A track mask replaces the whole array; RemoveBone zeroes a masked bone too.
  animation.AddAnimationLayerWithTrackMask("masked", "Upper");
  assert.deepEqual(mask(animation, "masked"), [0, 0.5]);
  animation.AddAnimationLayerBone("masked", "Root");
  assert.deepEqual(mask(animation, "masked"), [1, 0.5]);
  animation.AddAnimationLayerWithTrackMask("masked", "Upper");
  assert.deepEqual(mask(animation, "masked"), [0, 0.5]);
  animation.RemoveAnimationLayerBone("masked", "Child");
  assert.deepEqual(mask(animation, "masked"), [0, 0]);

  // A rebuilt rig re-applies the mask name, then the named bones at weight 0.
  animation.AddAnimationLayerBone("masked", "Child");
  assert.deepEqual(mask(animation, "masked"), [0, 1]);
  animation.SetGrannyResource(createResource());
  assert.deepEqual(mask(animation, "masked"), [0, 0]);
});


test("Tr2GrannyAnimation runs the pose modifier after sampling without compounding", () =>
{
  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource(createResource());
  animation.PlayAnimation("Move", true, 0, 0, 1, false);

  const seen = [];
  const modifier = {
    ModifyPose(skeleton, pose)
    {
      seen.push(skeleton.bones.slice());
      // In-place modification aliases the live pose (Carbon cmf::SkeletonPose&).
      pose.boneTransforms[0].position[0] += 100;
    }
  };
  assert.equal(animation.GetPoseModifier(), null);
  animation.SetPoseModifier(modifier);
  assert.equal(animation.GetPoseModifier(), modifier);

  animation.Update(1);
  let bones = animation.GetMeshBoneMatrixList();
  assert.ok(Math.abs(bones[3] - 105) < 1e-6, "sampled 5 plus the modifier's 100");

  // A second frame at the same clock must NOT compound the modifier's own
  // output (Carbon restores m_sampledPose first, Tr2GrannyAnimation.cpp:1704-1709).
  animation.Update(0);
  bones = animation.GetMeshBoneMatrixList();
  assert.ok(Math.abs(bones[3] - 105) < 1e-6, "no frame-over-frame compounding");
  assert.equal(seen.length, 2);
  assert.deepEqual(seen[0], ["Root", "Child"]);

  animation.SetPoseModifier(null);
  animation.Update(0);
  bones = animation.GetMeshBoneMatrixList();
  assert.ok(Math.abs(bones[3] - 5) < 1e-6, "cleared modifier leaves the sampled pose");
});


test("Tr2GrannyAnimation.StopAnimations pins a stop time and clears the queue", () =>
{
  // Immediate stop: the active animation is removed and, as Carbon never
  // rest-poses m_pose per frame (cpp:1704-1717), the bone keeps its last pose.
  const immediate = new Tr2GrannyAnimation();
  immediate.model_ = "Ship";
  immediate.SetGrannyResource(createResource());
  immediate.PlayAnimation("Move", true, 0, 0, 1, false);
  immediate.Update(1);
  assert.ok(Math.abs(immediate.GetMeshBoneMatrixList()[3] - 5) < 1e-6);
  immediate.StopAnimations(0);
  immediate.Update(0);
  assert.ok(Math.abs(immediate.GetMeshBoneMatrixList()[3] - 5) < 1e-6, "immediate stop holds the last pose");

  // Delayed stop: playback continues until the pinned stop time, then ends;
  // pending queue entries are dropped at the call.
  const delayed = new Tr2GrannyAnimation();
  delayed.model_ = "Ship";
  delayed.SetGrannyResource(createResource());
  delayed.PlayAnimation("Move", true, 0, 0, 1, false);
  delayed.PlayAnimation("Move", true, 0, 0, 1, false);
  delayed.Update(1);
  delayed.StopAnimations(1);
  delayed.Update(0.5);
  assert.ok(Math.abs(delayed.GetMeshBoneMatrixList()[3] - 7.5) < 1e-6,
    "still sampling before the stop time");
  delayed.Update(0.6);
  assert.ok(Math.abs(delayed.GetMeshBoneMatrixList()[3] - 7.5) < 1e-6,
    "past the stop time the animation is retired and the last pose held");
  delayed.Update(1);
  assert.ok(Math.abs(delayed.GetMeshBoneMatrixList()[3] - 7.5) < 1e-6,
    "the pending entry was dropped by the stop, not resumed");
});
