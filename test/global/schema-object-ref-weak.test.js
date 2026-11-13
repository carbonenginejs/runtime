import assert from "node:assert/strict";
import test from "node:test";

import { blue } from "../../src/blue/index.js";
import { CjsBlueGraph } from "../../src/blue/formats/graph/index.js";
import { DictReader } from "../../src/blue/formats/graph/DictReader.js";
import { DictWriter } from "../../src/blue/formats/graph/DictWriter.js";
import { YamlWriter } from "../../src/blue/formats/yaml/YamlWriter.js";
import { CjsSchema, type } from "../../src/blue/schema/index.js";
import { getCarbonTypeDefinition } from "../../src/blue/schema/types/carbonTypes.js";
import { CjsGraph } from "../../src/global/model/graph/index.js";
import { exposure as be } from "#be";

// `type.object.ref.weak` is IROOTPTR in every way but one fact: the member does not own its target.
// Each test runs the same operation over `ref` and `ref.weak` and requires the same answer.

class RefWeakLeaf
{
  value = 0;
}
CjsSchema.be.define(RefWeakLeaf, { name: "RefWeakLeaf", fields: {
  value: [ type.int32, be.mapAttribute(be.PERSIST) ]
} });

class OwnedHolder
{
  target = null;
}
CjsSchema.be.define(OwnedHolder, { name: "RefWeakOwnedHolder", fields: {
  target: [ type.object.ref("RefWeakLeaf"), be.mapAttribute(be.PERSIST) ]
} });

class UnownedHolder
{
  target = null;
}
CjsSchema.be.define(UnownedHolder, { name: "RefWeakUnownedHolder", fields: {
  target: [ type.object.ref.weak("RefWeakLeaf"), be.mapAttribute(be.PERSIST) ]
} });

/** The same graph under each holder class. */
function holders(value = 7)
{
  return [ OwnedHolder, UnownedHolder ].map(Holder =>
  {
    const holder = new Holder();
    holder.target = Object.assign(new RefWeakLeaf(), { value });
    return holder;
  });
}

const field = Holder => CjsSchema.getSchema(Holder).members.find(member => member.name === "target");
const unnamed = values => ({ ...values, _type: "holder" });

test("ref.weak is the rootRef kind, with one more fact", () =>
{
  assert.deepEqual(field(OwnedHolder).type, { kind: "rootRef", className: "RefWeakLeaf" });
  assert.deepEqual(field(UnownedHolder).type, { kind: "rootRef", className: "RefWeakLeaf", owned: false });
  assert.deepEqual(getCarbonTypeDefinition(field(UnownedHolder).type), getCarbonTypeDefinition(field(OwnedHolder).type));
});

test("object.weak stays Carbon's weak reference", () =>
{
  class Weak { target = null; }
  CjsSchema.define(Weak, { name: "RefWeakRealWeak", fields: { target: type.object.weak("RefWeakLeaf") } });

  assert.deepEqual(field(Weak).type, { kind: "rootWeak", className: "RefWeakLeaf" });
});

test("a subclass that redeclares the member replaces the ownership fact", () =>
{
  class Redeclared extends UnownedHolder {}
  CjsSchema.be.define(Redeclared, { name: "RefWeakRedeclared", fields: {
    target: [ type.object.ref("RefWeakLeaf"), be.mapAttribute(be.PERSIST) ]
  } });

  const merged = CjsSchema.getSchema(Redeclared).fields.find(member => member.name === "target");
  assert.equal(Object.hasOwn(merged.type, "owned"), false);
});

test("values, reading and YAML writing match ref", () =>
{
  const [ owned, unowned ] = holders();

  assert.deepEqual(unnamed(new DictWriter().WriteObject(unowned, {}, {})), unnamed(new DictWriter().WriteObject(owned, {}, {})));
  assert.deepEqual(
    unnamed(CjsSchema.getValuesFromSchema(unowned, {}, {})),
    unnamed(CjsSchema.getValuesFromSchema(owned, {}, {}))
  );
  assert.equal(
    new YamlWriter().WriteObjectToString(unowned).replace("RefWeakUnownedHolder", "holder"),
    new YamlWriter().WriteObjectToString(owned).replace("RefWeakOwnedHolder", "holder")
  );

  const source = { target: { _type: "RefWeakLeaf", value: 9 } };
  const [ ownedInto, unownedInto ] = [ new OwnedHolder(), new UnownedHolder() ];
  new DictReader().ReadInto(ownedInto, source);
  new DictReader().ReadInto(unownedInto, source);

  assert.ok(unownedInto.target instanceof RefWeakLeaf);
  assert.equal(unownedInto.target.value, ownedInto.target.value);
});

test("copying makes a new target, as ref does", () =>
{
  for (const holder of holders())
  {
    const copy = new holder.constructor();
    assert.ok(blue.classes.CopyTo(holder, copy));
    assert.notEqual(copy.target, holder.target);
    assert.equal(copy.target.value, 7);
  }
});

test("Find reaches the target, as ref does", () =>
{
  for (const holder of holders())
  {
    assert.deepEqual(blue.classes.Find(holder, "test.RefWeakLeaf"), [ holder.target ]);
  }
});

test("the graph holds the member on its own edge, which only a walk that asks for it follows", () =>
{
  CjsBlueGraph.define(RefWeakLeaf, "RefWeakLeaf");
  CjsBlueGraph.define(OwnedHolder, "RefWeakOwnedHolder");
  CjsBlueGraph.define(UnownedHolder, "RefWeakUnownedHolder");

  const member = Holder => CjsGraph.getClassInfo(Holder).compiled.byName.target[0];
  assert.equal(member(OwnedHolder).edgeKind, "ref");
  assert.equal(member(UnownedHolder).edgeKind, "refWeak");
  assert.equal(member(UnownedHolder).handler, member(OwnedHolder).handler);
  assert.deepEqual(member(UnownedHolder).edgeType, member(OwnedHolder).edgeType);

  const matchClass = info => info.ctor === RefWeakLeaf;
  const reachable = [ "embed", "ref", "refWeak" ];
  const owned = CjsGraph.compileSelection({ matchClass });
  const all = CjsGraph.compileSelection({ matchClass, edges: reachable });
  const walk = (root, options) =>
  {
    const visited = [];
    CjsGraph.traverse(root, object => { visited.push(object); }, options);
    return visited;
  };

  const [ ownedHolder, unownedHolder ] = holders();

  // An ownership walk, Destruct's: the default.
  assert.deepEqual(walk(ownedHolder), [ ownedHolder, ownedHolder.target ]);
  assert.deepEqual(walk(unownedHolder), [ unownedHolder ]);
  assert.deepEqual(CjsGraph.select(unownedHolder, owned, []), []);

  // A walk over everything reachable, Find's and a resource walk's, names the edge.
  assert.deepEqual(walk(unownedHolder, { edges: reachable }), [ unownedHolder, unownedHolder.target ]);
  assert.deepEqual(CjsGraph.select(unownedHolder, all, []), [ unownedHolder.target ]);
});
