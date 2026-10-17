import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { be } from "../../src/global/blue/index.js";

class Node
{
  constructor(name) { this.name = name; }
}
CjsSchema.define(Node, {
  className: "BlueFindNode",
  members: [
    { name: "child", key: "child", type: { kind: "rootRef", className: Node } },
    { name: "items", key: "items", type: { kind: "list", itemType: "BlueFindNode" } },
    { name: "byName", key: "byName", type: { kind: "map", valueType: Node } }
  ]
});

function graph()
{
  const root = new Node("root"), a = new Node("a"), b = new Node("b"), c = new Node("c");
  root.child = a;
  root.items = [ b ];
  root.byName = new Map([[ "key", c ]]);
  a.child = c;
  return { root, a, b, c };
}

test("FindRoute returns every route as [parent, type, key] steps (Find.cpp:436-463)", () =>
{
  const { root, a, c } = graph();
  const routes = be.FindRoute(root, c);
  // Carbon marks each object seen, so c is reached once per distinct parent path
  // the stack walk opens before c is visited.
  assert.ok(routes.length >= 1);
  for (const route of routes)
  {
    let at = root;
    for (const [ parent, type, key ] of route)
    {
      assert.ok(type === 0 || type === 1);
      if (type === 0) { assert.equal(parent, at); at = parent[key]; }
      else at = parent instanceof Map ? parent.get(key) : parent[key];
    }
    assert.equal(at, c, "every route replays to the destination");
  }
  assert.deepEqual(routes.find(route => route[0][2] === "child"), [[ root, 0, "child" ], [ a, 0, "child" ]]);
  assert.deepEqual(routes.find(route => route[0][2] === "byName"), [[ root, 0, "byName" ], [ root.byName, 1, "key" ]]);
  assert.deepEqual(be.FindRoute(root, root), [[]]);
  assert.throws(() => be.FindRoute(null, c), /neither from nor to/);
});

test("a collection step is Carbon's two steps: the member, then the index", () =>
{
  const { root, b } = graph();
  assert.deepEqual(be.FindFirstRoute(root, b), [[ root, 0, "items" ], [ root.items, 1, 0 ]]);
});

test("FindFirstRoute returns one route, [] for itself, and throws without one (Find.cpp:466-504)", () =>
{
  const { root, a, c } = graph();
  const route = be.FindFirstRoute(root, c);
  assert.ok(route.length >= 1);
  assert.deepEqual(be.FindFirstRoute(root, root), []);
  assert.throws(() => be.FindFirstRoute(a, root), /No valid route found/);
  assert.throws(() => be.FindFirstRoute(null, root), TypeError);
});

test("FindAllReferences maps each reached object to the references reaching it (Find.cpp:551-599)", () =>
{
  const { root, a, b, c } = graph();
  const references = be.FindAllReferences(root);
  assert.deepEqual(references.get(a), [[ root, 0, "child" ]]);
  assert.deepEqual(references.get(b), [[ root.items, 1, 0 ]]);
  assert.deepEqual(references.get(c).map(([ parent, type, key ]) => [ parent === a || parent === root.byName, type, key ]).sort(),
    [[ true, 0, "child" ], [ true, 1, "key" ]].sort());
  assert.equal(references.has(root), false, "the root is not referenced within its own tree");
  assert.equal(be.FindAllReferences(null).size, 0);
});

test("FindReference answers reachability (Find.cpp:507-548)", () =>
{
  const { root, a, c } = graph();
  assert.equal(be.FindReference(root, c), true);
  assert.equal(be.FindReference(a, root), false);
  assert.equal(be.FindReference(root, root), true);
  assert.equal(be.FindReference(null, root), false);
});

test("FindInterface tests only the object's own interface table, as Carbon's IsMatch does (Find.cpp:159-173)", () =>
{
  class IMarker {}
  CjsSchema.define(IMarker, { className: "BlueFindIMarker" });
  class Marked extends Node {}
  CjsSchema.define(Marked, { className: "BlueFindMarked" });
  CjsSchema.blue.interface(IMarker)(Marked);
  class Chained extends Node {}
  CjsSchema.define(Chained, { className: "BlueFindChained" });
  CjsSchema.blue.chainTo(Marked)(Chained);

  const root = new Node("root");
  const marked = new Marked("marked");
  const chained = new Chained("chained");
  root.items = [ marked, chained ];

  // Through QueryInterface the chained class does expose IMarker...
  assert.equal(be.classes.QueryThisInterface(chained, IMarker, chained.constructor, 1), chained);
  // ...but Carbon's Find tests the concrete class's own table only.
  assert.deepEqual(be.FindInterface(root, "BlueFindIMarker"), [ marked ]);
  assert.deepEqual(be.FindInterface(root, "NoSuchInterface"), []);
  assert.deepEqual(be.FindInterface(null, "BlueFindIMarker"), []);
});
