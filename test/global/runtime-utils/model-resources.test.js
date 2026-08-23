// GetResources is the dependency set that readiness, renewal and revival all
// fold over, so under-reporting it is not a cosmetic bug: an all-or-nothing
// readiness check would pass while a child's textures were still loading, which
// is exactly the progressive pop-in the fold exists to prevent.
//
// Declared through the CjsSchema API rather than decorator syntax, so the test
// runs against src without a build step.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsModel } from "../../../src/global/model/CjsModel.js";
import { CjsSchema, type } from "../../../src/global/schema/index.js";


function createResource(name)
{
  return new TestRes(name);
}


class LeafHolder extends CjsModel
{
  name = "";
  res = null;

  OnGetResources()
  {
    return [ this.res ];
  }
}

CjsSchema.define(LeafHolder, { className: "LeafHolder", family: "test" });
CjsSchema.decorateField(LeafHolder, "name", type.string);


class BranchHolder extends CjsModel
{
  child = null;
  res = null;

  OnGetResources()
  {
    return [ this.res ];
  }
}

CjsSchema.define(BranchHolder, { className: "BranchHolder", family: "test" });
CjsSchema.decorateField(BranchHolder, "child", type.struct(LeafHolder));


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
class DeclaredHolder extends CjsModel
{
  texture = null;
  geometry = null;
  profiles = [];
  child = null;
}

CjsSchema.define(DeclaredHolder, { className: "DeclaredHolder", family: "test" });
CjsSchema.decorateField(DeclaredHolder, "texture", type.objectRef("TestRes"));
CjsSchema.decorateField(DeclaredHolder, "geometry", type.objectRef("TestRes"));
CjsSchema.decorateField(DeclaredHolder, "profiles", type.list("TestRes"));
CjsSchema.decorateField(DeclaredHolder, "child", type.struct(DeclaredHolder));


test("resources in declared fields are collected without any hook", () =>
{
  // @type.objectRef("TriGeometryRes") already says the field holds a resource.
  // Requiring OnGetResources as well would be the hand-written relay chain.
  const model = new DeclaredHolder();
  model.texture = createResource("texture");
  model.geometry = createResource("geometry");

  const found = model.GetResources().map(r => r.name).sort();

  assert.deepEqual(found, [ "geometry", "texture" ]);
});


test("declared list fields contribute each of their resources", () =>
{
  const model = new DeclaredHolder();
  model.profiles = [ createResource("a"), createResource("b") ];

  assert.deepEqual(model.GetResources().map(r => r.name), [ "a", "b" ]);
});


test("declared fields are collected all the way down the graph", () =>
{
  const root = new DeclaredHolder();
  root.texture = createResource("root");
  root.child = new DeclaredHolder();
  root.child.texture = createResource("child");

  assert.deepEqual(root.GetResources().map(r => r.name).sort(), [ "child", "root" ]);
});


test("non-resource field values are ignored", () =>
{
  // The declaration says where to look; the value still has to be a resource.
  const model = new DeclaredHolder();
  model.texture = { name: "impostor" };
  model.geometry = createResource("real");

  assert.deepEqual(model.GetResources().map(r => r.name), [ "real" ]);
});


test("a model reporting resources does not hide its children's", () =>
{
  // The old collector pruned descendants of any model with OnGetResources, so a
  // branch holding one resource concealed every resource beneath it.
  const branch = new BranchHolder();
  branch.res = createResource("effect");
  branch.child = new LeafHolder();
  branch.child.res = createResource("texture");

  const found = branch.GetResources().map(r => r.name).sort();

  assert.deepEqual(found, [ "effect", "texture" ]);
});


test("unset resource slots are skipped, not collected", () =>
{
  const branch = new BranchHolder();
  branch.child = new LeafHolder();
  branch.child.res = createResource("texture");

  assert.deepEqual(branch.GetResources().map(r => r.name), [ "texture" ]);
});


test("the same resource shared by two models is reported once", () =>
{
  const shared = createResource("shared");
  const branch = new BranchHolder();
  branch.res = shared;
  branch.child = new LeafHolder();
  branch.child.res = shared;

  assert.equal(branch.GetResources().length, 1);
});


test("OnGetResources must return an iterable, so a bare resource is rejected", () =>
{
  // One shape only: no isResource sniffing, no null guard, no dual protocol
  // where the accumulator is both passed in and returned.
  const model = new LeafHolder();
  model.OnGetResources = () => createResource("bare");

  assert.throws(() => model.GetResources(), TypeError);
});


test("OnGetResources returning nothing is rejected too", () =>
{
  const model = new LeafHolder();
  model.OnGetResources = () => undefined;

  assert.throws(() => model.GetResources(), TypeError);
});


test("OnGetResources takes no accumulator argument", () =>
{
  // Anyone porting ccpwgl's GetResources(out) would write out.push(...); the
  // hook is return-only so that mistake surfaces immediately.
  let received = "unset";
  const model = new LeafHolder();
  model.res = createResource("texture");
  model.OnGetResources = (...args) => { received = args.length; return [ model.res ]; };

  model.GetResources();

  assert.equal(received, 0);
});
