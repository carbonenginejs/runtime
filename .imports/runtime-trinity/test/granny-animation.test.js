import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { Tr2GrannyAnimation } from "../npm/dist/core/animation/Tr2GrannyAnimation.js";
import { GrannyBoneOffset } from "../npm/dist/core/index.js";


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
  animation.model_ = "Ship";
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


test("Tr2GrannyAnimation handles reverse, paused, and masked-layer playback", () =>
{
  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource(createResource());
  animation.PlayAnimation("Move", true, 0, 0, -1, false);
  animation.Update(0.5);
  assert.ok(Math.abs(animation.GetMeshBoneMatrixList()[3] - 7.5) < 1e-6);

  animation.TogglePauseAnimations(true);
  animation.Update(1);
  assert.ok(Math.abs(animation.GetMeshBoneMatrixList()[3] - 7.5) < 1e-6);
  animation.TogglePauseAnimations(false);

  assert.equal(animation.AddAnimationLayer("upper", 0.5), true);
  assert.equal(animation.AddAnimationLayerBone("upper", "Child"), true);
  assert.equal(animation.PlayLayerAnimation("upper", "Move", true, 0, 0, 1, false), true);
  assert.equal(animation.GetLayerWeight("upper"), 0.5);
  assert.equal(animation.RemoveAnimationLayerBone("upper", "Child"), true);
  animation.ClearAnimationLayers();
  assert.equal(animation.GetLayerWeight("upper"), 0);
});
