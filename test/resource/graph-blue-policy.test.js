import assert from "node:assert/strict";
import { test } from "node:test";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { blue } from "../../npm/dist/blue/index.js";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { CjsBlueGraph } from "../../npm/dist/blue/formats/graph/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/index.js";
import { ImportAllDistModules } from "../support/allDistClasses.js";

await ImportAllDistModules();
CjsBlueGraph.register(blue.classes);

const create = name => new (blue.classes.Get(name))();
const quiet = { notify: false, markDirty: false, reuseObjects: true };

/** Records what an instance is told, without running its hooks. */
function spy(object)
{
  const told = [];
  object.OnModified = name => { told.push([ "OnModified", name ]); return true; };
  object.Initialize = () => { told.push([ "Initialize" ]); return true; };
  return told;
}

/** Runs one operation with a class's own hooks recorded for every instance it creates. */
function withPrototypeSpy(ctor, names, run)
{
  const told = [], saved = {};
  for (const name of names)
  {
    saved[name] = Object.getOwnPropertyDescriptor(ctor.prototype, name);
    ctor.prototype[name] = function(...args) { told.push([ name, this.name ?? null, ...args.slice(0, 1) ]); return true; };
  }

  try { run(); }
  finally
  {
    for (const name of names)
    {
      if (saved[name]) Object.defineProperty(ctor.prototype, name, saved[name]);
      else delete ctor.prototype[name];
    }
  }

  return told;
}

test("blue.classes Get and Create are thin wrappers over its real methods", () =>
{
  const name = "Tr2MeshArea";
  assert.equal(blue.classes.Get(name), blue.classes.GetClassRegistration(name).type);
  assert.equal(blue.classes.Create(name).constructor, blue.classes.Get(name));
  assert.equal(blue.classes.Get("NoSuchGraphClass"), null);
  assert.equal(blue.classes.Create("NoSuchGraphClass"), null);
});

test("_type names resolve through Blue's class library, and an unknown name is an error", () =>
{
  const area = CjsGraph.from(null, { _type: "Tr2MeshArea", name: "a" }, { skipEvents: true });
  assert.equal(area.constructor, blue.classes.Get("Tr2MeshArea"));
  assert.equal(area.name, "a");
  assert.throws(() => CjsGraph.from(null, { _type: "NoSuchGraphClass" }), /Unknown graph class/);
});

test("a member keeps the class it declares, though that class is defined after its holder", () =>
{
  const { exposure: be, type } = CjsSchema;

  class GraphPolicyHolder
  {
    held = null;
  }
  CjsSchema.decorateField(GraphPolicyHolder, "held", be.mapAttribute(be.READWRITE | be.PERSIST), type.object.ref("GraphPolicyLate"));
  // The define declares the class to the graph: nothing else does.
  be.define("GraphPolicyHolder")(GraphPolicyHolder);

  assert.deepEqual(CjsGraph._FindEntry(CjsGraph.getClassInfo(GraphPolicyHolder), "held").edgeType, [ "GraphPolicyLate" ]);

  // A class nothing defines is not answered by "any object": the member refuses what it is given.
  const holder = new GraphPolicyHolder();
  holder.held = create("Tr2MeshArea");
  assert.throws(() => CjsGraph.get(holder, { full: true }), /Unknown graph class: GraphPolicyLate/);

  class GraphPolicyLate
  {
    name = "";
  }
  CjsSchema.decorateField(GraphPolicyLate, "name", be.mapAttribute(be.READWRITE | be.PERSIST), type.string);
  be.define("GraphPolicyLate")(GraphPolicyLate);

  assert.throws(() => CjsGraph.get(holder, { full: true }), /not assignable to GraphPolicyLate/);
  holder.held = new GraphPolicyLate();
  holder.held.name = "late";
  assert.equal(CjsGraph.get(holder, { full: true }).held.name, "late");
});

