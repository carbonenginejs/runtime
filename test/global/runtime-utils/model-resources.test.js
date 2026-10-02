import { GetResources } from "../../../src/global/blue/getResources.js";
import "../../../src/global/blue/values.js";
// GetResources is the dependency set that readiness, renewal and revival all
// fold over, so under-reporting it is not a cosmetic bug: an all-or-nothing
// readiness check would pass while a child's textures were still loading, which
// is exactly the progressive pop-in the fold exists to prevent.
//
// Declared through the CjsSchema API rather than decorator syntax, so the test
// runs against src without a build step.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsSchema, meta } from "../../../src/global/schema/index.js";


function createResource(name)
{
  return new TestRes(name);
}


class LeafHolder
{
  name = "";
  res = null;
}

CjsSchema.decorateField(LeafHolder, "name", meta.type.string);
CjsSchema.decorateField(LeafHolder, "res", meta.type.resource("TestRes"));
CjsSchema.define(LeafHolder, { className: "LeafHolder", family: "test" });


class BranchHolder
{
  child = null;
  res = null;
}

CjsSchema.decorateField(BranchHolder, "child", meta.type.struct(LeafHolder));
CjsSchema.decorateField(BranchHolder, "res", meta.type.resource("TestRes"));
CjsSchema.define(BranchHolder, { className: "BranchHolder", family: "test" });


/** Stands in for a Res class: what marks it is the static, as CjsResource does. */
class TestRes
{
  static isResource = true;

  constructor(name)
  {
    this.name = name;
  }

  get isResource()
  {
    return this.constructor.isResource === true;
  }
}

CjsSchema.SetConstructor("TestRes", TestRes);


/** Holds resources the way real classes do: declared schema fields, no hook. */
class DeclaredHolder
{
  texture = null;
  geometry = null;
  profiles = [];
  child = null;
}

CjsSchema.decorateField(DeclaredHolder, "texture", meta.type.objectRef("TestRes"));
CjsSchema.decorateField(DeclaredHolder, "geometry", meta.type.objectRef("TestRes"));
CjsSchema.decorateField(DeclaredHolder, "profiles", meta.type.list("TestRes"));
CjsSchema.decorateField(DeclaredHolder, "child", meta.type.struct(DeclaredHolder));
CjsSchema.define(DeclaredHolder, { className: "DeclaredHolder", family: "test" });


test("resources in declared fields are collected without any hook", () =>
{
  // @type.objectRef("TriGeometryRes") already says the field holds a resource.
  // Runtime-only private slots use type.resource; both are traversable edges.
  const model = new DeclaredHolder();
  model.texture = createResource("texture");
  model.geometry = createResource("geometry");

  const found = GetResources(model).map(r => r.name).sort();

  assert.deepEqual(found, [ "geometry", "texture" ]);
});


test("declared list fields contribute each of their resources", () =>
{
  const model = new DeclaredHolder();
  model.profiles = [ createResource("a"), createResource("b") ];

  assert.deepEqual(GetResources(model).map(r => r.name), [ "a", "b" ]);
});


test("declared fields are collected all the way down the graph", () =>
{
  const root = new DeclaredHolder();
  root.texture = createResource("root");
  root.child = new DeclaredHolder();
  root.child.texture = createResource("child");

  assert.deepEqual(GetResources(root).map(r => r.name).sort(), [ "child", "root" ]);
});


test("non-resource field values are ignored", () =>
{
  // The declaration says where to look; the value still has to be a resource.
  const model = new DeclaredHolder();
  model.texture = { name: "impostor" };
  model.geometry = createResource("real");

  assert.deepEqual(GetResources(model).map(r => r.name), [ "real" ]);
});


test("a model with runtime resource fields does not hide its children's", () =>
{
  // A branch holding a private loaded resource must retain child dependencies.
  const branch = new BranchHolder();
  branch.res = createResource("effect");
  branch.child = new LeafHolder();
  branch.child.res = createResource("texture");

  const found = GetResources(branch).map(r => r.name).sort();

  assert.deepEqual(found, [ "effect", "texture" ]);
});


test("unset resource slots are skipped, not collected", () =>
{
  const branch = new BranchHolder();
  branch.child = new LeafHolder();
  branch.child.res = createResource("texture");

  assert.deepEqual(GetResources(branch).map(r => r.name), [ "texture" ]);
});


test("the same resource shared by two models is reported once", () =>
{
  const shared = createResource("shared");
  const branch = new BranchHolder();
  branch.res = shared;
  branch.child = new LeafHolder();
  branch.child.res = shared;

  assert.equal(GetResources(branch).length, 1);
});


test("runtime resource declarations collect a single reference without a callback", () =>
{
  const model = new LeafHolder();
  model.res = createResource("geometry");
  const out = [createResource("stale")];
  assert.equal(GetResources(model, out), out);
  assert.deepEqual(out, [model.res]);
});


test("runtime resource declarations ignore impostors and absent values", () =>
{
  const model = new LeafHolder();
  for (const value of [undefined, null, "resource", { name: "impostor" }])
  {
    model.res = value;
    assert.deepEqual(GetResources(model), []);
  }
});


test("resource collection never reads the removed callback property", () =>
{
  const model = new LeafHolder();
  model.res = createResource("geometry");
  Object.defineProperty(model, "OnGetResources", {
    get() { assert.fail("resource collection must use declarations only"); },
  });
  assert.deepEqual(GetResources(model), [model.res]);
});
