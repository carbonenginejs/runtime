// The orientation-enforcing accessor pair.
//
// A GPU-form record holds matrices that are transposed but indistinguishable
// from logical ones, so the API refuses the ambiguous call rather than
// documenting it: Set/Get throw on a matrix field, SetAndTranspose/GetTransposed
// throw on everything else. See carbon-math-conventions F1/F6.
import test from "node:test";

import { mat4 } from "@carbonenginejs/runtime-utils/mat4";

import { makePerObjectStore } from "./helpers/perObjectStore.js";


function assert(condition, message = "assertion failed")
{
  if (!condition)
  {
    throw new Error(message);
  }
}


function assertEquals(actual, expected, message = "")
{
  if (actual !== expected)
  {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}


function assertThrows(fn, pattern, message = "")
{
  try
  {
    fn();
  }
  catch (error)
  {
    assert(pattern.test(error.message), `${message}: "${error.message}" should match ${pattern}`);

    return;
  }

  throw new Error(`${message}: expected a throw`);
}


function decal()
{
  return makePerObjectStore().Alloc("DecalVSPerObjectData");
}


test("SetAndTranspose writes GPU-form bytes from a logical matrix", () =>
{
  const data = decal();
  const world = mat4.create();
  mat4.fromTranslation(world, [ 7, 8, 9 ]);

  data.SetAndTranspose("worldMatrix", world);

  // gl-matrix keeps translation at 12..14; Carbon's staging fill transposes it
  // into the fourth column of each row.
  const out = new Float32Array(16);
  data.Copy("worldMatrix", out);

  assertEquals(out[3], 7, "row 0 translation");
  assertEquals(out[7], 8, "row 1 translation");
  assertEquals(out[11], 9, "row 2 translation");
});


test("Set and Get refuse a matrix field, naming the method to use", () =>
{
  const data = decal();

  assertThrows(() => data.Get("worldMatrix"), /stored TRANSPOSED.*GetTransposed/u, "Get on a matrix");
  assertThrows(() => data.SetIndex("worldMatrix", 0, mat4.create()), /SetAndTranspose/u, "SetIndex on a matrix");
  assertThrows(() => data.GetIndex("worldMatrix", 0), /GetTransposed/u, "GetIndex on a matrix");
});


test("the transposed pair refuses a non-matrix field", () =>
{
  const data = makePerObjectStore().Alloc("DecalPSPerObjectData");

  assertThrows(() => data.SetAndTranspose("shipData", [ 1, 2, 3, 4 ]), /not a matrix/u, "SetAndTranspose on a vector");
  assertThrows(() => data.GetTransposed("shipData"), /not a matrix/u, "GetTransposed on a vector");
});


test("Get returns a live reference, so writing through it is zero-copy", () =>
{
  // Carbon hands out a raw pointer into m_psData for exactly this
  // (GetParentData, EveSpaceObject2.cpp:1877-1883).
  const data = makePerObjectStore().Alloc("DecalPSPerObjectData");

  data.Set("shipData", [ 1, 2, 3, 4 ]);

  const view = data.Get("shipData");
  assertEquals(view.length, 4, "view spans the field");
  assertEquals(view[2], 3, "view reads the written value");

  view[2] = 99;

  const out = new Float32Array(4);
  data.Copy("shipData", out);
  assertEquals(out[2], 99, "writing through the view reached the buffer");

  // The view aliases the record's own bytes, not a copy.
  assertEquals(view.buffer, data.GetData().buffer, "same backing buffer");
});


test("GetTransposed hands back the stored, transposed matrix", () =>
{
  const data = decal();
  const world = mat4.create();
  mat4.fromTranslation(world, [ 1, 2, 3 ]);

  data.SetAndTranspose("worldMatrix", world);

  const stored = data.GetTransposed("worldMatrix");

  assertEquals(stored.length, 16);
  // Transposed: translation in the fourth column of each row, NOT at 12..14.
  assertEquals(stored[3], 1);
  assertEquals(stored[12], 0, "12..14 is not the translation once transposed");
});


test("the indexed pair addresses one element and leaves the rest alone", () =>
{
  const store = makePerObjectStore();
  const vs = store.Alloc("EveBoosterSetVSData");

  // Carbon fills these rings partially - trails for the control points that
  // exist, turrets for the visible ones - so an indexed write must not disturb
  // its neighbours.
  vs.SetIndex("trailsControlPositions", 1, [ 5, 6, 7, 8 ]);

  const one = vs.GetIndex("trailsControlPositions", 1);
  assertEquals(one.length, 4, "one element wide");
  assertEquals(one[0], 5);

  const zero = vs.GetIndex("trailsControlPositions", 0);
  assertEquals(zero[0], 0, "neighbour untouched");

  const whole = vs.Get("trailsControlPositions");
  assertEquals(whole.length, 20, "the un-indexed view spans all five elements");
});


test("an out-of-range element is rejected rather than silently clamped", () =>
{
  const vs = makePerObjectStore().Alloc("EveBoosterSetVSData");

  assertThrows(() => vs.SetIndex("trailsControlPositions", 5, [ 0, 0, 0, 0 ]), /out of range/u, "past the end");
  assertThrows(() => vs.GetIndex("trailsControlPositions", -1), /out of range/u, "negative");
});


test("CopyIndex copies one element out", () =>
{
  const vs = makePerObjectStore().Alloc("EveBoosterSetVSData");
  vs.SetIndex("trailsControlNormals", 2, [ 9, 8, 7, 6 ]);

  const out = new Float32Array(4);
  vs.CopyIndex("trailsControlNormals", 2, out);

  assertEquals(out[0], 9);
  assertEquals(out[3], 6);
});


test("an unknown field throws from every verb", () =>
{
  const data = decal();

  for (const call of [
    () => data.Get("nope"),
    () => data.GetTransposed("nope"),
    () => data.SetAndTranspose("nope", mat4.create()),
    () => data.SetIndex("nope", 0, [ 0 ])
  ])
  {
    assertThrows(call, /unknown field/u, "unknown field");
  }
});
