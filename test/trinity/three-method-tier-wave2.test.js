import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveChildExplosion,
  EveTacticalTrails,
  Tr2ManipulationTool,
  Tr2RenderContext,
  Tr2RotationTool
} from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/stub/Tr2RenderContextALStub/Tr2RenderContextALStub.js";
import { Tr2SphereShapeAttributeGenerator } from "../../npm/dist/trinity/particle/index.js";
import { Tr2TexturePipelineStepPack, Tr2TexturePackChannel } from "../../npm/dist/resource/texture/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";

/**
 * The three-method-tier wave-2 ports
 * (docs/research/ratchet-three-method-tier-2026-09-06.md), each pinned to the
 * donor body re-read before porting.
 */

function assertVecNear(actual, expected, message, epsilon = 1e-5)
{
  for (let i = 0; i < expected.length; i++)
  {
    assert.ok(Math.abs(actual[i] - expected[i]) < epsilon, `${message}[${i}]: ${actual[i]} vs ${expected[i]}`);
  }
}

test("Tr2ManipulationTool.GetBaseVectors normalises the local rows (Tr2ManipulationTool.cpp)", () =>
{
  const tool = new Tr2ManipulationTool();
  mat4.fromScaling(tool.localTransform, [ 2, 3, 4 ]);
  const [ x, y, z ] = tool.GetBaseVectors();
  assertVecNear(x, [ 1, 0, 0 ], "x");
  assertVecNear(y, [ 0, 1, 0 ], "y");
  assertVecNear(z, [ 0, 0, 1 ], "z");
});

test("Tr2RotationTool.GetDesiredPlaneNormal picks the drag plane per axis (cpp:131-165)", () =>
{
  const tool = new Tr2RotationTool();
  const view = mat4.create();

  tool.selectedAxis = "w";
  assertVecNear(tool.GetDesiredPlaneNormal(null, view), [ 0, 0, 1 ], "screen handle uses the view vector");

  tool.selectedAxis = "x";
  assertVecNear(tool.GetDesiredPlaneNormal(null, view), [ 1, 0, 0 ], "x axis, camera perpendicular");

  // The identity view's third column IS z, so dot > 0 flips the z plane
  // toward the camera.
  tool.selectedAxis = "z";
  assertVecNear(tool.GetDesiredPlaneNormal(null, view), [ 0, 0, -1 ], "axis flipped toward the camera");
});

test("Tr2RotationTool.GetUnTransformedBaseVectors is the identity basis (cpp:211-216)", () =>
{
  const [ x, y, z ] = new Tr2RotationTool().GetUnTransformedBaseVectors();
  assertVecNear(x, [ 1, 0, 0 ], "x");
  assertVecNear(y, [ 0, 1, 0 ], "y");
  assertVecNear(z, [ 0, 0, 1 ], "z");
});

test("Tr2RotationTool.Hemisphere maps mouse offsets onto Carbon's cone (cpp:396-439)", () =>
{
  const tool = new Tr2RotationTool();
  tool.wwLine = { scale: 1 };
  const viewport = { x: 0, y: 0, width: 100, height: 100 };
  const view = mat4.create();
  const projection = mat4.create();

  // Identity viewProj: centre projects to (50,50); the ring's screen radius
  // is 50 * scale, plus Carbon's 16px cursor pad -> 66.
  assertVecNear(tool.Hemisphere(50, 50, viewport, view, projection), [ 0, 0, 1 ], "centre lifts straight up");
  assertVecNear(tool.Hemisphere(116, 50, viewport, view, projection), [ 1, 0, 0 ], "the rim has no lift");

  // Halfway out: z = 1 - d, a CONE despite the name - (0, .5, .5) normalised.
  const half = Math.SQRT1_2;
  assertVecNear(tool.Hemisphere(50, 17, viewport, view, projection), [ 0, half, half ], "half radius, screen-inverted y");
});

function stubContext()
{
  const al = new Tr2RenderContextALStub();
  al.CreateDevice({ mode: { width: 64, height: 64 } });
  const context = new Tr2RenderContext();
  context.SetRenderContextAL(al);
  return context;
}

