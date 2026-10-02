import assert from "node:assert/strict";
import test from "node:test";

import { blue, Copier, ICopier, ICopierCustomAssignment, IInitialize, INotify } from "../../src/global/blue/index.js";
import { CjsSchema, CJS_CLASS_NAME } from "../../src/global/schema/index.js";

// Blue's Copier (blueexposure/Copier.cpp), reached through blue.classes.CopyTo
// as BlueClasses.cpp:498-516 does.


const { OverrideResult } = ICopier;

class CopierLeaf
{
  value = 0;
  label = "";
  scratch = 0;
}
CjsSchema.define(CopierLeaf, { className: "CopierLeaf", fields: {
  value: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist ],
  label: [ CjsSchema.meta.type.string, CjsSchema.meta.blue.persist ],
  scratch: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.readwrite ]
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
  position: [ CjsSchema.meta.type.vec3, CjsSchema.meta.blue.persist ],
  left: [ CjsSchema.meta.type.model("CopierLeaf"), CjsSchema.meta.blue.persist ],
  right: [ CjsSchema.meta.type.model("CopierLeaf"), CjsSchema.meta.blue.persist ],
  items: [ CjsSchema.meta.type.list("CopierLeaf"), CjsSchema.meta.blue.persist ],
  byName: [ CjsSchema.meta.type.map("CopierLeaf"), CjsSchema.meta.blue.persist ]
} });

CjsSchema.meta.blue.mapInterface(INotify)(CopierNode);

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
  value: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist ]
} });

CjsSchema.meta.blue.mapInterface(IInitialize, INotify)(CopierInitialized);

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
  CjsSchema.define(CopierCustom, { className: "CopierCustom", fields: { value: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist ] } });

  CjsSchema.meta.blue.mapInterface(ICopierCustomAssignment)(CopierCustom);

  const source = Object.assign(new CopierCustom(), { value: 1, hidden: "kept" });
  assert.equal(blue.classes.CopyTo(source).hidden, "kept");
});

test("Copier is exported and implements ICopier", () =>
{
  assert.ok(new Copier() instanceof ICopier);
});

test("a list typed by an unregistered interface still copies its items as objects", () =>
{
  // BlueListUtil.h:507-540: a BlueList of IRoot pointers copies every item
  // through the copier, whatever interface types it (TriCurveSet.bindings is
  // ITr2ValueBinding, which nothing registers).
  class CopierInterfaceHost
  {
    bindings = [];
  }
  CjsSchema.define(CopierInterfaceHost, { className: "CopierInterfaceHost", fields: {
    bindings: [ CjsSchema.meta.type.list("ICopierUnregisteredBinding"), CjsSchema.meta.blue.persist ]
  } });

  const leaf = new CopierLeaf();
  leaf.value = 5;
  const host = new CopierInterfaceHost();
  host.bindings = [ leaf, leaf ];

  const copy = blue.classes.CopyTo(host);
  assert.equal(copy.bindings.length, 2);
  assert.equal(copy.bindings[0] instanceof CopierLeaf, true);
  assert.notEqual(copy.bindings[0], leaf);
  assert.equal(copy.bindings[0].value, 5);
  assert.equal(copy.bindings[1], copy.bindings[0], "a shared item stays shared");
});

