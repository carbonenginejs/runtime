// EveStretch places its children as Carbon EveStretch.cpp:175-294 does. Firing effects (web, neutralizer, ECM drones)
// take the transform-mode path: the stretch spans the muzzle's +Z over the length whatever isNegZForward says, and the
// destination child sits at the destination with its Y axis pointing back at the source.
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveStretch, EveTransform, EveUpdateContext, Tr2CurveScalar } from "../../npm/dist/trinity/index.js";

/** A real EveTransform child that records the transform it is placed with. */
function recorder()
{
  const child = new EveTransform();
  child.placed = null;
  child.UpdateVisibility = (_context, transform) => { child.placed = Array.from(transform); return true; };
  return child;
}

function near(actual, expected, message)
{
  assert.equal(actual.length, expected.length, message);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) < 1e-5, `${message}: [${index}] ${actual[index]} != ${expected[index]}`);
  }
}

function stretchWith(children)
{
  const stretch = new EveStretch();
  Object.assign(stretch, children);
  stretch.DisplayEndPoints(true, true);
  return stretch;
}

function place(stretch)
{
  const context = new EveUpdateContext();
  context.SetTime(10 * 10_000_000);
  stretch.UpdateSynchronous(context);
  stretch.UpdateAsynchronous(context);
  stretch.UpdateVisibility(context);
}

test("a firing stretch spans the muzzle's +Z toward the target and faces its destination child back at the source", () =>
{
  const stretchObject = recorder(), destObject = recorder(), sourceObject = recorder();
  const stretch = stretchWith({ stretchObject, destObject, sourceObject });
  // Muzzle at the origin facing -Z toward a target 100 m away; SetFiringTransform also sets isNegZForward.
  const muzzle = mat4.fromYRotation(mat4.create(), Math.PI);
  stretch.SetFiringTransform(muzzle, [ 0, 0, -100 ]);
  place(stretch);

  // Carbon ScalingMatrix(1, 1, length) * m_sourceTransform: the muzzle's Z axis stretched by +100.
  near(stretchObject.placed.slice(8, 11), [ 0, 0, -100 ], "stretch Z spans the muzzle's +Z, which points at the target");
  near(stretchObject.placed.slice(12, 15), [ 0, 0, 0 ], "stretch starts at the muzzle");
  near(destObject.placed.slice(12, 15), [ 0, 0, -100 ], "destination child sits at the destination");
  near(destObject.placed.slice(4, 7), [ 0, 0, 1 ], "destination child's Y points back at the source");
  // Carbon RotationXMatrix(-pi/2) * m_sourceTransform.
  near(sourceObject.placed, Array.from(mat4.multiply(mat4.create(), muzzle, mat4.fromXRotation(mat4.create(), -Math.PI / 2))), "source child takes the corrected muzzle");
});

test("a positional stretch faces its children by Carbon's arc-from-forward, double flip included", () =>
{
  const stretchObject = recorder(), moveObject = recorder();
  const stretch = stretchWith({ stretchObject, moveObject });
  const progress = new Tr2CurveScalar();
  progress.currentValue = 0.5;
  stretch.progressCurve = progress;
  stretch.SetSourcePosition([ 0, 0, 0 ]);
  stretch.SetDestinationPosition([ 0, 0, -100 ]);
  stretch.SetIsNegZForward(false);
  place(stretch);

  // direction = normalize(source - destination) = +Z. Not -Z-forward, so it is flipped to -Z for the stretch child
  // (EveStretch.cpp:233-236), and TriQuaternionArcFromForward, which turns -Z onto its argument, gives identity: the
  // child's forward (-Z) points at the destination and its +Z column is +length.
  near(stretchObject.placed.slice(8, 11), [ 0, 0, 100 ], "stretch forward (-Z) spans source to destination");
  near(moveObject.placed.slice(12, 15), [ 0, 0, -50 ], "move child halfway along at progress 0.5");
  // Flipped again for the move child (cpp:259-263), back to +Z: a half turn about X, so its forward (-Z) faces the source.
  near(moveObject.placed.slice(8, 11), [ 0, 0, -1 ], "move child forward faces the source, as Carbon's double flip leaves it");
});
