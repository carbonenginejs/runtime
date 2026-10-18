// TriLineSet's geometry and drawing (TriLineSet.cpp:30-444) on the stub backend: Carbon's cylinder frame, the oriented
// box, the world transform it renders under, and the 16-byte VertexPosColor line list it submits.
import assert from "node:assert/strict";
import test from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { TriLineSet, TriDebugResourceHelper, Tr2VariableStore, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/Tr2Renderer.js";

function setup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  const draws = [];
  const draw = al.DrawPrimitiveUP.bind(al);
  al.DrawPrimitiveUP = (count, data, stride) => { draws.push({ count, data: data.slice(), stride }); return draw(count, data, stride); };
  t.after(() => context.SetRenderContextAL(prior));
  return { context, draws };
}

const near = (actual, expected, message) =>
  expected.forEach((value, index) => assert.ok(Math.abs(actual[index] - value) < 1e-5, `${message}: ${Array.from(actual)} against ${expected}`));

test("AddCylinder builds Carbon's frame along end -> start, scaled by radius and length", () =>
{
  const lines = new TriLineSet();
  lines.AddCylinder([ 0, 0, 10 ], [ 0, 0, 0 ], 2, 4, 0xffffffff);
  // z = (0, 0, 1), x = normalize(cross(+Y, z)) = (1, 0, 0), y = cross(z, x) = (0, 1, 0); five lines per segment.
  assert.equal(lines.vertices.length, 4 * 5 * 2);
  near(lines.vertices[0].position, [ 2, 0, 0 ], "segment 0 base");
  near(lines.vertices[1].position, [ 2, 0, 10 ], "segment 0 top");
  near(lines.vertices[5].position, [ 0, 0, 10 ], "top to start");
  near(lines.vertices[7].position, [ 0, 2, 0 ], "next base point, a quarter turn on");
  near(lines.vertices[9].position, [ 0, 2, 10 ], "next top point");

  const cone = new TriLineSet();
  cone.AddCone([ 0, 0, 10 ], [ 0, 0, 0 ], 2, 4, 0xffffffff);
  near(cone.vertices[1].position, [ 0, 0, 10 ], "every side meets at the apex (start)");
});

test("AddOrientedBox takes the unit box's corners through boxMatrix", () =>
{
  const lines = new TriLineSet();
  lines.AddOrientedBox(mat4.fromRotationTranslationScale(mat4.create(), [ 0, 0, 0, 1 ], [ 5, 0, 0 ], [ 2, 3, 4 ]), 0xffffffff);
  assert.equal(lines.vertices.length, 24);
  near(lines.vertices[0].position, [ 3, -3, -4 ], "min corner");
  near(lines.vertices[1].position, [ 7, -3, -4 ], "minA");

  const minMax = new TriLineSet();
  minMax.AddOrientedBox__MinMax(mat4.fromTranslation(mat4.create(), [ 1, 2, 3 ]), [ 0, 0, 0 ], [ 1, 1, 1 ], 0xffffffff);
  near(minMax.vertices[0].position, [ 1, 2, 3 ], "AddBox's first edge, translated");
});

test("Render sets the world transform; SubmitGeometry draws a 16-byte VertexPosColor line list", (t) =>
{
  const { context, draws } = setup(t);
  const lines = new TriLineSet();
  lines.Add([ 1, 2, 3 ], 0x11223344, [ 4, 5, 6 ], 0x55667788);
  lines.transform = mat4.fromTranslation(mat4.create(), [ 7, 8, 9 ]);

  lines.Render(context);
  assert.deepEqual(Array.from(Tr2Renderer.GetWorldTransform()), Array.from(lines.transform));
  const worldMat = Tr2VariableStore.globalStore().GetVariable("WorldMat");
  assert.deepEqual(Array.from(worldMat.GetValue()).slice(12, 15), [ 7, 8, 9 ], "the WorldMat global follows (Tr2Renderer.cpp:553-559)");
  assert.notEqual(TriDebugResourceHelper.g_debugResourceHelper().GetVertexPosColorDecl(), undefined);

  lines.SubmitGeometry(context);
  assert.equal(draws.length, 1);
  assert.equal(draws[0].count, 1, "one line");
  assert.equal(draws[0].stride, 16);
  const floats = new Float32Array(draws[0].data.buffer, draws[0].data.byteOffset, 8);
  const words = new Uint32Array(draws[0].data.buffer, draws[0].data.byteOffset, 8);
  assert.deepEqual(Array.from(floats.slice(0, 3)), [ 1, 2, 3 ]);
  assert.equal(words[3], 0x11443322, "the colour, swizzled RGBA to BGRA");
  assert.deepEqual(Array.from(floats.slice(4, 7)), [ 4, 5, 6 ]);
  assert.equal(words[7], 0x55887766);

  lines.Clear();
  lines.Render(context);
  assert.equal(draws.length, 1, "an empty set draws nothing");
});
