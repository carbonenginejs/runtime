import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import * as eve from "../npm/dist/eve/index.js";
import * as generatedEve from "../npm/dist/generated/eve/index.js";
import * as trinity from "../npm/dist/index.js";


function assertArrayNear(actual, expected, message, epsilon = 1e-5)
{
  assert.equal(actual.length, expected.length, `${message} length`);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `${message}[${index}]: expected ${expected[index]}, received ${actual[index]}`);
  }
}


function makeConnector(type)
{
  const connector = new eve.EveConnector();
  connector.type = type;
  vec3.set(connector.sourcePosition, 1, 2, 3);
  vec3.set(connector.destPosition, 4, 6, 8);
  return connector;
}


test("EveConnector is maintained with one canonical ConnectorType enum", () =>
{
  const connector = new eve.EveConnector();
  assert.equal(trinity.EveConnector, eve.EveConnector);
  assert.equal(trinity.ConnectorType, eve.ConnectorType);
  assert.equal(eve.EveConnector.ConnectorType, eve.ConnectorType);
  assert.equal("EveConnector" in generatedEve, false);
  assert.equal(
    existsSync(new URL("../src/generated/eve/ui/EveConnector.js", import.meta.url)),
    false
  );
  assert.equal(
    existsSync(new URL("../src/generated/eve/ui/enums.js", import.meta.url)),
    false
  );
  assert.equal(connector.type, eve.ConnectorType.PointToPoint);
  assert.deepEqual(Array.from(connector.color), [ 0.5, 0.5, 0.5, 1 ]);
  assert.deepEqual(Array.from(connector.animationColor), [ 1, 0, 0, 1 ]);
  assert.deepEqual(Array.from(connector.planeNormal), [ 0, 1, 0 ]);
  assert.equal(connector.lineWidth, 1);
  assert.equal(connector.animationScale, 1);
  assert.equal(connector.animationSpeed, 0);
  assert.equal(connector.isAnimated, false);
  assert.equal(connector.autoScaleAnimation, false);
  assert.equal(CjsSchema.getField(eve.EveConnector, "type")?.enum?.enumType, "ConnectorType");
  assert.equal(Object.isFrozen(eve.ConnectorType), true);
  assert.deepEqual(eve.ConnectorType, {
    PointToPoint: 0,
    XZ_CircleStraight: 1,
    XZ_Circle: 2,
    StraightAnchor: 3,
    CurvedAnchor: 4,
    Orbit: 5,
    Circle: 6,
    Ellipse: 7,
  });
});


test("EveConnector samples nullable vector functions with the JavaScript time-first contract", () =>
{
  const connector = new eve.EveConnector();
  const calls = [];
  connector.sourceObject = {
    GetValueAt(time, out)
    {
      calls.push([ "source", time, out ]);
      vec3.set(out, 1, 2, 3);
    }
  };
  connector.destObject = {
    GetValueAt(time, out)
    {
      calls.push([ "destination", time, out ]);
      vec3.set(out, 4, 5, 6);
    }
  };

  connector.Update({ GetTime: () => 17.25 });
  assert.deepEqual(calls.map(([ name, time ]) => [ name, time ]), [
    [ "source", 17.25 ],
    [ "destination", 17.25 ],
  ]);
  assert.equal(calls[0][2], connector.sourcePosition);
  assert.equal(calls[1][2], connector.destPosition);
  assert.deepEqual(Array.from(connector.sourcePosition), [ 1, 2, 3 ]);
  assert.deepEqual(Array.from(connector.destPosition), [ 4, 5, 6 ]);
  assert.throws(() => connector.Update({}), /GetTime/u);
  connector.sourceObject = {};
  connector.destObject = null;
  assert.throws(() => connector.Update({ GetTime: () => 0 }), /GetValueAt/u);
});