test("a Map and a member of two classes keep what they declare, and set and diff ask the graph as get does", () =>
{
  const { exposure: be, type } = CjsSchema;

  class GraphPolicyBag
  {
    byName = new Map();
    either = null;
  }
  CjsSchema.decorateField(GraphPolicyBag, "byName", be.mapAttribute(be.READWRITE | be.PERSIST), type.map("GraphPolicyMapped"));
  CjsSchema.decorateField(GraphPolicyBag, "either", be.mapAttribute(be.READWRITE | be.PERSIST), type.object.ref([ "Tr2MeshArea", "GraphPolicyMapped" ]));
  be.define("GraphPolicyBag")(GraphPolicyBag);

  const info = CjsGraph.getClassInfo(GraphPolicyBag);
  assert.deepEqual(CjsGraph._FindEntry(info, "byName").edgeType, [ "GraphPolicyMapped" ]);
  assert.deepEqual(CjsGraph._FindEntry(info, "either").edgeType, [ "Tr2MeshArea", "GraphPolicyMapped" ]);

  // The first class a member accepts is defined, and an object of it is held without asking for the second.
  const bag = new GraphPolicyBag();
  bag.either = create("Tr2MeshArea");
  bag.either.name = "area";
  assert.equal(CjsGraph.get(bag, { full: true, typeTags: true }).either.name, "area");
  assert.deepEqual(CjsGraph.diff(bag, { either: { name: "other" } }), { either: { name: "other" } });

  // The Map's class is not defined yet: writing one names it. Asking what the write would change creates
  // nothing, so it answers.
  const mapped = { byName: { a: { name: "a" } } };
  assert.throws(() => CjsGraph.set(bag, mapped, { skipEvents: true }), /Unknown graph class: GraphPolicyMapped/);
  assert.deepEqual(CjsGraph.diff(bag, mapped), mapped);

  class GraphPolicyMapped
  {
    name = "";
  }
  CjsSchema.decorateField(GraphPolicyMapped, "name", be.mapAttribute(be.READWRITE | be.PERSIST), type.string);
  be.define("GraphPolicyMapped")(GraphPolicyMapped);

  CjsGraph.set(bag, mapped, { skipEvents: true });
  assert.equal(bag.byName.get("a").constructor, GraphPolicyMapped);
  assert.equal(bag.byName.get("a").name, "a");
  assert.equal(CjsGraph.diff(bag, mapped), false);

  // The second accepted class, by its tag.
  CjsGraph.set(bag, { either: { _type: "GraphPolicyMapped", name: "second" } }, { skipEvents: true });
  assert.equal(bag.either.constructor, GraphPolicyMapped);
  assert.equal(CjsGraph.get(bag, { full: true, typeTags: true }).either._type, "GraphPolicyMapped");
});

test("a mapped interface counts as assignable, and a legacy material sits in an effect member", () =>
{
  const area = create("Tr2MeshArea");
  area.effect = create("Tr2ShaderMaterial");
  assert.equal(CjsGraph.get(area, { full: true, persistOnly: true, typeTags: true }).effect._type, "Tr2ShaderMaterial");
});

test("a Map of objects reads and writes as a bag keyed by name", () =>
{
  const material = create("Tr2ShaderMaterial");
  const parameter = create("Tr2FloatParameter");
  parameter.name = "x";
  material.parameters.set("x", parameter);

  const values = CjsGraph.get(material, { full: true, persistOnly: true, typeTags: true });
  assert.deepEqual(values, CjsSchema.getValues(material, {}, { persistOnly: true, typeTags: true }));

  const built = CjsGraph.from(null, values, { skipEvents: true });
  assert.equal(built.parameters.get("x").constructor, parameter.constructor);
  assert.equal(CjsGraph.set(built, values, { skipEvents: true }), false);
  assert.deepEqual(CjsGraph.traverse(material, () => {}), 2);
});

test("flags on members pick what the values path picks", () =>
{
  const area = create("Tr2MeshArea");
  area.name = "a";
  assert.deepEqual(CjsGraph.get(area, { full: true, persistOnly: true }), CjsSchema.getValues(area, {}, { persistOnly: true }));
});

test("a member the class's own declaration dropped stays dropped, though a JS base declares it", () =>
{
  const light = create("EveSOFDataHullLightSetTexturedPointLight");
  const values = CjsGraph.get(light, { full: true, persistOnly: true });
  assert.deepEqual(values, CjsSchema.getValues(light, {}, { persistOnly: true }));
  assert.equal(Object.hasOwn(values, "lightColor"), false);
});