test("EveTacticalTrails.UpdateGraphicsState packs Carbon's twelve LineVertex records per segment (cpp:174-258)", () =>
{
  const trails = new EveTacticalTrails();
  trails.fadeOutTime = 5;
  trails.trackedObjects.push({
    ball: null,
    positions: [
      { position: [ 0, 0, 0 ], time: 0 },
      { position: [ 1, 0, 0 ], time: 1 },
      { position: [ 1, 2, 0 ], time: 2 }
    ]
  });

  const context = stubContext();
  trails.UpdateGraphicsState(10, context);

  assert.equal(trails.segments, 2);
  const buffer = trails.GetVertexBuffer();
  assert.equal(buffer.GetDesc().stride, 36, "the built declaration's ledger is the stride");
  assert.equal(buffer.GetDesc().count, 1024, "capacity floors at 1024 vertices");

  const mapping = buffer.MapForWriting(context);
  const floats = new Float32Array(mapping.data.buffer, mapping.data.byteOffset, 2 * 12 * 9);

  // Vertex 0: pos1, lineDir = pos2 - pos1, fade (10-0)/5, quad (-1,-1).
  assert.deepEqual([ ...floats.slice(0, 9) ], [ 0, 0, 0, 1, 0, 0, 2, -1, -1 ]);
  // The last segment's connector fans toward the EXTRAPOLATED third point:
  // pos3 = pos2 + (pos2 - pos1) has no sample - vertex 8 of segment 2 carries
  // lineDir = pos3 - pos2 = (0, 2, 0).
  const segment2 = 12 * 9;
  assert.deepEqual([ ...floats.slice(segment2 + 8 * 9 + 3, segment2 + 8 * 9 + 6) ], [ 0, 2, 0 ]);

  // A context that is not valid zeroes the count, as the donor does.
  trails.UpdateGraphicsState(10, new Tr2RenderContext());
  assert.equal(trails.segments, 0);

  // ReleaseResources drops only the declaration handle; the next update
  // re-interns and repacks.
  trails.ReleaseResources(0);
  trails.UpdateGraphicsState(10, context);
  assert.equal(trails.segments, 2);
});

test("Tr2TexturePipelineStepPack carries its own step virtuals (cpp:39-57, 60-179)", () =>
{
  const step = new Tr2TexturePipelineStepPack();
  step.r = new Tr2TexturePackChannel();
  step.r.path = "res:/red.png";
  step.r.channel = 2; // Carbon's BGRA chooser: 2 selects the red byte.
  step.a = new Tr2TexturePackChannel();
  step.a.path = "res:/alpha.png";
  step.a.channel = 2;

  const resources = step.GetResourceDependencies();
  assert.deepEqual([ ...resources ].sort(), [ "res:/alpha.png", "res:/red.png" ]);

  const red = { width: 1, height: 1, data: Uint8Array.from([ 200, 0, 0, 255 ]) };
  const alpha = { width: 1, height: 1, data: Uint8Array.from([ 40, 0, 0, 255 ]) };
  const inputs = new Map([ [ "res:/red.png", red ], [ "res:/alpha.png", alpha ] ]);

  const packed = step.Execute(inputs);
  assert.equal(packed.width, 1);
  // Unfilled g/b channels take their fill byte (0); r and a read channel 2
  // (red) of their sources.
  assert.deepEqual([ ...packed.data ], [ 200, 0, 0, 40 ]);
});

test("EveChildExplosion shares, aliases and rebases as Carbon's copier flow does (cpp:319-448)", () =>
{
  const explosion = new EveChildExplosion();

  // A shared subgraph: the shared container persists a child list holding
  // the node every spawned copy must ALIAS.
  const sharedThing = new EveChildExplosion();
  const sharedRoot = new EveChildExplosion();
  sharedRoot.objects.push(sharedThing);
  explosion.localExplosionShared = sharedRoot;

  explosion.FindSharedObjects();
  assert.equal(explosion.CopyElement(sharedRoot), sharedRoot, "the root is shared");
  assert.equal(explosion.CopyElement(sharedThing), sharedThing, "reached through the persisted list");
  assert.equal(explosion.CopyElement(new EveChildExplosion()), undefined, "anything else falls back to the copier");

  // UpdateEmitter: the donor's conj(rot)*p*rot sandwich - the INVERSE of
  // TriVectorRotateQuaternion - carried exactly. A -90-degree-about-Y
  // rotation of (1,0,0) lands on (0,0,1), plus the explosion position.
  const generator = new Tr2SphereShapeAttributeGenerator();
  generator.SetTransform([ 1, 0, 0 ], quat.create());
  const rotation = quat.setAxisAngle(quat.create(), [ 0, 1, 0 ], Math.PI / 2);
  EveChildExplosion.updateEmitter(generator, { position: [ 10, 0, 0 ], rotation });

  const position = vec3.create();
  const outRotation = quat.create();
  generator.GetTransform(position, outRotation);
  assertVecNear(position, [ 10, 0, 1 ], "position rebased through the donor's sandwich");
  assertVecNear(outRotation, rotation, "identity generator rotation composes to the explosion rotation");

  // A non-generator copy passes through untouched.
  EveChildExplosion.updateEmitter(new EveChildExplosion(), { position: [ 1, 1, 1 ], rotation });
});
