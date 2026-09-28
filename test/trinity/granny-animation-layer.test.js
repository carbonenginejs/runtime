import test from "node:test";
import assert from "node:assert/strict";
import { Tr2GrannyAnimation } from "../../npm/dist/trinity/core/animation/Tr2GrannyAnimation.js";
import { Tr2GrannyAnimationLayer } from "../../npm/dist/trinity/core/animation/Tr2GrannyAnimationLayer.js";
import { EveSpaceObject2 } from "../../npm/dist/trinity/eve/spaceObject/EveSpaceObject2.js";
import { Tr2SyncToAnimation } from "../../npm/dist/trinity/index.js";


const identity3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const identity4 = [0, 0, 0, 1];


/**
 * Geometry a mesh lends its updater: what a TriGeometryRes read from a .gr2
 * answers (GetGrannyInfo; Carbon m_pGrannyFile).
 */
function geometryOf(grannyFile)
{
  return { GetGrannyInfo: () => grannyFile };
}


/** One root bone and a 2-second "Move" animation. */
function createResource()
{
  return {
    models: [{
      name: "Ship",
      skeleton: { bones: [{ name: "Root", parentIndex: -1, position: [0, 0, 0], orientation: identity4, scaleShear: identity3 }] },
      meshBindings: [0]
    }],
    meshes: [{ boneBindings: [{ name: "Root" }] }],
    animations: [{
      name: "Move",
      duration: 2,
      trackGroups: [{
        name: "Ship",
        transformTracks: [{
          name: "Root",
          position: { knots: [0, 2], controls: [0, 0, 0, 10, 0, 0], dimension: 3, degree: 1 }
        }]
      }]
    }]
  };
}


function createAnimation()
{
  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource(createResource());
  return animation;
}


function close(actual, expected, message)
{
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} != ${expected}`);
}


test("GetAnimationLayer: null is the base layer, names look up, unknown and empty are null (Tr2GrannyAnimation.cpp:305-319)", () =>
{
  const animation = createAnimation();
  const base = animation.GetAnimationLayer(null);
  assert.ok(base instanceof Tr2GrannyAnimationLayer);
  assert.equal(animation.GetAnimationLayer(), base);
  assert.equal(animation.GetAnimationLayer("upper"), null);
  assert.equal(animation.GetAnimationLayer(""), null, "an empty name is a map key, not the base layer");
  animation.AddAnimationLayer("upper", 0.5);
  const upper = animation.GetAnimationLayer("upper");
  assert.ok(upper instanceof Tr2GrannyAnimationLayer);
  assert.equal(upper.GetLayerWeight(), 0.5);
  upper.SetLayerWeight(0.25);
  assert.equal(animation.GetLayerWeight("upper"), 0.25);
});


test("GetAnimationRemainingTime follows cmf loop truncation and the explicit-stop quirk (Tr2GrannyAnimationLayer.cpp:836-861)", () =>
{
  const animation = createAnimation();
  const layer = animation.GetAnimationLayer(null);
  assert.equal(layer.GetAnimationRemainingTime(), 0, "no players");

  // Finite clearWhenDone play pins an explicit stop (cpp:257-260), which the
  // loop truncation cannot move (animation.cpp:602-607): all loops remain.
  animation.PlayAnimation("Move", true, 3, 0, 1, true);
  animation.Update(0.5);
  close(layer.GetAnimationRemainingTime(), 5.5, "explicit stop: 3 loops * 2s - 0.5s");

  // Without clearWhenDone the stop is derived: end of the CURRENT loop.
  animation.PlayAnimation("Move", true, 3, 0, 1, false);
  animation.Update(0.5);
  close(layer.GetAnimationRemainingTime(), 1.5, "derived stop: end of loop 0");

  // Infinite loop: still the end of the current loop.
  animation.PlayAnimation("Move", true, 0, 0, 1, true);
  animation.Update(2.5);
  close(layer.GetAnimationRemainingTime(), 1.5, "infinite loop: end of loop 1");

  // Speed scales the loop; zero speed never ends (animation.cpp:688-695).
  animation.PlayAnimation("Move", true, 1, 0, 2, false);
  animation.Update(0.5);
  close(layer.GetAnimationRemainingTime(), 0.5, "speed 2: 1s loop");
  animation.PlayAnimation("Move", true, 1, 0, 0, false);
  assert.equal(layer.GetAnimationRemainingTime(), Infinity);

  // A delayed start counts its delay (loop index clamps to 0).
  animation.PlayAnimation("Move", true, 1, 1, 1, false);
  close(layer.GetAnimationRemainingTime(), 3, "1s delay + 2s loop");

  // A held (finished, not cleared) play has nothing left.
  animation.PlayAnimation("Move", true, 1, 0, 1, false);
  animation.Update(3);
  assert.equal(layer.GetAnimationRemainingTime(), 0);
});


test("a chained request is timed from the end of the one before it", () =>
{
  const animation = createAnimation();
  animation.PlayAnimation("Move", true, 1, 0, 1, false);
  animation.ChainAnimation("Move");
  close(animation.GetAnimationLayer(null).GetAnimationRemainingTime(), 4, "2s current + 2s chained");
});


test("owner End/Stop/ClearAnimations delegate to the base layer (Tr2GrannyAnimation.cpp:1505-1518)", () =>
{
  const animation = createAnimation();
  const layer = animation.GetAnimationLayer(null);
  animation.PlayAnimation("Move", true, 0, 0, 1, true);
  animation.Update(2.5);
  animation.EndAnimation();
  assert.equal(layer.queue[0].loopCount, 2, "finish at the end of loop 1");
  animation.ClearAnimations();
  assert.equal(layer.queue.length, 0);
});


test("EveSpaceObject2.GetAnimationController returns the animation updater (EveSpaceObject2.h:450-453)", () =>
{
  const object = new EveSpaceObject2();
  assert.equal(object.GetAnimationController(), null);
  const animation = createAnimation();
  object.animationUpdater = animation;
  assert.equal(object.GetAnimationController(), animation);
});


test("Tr2SyncToAnimation reads a real Tr2GrannyAnimation layer (Tr2SyncToAnimation.cpp:10-28)", () =>
{
  const animation = createAnimation();
  const controller = { GetOwner: () => ({ GetAnimationController: () => animation }) };
  const finalizer = new Tr2SyncToAnimation();
  assert.equal(finalizer.CanTransition(controller), true, "idle base layer");

  animation.PlayAnimation("Move", true, 1, 0, 1, false);
  animation.Update(1);
  assert.equal(finalizer.CanTransition(controller), false, "1s remaining");
  animation.Update(1.5);
  assert.equal(finalizer.CanTransition(controller), true, "finished");

  finalizer.mask = "missing";
  assert.equal(finalizer.CanTransition(controller), true, "no such layer");
});


test("SetSharedGeometryRes is a no-op for the bound resource (Tr2GrannyAnimation.cpp:283-286)", () =>
{
  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  const resource = geometryOf(createResource());
  animation.SetSharedGeometryRes(resource);
  assert.equal(animation.HasSharedGeometryRes(), true);
  animation.resPath_ = "res:/kept.gr2";
  animation.SetSharedGeometryRes(resource);
  assert.equal(animation.resPath_, "res:/kept.gr2", "same resource: m_resPath untouched");

  const unbound = new Tr2GrannyAnimation();
  unbound.resPath_ = "res:/own.gr2";
  unbound.SetSharedGeometryRes(null);
  assert.equal(unbound.resPath_, "res:/own.gr2", "null onto null: m_resPath untouched");
});