test("a live object is told OnModified once per changed NOTIFY member, in order", () =>
{
  const transition = create("Tr2StateMachineTransition");
  const told = spy(transition);

  // Told in member-table order, which is Carbon's macro order: name, then condition
  // (Tr2StateMachineTransition_Blue.cpp:18-19), whatever order the values come in.
  CjsGraph.set(transition, { condition: "1", name: "first" });
  assert.deepEqual(told, [ [ "OnModified", "name" ], [ "OnModified", "condition" ] ]);

  told.length = 0;
  assert.equal(CjsGraph.set(transition, { condition: "1", name: "first" }), false);
  assert.deepEqual(told, [], "an equal member is not told");

  CjsGraph.set(transition, { name: "second" });
  assert.deepEqual(told, [ [ "OnModified", "name" ] ], "one change, one call");
});

test("a live IInitialize object is told OnModified and never initialised", () =>
{
  const parameter = create("TriFloatArrayParameter");
  const told = spy(parameter);

  CjsGraph.set(parameter, { name: "x" });
  assert.deepEqual(told, [ [ "OnModified", "name" ] ]);
});

test("a created IInitialize object is initialised once and not told of its members", () =>
{
  const ctor = blue.classes.Get("Tr2FloatParameter");
  const told = withPrototypeSpy(ctor, [ "Initialize", "OnModified" ], () => CjsGraph.from(ctor, { name: "x" }));

  assert.deepEqual(told, [ [ "Initialize", "x" ] ]);
});

test("a class that only happens to have a method is not called: flags say what it maps", () =>
{
  const ctor = blue.classes.Get("Tr2StateMachineTransition");
  assert.equal(CjsGraph.getClassInfo(ctor).declared.initialize, false);
});

test("UpdateValues with a name tells the same OnModified as Set", () =>
{
  const transition = create("Tr2StateMachineTransition");
  const told = spy(transition);

  transition.name = "direct";
  CjsGraph.commitValues(transition, "name");
  assert.deepEqual(told, [ [ "OnModified", "name" ] ]);
});

test("skipEvents tells nothing and still writes lists", () =>
{
  const mesh = create("Tr2Mesh");
  const told = spy(mesh);
  const list = mesh.opaqueAreas;

  CjsGraph.set(mesh, { name: "x", opaqueAreas: [ { _type: "Tr2MeshArea", name: "a" } ] }, { skipEvents: true });
  assert.deepEqual(told, []);
  assert.equal(mesh.opaqueAreas, list);
  assert.equal(list.length, 1);
});

test("a mapped list sends the same events as DictReader, with the old items present at UNLOADSTART", () =>
{
  const run = write =>
  {
    const mesh = create("Tr2Mesh");
    const list = mesh.opaqueAreas;
    const first = create("Tr2MeshArea");
    first.name = "old";
    list.Append(first);

    const events = [];
    mesh.OnListModified = (event, key, key2, value, target) =>
    {
      events.push([ event & BLUELISTEVENT.BELIST_EVENTMASK, target.length ]);
      return true;
    };
    list.SetNotify(mesh);

    write(mesh);
    return { events, identity: mesh.opaqueAreas === list, names: Array.from(list, area => area.name) };
  };

  const values = { opaqueAreas: [ { _type: "Tr2MeshArea", name: "a" }, { _type: "Tr2MeshArea", name: "b" } ] };
  const graph = run(mesh => CjsGraph.set(mesh, values));
  const old = run(mesh => CjsSchema.setValues(mesh, values, quiet));

  assert.deepEqual(graph, old);
  assert.deepEqual(graph.events, [ [ BLUELISTEVENT.BELIST_UNLOADSTART, 1 ], [ BLUELISTEVENT.BELIST_LOADFINISHED, 2 ] ]);
  assert.equal(graph.identity, true);
  assert.deepEqual(graph.names, [ "a", "b" ]);
});

test("a fresh load still sends LOADFINISHED, which is how a mesh attaches its areas", () =>
{
  const Mesh = blue.classes.Get("Tr2Mesh");
  const events = [];
  const original = Mesh.prototype.OnListModified;

  Mesh.prototype.OnListModified = function(event, key, key2, value, list)
  {
    events.push(event & BLUELISTEVENT.BELIST_EVENTMASK);
    return original.call(this, event, key, key2, value, list);
  };

  try
  {
    const mesh = CjsGraph.from(Mesh, { opaqueAreas: [ { _type: "Tr2MeshArea", name: "a" } ] }, { initializeHeld: false });
    assert.deepEqual(events, [ BLUELISTEVENT.BELIST_LOADFINISHED ], "DictReader.cpp:472-475");
    assert.equal(mesh.opaqueAreas.length, 1);
  }
  finally { Mesh.prototype.OnListModified = original; }
});
