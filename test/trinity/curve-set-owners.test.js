// Curve-set ownership: every class whose Carbon donor derives from ITr2CurveSetOwner answers the cast and forwards
// play/stop/duration calls the way its donor does (EveChildPlug.cpp:272-353, EveChildSocket.cpp:344-400,
// EveChildInstanceContainer.cpp:579-657, EveSpaceObject2.cpp:3901-4047).
import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import {
  EveChildContainer,
  EveChildInstanceContainer,
  EveChildPlug,
  EveChildProceduralContainer,
  EveChildRef,
  EveChildSocket,
  EveEffectRoot2,
  EveSpaceObject2,
  EveTransform,
  ITr2CurveSetOwner,
  TriCurveSet
} from "../../npm/dist/trinity/index.js";

/** A container that plays curve sets, holding one named set. */
function containerWithSet(name)
{
  const container = new EveChildContainer();
  container.updateOnDisplay = false;
  container.displayFilter = EveChildContainer.DisplayQualityModifier.ONLY_REFLECTIONS;
  const curveSet = new TriCurveSet();
  curveSet.name = name;
  container.curveSets.push(curveSet);
  assert.equal(container.IsUpdating(), true, "the fixture container must be updating to play its sets");
  return { container, curveSet };
}

test("every Carbon curve-set owner answers the ITr2CurveSetOwner cast", () =>
{
  for (const Class of [ EveChildContainer, EveChildInstanceContainer, EveChildPlug, EveChildSocket, EveChildRef,
    EveChildProceduralContainer, EveEffectRoot2, EveSpaceObject2, EveTransform ])
  {
    const value = new Class();
    assert.equal(CjsSchema.cast(value, ITr2CurveSetOwner), value, Class.name);
  }
});

test("a plug forwards play and stop to its curve-set-owning objects", () =>
{
  const plug = new EveChildPlug();
  const { container, curveSet } = containerWithSet("activate");
  plug.objects.push(container);

  plug.PlayCurveSet("activate", "");
  assert.equal(curveSet.isPlaying, true);
  plug.StopCurveSet("activate");
  assert.equal(curveSet.isPlaying, false);
  plug.PlayAllCurveSets();
  assert.equal(curveSet.isPlaying, true);
  plug.StopAllCurveSets();
  assert.equal(curveSet.isPlaying, false);
  assert.equal(plug.GetCurveSetDuration("activate"), 0);
});

test("a socket forwards to its plug, and answers 0 without one", () =>
{
  const socket = new EveChildSocket();
  assert.equal(socket.GetCurveSetDuration("activate"), 0);
  assert.equal(socket.GetRangeDuration("activate", "loop"), 0);
  socket.PlayCurveSet("activate", "");

  const plug = new EveChildPlug();
  const { container, curveSet } = containerWithSet("activate");
  plug.objects.push(container);
  socket.plug = plug;
  socket.PlayCurveSet("activate", "");
  assert.equal(curveSet.isPlaying, true);
  socket.StopCurveSet("activate");
  assert.equal(curveSet.isPlaying, false);
});

test("an instance container with no instances plays on its editable source", () =>
{
  const instances = new EveChildInstanceContainer();
  const { container, curveSet } = containerWithSet("pulse");
  instances.source = container;

  instances.PlayCurveSet("pulse", "");
  assert.equal(curveSet.isPlaying, true);
  instances.StopAllCurveSets();
  assert.equal(curveSet.isPlaying, false);
  instances.PlayAllCurveSets();
  assert.equal(curveSet.isPlaying, true);
  assert.equal(instances.GetCurveSetDuration("pulse"), container.GetCurveSetDuration("pulse"));

  instances.disableEditMode = true;
  instances.StopCurveSet("pulse");
  assert.equal(curveSet.isPlaying, true, "edit mode off and no instances: nothing is reached");
});

test("a space object plays its own sets, then its children and effect children", () =>
{
  const object = new EveSpaceObject2();
  const own = new TriCurveSet();
  own.name = "warp";
  object.curveSets.push(own);
  const { container, curveSet } = containerWithSet("warp");
  object.effectChildren.push(container);

  object.PlayCurveSet("warp", "");
  assert.equal(own.isPlaying, true);
  assert.equal(curveSet.isPlaying, true);
  object.StopCurveSet("warp");
  assert.equal(own.isPlaying, false);
  assert.equal(curveSet.isPlaying, false);
  assert.equal(object.GetCurveSetDuration("warp"), 0);
  assert.equal(object.GetRangeDuration("warp", "none"), 0);
});
