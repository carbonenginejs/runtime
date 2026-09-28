import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../../src/global/schema/index.js";
import {
  CjsLoadingObject,
  CjsResMan,
  CjsResource
} from "../../../src/resource/index.js";

// Carbon's LoadObject caches a builder and creates a new object per call
// (BlueResMan.cpp:653-795). These pin that for routes that hydrate a Target.

class TestGraphFormat
{
  static read()
  {
    return {
      list: [ 1, 2 ],
      typed: new Float32Array([ 1, 2 ]),
      carrier: { _sourceClassName: "Carrier", value: 1 }
    };
  }
}

// Deliberately aliasing: Object.assign keeps every nested reference, so any
// independence the tests observe comes from the manager, not from the target.
class TestGraph
{
  constructor(values) { Object.assign(this, values); }
  static from(values) { return new TestGraph(values); }
}

function graphManager()
{
  const counter = { reads: 0 };
  const resMan = new CjsResMan({
    source: { Read() { counter.reads += 1; return new Uint8Array([ counter.reads ]); } }
  });
  resMan.RegisterExtension("graph", CjsLoadingObject, {
    Format: TestGraphFormat,
    Target: TestGraph
  });
  return { resMan, counter };
}

test("each caller receives its own object built from one decode", async () =>
{
  const { resMan, counter } = graphManager();
  const path = "res:/data/one.graph";

  const first = await resMan.Fetch(path);
  const second = await resMan.Fetch(path);
  const third = await resMan.LoadObject(path);

  assert.equal(CjsSchema.cast(first, TestGraph), first);
  assert.notEqual(first, second);
  assert.notEqual(second, third);
  assert.deepEqual({ ...first }, { ...second });
  // Nothing re-read: the retained values are the builder.
  assert.equal(counter.reads, 1);

  // Independent all the way down, although TestGraph.from aliases its input.
  assert.notEqual(first.list, second.list);
  assert.notEqual(first.typed, second.typed);
  assert.notEqual(first.carrier, second.carrier);
  first.list.push(3);
  first.typed[0] = 99;
  first.carrier.value = 2;
  assert.deepEqual(second.list, [ 1, 2 ]);
  assert.equal(second.typed[0], 1);
  assert.equal(second.carrier.value, 1);

  // A later build is not affected by an earlier caller's mutation either.
  const fourth = await resMan.Fetch(path);
  assert.deepEqual(fourth.list, [ 1, 2 ]);
  assert.equal(fourth.typed[0], 1);
});

test("concurrent callers joining one load each receive their own object", async () =>
{
  const { resMan, counter } = graphManager();
  const path = "res:/data/concurrent.graph";
  const [ a, b, c ] = await Promise.all([
    resMan.GetObject(path),
    resMan.GetObject(path),
    resMan.GetObject(path)
  ]);
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.notEqual(a, c);
  assert.equal(counter.reads, 1);
});

test("different paths never share an object (negative control)", async () =>
{
  const { resMan } = graphManager();
  const a = await resMan.Fetch("res:/data/a.graph");
  const b = await resMan.Fetch("res:/data/b.graph");
  assert.notEqual(a, b);
});

test("the retained payload is the decoded values, and a released payload rebuilds from source", async () =>
{
  const { resMan, counter } = graphManager();
  const path = "res:/data/lease.graph";
  await resMan.Fetch(path);
  const handle = resMan.GetResource(path);
  assert.equal(CjsSchema.cast(handle.GetPayload(), TestGraph), null);
  assert.deepEqual(handle.GetPayload().list, [ 1, 2 ]);

  handle.ReleasePayload();
  const rebuilt = await resMan.Fetch(path);
  assert.equal(CjsSchema.cast(rebuilt, TestGraph), rebuilt);
  assert.equal(counter.reads, 2);
});

test("RESOURCE-mode routes and routes without a Target keep their shared outcome", async () =>
{
  class TestSemanticResource extends CjsResource {}
  const { resMan } = graphManager();
  resMan.RegisterResourceType("semantic", TestSemanticResource);

  const semantic = await resMan.Fetch("res:/data/semantic.graph", { requirement: "semantic" });
  assert.equal(CjsSchema.cast(semantic, TestSemanticResource), semantic);
  assert.equal(CjsSchema.cast(semantic.GetPayload(), TestGraph), semantic.GetPayload());
  assert.equal(
    await resMan.GetObject("res:/data/semantic.graph", { requirement: "semantic" }),
    semantic
  );

  // Identify returning true publishes the decoded values themselves: data under
  // the shared read-only payload rule, with no Carbon LoadObject counterpart.
  resMan.RegisterExtension("plain", CjsLoadingObject, {
    Format: TestGraphFormat,
    Identify() { return true; }
  });
  const plainA = await resMan.Fetch("res:/data/value.plain");
  const plainB = await resMan.Fetch("res:/data/value.plain");
  assert.equal(plainA, plainB);
});