test("canonical members copy backing keys and indexes without invoking live properties", () =>
{
  class CopierStoredSlots
  {
    _slots = [ 0, 0, 91 ];
    _label = "";
    changes = [];
    get label() { throw new Error("live getter must not run"); }
    set label(_value) { throw new Error("live setter must not run"); }
    OnModified(name) { this.changes.push(name); return true; }
  }
  CjsSchema.define(CopierStoredSlots, {
    className: "CopierStoredSlots",
    members: [
      { name: "first", key: "_slots", index: 0, type: { kind: "int32" }, edit: { persist: true } },
      { name: "second", key: "_slots", index: 1, type: { kind: "int32" }, edit: { persist: true } },
      { name: "label", key: "_label", type: { kind: "wstring" }, edit: { persist: true } }
    ],
    properties: [ { name: "label", key: "label", type: { kind: "wstring" }, edit: { persist: true, notify: true } } ]
  });
  CjsSchema.meta.blue.mapInterface(INotify)(CopierStoredSlots);
  const source = new CopierStoredSlots();
  source._slots = [ 12, 34, 999 ];
  source._label = "wide label";
  const dest = new CopierStoredSlots();
  const storage = dest._slots;

  assert.equal(blue.classes.CopyTo(source, dest), dest);
  assert.equal(dest._slots, storage);
  assert.deepEqual(dest._slots, [ 12, 34, 91 ], "only declared storage indexes are copied");
  assert.equal(dest._label, "wide label");
  assert.deepEqual(dest.changes, [ "first", "second", "label" ], "Copier.cpp:190 does not require NOTIFY");
  blue.classes.CopyTo(source, dest);
  assert.deepEqual(dest.changes, [ "first", "second", "label" ], "equal stored values are not notified twice");
});

test("same-name inherited members copy derived first without merging declarations", () =>
{
  class CopierStoredBase
  {
    baseValue = 0;
    changes = [];
    OnModified(name) { this.changes.push([ name, this.derivedValue, this.baseValue ]); return true; }
  }
  CjsSchema.define(CopierStoredBase, {
    className: "CopierStoredBase",
    members: [ { name: "value", key: "baseValue", type: { kind: "int32" }, edit: { persist: true } } ]
  });
  CjsSchema.meta.blue.mapInterface(INotify)(CopierStoredBase);
  class CopierStoredDerived extends CopierStoredBase { derivedValue = 0; }
  CjsSchema.define(CopierStoredDerived, {
    className: "CopierStoredDerived",
    members: [ { name: "value", key: "derivedValue", type: { kind: "int32" }, edit: { persist: true } } ]
  });
  const source = Object.assign(new CopierStoredDerived(), { derivedValue: 2, baseValue: 1 });
  const copy = blue.classes.CopyTo(source);
  assert.deepEqual(copy.changes, [ [ "value", 2, 0 ], [ "value", 2, 1 ] ], "Copier.cpp:151-169 walks each native member table");
});

test("declared storage rejects accessors on either side and at an indexed element", () =>
{
  class CopierStorageGuard { backing = [ 0 ]; }
  CjsSchema.define(CopierStorageGuard, {
    className: "CopierStorageGuard",
    members: [ { name: "value", key: "backing", index: 0, type: { kind: "int32" }, edit: { persist: true } } ]
  });
  for (const side of [ "source", "dest" ])
  {
    for (const indexed of [ false, true ])
    {
      const source = new CopierStorageGuard();
      const dest = new CopierStorageGuard();
      const selected = side === "source" ? source : dest;
      let called = false;
      Object.defineProperty(indexed ? selected.backing : selected, indexed ? 0 : "backing", {
        get() { called = true; throw new Error("getter executed"); },
        set() { called = true; throw new Error("setter executed"); }
      });
      assert.throws(() => blue.classes.CopyTo(source, dest), /Copier storage .* is an accessor/);
      assert.equal(called, false);
    }
  }
  const source = new CopierStorageGuard();
  const dest = new CopierStorageGuard();
  dest.backing = [];
  assert.throws(() => blue.classes.CopyTo(source, dest), /exceeds its indexed storage length/);
  dest.backing = null;
  assert.throws(() => blue.classes.CopyTo(source, dest), /requires existing indexed storage/);
});

test("unmapped lifecycle and custom-assignment methods are ignored", () =>
{
  class CopierUnmapped
  {
    value = 0;
    Initialize() { throw new Error("unmapped Initialize"); }
    OnModified() { throw new Error("unmapped OnModified"); }
    AssignTo() { throw new Error("unmapped AssignTo"); }
  }
  CjsSchema.define(CopierUnmapped, { className: "CopierUnmapped", fields: { value: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist ] } });
  assert.equal(blue.classes.CopyTo(Object.assign(new CopierUnmapped(), { value: 7 })).value, 7);
});

