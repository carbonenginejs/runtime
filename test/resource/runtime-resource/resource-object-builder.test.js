import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../../src/global/schema/index.js";
import {
  CjsLoadingObject,
  CjsResMan,
  CjsResource
} from "../../../src/resource/index.js";
import { LoadData } from "../../support/loadData.js";

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
    resMan.LoadObject(path),
    resMan.LoadObject(path),
    resMan.LoadObject(path)
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
    await resMan.LoadObject("res:/data/semantic.graph", { requirement: "semantic" }),
    semantic
  );

  // Identify returning true publishes the decoded values themselves: data, not
  // an object, so it is read through the resource - one shared payload
  // (resource semantics) - and GetObject refuses it (tested below).
  resMan.RegisterExtension("plain", CjsLoadingObject, {
    Format: TestGraphFormat,
    Identify() { return true; }
  });
  const plainA = await LoadData(resMan, "res:/data/value.plain");
  const plainB = await LoadData(resMan, "res:/data/value.plain");
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
  const third = await resMan.LoadObject(path);
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

test("GetObject refuses a load that yields plain data, and names GetResource", async () =>
{
  const refused = /yields plain data, not an object; read it with GetResource/u;
  const resMan = new CjsResMan({ source: { Read() { return new Uint8Array([ 1 ]); } } });
  // A format-only route (no Target or Identify).
  resMan.RegisterExtension("fmt", CjsLoadingObject, { Format: TestGraphFormat });
  // Identify answering true (plain values) - refused once the load says so.
  resMan.RegisterExtension("idtrue", CjsLoadingObject, { Format: TestGraphFormat, Identify() { return true; } });
  // A bare loader returning data.
  resMan.RegisterObjectLoader("json", () => ({ plain: true }));

  assert.throws(() => resMan.LoadObject("res:/data/a.fmt"), refused);
  assert.throws(() => resMan.LoadObject("res:/data/a.json"), refused);
  await assert.rejects(resMan.LoadObject("res:/data/a.idtrue"), refused);
  // The data is the resource's payload.
  assert.deepEqual((await LoadData(resMan, "res:/data/a.fmt")).list, [ 1, 2 ]);
  assert.deepEqual(await LoadData(resMan, "res:/data/a.json"), { plain: true });
  // Fetch answers what a path is: plain data comes back as its resource.
  const fetched = await resMan.Fetch("res:/data/b.json");
  assert.deepEqual(fetched.GetPayload(), { plain: true });

  // Negative controls: a Target route and a RESOURCE-mode type are answered.
  const { resMan: routed } = graphManager();
  assert.equal(CjsSchema.cast(await routed.LoadObject("res:/data/a.graph"), TestGraph) !== null, true);
  class TestSemanticResource extends CjsResource {}
  routed.RegisterResourceType("semantic", TestSemanticResource);
  const semantic = await routed.LoadObject("res:/data/s.graph", { requirement: "semantic" });
  assert.equal(CjsSchema.cast(semantic, TestSemanticResource), semantic);
});

// Builds from a registered object builder are MAIN-queue tasks: FIFO, each
// whole, drained within the pump's time budget (Carbon's one-build-at-a-time
// BlackReader wait, BlackReader.cpp:233-262; ccpwgl findings 0277-0279).
test("object builds drain FIFO within the prepare budget, never split, re-entrant last", async () =>
{
  let clock = 0;
  let built = 0;
  const resMan = new CjsResMan({ source: { Read() { return new Uint8Array([ 1 ]); } } });
  resMan.RegisterObjectBuilder("obj", () => ({
    CreateObject()
    {
      clock += 6;
      return { sequence: built++ };
    }
  }));
  const path = "res:/data/budget.obj";
  await resMan.LoadObject(path);
  resMan.autoPumpMainThreadQueue = false;

  const order = [];
  const requests = [];
  for (let i = 0; i < 20; i++)
  {
    requests.push(resMan.LoadObject(path).then(object =>
    {
      order.push(i);
      // Re-entrant: asked while draining, so it queues behind every earlier one.
      if (i === 0) requests.push(resMan.LoadObject(path).then(() => order.push("reentrant")));
      return object;
    }));
  }
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
  // Negative control: nothing builds until the queue is pumped.
  assert.equal(built, 1);

  const perPump = [];
  for (let pumps = 0; pumps < 50 && order.length < 21; pumps++)
  {
    const before = built;
    resMan.PumpMainThreadQueue({ maxTime: 0.010, maxItems: 0, now: () => clock });
    perPump.push(built - before);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  await Promise.all(requests);

  assert.deepEqual(order.slice(0, 20), [ ...Array(20).keys() ]);
  assert.equal(order[20], "reentrant");
  // 6 ms builds under a 10 ms budget: at most two per pump, at least one.
  assert.ok(perPump.every(count => count >= 0 && count <= 2), JSON.stringify(perPump));
  assert.ok(perPump.filter(count => count > 0).length >= 10, JSON.stringify(perPump));
});
