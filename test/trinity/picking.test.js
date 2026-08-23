// The portable half of picking: pick-ray construction and batch collection.
//
// What a ray HITS is engine work - Carbon renders a picking pass and reads
// pixels back - so PickObject and friends stay explicit. Everything below is
// the CPU side an engine builds that pass from.
import test from "node:test";
import assert from "node:assert/strict";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";

import {
  EveChildMesh,
  EveMissile,
  EveMissileWarhead,
  EveMobile,
  EveRootTransform,
  EveSpaceObject2,
  EveSpaceScene,
  EveTransform,
  EveUiObject,
  TR2_PICK_TYPE_DEFAULT,
  Tr2PickType,
  convertProjectionCoordToWorldPickRay,
  screenToProjection
} from "../../npm/dist/trinity/index.js";


const VIEWPORT = { x: 0, y: 0, width: 801, height: 601 };

/** A camera at the origin looking down -Z, with a 90-degree vertical field. */
function makeCamera()
{
  return {
    projection: mat4.perspectiveNO(mat4.create(), Math.PI / 2, 1, 1, 1000),
    view: mat4.create()
  };
}


/** A mesh duck that records which batch types were asked for. */
function makeMesh(areasByType = {})
{
  const asked = [];

  return {
    asked,
    display: true,
    GetAreas(batchType)
    {
      asked.push(batchType);

      return areasByType[batchType] ?? null;
    },
    GetBatches()
    {
      return true;
    }
  };
}


test("a pixel maps to projection space through pixel CENTRES", () =>
{
  // Carbon divides by width - 1, not width: across the viewport, the first
  // pixel maps to -1 and the last to +1 (TriDevice::ScreenToProjection).
  const first = screenToProjection(0, 0, VIEWPORT);
  const last = screenToProjection(800, 600, VIEWPORT);
  const centre = screenToProjection(400, 300, VIEWPORT);

  assert.equal(first.x, -1, "the first column is -1");
  assert.equal(last.x, 1, "the last column is +1");
  assert.equal(centre.x, 0, "the middle column is 0");

  // y is flipped: screen y grows downwards, projection y upwards.
  assert.equal(first.y, 1, "the top row is +1");
  assert.equal(last.y, -1, "the bottom row is -1");
});


test("the viewport origin offsets the pixel before mapping", () =>
{
  const offset = screenToProjection(100, 100, { x: 100, y: 100, width: 801, height: 601 });

  assert.equal(offset.x, -1, "a pixel at the viewport origin is the first column");
  assert.equal(offset.y, 1, "and the top row");
});


test("the centre pixel's world ray points straight down the view direction", () =>
{
  const { projection, view } = makeCamera();
  const ray = convertProjectionCoordToWorldPickRay(0, 0, projection, view);

  // An identity view looks down -Z, so the centre ray is (0, 0, -1).
  assert.ok(Math.abs(ray.direction[0]) < 1e-6, "no x component");
  assert.ok(Math.abs(ray.direction[1]) < 1e-6, "no y component");
  assert.ok(Math.abs(ray.direction[2] + 1) < 1e-6, "straight ahead");
});


test("an off-centre pixel's ray leans the right way, and stays normalized", () =>
{
  const { projection, view } = makeCamera();
  const right = convertProjectionCoordToWorldPickRay(1, 0, projection, view);
  const direction = vec3.clone(right.direction);

  assert.ok(direction[0] > 0, "the right edge leans +x");
  assert.ok(direction[2] < 0, "and still points forwards");
  assert.ok(Math.abs(vec3.length(direction) - 1) < 1e-6, "the direction is normalized");

  const up = convertProjectionCoordToWorldPickRay(0, 1, projection, view);
  assert.ok(up.direction[1] > 0, "the top edge leans +y");
});