test("mapped but missing lifecycle and custom-assignment methods fail visibly", () =>
{
  for (const [ Interface, name ] of [ [ INotify, "Notify" ], [ IInitialize, "Initialize" ], [ ICopierCustomAssignment, "Assignment" ] ])
  {
    class CopierMissingMethod { value = 0; }
    CjsSchema.define(CopierMissingMethod, { className: `CopierMissing${name}`, fields: { value: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist ] } });
    CjsSchema.meta.blue.mapInterface(Interface)(CopierMissingMethod);
    const source = Object.assign(new CopierMissingMethod(), { value: 1 });
    assert.throws(() => blue.classes.CopyTo(source), TypeError, name);
  }
});

test("false notification aborts after its member and before custom assignment", () =>
{
  const calls = [];
  class CopierRejectNotification
  {
    first = 0;
    second = 0;
    OnModified(name) { calls.push(name); return false; }
    AssignTo() { calls.push("assignment"); return true; }
  }
  CjsSchema.define(CopierRejectNotification, { className: "CopierRejectNotification", fields: {
    first: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist ], second: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist ]
  } });
  CjsSchema.meta.blue.mapInterface(INotify, ICopierCustomAssignment)(CopierRejectNotification);
  const source = Object.assign(new CopierRejectNotification(), { first: 1, second: 2 });
  const dest = new CopierRejectNotification();
  assert.equal(blue.classes.CopyTo(source, dest, null, () => calls.push("post")), null);
  assert.equal(dest.first, 1);
  assert.equal(dest.second, 0);
  assert.deepEqual(calls, [ "first" ], "Copier.cpp:190 aborts immediately on false");
});

test("custom assignment precedes mapped initialization, which suppresses notifications", () =>
{
  const calls = [];
  class CopierOrderedLifecycle
  {
    value = 0;
    hidden = "";
    allowAssignment = true;
    allowInitialize = true;
    OnModified() { throw new Error("IInitialize suppresses INotify"); }
    AssignTo(dest)
    {
      calls.push([ "assignment", dest.value ]);
      dest.hidden = this.hidden;
      return this.allowAssignment;
    }
    Initialize()
    {
      calls.push([ "initialize", this.value, this.hidden ]);
      return this.allowInitialize;
    }
  }
  CjsSchema.define(CopierOrderedLifecycle, { className: "CopierOrderedLifecycle", fields: { value: [ CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist ] } });
  CjsSchema.meta.blue.mapInterface(IInitialize, INotify, ICopierCustomAssignment)(CopierOrderedLifecycle);
  const source = Object.assign(new CopierOrderedLifecycle(), { value: 4, hidden: "custom" });
  const dest = new CopierOrderedLifecycle();
  assert.equal(blue.classes.CopyTo(source, dest, null, () => calls.push([ "post" ])), dest);
  assert.deepEqual(calls, [ [ "assignment", 4 ], [ "initialize", 4, "custom" ], [ "post" ] ]);

  calls.length = 0;
  source.allowAssignment = false;
  assert.equal(blue.classes.CopyTo(source, new CopierOrderedLifecycle()), null);
  assert.deepEqual(calls, [ [ "assignment", 4 ] ]);

  calls.length = 0;
  source.allowAssignment = true;
  const rejecting = Object.assign(new CopierOrderedLifecycle(), { allowInitialize: false });
  assert.equal(blue.classes.CopyTo(source, rejecting, null, () => calls.push([ "post" ])), null);
  assert.deepEqual(calls, [ [ "assignment", 4 ], [ "initialize", 4, "custom" ] ]);
  assert.equal(rejecting.value, 4, "initialization failure retains completed member writes");
});

test("mapped interface identity survives inherited mappings and other constructor identities", () =>
{
  class AnotherInitializeContract {}
  Object.defineProperty(AnotherInitializeContract, CJS_CLASS_NAME, { value: "IInitialize" });
  class CopierMappedBase
  {
    initialized = 0;
    Initialize() { this.initialized++; return true; }
  }
  CjsSchema.meta.blue.mapInterface(AnotherInitializeContract)(CopierMappedBase);
  CjsSchema.define(CopierMappedBase, { className: "CopierMappedBase", fields: {} });
  class CopierMappedDerived extends CopierMappedBase {}
  CjsSchema.define(CopierMappedDerived, { className: "CopierMappedDerived", fields: {} });
  assert.notEqual(AnotherInitializeContract, IInitialize);
  assert.equal(blue.classes.CopyTo(new CopierMappedDerived()).initialized, 1);
});

