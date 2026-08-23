import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import * as eve from "../../npm/dist/trinity/eve/index.js";
import * as generatedEve from "../../npm/dist/trinity/generated/eve/index.js";
import * as trinity from "../../npm/dist/trinity/index.js";


test("EveLineContainer is maintained with Carbon graph defaults", () =>
{
  const container = new eve.EveLineContainer();
  assert.equal(trinity.EveLineContainer, eve.EveLineContainer);
  assert.equal("EveLineContainer" in generatedEve, false);
  assert.equal(
    existsSync(new URL("../../src/trinity/generated/eve/ui/EveLineContainer.js", import.meta.url)),
    false
  );
  assert.deepEqual(container.connectors, []);
  assert.equal(container.name, "");
  assert.equal(container.lineSet, null);
  assert.equal(container.display, true);
});


test("EveLineContainer rebuilds one real line set in exact connector order", () =>
{
  const container = new eve.EveLineContainer();
  const lineSet = new eve.EveCurveLineSet();
  lineSet.AddStraightLine([ 90, 0, 0 ], vec4.create(), [ 91, 0, 0 ], vec4.create(), 1);
  const calls = [];

  const point = new eve.EveConnector();
  point.sourceObject = {
    GetValueAt(time, out)
    {
      calls.push([ "point-source", time ]);
      vec3.set(out, 0, 0, 0);
    }
  };
  point.destObject = {
    GetValueAt(time, out)
    {
      calls.push([ "point-destination", time ]);
      vec3.set(out, 2, 0, 0);
    }
  };

  const circle = new eve.EveConnector();
  circle.type = eve.ConnectorType.Circle;
  circle.length = 3;
  vec3.set(circle.sourcePosition, 10, 1, -4);
  vec3.set(circle.planeNormal, 0, 0, 1);

  container.lineSet = lineSet;
  container.connectors.push(point, circle);
  const context = { GetTime: () => 12.5 };
  container.UpdateSyncronous(context);

  assert.deepEqual(calls, [ [ "point-source", 12.5 ], [ "point-destination", 12.5 ] ]);
  assert.equal(lineSet.lines.length, 5, "the stale line is cleared before both connectors append");
  assert.deepEqual(Array.from(lineSet.lines[0].position1), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(lineSet.lines[0].position2), [ 2, 0, 0 ]);
  assert.equal(lineSet.currentSubmittedLineCount, 81,
    "one straight segment plus four twenty-segment spherical arcs are submitted");
  assert.ok(lineSet.boundingSphere[3] > 3);
  assert.equal(container.UpdateAsyncronous(context), undefined);

  const detached = new eve.EveLineContainer();
  detached.connectors.push({ Update() { throw new Error("must not run"); } });
  assert.equal(detached.Update(context), undefined, "a nullable line set is the only early exit");

  container.connectors = [ {} ];
  assert.throws(() => container.Update(context), /Update/u,
    "malformed owned connectors fail at their direct method call");
});


test("EveLineContainer display and query gates delegate without duck probes", () =>
{
  class RecordingLineSet extends eve.EveCurveLineSet
  {
    calls = [];

    UpdateVisibility(context, parent)
    {
      this.calls.push([ "visibility", context, parent ]);
    }

    GetRenderables(renderables, impostors)
    {
      this.calls.push([ "renderables", renderables, impostors ]);
    }

    GetBoundingSphere(out, query)
    {
      this.calls.push([ "sphere", out, query ]);
      vec4.set(out, 1, 2, 3, 4);
      return true;
    }

    UpdateModelCenterWorldPosition(position, time)
    {
      this.calls.push([ "update-center", position, time ]);
    }

    GetModelCenterWorldPosition(position)
    {
      this.calls.push([ "get-center", position ]);
    }

    GetLocalBoundingBox(minBounds, maxBounds)
    {
      this.calls.push([ "box", minBounds, maxBounds ]);
      return true;
    }

    GetLocalToWorldTransform(transform)
    {
      this.calls.push([ "transform", transform ]);
      mat4.identity(transform);
    }
  }

  const container = new eve.EveLineContainer();
  const lineSet = new RecordingLineSet();
  container.lineSet = lineSet;
  const context = {};
  const parent = mat4.fromTranslation(mat4.create(), [ 5, 6, 7 ]);
  const renderables = [];
  const impostors = {};

  container.display = false;
  container.UpdateVisibility(context, parent);
  container.GetRenderables(renderables, impostors);
  assert.deepEqual(lineSet.calls, []);

  container.display = true;
  container.UpdateVisibility(context, parent);
  container.GetRenderables(renderables, impostors);
  const sphere = vec4.create();
  const position = vec3.create();
  const minBounds = vec3.create();
  const maxBounds = vec3.create();
  const transform = mat4.fromTranslation(mat4.create(), [ 8, 9, 10 ]);
  assert.equal(container.GetBoundingSphere(sphere, 7), true);
  container.UpdateModelCenterWorldPosition(position, 3.5);
  container.GetModelCenterWorldPosition(position);
  assert.equal(container.GetLocalBoundingBox(minBounds, maxBounds), true);
  container.GetLocalToWorldTransform(transform);
  assert.deepEqual(lineSet.calls.map(call => call[0]), [
    "visibility",
    "renderables",
    "sphere",
    "update-center",
    "get-center",
    "box",
    "transform",
  ]);
  assert.equal(lineSet.calls[0][1], context);
  assert.equal(lineSet.calls[0][2], parent);
  assert.equal(lineSet.calls[1][1], renderables);
  assert.equal(lineSet.calls[1][2], impostors);
  assert.deepEqual(Array.from(sphere), [ 1, 2, 3, 4 ]);
  assert.deepEqual(Array.from(transform), Array.from(mat4.create()));

  container.lineSet = null;
  vec4.set(sphere, 9, 8, 7, 6);
  mat4.fromTranslation(transform, [ 1, 2, 3 ]);
  assert.equal(container.GetBoundingSphere(sphere), false);
  assert.equal(container.GetLocalBoundingBox(minBounds, maxBounds), false);
  container.GetLocalToWorldTransform(transform);
  assert.deepEqual(Array.from(sphere), [ 9, 8, 7, 6 ], "missing line set leaves output untouched");
  assert.deepEqual(Array.from(transform), Array.from(mat4.fromTranslation(mat4.create(), [ 1, 2, 3 ])),
    "missing line set does not invent a transform fallback");
});
