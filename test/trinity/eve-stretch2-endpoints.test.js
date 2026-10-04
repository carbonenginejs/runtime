// EveStretch2's endpoint bases (EveStretch2.cpp:271-301): the source basis's Z axis points down the beam, the
// destination basis negates X and Z, and up is the world axis least aligned with the beam.
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveStretch2 } from "../../npm/dist/trinity/index.js";

function endpoints(source, destination)
{
  const stretch = new EveStretch2();
  stretch.SetFiringTransform(source, destination);
  const sourceTransform = mat4.create(), destinationTransform = mat4.create();
  stretch.GetEndPointTransforms(sourceTransform, destinationTransform);
  return { sourceTransform, destinationTransform };
}

const axis = (matrix, offset) => Array.from(matrix.subarray(offset, offset + 3));
const close = (actual, expected, message) =>
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6, `${message}: ${actual} against ${expected}`));

test("the source basis points down the beam, and the destination basis faces back with X negated", () =>
{
  const source = [ 10, 20, 30 ], destination = [ 40, 30, -70 ];
  const { sourceTransform, destinationTransform } = endpoints(source, destination);
  const direction = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), destination, source));
  // |y| (10) is the least of 30, 10 and 100, so up is +Y: X = normalize(cross(Y, Z)), Y = cross(X, Z).
  const xAxis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), [ 0, 1, 0 ], direction));
  const yAxis = vec3.cross(vec3.create(), xAxis, direction);
  close(axis(sourceTransform, 8), Array.from(direction), "source Z");
  close(axis(sourceTransform, 0), Array.from(xAxis), "source X");
  close(axis(sourceTransform, 4), Array.from(yAxis), "source Y");
  close(axis(sourceTransform, 12), source, "source translation");
  close(axis(destinationTransform, 8), Array.from(direction, value => -value), "destination Z");
  close(axis(destinationTransform, 0), Array.from(xAxis, value => -value), "destination X");
  close(axis(destinationTransform, 4), Array.from(yAxis), "destination Y is kept");
  close(axis(destinationTransform, 12), destination, "destination translation");
});

test("quirk: a beam exactly along Z ties x and y, so up is +Z and X and Y collapse to zero", () =>
{
  const { sourceTransform, destinationTransform } = endpoints([ 0, 0, 0 ], [ 0, 0, -3000 ]);
  close(axis(sourceTransform, 8), [ 0, 0, -1 ], "source Z");
  close(axis(sourceTransform, 0), [ 0, 0, 0 ], "source X");
  close(axis(sourceTransform, 4), [ 0, 0, 0 ], "source Y");
  close(axis(destinationTransform, 8), [ 0, 0, 1 ], "destination Z");
});

test("a zero-length beam normalizes to a zero Z axis, as XMVector3Normalize does", () =>
{
  const { sourceTransform } = endpoints([ 5, 5, 5 ], [ 5, 5, 5 ]);
  close(axis(sourceTransform, 8), [ 0, 0, 0 ], "source Z");
  close(axis(sourceTransform, 12), [ 5, 5, 5 ], "source translation");
});
