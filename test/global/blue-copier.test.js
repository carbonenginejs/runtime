import assert from "node:assert/strict";
import test from "node:test";

import { blue, Copier, ICopier } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";

// Blue's Copier (blueexposure/Copier.cpp), reached through blue.classes.CopyTo
// as BlueClasses.cpp:498-516 does.

const { type, edit } = CjsSchema;
const { OverrideResult } = ICopier;

class CopierLeaf
{
  value = 0;
  label = "";
  scratch = 0;
}
CjsSchema.define(CopierLeaf, { className: "CopierLeaf", fields: {
  value: [ type.int32, edit.persist ],
  label: [ type.string, edit.persist ],
  scratch: [ type.int32, edit.readwrite ]
} });

class CopierNode
{
  position = new Float32Array(3);
  left = null;
  right = null;
  items = [];
  byName = new Map();
  modified = [];

  OnModified(name)
  {
    this.modified.push(name);
    return true;
  }
}
CjsSchema.define(CopierNode, { className: "CopierNode", fields: {
  position: [ type.vec3, edit.persist ],
  left: [ type.model("CopierLeaf"), edit.persist ],
  right: [ type.model("CopierLeaf"), edit.persist ],
  items: [ type.list("CopierLeaf"), edit.persist ],
  byName: [ type.map("CopierLeaf"), edit.persist ]
} });

class CopierInitialized
{
  value = 0;
  initialized = 0;
  modified = 0;

  Initialize()
  {
    this.initialized += 1;
    return true;
  }

  OnModified()
  {
    this.modified += 1;
    return true;
  }
}
CjsSchema.define(CopierInitialized, { className: "CopierInitialized", fields: {
  value: [ type.int32, edit.persist ]
} });

function Leaf(value, label = "")
{
  return Object.assign(new CopierLeaf(), { value, label });
}

test("CopyTo creates an instance of the source's class and copies only PERSIST members", () =>
{
  const source = Object.assign(Leaf(7, "seven"), { scratch: 99 });
  const copy = blue.classes.CopyTo(source);

  assert.ok(copy instanceof CopierLeaf);
  assert.notEqual(copy, source);
  assert.equal(copy.value, 7);
  assert.equal(copy.label, "seven");
  assert.equal(copy.scratch, 0, "a member without PERSIST is not copied");
});

test("a shared child stays shared in the copy, and each copy is new", () =>
{
  const shared = Leaf(1);
  const source = new CopierNode();
  source.left = shared;
  source.right = shared;

  const copy = blue.classes.CopyTo(source);
  assert.notEqual(copy.left, shared);
  assert.equal(copy.left, copy.right, "topology is preserved through the identity map");
  assert.equal(copy.left.value, 1);

  const second = blue.classes.CloneTo(source);
  assert.notEqual(second.left, copy.left, "the identity map clears between copies");
});

test("a buffer member is written into the destination's own storage", () =>
{
  const source = new CopierNode();
  source.position.set([ 1, 2, 3 ]);
  const dest = new CopierNode();
  const storage = dest.position;

  assert.equal(blue.classes.CopyTo(source, dest), dest);
  assert.equal(dest.position, storage);
  assert.deepEqual(Array.from(dest.position), [ 1, 2, 3 ]);
});

test("OnModified fires once per changed member, and not for unchanged ones", () =>
{
  const source = new CopierNode();
  source.position.set([ 1, 2, 3 ]);
  const dest = new CopierNode();
  dest.position.set([ 1, 2, 3 ]);

  blue.classes.CopyTo(source, dest);
  assert.deepEqual(dest.modified, [], "an equal buffer and empty containers change nothing");

  source.items = [ Leaf(4) ];
  blue.classes.CopyTo(source, dest);
  assert.deepEqual(dest.modified, [ "items" ]);
});

test("a destination with Initialize is initialized instead of notified", () =>
{
  const dest = new CopierInitialized();
  const source = Object.assign(new CopierInitialized(), { value: 3 });

  blue.classes.CopyTo(source, dest);
  assert.equal(dest.value, 3);
  assert.equal(dest.initialized, 1);
  assert.equal(dest.modified, 0);
});

test("lists and maps of objects are rebuilt from copied items", () =>
{
  const source = new CopierNode();
  source.items = [ Leaf(1), Leaf(2) ];
  source.byName = new Map([ [ "a", source.items[0] ] ]);

  const copy = blue.classes.CopyTo(source);
  assert.deepEqual(copy.items.map(item => item.value), [ 1, 2 ]);
  assert.notEqual(copy.items[0], source.items[0]);
  assert.equal(copy.byName.get("a"), copy.items[0], "one identity map spans lists and maps");
});

test("a destination of another class fails the copy", () =>
{
  const originalError = console.error;
  console.error = () => {};
  try
  {
    assert.equal(blue.classes.CopyTo(Leaf(1), new CopierNode()), null);
  }
  finally
  {
    console.error = originalError;
  }
});

test("a null source object member fails the copy, as Copy<IROOTPTR> does", () =>
{
  const source = new CopierNode();
  const dest = new CopierNode();
  dest.left = Leaf(5);

  assert.equal(blue.classes.CopyTo(source, dest), null);
  assert.equal(dest.left, null, "the old object is released before the failure");
});

test("the override can alias an object, and the post-copy sees every copy", () =>
{
  const shared = Leaf(9);
  const source = new CopierNode();
  source.left = shared;
  source.right = Leaf(2);
  const posted = [];

  const copy = blue.classes.CopyTo(
    source,
    null,
    object => object === shared ? { result: OverrideResult.SUCCESS, dest: object } : { result: OverrideResult.FALLBACK },
    (object, dest) => posted.push(dest)
  );

  assert.equal(copy.left, shared, "SUCCESS returns the override's object");
  assert.notEqual(copy.right, source.right, "FALLBACK copies normally");
  assert.ok(posted.includes(copy.right));
  assert.ok(posted.includes(copy));
});

test("AssignTo on the source copies state outside the schema", () =>
{
  class CopierCustom
  {
    value = 0;
    hidden = null;

    AssignTo(other)
    {
      other.hidden = this.hidden;
      return true;
    }
  }
  CjsSchema.define(CopierCustom, { className: "CopierCustom", fields: { value: [ type.int32, edit.persist ] } });

  const source = Object.assign(new CopierCustom(), { value: 1, hidden: "kept" });
  assert.equal(blue.classes.CopyTo(source).hidden, "kept");
});

test("Copier is exported and implements ICopier", () =>
{
  assert.ok(new Copier() instanceof ICopier);
});
