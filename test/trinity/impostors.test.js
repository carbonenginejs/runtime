// Impostors: EveSpaceObject2 as Carbon's ITr2ImpostorSource (EveSpaceObject2.cpp:1821-1851,
// 4226-4274) and the math UpdateImpostors uses (EveSpaceScene.cpp:1578-1684).
import assert from "node:assert/strict";
import test from "node:test";

import { EveSpaceObject2, Tr2ImpostorManager } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

test("mat4.perspectiveRHD3D is DirectXMath's XMMatrixPerspectiveRH", () =>
{
  const [ w, h, n, f ] = [ 40, 30, 5, 250 ];
  // XMMatrixPerspectiveRH, row-major: diag(2n/w, 2n/h, f/(n-f), 0), [2][3] = -1, [3][2] = n*f/(n-f).
  const expected = [ 2 * n / w, 0, 0, 0, 0, 2 * n / h, 0, 0, 0, 0, f / (n - f), -1, 0, 0, n * f / (n - f), 0 ];
  const actual = mat4.perspectiveRHD3D(mat4.create(), w, h, n, f);
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-6, `[${i}] ${actual[i]} vs ${expected[i]}`);
});

test("GetRenderPriority is the larger turn of view or up since capture (cpp:4254-4259)", () =>
{
  const object = new EveSpaceObject2();
  const captured = { viewDir: [ 0, 0, 1 ], upDir: [ 0, 1, 0 ] };
  assert.equal(object.GetRenderPriority(captured, captured), 0);
  const turned = { viewDir: [ 1, 0, 0 ], upDir: [ 0, 1, 0 ] };
  assert.equal(object.GetRenderPriority(captured, turned), 1);
});

test("GetLastImpostorBoundingSphere moves the sphere to last frame's world position (cpp:4266-4274)", () =>
{
  const object = new EveSpaceObject2();
  object.GetBoundingSphere = out => { out.set([ 10, 20, 30, 5 ]); return true; };
  mat4.fromTranslation(object.worldTransform, [ 100, 0, 0 ]);
  mat4.fromTranslation(object.lastWorldTransform, [ 90, 0, 0 ]);
  const sphere = new Float32Array(4);
  object.GetLastImpostorBoundingSphere(sphere);
  assert.deepEqual(Array.from(sphere), [ 0, 20, 30, 5 ]);
});

test("an object the manager declines pushes its renderables instead (cpp:1821-1851)", () =>
{
  const object = new EveSpaceObject2();
  object.display = true;
  object.isVisible = true;
  object._impostorMode = true;
  object.PushRenderables = out => out.push("hull");
  // A manager whose atlas was never prepared declines every Add.
  const declined = object.GetRenderables_Impostors([], new Tr2ImpostorManager());
  assert.deepEqual(declined, [ "hull" ]);
  assert.equal(object.IsImpostor(), false, "impostor mode falls back when Add fails");

  object._impostorMode = true;
  assert.deepEqual(object.GetRenderables_Impostors([], null), [ "hull" ], "no manager: impostor mode is dropped");
});