test("point connectors preserve truncation, fade, and auto-scaled animation", () =>
{
  const connector = new eve.EveConnector();
  vec3.set(connector.sourcePosition, 0, 0, 0);
  vec3.set(connector.destPosition, 4, 0, 0);
  connector.length = 2;
  connector.isAnimated = true;
  connector.autoScaleAnimation = true;
  connector.animationSpeed = 8;
  connector.animationScale = 3;
  const lineSet = new eve.EveCurveLineSet();

  connector.AddLine(lineSet);
  assert.equal(lineSet.lines.length, 1);
  assert.equal(lineSet.lines[0].type, lineSet.constructor.LineType.LINETYPE_STRAIGHT);
  assertArrayNear(lineSet.lines[0].position1, [ 0, 0, 0 ], "point source");
  assertArrayNear(lineSet.lines[0].position2, [ 2, 0, 0 ], "truncated destination");
  assert.deepEqual(Array.from(lineSet.lines[0].color2), [ 0, 0, 0, 0 ]);
  assert.equal(lineSet.lines[0].animationSpeed, 2, "speed divides by the original line length");
  assert.equal(lineSet.lines[0].animationScale, 12, "scale multiplies the original line length");

  const later = new eve.EveConnector();
  later.isAnimated = true;
  later.animationSpeed = 5;
  later.animationScale = 2;
  vec3.set(later.sourcePosition, 10, 0, 0);
  vec3.set(later.destPosition, 12, 0, 0);
  later.AddLine(lineSet);
  assert.notEqual(lineSet.lines[0].position1, lineSet.lines[1].position1);
  assert.notEqual(lineSet.lines[0].color2, lineSet.lines[1].color2);
  assert.deepEqual(Array.from(lineSet.lines[0].color2), [ 0, 0, 0, 0 ],
    "later END_COLOR scratch use does not mutate the faded record");
  assert.deepEqual(Array.from(lineSet.lines[1].color2), [ 0.5, 0.5, 0.5, 1 ]);
  assert.equal(lineSet.lines[1].animationSpeed, 5, "fixed-scale animation keeps authored speed");
  assert.equal(lineSet.lines[1].animationScale, 2, "fixed-scale animation keeps authored scale");

  const zeroLength = new eve.EveConnector();
  zeroLength.type = eve.ConnectorType.StraightAnchor;
  zeroLength.isAnimated = true;
  zeroLength.autoScaleAnimation = true;
  zeroLength.animationSpeed = 7;
  zeroLength.animationScale = 4;
  vec3.set(zeroLength.sourcePosition, 1, 2, 3);
  vec3.set(zeroLength.destPosition, 5, 2, 9);
  const zeroLines = new eve.EveCurveLineSet();
  zeroLength.AddLine(zeroLines);
  assert.equal(zeroLines.lines[0].animationSpeed, 7,
    "zero normalization length preserves authored animation speed");
  assert.equal(zeroLines.lines[0].animationScale, 0);
  assert.throws(() => later.AddLine({}), /AddStraightLine/u);
});


test("anchor and circle connector types emit Carbon's exact line families", () =>
{
  const types = eve.ConnectorType;

  const straight = makeConnector(types.StraightAnchor);
  const straightLines = new eve.EveCurveLineSet();
  straight.AddLine(straightLines);
  assert.equal(straightLines.lines.length, 1);
  assertArrayNear(straightLines.lines[0].position2, [ 4, 2, 8 ], "destination projected to source XZ plane");

  const curved = makeConnector(types.CurvedAnchor);
  const curvedLines = new eve.EveCurveLineSet();
  curved.AddLine(curvedLines);
  assert.equal(curvedLines.lines.length, 1);
  assert.equal(curvedLines.lines[0].type, curvedLines.constructor.LineType.LINETYPE_SPHERED);
  assertArrayNear(curvedLines.lines[0].intermediatePosition, curved.sourcePosition, "curved anchor center");
  const curvedScale = Math.sqrt(50 / 34);
  assertArrayNear(curvedLines.lines[0].position2,
    [ 1 + 3 * curvedScale, 2, 3 + 5 * curvedScale ], "curved anchor rotated endpoint");

  const fullCircle = makeConnector(types.XZ_Circle);
  const fullCircleLines = new eve.EveCurveLineSet();
  fullCircle.AddLine(fullCircleLines);
  const fullRadius = Math.sqrt(50);
  const expectedFull = [
    [ [ 1, 2, 3 + fullRadius ], [ 1 + fullRadius, 2, 3 ] ],
    [ [ 1 + fullRadius, 2, 3 ], [ 1, 2, 3 - fullRadius ] ],
    [ [ 1, 2, 3 - fullRadius ], [ 1 - fullRadius, 2, 3 ] ],
    [ [ 1 - fullRadius, 2, 3 ], [ 1, 2, 3 + fullRadius ] ],
  ];
  expectedFull.forEach(([ start, end ], index) =>
  {
    assertArrayNear(fullCircleLines.lines[index].position1, start, `full circle start ${index}`);
    assertArrayNear(fullCircleLines.lines[index].position2, end, `full circle end ${index}`);
  });

  const projectedCircle = makeConnector(types.XZ_CircleStraight);
  const projectedCircleLines = new eve.EveCurveLineSet();
  projectedCircle.AddLine(projectedCircleLines);
  assertArrayNear(projectedCircleLines.lines[0].position1,
    [ 1, 2, 3 + Math.sqrt(34) ], "projected XZ radius excludes vertical distance");
  assert.notEqual(projectedCircleLines.lines[0].position1[2], fullCircleLines.lines[0].position1[2]);

  const planeCircle = makeConnector(types.Circle);
  planeCircle.length = 6;
  vec3.set(planeCircle.planeNormal, 0, 0, 1);
  const planeCircleLines = new eve.EveCurveLineSet();
  planeCircle.AddLine(planeCircleLines);
  const expectedPlane = [
    [ [ 1, -4, 3 ], [ 7, 2, 3 ] ],
    [ [ 7, 2, 3 ], [ 1, 8, 3 ] ],
    [ [ 1, 8, 3 ], [ -5, 2, 3 ] ],
    [ [ -5, 2, 3 ], [ 1, -4, 3 ] ],
  ];
  expectedPlane.forEach(([ start, end ], index) =>
  {
    assertArrayNear(planeCircleLines.lines[index].position1, start, `plane circle start ${index}`);
    assertArrayNear(planeCircleLines.lines[index].position2, end, `plane circle end ${index}`);
  });
});


