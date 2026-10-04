// Tr2ReflectionProbe's render pass (Tr2ReflectionProbe.cpp:73-204) on Carbon's
// stub backend, with the matrices checked against Carbon's own row-vector
// formulas written out independently here.
import assert from "node:assert/strict";
import test from "node:test";

import { Tr2ReflectionProbe } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { StubContext } from "../support/stubContext.js";

/** Carbon LookAtMatrix (math/include/Matrix_inline.h:671-702), as m[row][col] = out[row * 4 + col]. */
function carbonLookAtMatrix(eye, at, up)
{
  const sub = (a, b) => [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];
  const cross = (a, b) => [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = v => { const l = Math.hypot(...v); return l ? v.map(x => x / l) : [ 0, 0, 0 ]; };
  const vec = norm(sub(at, eye));
  const right = cross(up, vec);
  const upv = cross(vec, right);
  const rn = norm(right), un = norm(upv);
  const m = new Array(16).fill(0);
  m[0] = -rn[0]; m[4] = -rn[1]; m[8] = -rn[2]; m[12] = dot(rn, eye);
  m[1] = un[0]; m[5] = un[1]; m[9] = un[2]; m[13] = -dot(un, eye);
  m[2] = -vec[0]; m[6] = -vec[1]; m[10] = -vec[2]; m[14] = dot(vec, eye);
  m[15] = 1;
  return m;
}

/** Carbon's A * B for row-major matrices: (A*B)[r][c] = sum_k A[r][k] * B[k][c]. */
function carbonMultiply(a, b)
{
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) out[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c];
  return out;
}

const X_INVERTER = [ -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
const FACES = [ [ [ 0, 1, 0 ], [ 1, 0, 0 ] ], [ [ 0, 1, 0 ], [ -1, 0, 0 ] ], [ [ 0, 0, -1 ], [ 0, 1, 0 ] ],
  [ [ 0, 0, 1 ], [ 0, -1, 0 ] ], [ [ 0, 1, 0 ], [ 0, 0, 1 ] ], [ [ 0, 1, 0 ], [ 0, 0, -1 ] ] ];

function close(actual, expected, message)
{
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-5, `${message}: [${i}] ${actual[i]} vs ${expected[i]}`);
}

test("mat4.lookAtCarbon is Carbon's LookAtMatrix, including a degenerate up", () =>
{
  const cases = [ [ [ 1, 2, 3 ], [ 4, -1, 7 ], [ 0, 1, 0 ] ], [ [ 0, 0, 0 ], [ 0, 5, 0 ], [ 0, 1, 0 ] ] ];
  for (const [ eye, at, up ] of cases) close(mat4.lookAtCarbon(mat4.create(), eye, at, up), carbonLookAtMatrix(eye, at, up), `eye ${eye}`);
});

test("StartRenderFace looks along each face as Carbon's LookAtMatrix(...) * xInverter (cpp:147-175)", () =>
{
  const context = StubContext();
  const probe = new Tr2ReflectionProbe();
  probe.lockPosition = true;
  probe.position.set([ 10, -20, 30 ]);
  for (let face = 0; face < 6; face++)
  {
    probe.StartRenderFace(face, context);
    const [ up, direction ] = FACES[face];
    const at = [ 10 + direction[0], -20 + direction[1], 30 + direction[2] ];
    const look = carbonLookAtMatrix([ 10, -20, 30 ], at, up);
    const expected = carbonMultiply(look, X_INVERTER);
    close(context.GetViewTransform(), expected, `face ${face}`);
    if (face === 0)
    {
      // Negative control: the reversed product is a different matrix.
      const reversed = carbonMultiply(X_INVERTER, look);
      assert.ok(reversed.some((v, i) => Math.abs(v - expected[i]) > 1e-3), "operand order matters for this face");
    }
  }
});

test("InitRenderPass takes the camera position unless locked, squares the projection and inverts culling", () =>
{
  const context = StubContext();
  const esm = context.GetEffectStateManager();
  const probe = new Tr2ReflectionProbe();
  const projection = mat4.perspective(mat4.create(), 1, 1.6, 2, 5000);
  context.SetProjection(projection);
  const before = esm.IsCullModeInverted();

  probe.InitRenderPass(context);
  assert.deepEqual(Array.from(probe.position), Array.from(context.GetViewPosition()), "unlocked: takes the view position");
  const square = context.GetProjection();
  assert.equal(square[0], 1);
  assert.equal(square[5], 1);
  assert.equal(square[10], projection[10], "near/far term kept (m[2][2])");
  assert.equal(square[14], projection[14], "near/far term kept (m[3][2])");
  assert.equal(square[11], -1);
  assert.equal(square[15], 0);
  assert.equal(esm.IsCullModeInverted(), true);
  assert.equal(esm.GetViewport().width, probe.reflectionSize);
  esm.SetInvertedCullMode(before);
});

test("EveSpaceScene: shadows in reflections toggle Carbon's 512 map; no valid probe means no reflection pass", async () =>
{
  const { EveSpaceScene } = await import("../../npm/dist/trinity/index.js");
  const scene = new EveSpaceScene();
  assert.equal(scene.IsShadowsInReflectionsEnabled(), false, "off by default (cpp:4154-4168)");
  scene.EnableShadowsInReflections(true);
  assert.equal(scene.IsShadowsInReflectionsEnabled(), true);
  scene.EnableShadowsInReflections(false);
  assert.equal(scene.IsShadowsInReflectionsEnabled(), false);

  assert.equal(scene.HasReflectionProbe(), false);
  const intensity = scene.currentReflectionIntensity;
  scene.RenderReflectionPass(null, StubContext(), null);
  assert.equal(scene.currentReflectionIntensity, intensity, "an early return touches nothing");
});