test("cycles reuse allocated copies but existing destinations are not added to the identity map", () =>
{
  class CopierCycle { next = null; }
  CjsSchema.define(CopierCycle, { className: "CopierCycle", fields: { next: [ CjsSchema.meta.type.objectRef("CopierCycle"), CjsSchema.meta.blue.persist ] } });
  const source = new CopierCycle();
  source.next = source;
  const posted = [];
  const copy = blue.classes.CopyTo(source, null, null, (_source, dest) => posted.push(dest));
  assert.equal(copy.next, copy);
  assert.deepEqual(posted, [ copy ], "an identity-map hit does not repeat post-copy");

  const existing = new CopierCycle();
  blue.classes.CopyTo(source, existing);
  assert.notEqual(existing.next, existing, "Copier.cpp:64-94 maps only newly allocated destinations");
  assert.equal(existing.next.next, existing.next);
});

test("embedded members keep destination objects while pointer members allocate", () =>
{
  class CopierEmbeddedAndPointer
  {
    embedded = new CopierLeaf();
    pointer = null;
  }
  CjsSchema.define(CopierEmbeddedAndPointer, { className: "CopierEmbeddedAndPointer", fields: {
    embedded: [ CjsSchema.meta.type.struct("CopierLeaf"), CjsSchema.meta.blue.persist ],
    pointer: [ CjsSchema.meta.type.objectRef("CopierLeaf"), CjsSchema.meta.blue.persist ]
  } });
  const source = new CopierEmbeddedAndPointer();
  source.embedded.value = 42;
  source.pointer = source.embedded;
  const dest = new CopierEmbeddedAndPointer();
  const embedded = dest.embedded;
  assert.equal(blue.classes.CopyTo(source, dest), dest);
  assert.equal(dest.embedded, embedded);
  assert.equal(dest.embedded.value, 42);
  assert.notEqual(dest.pointer, source.pointer);
  assert.notEqual(dest.pointer, embedded, "an embedded existing target was never put in the identity map");
  assert.equal(dest.pointer.value, 42);
});

test("list child failure aborts with its copied prefix while map child failure is skipped", () =>
{
  const rejected = Leaf(2);
  const override = source => source === rejected
    ? { result: OverrideResult.FAILURE }
    : { result: OverrideResult.FALLBACK };
  const listSource = new CopierNode();
  listSource.items = [ Leaf(1), rejected, Leaf(3) ];
  const listDest = new CopierNode();
  assert.equal(blue.classes.CopyTo(listSource, listDest, override), null);
  assert.deepEqual(listDest.items.map(item => item.value), [ 1 ]);
  assert.deepEqual(listDest.modified, [], "failed list assignment does not notify the enclosing member");

  const mapSource = new CopierNode();
  mapSource.byName = new Map([ [ "first", Leaf(1) ], [ "rejected", rejected ], [ "last", Leaf(3) ] ]);
  const mapDest = new CopierNode();
  assert.equal(blue.classes.CopyTo(mapSource, mapDest, override), mapDest);
  assert.deepEqual(Array.from(mapDest.byName, ([ key, value ]) => [ key, value.value ]), [ [ "first", 1 ], [ "last", 3 ] ]);
  assert.deepEqual(mapDest.modified, [ "byName" ]);
});

test("weak-reference members retain their referents rather than cloning them", () =>
{
  class CopierWeakReference { owner = null; }
  CjsSchema.define(CopierWeakReference, { className: "CopierWeakReference", fields: {
    owner: [ CjsSchema.meta.type.weakRef("CopierLeaf"), CjsSchema.meta.blue.persist ]
  } });
  const source = new CopierWeakReference();
  source.owner = Leaf(11);
  const copy = blue.classes.CopyTo(source);
  assert.equal(copy.owner, source.owner, "BlueVariable.cpp:869-875 assigns the existing referent");
});