test("values that cannot be copied fail the load by name", async () =>
{
  class TestFunctionFormat
  {
    static read() { return { callback() {} }; }
  }
  const resMan = new CjsResMan({ source: { Read() { return new Uint8Array([ 1 ]); } } });
  resMan.RegisterExtension("fn", CjsLoadingObject, {
    Format: TestFunctionFormat,
    Target: TestGraph
  });
  await assert.rejects(
    resMan.Fetch("res:/data/value.fn"),
    error => error.code === "CJS_RESOURCE_EXTENSION_TARGET_FAILED"
      && error.cause?.name === "DataCloneError"
  );
});

// A registered object builder (RegisterObjectBuilder): the parsed file is the
// builder, kept as the payload, and every GetObject asks it for a new object -
// Carbon's BlackReader kept per file (BlueResMan.cpp:722-773,
// BlackReader.cpp:198-208).
function builderManager()
{
  const counter = { reads: 0, builders: 0, objects: 0 };
  const resMan = new CjsResMan({
    source: { Read() { counter.reads += 1; return new Uint8Array([ counter.reads ]); } }
  });
  resMan.RegisterObjectBuilder("obj", bytes =>
  {
    counter.builders += 1;
    const read = bytes[0];
    return {
      CreateObject(objectMarker)
      {
        assert.equal(objectMarker, 0);
        counter.objects += 1;
        const shared = { read };
        return { read, list: [ 1, 2 ], a: shared, b: shared };
      }
    };
  });
  return { resMan, counter };
}

test("an object builder is parsed once and builds a new object for every caller", async () =>
{
  const { resMan, counter } = builderManager();
  const path = "res:/data/one.obj";
  const first = await resMan.LoadObject(path);
  const second = await resMan.LoadObject(path);
  const third = await resMan.GetObject(path);
  assert.notEqual(first, second);
  assert.notEqual(second, third);
  assert.deepEqual(first, second);
  // Sharing inside one graph is the builder's, and survives.
  assert.equal(first.a, first.b);
  assert.notEqual(first.a, second.a);
  assert.equal(counter.reads, 1);
  assert.equal(counter.builders, 1);
  assert.equal(counter.objects, 3);
  // The payload is the builder, never an object a caller holds (the manager's
  // own handle: GetResource refuses an object file).
  const payload = resMan._GetResource(path).GetPayload();
  assert.equal(typeof payload.CreateObject, "function");
  assert.notEqual(payload, first);
});

test("callers joining one builder load each receive their own object", async () =>
{
  const { resMan, counter } = builderManager();
  const [ a, b, c ] = await Promise.all([
    resMan.LoadObject("res:/data/join.obj"),
    resMan.LoadObject("res:/data/join.obj"),
    resMan.LoadObject("res:/data/join.obj")
  ]);
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.equal(counter.reads, 1);
  assert.equal(counter.builders, 1);
});

test("a released builder payload is read and parsed again on the next load", async () =>
{
  const { resMan, counter } = builderManager();
  const path = "res:/data/lease.obj";
  await resMan.LoadObject(path);
  resMan._GetResource(path).ReleasePayload();
  const rebuilt = await resMan.LoadObject(path);
  assert.equal(rebuilt.read, 2);
  assert.equal(counter.reads, 2);
  assert.equal(counter.builders, 2);
});

test("GetResource refuses an object file; a routed or plain extension still answers", () =>
{
  const { resMan } = builderManager();
  assert.throws(() => resMan.GetResource("res:/data/refused.obj"), /is an object file; load it with LoadObject/u);
  assert.throws(() => resMan.GetResource("RES:/Data/Refused.OBJ"), /is an object file/u);
  // Negative control: a Target route and an unregistered extension are resources.
  const { resMan: routed } = graphManager();
  assert.equal(typeof routed.GetResource("res:/data/a.graph").GetPath, "function");
  assert.equal(typeof resMan.GetResource("res:/data/plain.bin").GetPath, "function");
});
