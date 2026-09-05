import test from "node:test";
import assert from "node:assert/strict";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import {
  SCREEN_QUAD_FLOATS,
  SCREEN_VERTEX_FLOATS,
  SetupScreenQuad,
  SetupScreenQuadInCameraSpace
} from "../../npm/dist/trinity/core/Tr2RenderUtils.js";


/**
 * The four vertices as [x, y, z, w, u, v] rows, in emission order.
 *
 * Carbon's `v * 2 - 1` produces a signed zero at the midpoint, and deepEqual
 * distinguishes -0 from 0. The sign is meaningless once the value is in a
 * vertex buffer, so it is normalized here rather than asserted around.
 */
function rows(quad)
{
  const out = [];
  for (let i = 0; i < 4; i++)
  {
    out.push(Array.from(quad.slice(i * SCREEN_VERTEX_FLOATS, (i + 1) * SCREEN_VERTEX_FLOATS), value => value + 0));
  }
  return out;
}

test("SetupScreenQuad maps [0,1] placement into clip space with y flipped", () =>
{
  const context = new Tr2RenderContext();
  const quad = SetupScreenQuad(new Float32Array(SCREEN_QUAD_FLOATS), context, [ 0, 0 ], [ 1, 1 ]);

  // Full-screen placement is the whole clip volume, and y inverts because the
  // vertex coordinates arrive y-down (cpp:19-20).
  assert.deepEqual(rows(quad), [
    [ -1, 1, 1, 1, 0, 0 ],
    // Interior edge swapped: the cull mode is NOT inverted by default, which is
    // exactly when Carbon flips edge1/edge2 (cpp:27-33). Bottom-left is emitted
    // at index 1 and top-right at index 2.
    [ -1, -1, 1, 1, 0, 1 ],
    [ 1, 1, 1, 1, 1, 0 ],
    [ 1, -1, 1, 1, 1, 1 ]
  ]);
});

test("SetupScreenQuad flips the interior edge with the cull mode", () =>
{
  const context = new Tr2RenderContext();
  const esm = context.GetEffectStateManager();

  const normal = rows(SetupScreenQuad(new Float32Array(SCREEN_QUAD_FLOATS), context, [ 0, 0 ], [ 1, 1 ]));

  // Negative control: with the cull mode inverted the two interior vertices
  // must swap, and nothing else may move. A quad that ignored the flag would
  // read identically here and silently wind one of the two triangles backwards.
  esm.SetInvertedCullMode(true);
  assert.equal(esm.IsCullModeInverted(), true);
  const inverted = rows(SetupScreenQuad(new Float32Array(SCREEN_QUAD_FLOATS), context, [ 0, 0 ], [ 1, 1 ]));

  assert.notDeepEqual(normal, inverted);
  assert.deepEqual(inverted[0], normal[0]);
  assert.deepEqual(inverted[3], normal[3]);
  assert.deepEqual(inverted[1], normal[2]);
  assert.deepEqual(inverted[2], normal[1]);
});

test("SetupScreenQuad honours a sub-rectangle placement and its texture window", () =>
{
  const context = new Tr2RenderContext();
  const quad = SetupScreenQuad(new Float32Array(SCREEN_QUAD_FLOATS), context, [ 0.25, 0.25 ], [ 0.75, 0.75 ], [ 0, 0 ], [ 0.5, 0.5 ]);
  const emitted = rows(quad);

  // Top-left stays at the clip-space corner, bottom-right lands at the centre.
  assert.deepEqual(emitted[0], [ -1, 1, 1, 1, 0.25, 0.25 ]);
  assert.deepEqual(emitted[3], [ 0, 0, 1, 1, 0.75, 0.75 ]);
});

test("SetupScreenQuadInCameraSpace reports null rather than guessing a projection", () =>
{
  const context = new Tr2RenderContext();

  // Carbon takes the projection from the Tr2Renderer global, which is always
  // set by the time a blit runs; we take it from the context, which can be
  // empty. Refusing beats unprojecting through an identity nobody chose.
  assert.equal(context.GetProjection(), null);
  assert.equal(SetupScreenQuadInCameraSpace(new Float32Array(SCREEN_QUAD_FLOATS), context), null);
});

test("SetupScreenQuadInCameraSpace shares one depth across all four corners", () =>
{
  const context = new Tr2RenderContext();
  context.SetProjection([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);

  const quad = SetupScreenQuadInCameraSpace(new Float32Array(SCREEN_QUAD_FLOATS), context);
  assert.notEqual(quad, null);

  // Carbon writes tl.z into every vertex, the last one included (cpp:97), so
  // br's own z is deliberately unused. Reading br.z there is the easy slip.
  const z = rows(quad).map(row => row[2]);
  assert.deepEqual(z, [ z[0], z[0], z[0], z[0] ]);
});