test("orbit and ellipse connectors retain Carbon's helper geometry", () =>
{
  const orbit = makeConnector(eve.ConnectorType.Orbit);
  orbit.length = 5;
  vec3.set(orbit.planeNormal, 0.25, 1, -0.5);
  const orbitLines = new eve.EveCurveLineSet();
  orbit.AddLine(orbitLines);
  assert.equal(orbitLines.lines.length, 5);
  assert.ok(orbitLines.lines.slice(0, 4)
    .every(line => line.type === orbitLines.constructor.LineType.LINETYPE_SPHERED));
  assert.equal(orbitLines.lines[4].type, orbitLines.constructor.LineType.LINETYPE_STRAIGHT);
  const orbitNormal = vec3.normalize(vec3.create(), orbit.planeNormal);
  const projected = vec3.subtract(vec3.create(), orbit.destPosition, orbit.sourcePosition);
  const planeDistance = vec3.dot(orbitNormal, projected);
  vec3.scaleAndAdd(projected, orbit.sourcePosition, orbitNormal, planeDistance);
  vec3.subtract(projected, projected, orbit.destPosition);
  vec3.normalize(projected, projected);
  vec3.scaleAndAdd(projected, orbit.destPosition, projected, orbit.length);
  assertArrayNear(orbitLines.lines[4].position2, projected, "orbit projected endpoint");

  const ellipse = makeConnector(eve.ConnectorType.Ellipse);
  vec3.set(ellipse.destPosition, 7, 3, 28);
  vec3.set(ellipse.planeNormal, 1, 2, 3);
  const ellipseLines = new eve.EveCurveLineSet();
  ellipse.AddLine(ellipseLines);
  assert.equal(ellipseLines.lines.length, 32);
  assert.ok(ellipseLines.lines.every(line =>
    line.type === ellipseLines.constructor.LineType.LINETYPE_CURVED && line.numOfSegments === 5));
  const normal = vec3.normalize(vec3.create(), ellipse.planeNormal);
  const side = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), [ 0, 1, 0 ], normal));
  const front = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), side, normal));
  const rotation = 28 * Math.PI / 180;
  const rotatedSide = vec3.fromValues(
    side[0] * Math.cos(rotation) + front[0] * Math.sin(rotation),
    side[1] * Math.cos(rotation) + front[1] * Math.sin(rotation),
    side[2] * Math.cos(rotation) + front[2] * Math.sin(rotation)
  );
  const rotatedFront = vec3.fromValues(
    -side[0] * Math.sin(rotation) + front[0] * Math.cos(rotation),
    -side[1] * Math.sin(rotation) + front[1] * Math.cos(rotation),
    -side[2] * Math.sin(rotation) + front[2] * Math.cos(rotation)
  );
  const step = 2 * Math.PI / 32;
  const expectedPoint = (angle, scale = 1) => [
    ellipse.sourcePosition[0] +
      (rotatedSide[0] * Math.cos(angle) * 7 + rotatedFront[0] * Math.sin(angle) * 3) * scale,
    ellipse.sourcePosition[1] +
      (rotatedSide[1] * Math.cos(angle) * 7 + rotatedFront[1] * Math.sin(angle) * 3) * scale,
    ellipse.sourcePosition[2] +
      (rotatedSide[2] * Math.cos(angle) * 7 + rotatedFront[2] * Math.sin(angle) * 3) * scale,
  ];
  assertArrayNear(ellipseLines.lines[0].position1, expectedPoint(0), "ellipse first endpoint");
  assertArrayNear(ellipseLines.lines[0].position2, expectedPoint(step), "ellipse second endpoint");
  assertArrayNear(ellipseLines.lines[0].intermediatePosition,
    expectedPoint(step * 0.5, 1.01), "ellipse expanded midpoint");
  assert.notEqual(ellipseLines.lines[0].position1, ellipseLines.lines[1].position1);
  assert.notEqual(ellipseLines.lines[0].position2, ellipseLines.lines[1].position2);
  assert.notEqual(ellipseLines.lines[0].intermediatePosition, ellipseLines.lines[1].intermediatePosition);

  const firstBefore = [
    Array.from(ellipseLines.lines[0].position1),
    Array.from(ellipseLines.lines[0].position2),
    Array.from(ellipseLines.lines[0].intermediatePosition),
  ];
  makeConnector(eve.ConnectorType.Ellipse).AddLine(new eve.EveCurveLineSet());
  assert.deepEqual(Array.from(ellipseLines.lines[0].position1), firstBefore[0]);
  assert.deepEqual(Array.from(ellipseLines.lines[0].position2), firstBefore[1]);
  assert.deepEqual(Array.from(ellipseLines.lines[0].intermediatePosition), firstBefore[2]);
});
