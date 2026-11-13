import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/index.js";
import { CjsBlueGraph } from "../../npm/dist/blue/formats/graph/index.js";

test("Blue declares own destructors without activating graph values or copying a second base's", () =>
{
  const calls = [], argument = new Set();
  class Primary { _Destructor(...args) { calls.push([ "primary", args.length ]); } }
  class Secondary { _Destructor(...args) { calls.push([ "secondary", args.length ]); } }
  class Owner extends Primary { _Destructor(...args) { calls.push([ "owner", args.length ]); } }
  CjsSchema.meta.define("LifetimeBridgePrimary")(Primary);
  CjsSchema.meta.define("LifetimeBridgeSecondary")(Secondary);
  CjsSchema.meta.inherit(Secondary)(Owner);
  CjsSchema.meta.define("LifetimeBridgeOwner")(Owner);
  assert.equal(CjsGraph.isDefined(Owner), false);
  const object = new Owner();
  object.Destruct(argument);
  assert.deepEqual(calls, [ [ "owner", 0 ], [ "secondary", 0 ], [ "primary", 0 ] ], "a destructor takes no arguments");
  CjsBlueGraph.define(Owner, "LifetimeBridgeOwner");
  assert.equal(CjsGraph.isDefined(Owner), true);
  calls.length = 0;
  object.Destruct(argument);
  assert.deepEqual(calls.map(row => row[0]), [ "owner", "secondary", "primary" ]);

  class Composed {}
  CjsSchema.meta.inherit(Secondary)(Composed);
  CjsSchema.meta.define("LifetimeBridgeComposed")(Composed);
  assert.equal(Object.hasOwn(Composed.prototype, "_Destructor"), false);
  calls.length = 0;
  new Composed().Destruct(argument);
  assert.deepEqual(calls, [ [ "secondary", 0 ] ]);
});

test("registration preserves inherited legacy Destruct until its owner is migrated", () =>
{
  let calls = 0;
  class Legacy { Destruct() { calls++; } }
  class Derived extends Legacy { OnDestruct() { assert.fail("legacy owner must not be bypassed"); } }
  CjsSchema.meta.define("LifetimeBridgeLegacy")(Legacy);
  CjsSchema.meta.define("LifetimeBridgeLegacyChild")(Derived);
  new Derived().Destruct();
  assert.equal(calls, 1);
  assert.equal(Object.hasOwn(Derived.prototype, "Destruct"), false);
});

test("late composed-base registration invalidates an already used teardown list", () =>
{
  const calls = [];
  class Owner { _Destructor() { calls.push("own"); } }
  class Late { _Destructor() { calls.push("late"); } }
  CjsSchema.meta.define("LifetimeBridgeLateOwner")(Owner);
  CjsSchema.meta.define("LifetimeBridgeLateBase")(Late);
  const object = new Owner();
  object.Destruct();
  CjsSchema.meta.inherit(Late)(Owner);
  object.Destruct();
  assert.deepEqual(calls, [ "own", "own", "late" ]);
});

test("unexposed composed classes acquire teardown before any Blue definition", () =>
{
  const calls = [];
  class Base { _Destructor() { calls.push("base"); } }
  class Owner { OnDestruct(value) { calls.push(["owner", value]); return true; } _Destructor() { calls.push("~owner"); } }
  CjsSchema.meta.inherit(Base)(Owner);
  assert.equal(CjsGraph.isDefined(Owner), false);
  new Owner().Destruct(7);
  assert.deepEqual(calls, [["owner", 7], "~owner", "base"]);
});


test("a direct native GPU-buffer import can destruct before the device service loads", () =>
{
  const moduleUrl = new URL("../../npm/dist/trinity/core/device/Tr2GpuBuffer.js", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `
    import { Tr2GpuBuffer } from ${JSON.stringify(moduleUrl)};
    const owner = new Tr2GpuBuffer();
    owner.Destruct();
    owner.Destruct();
  `], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