test("a singular matrix yields no ray rather than a wrong one", () =>
{
  const { view } = makeCamera();
  const singular = mat4.create();

  mat4.set(singular, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

  assert.equal(convertProjectionCoordToWorldPickRay(0, 0, singular, view), null, "no projection inverse");
  assert.equal(convertProjectionCoordToWorldPickRay(0, 0, mat4.create(), singular), null, "no view inverse");
});


test("EveSpaceScene.PickInfinity resolves a click on empty space to a direction", () =>
{
  const scene = new EveSpaceScene();
  const { projection, view } = makeCamera();

  const centre = scene.PickInfinity(400, 300, projection, view, VIEWPORT);
  assert.ok(Math.abs(centre[2] + 1) < 1e-6, "the centre pixel points straight ahead");

  const right = scene.PickInfinity(800, 300, projection, view, VIEWPORT);
  assert.ok(right[0] > 0, "the right edge leans +x");

  // Carbon returns false from the ray helper on a singular matrix; the scene
  // surfaces that as null rather than a plausible-looking direction.
  const singular = mat4.create();
  mat4.set(singular, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  assert.equal(scene.PickInfinity(400, 300, singular, view, VIEWPORT), null, "no ray, no guess");
});


test("the picking mask selects which batch types are collected", () =>
{
  const object = new EveSpaceObject2();
  const collected = [];

  object.GetBatches = (batches, batchType) => collected.push(batchType);
  object.GetBatchesFromOverlayVector = (batches, data, batchType) => collected.push(`overlay:${batchType}`);

  object.GetPickingBatches({}, Tr2PickType.PICK_TYPE_PICKING, null);
  assert.deepEqual(collected, [ TriBatchType.TRIBATCHTYPE_PICKING ], "picking-only geometry");

  collected.length = 0;
  object.GetPickingBatches({}, Tr2PickType.PICK_TYPE_OPAQUE, null);
  assert.deepEqual(
    collected,
    [
      TriBatchType.TRIBATCHTYPE_OPAQUE,
      TriBatchType.TRIBATCHTYPE_DECAL,
      `overlay:${TriBatchType.TRIBATCHTYPE_TRANSPARENT}`,
      `overlay:${TriBatchType.TRIBATCHTYPE_ADDITIVE}`
    ],
    "the solid pass pulls in decals and the pickable overlays"
  );

  // The default is picking plus opaque (EveSpaceScene.h:554).
  collected.length = 0;
  object.GetPickingBatches({});
  assert.equal(collected[0], TriBatchType.TRIBATCHTYPE_PICKING, "the default starts with picking");
  assert.equal(collected.length, 5, "and adds the whole opaque set");
  assert.equal(TR2_PICK_TYPE_DEFAULT, Tr2PickType.PICK_TYPE_PICKING | Tr2PickType.PICK_TYPE_OPAQUE);
});


test("the transparent pass reads the mesh's own areas, and a hidden mesh suppresses only it", () =>
{
  const object = new EveSpaceObject2();
  const mesh = makeMesh({ [TriBatchType.TRIBATCHTYPE_TRANSPARENT]: [ {} ] });
  const collected = [];

  object.mesh = mesh;
  object.GetBatches = (batches, batchType) => collected.push(batchType);
  object.GetBatchesFromOverlayVector = () => {};

  object.GetPickingBatches({}, Tr2PickType.PICK_TYPE_TRANSPARENT, null);
  assert.deepEqual(
    mesh.asked,
    [ TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE ],
    "both transparent kinds are asked for"
  );
  assert.equal(collected.length, 0, "and none of them go through GetBatches");

  // Hidden: the transparent pass stops, but the opaque collection above it
  // has already run - Carbon returns AFTER those.
  mesh.asked.length = 0;
  mesh.display = false;
  object.GetPickingBatches({}, Tr2PickType.PICK_TYPE_OPAQUE | Tr2PickType.PICK_TYPE_TRANSPARENT, null);
  assert.equal(mesh.asked.length, 0, "a hidden mesh contributes no transparent areas");
  assert.ok(collected.includes(TriBatchType.TRIBATCHTYPE_OPAQUE), "the opaque pass still ran");
});


test("EveChildMesh picks like the hull but has no overlays to contribute", () =>
{
  const child = new EveChildMesh();
  const collected = [];

  child.GetBatches = (batches, batchType) => collected.push(batchType);

  child.GetPickingBatches({}, Tr2PickType.PICK_TYPE_OPAQUE, null);
  assert.deepEqual(
    collected,
    [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL ],
    "solid and decals, no overlay effects"
  );
});


test("a picked area resolves to the hull itself", () =>
{
  const object = new EveSpaceObject2();

  assert.equal(object.GetID(0), object, "area 0");
  assert.equal(object.GetID(7), object, "the area index is deliberately ignored");
});


test("the pick passes that need a GPU readback stay explicit", () =>
{
  const scene = new EveSpaceScene();

  for (const name of [ "PickObject", "PickAsyncObject", "PickObjectAndAreaID" ])
  {
    assert.throws(() => scene[name](), /not implemented/u, `${name} needs an engine pass`);
  }
});


test("EveTransform picks through its own GetBatches, and the derived classes inherit it", () =>
{
  const transform = new EveTransform();
  const collected = [];

  transform.GetBatches = (batches, batchType) => collected.push(batchType);

  // No decals and no overlays: the opaque bit is one collection, unlike the hull.
  transform.GetPickingBatches({}, Tr2PickType.PICK_TYPE_OPAQUE, null);
  assert.deepEqual(collected, [ TriBatchType.TRIBATCHTYPE_OPAQUE ], "solid only");

  // The transparent bit goes through GetBatches too, NOT the mesh's areas -
  // so a hidden transform contributes nothing rather than suppressing one pass.
  collected.length = 0;
  transform.GetPickingBatches({}, Tr2PickType.PICK_TYPE_TRANSPARENT, null);
  assert.deepEqual(
    collected,
    [ TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE ],
    "both transparent kinds, through the node's own batch path"
  );

  assert.equal(transform.GetID(3), transform, "a picked area resolves to the transform");
});


test("every Carbon pickable has a surface, whether declared or inherited", () =>
{
  // Carbon declares GetPickingBatches on exactly two of these - EveSpaceObject2
  // and EveTransform - and the rest inherit. The JS hierarchy matches, so the
  // whole family is covered by those two ports.
  for (const [ name, Constructor, base ] of [
    [ "EveMissile", EveMissile, EveSpaceObject2 ],
    [ "EveMobile", EveMobile, EveSpaceObject2 ],
    [ "EveUiObject", EveUiObject, EveSpaceObject2 ],
    [ "EveMissileWarhead", EveMissileWarhead, EveTransform ],
    [ "EveRootTransform", EveRootTransform, EveTransform ]
  ])
  {
    const instance = new Constructor();

    assert.ok(instance instanceof base, `${name} derives from ${base.name}`);
    assert.equal(typeof instance.GetPickingBatches, "function", `${name} can be picked`);
    assert.equal(instance.GetID(0), instance, `${name} resolves to itself`);
  }
});
