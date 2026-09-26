// Carbon's renderer keeps the global variable store aware of the camera
// (Tr2Renderer::Initialize, cpp:326-345; SetProjectionDerivedValues cpp:195-207;
// SetViewTransform cpp:566-576). Effects bind these by name; unregistered, a
// shader such as the god rays read a zero ProjectionMat.
import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2RenderContext, Tr2VariableStore } from "../../npm/dist/trinity/core/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

const value = name => Array.from(Tr2VariableStore.GlobalStore().FindVariable(name).GetValue());

test("SetProjection and SetViewTransform publish the camera globals", () =>
{
  const context = new Tr2RenderContext();
  const projection = mat4.perspectiveNO(mat4.create(), Math.PI / 3, 1.5, 1, 1000);
  const view = mat4.lookAt(mat4.create(), [ 3, 4, 5 ], [ 0, 0, 0 ], [ 0, 1, 0 ]);

  context.SetProjection(projection);
  context.SetViewTransform(view);

  assert.deepEqual(value("ProjectionMat"), Array.from(projection));
  assert.deepEqual(value("ViewMat"), Array.from(view));
  assert.deepEqual(value("ProjectionInvMat"), Array.from(mat4.invert(mat4.create(), projection)));
  assert.deepEqual(value("ViewInvMat"), Array.from(mat4.invert(mat4.create(), view)));

  // Carbon view * proj (row-vector) is gl-matrix multiply(proj, view).
  const viewProjection = mat4.multiply(mat4.create(), projection, view);
  assert.deepEqual(value("ViewProjectionMat"), Array.from(viewProjection));

  // FrustumPlane0 is Carbon's (_13, _23, _33, _43): indices 2, 6, 10, 14.
  assert.deepEqual(value("FrustumPlane0"), [ viewProjection[2], viewProjection[6], viewProjection[10], viewProjection[14] ]);
  // FrustumPlane1 is column 4 plus column 1.
  assert.deepEqual(value("FrustumPlane1"), [
    viewProjection[3] + viewProjection[0],
    viewProjection[7] + viewProjection[4],
    viewProjection[11] + viewProjection[8],
    viewProjection[15] + viewProjection[12]
  ]);
});

test("a matrix variable is transposed into the effect constants, as Carbon's CopyValueToEffect", () =>
{
  // TriVariable.cpp:127-133: "column_major for shaders". A copied-straight
  // matrix reaches the shader flipped.
  const variable = Tr2VariableStore.GlobalStore().RegisterVariable("TransposeProbe", mat4.fromValues(
    1, 2, 3, 4,
    5, 6, 7, 8,
    9, 10, 11, 12,
    13, 14, 15, 16
  ));
  const out = new Float32Array(16);

  variable.CopyValueToEffect(null, out, 64);
  assert.deepEqual(Array.from(out), [ 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16 ]);

  // A vector is copied as-is.
  const vector = Tr2VariableStore.GlobalStore().RegisterVariable("VectorProbe", [ 1, 2, 3, 4 ]);
  const four = new Float32Array(4);
  vector.CopyValueToEffect(null, four, 16);
  assert.deepEqual(Array.from(four), [ 1, 2, 3, 4 ]);
});
