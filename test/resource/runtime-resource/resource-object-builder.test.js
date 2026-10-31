import { blue } from "../../../npm/dist/global/blue/index.js";
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import {
  CjsLoadingObject,
  CjsMotherLode,
  CjsBlueResMan,
  BlueAsyncRes,
  getMotherLodeKey
} from "../../../npm/dist/resource/index.js";
import { RegisterDataLoader } from "../../support/testDataRes.js";

// Carbon's LoadObject caches a builder and creates a new object per call
// (BlueResMan.cpp:653-795). These pin that for routes that hydrate a Target.

/** The loading object LoadObject keeps for a path, in its own cache (m_loadObjectCache). */
function objectLoad(resMan, path)
{
  return resMan.loadObjectCache.Lookup(getMotherLodeKey(path, ""));
}

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
  const resMan = new CjsBlueResMan({
    source: { Read() { counter.reads += 1; return new Uint8Array([ counter.reads ]); } }
  });
  blue.resMan = resMan;
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
  const handle = objectLoad(resMan, path);
  assert.equal(resMan.Lookup(path), null, "a resource lookup never finds a loading object");
  assert.equal(CjsSchema.cast(resMan.GetResourcePayload(handle), TestGraph), null);
  assert.deepEqual(resMan.GetResourcePayload(handle).list, [ 1, 2 ]);

  resMan.ReleaseResourcePayload(handle);
  const rebuilt = await resMan.Fetch(path);
  assert.equal(CjsSchema.cast(rebuilt, TestGraph), rebuilt);
  assert.equal(counter.reads, 2);
});

test("RESOURCE-mode routes keep their shared outcome", async () =>
{
  class TestSemanticResource extends BlueAsyncRes
  {
    value = null;
    async _DoLoad()
    {
      this.value = await blue.resMan.ReadResourceObjectPayload(this, this._dataStream.data);
      return BlueAsyncRes.LoadingResult.LR_SUCCESS;
    }
    _DoPrepare() { return this.value !== null; }
  }
  const { resMan } = graphManager();
  resMan.RegisterExtension("graphsemantic", TestSemanticResource, { Format: TestGraphFormat });

  const semantic = await resMan.Fetch("res:/data/semantic.graph", { ex: "semantic" });
  assert.equal(CjsSchema.cast(semantic, TestSemanticResource), semantic);
  assert.deepEqual(semantic.value.list, [1, 2]);
  assert.equal(resMan.GetResourcePayload(semantic), null);
  await assert.rejects(
    resMan.LoadObject("res:/data/semantic.graph", { ex: "semantic" }),
    /is a resource, not an object/u
  );
});

test("values that cannot be copied fail the load by name", async () =>
{
  class TestFunctionFormat
  {
    static read() { return { callback() {} }; }
  }
  const resMan = new CjsBlueResMan({ source: { Read() { return new Uint8Array([ 1 ]); } } });
  blue.resMan = resMan;
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
  const resMan = new CjsBlueResMan({
    source: { Read() { counter.reads += 1; return new Uint8Array([ counter.reads ]); } }
  });
  blue.resMan = resMan;
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
  const payload = resMan.GetResourcePayload(objectLoad(resMan, path));
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
  resMan.ReleaseResourcePayload(objectLoad(resMan, path));
  const rebuilt = await resMan.LoadObject(path);
  assert.equal(rebuilt.read, 2);
  assert.equal(counter.reads, 2);
  assert.equal(counter.builders, 2);
});

test("GetResource has no factory for an object file, as Carbon's (BlueResMan.cpp:266-273); a Res route still answers", async () =>
{
  const { resMan } = builderManager();
  assert.equal(resMan.GetResource("res:/data/refused.obj"), null);
  assert.equal(resMan.GetResource("RES:/Data/Refused.OBJ"), null);
  RegisterDataLoader(resMan, "bin", bytes => bytes);
  const handle = resMan.GetResource("res:/data/plain.bin");
  await resMan.Ready(handle);
  assert.equal(typeof handle.GetPath, "function");
});

test("LoadObject refuses a load that yields plain data, and names the plain read", async () =>
{
  const refused = /yields plain data, not an object; read it with ReadResource/u;
  const resMan = new CjsBlueResMan({ source: { Read() { return new Uint8Array([ 1 ]); } } });
  blue.resMan = resMan;
  // A format-only object route (no Target or Identify) is refused at registration.
  assert.throws(
    () => resMan.RegisterExtension("fmt", CjsLoadingObject, { Format: TestGraphFormat }),
    /an object handler needs a Target or Identify/u
  );
  resMan.RegisterFormat(class TestFmtFormat { static extensions = [ ".fmt" ]; static read() { return { list: [ 1, 2 ] }; } });
  // Identify answering true (plain values) - refused once the load says so.
  resMan.RegisterExtension("idtrue", CjsLoadingObject, { Format: TestGraphFormat, Identify() { return true; } });
  // A bare loader returning data.
  resMan.RegisterObjectLoader("json", () => ({ plain: true }));

  await assert.rejects(resMan.LoadObject("res:/data/a.fmt"), refused);
  await assert.rejects(resMan.LoadObject("res:/data/a.json"), refused);
  await assert.rejects(resMan.LoadObject("res:/data/a.idtrue"), refused);

  // Negative controls: a Target route and a RESOURCE-mode type are answered.
  const { resMan: routed } = graphManager();
  assert.equal(CjsSchema.cast(await routed.LoadObject("res:/data/a.graph"), TestGraph) !== null, true);
  class TestSemanticResource extends BlueAsyncRes
  {
    value = null;
    async _DoLoad()
    {
      this.value = await blue.resMan.ReadResourceObjectPayload(this, this._dataStream.data);
      return BlueAsyncRes.LoadingResult.LR_SUCCESS;
    }
    _DoPrepare() { return this.value !== null; }
  }
  routed.RegisterExtension("graphsemantic", TestSemanticResource, { Format: TestGraphFormat });
  const semantic = await routed.FetchResource("res:/data/s.graph", { ex: "semantic" });
  assert.equal(CjsSchema.cast(semantic, TestSemanticResource), semantic);
});

// Builds from a registered object builder are MAIN-queue tasks: FIFO, each
// whole, drained within the prepare loop's time slice (Carbon's one-build-at-a-time
// BlackReader wait, BlackReader.cpp:233-262; ccpwgl findings 0277-0279).
test("object builds drain FIFO within the prepare budget, never split, re-entrant last", async () =>
{
  let clock = 0;
  let built = 0;
  const resMan = new CjsBlueResMan({ source: { Read() { return new Uint8Array([ 1 ]); } } });
  blue.resMan = resMan;
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
    resMan.Update({ cache: false, purge: false, prepare: { maxTime: 0.010, now: () => clock } });
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

test("an idle sweep releases a builder's cached bytes, and the next load reads and parses again", async () =>
{
  let time = 0;
  const counter = { reads: 0, builders: 0 };
  const resMan = new CjsBlueResMan({
    motherLode: new CjsMotherLode({ now: () => time }),
    source: { Read() { counter.reads += 1; return new Uint8Array([ counter.reads ]); } }
  });
  blue.resMan = resMan;
  resMan.RegisterObjectBuilder("obj", bytes =>
  {
    counter.builders += 1;
    return { CreateObject() { return { read: bytes[0] }; } };
  });
  const path = "res:/data/idle.obj";
  assert.equal((await resMan.LoadObject(path)).read, 1);
  assert.equal((await resMan.LoadObject(path)).read, 1);
  assert.equal(counter.reads, 1);

  // Negative control: a sweep before the payload is idle long enough keeps it.
  time = 1;
  assert.equal(resMan.PurgeInactive({ time, maxIdleMilliseconds: 1000, payloadMaxIdleMilliseconds: 100 }).payloadsReleased, 0);
  assert.equal((await resMan.LoadObject(path)).read, 1);

  time = 500;
  assert.equal(resMan.PurgeInactive({ time, maxIdleMilliseconds: 1000, payloadMaxIdleMilliseconds: 100 }).payloadsReleased, 1);
  const reloaded = await resMan.LoadObject(path);
  assert.equal(reloaded.read, 2);
  assert.equal(counter.reads, 2);
  assert.equal(counter.builders, 2);
});

test("explicit extension selects a cached builder for extensionless object names", async () =>
{
  let reads = 0, parses = 0;
  const resMan = new CjsBlueResMan({ source: { Read(path) { if (path === "res:/extensionless") reads++; return new Uint8Array([7]); } } });
  blue.resMan = resMan;
  resMan.RegisterObjectBuilder("example", bytes =>
  {
    parses++;
    return { CreateObject: () => ({ values: [bytes[0]] }) };
  });
  try
  {
    await assert.rejects(resMan.LoadObject("res:/plain-without-override"), /No resource factory/);
    const first = await resMan.LoadObject("res:/extensionless", { ext: ".example" });
    const second = await resMan.LoadObject("res:/extensionless", { ext: ".example" });
    assert.notEqual(first, second);
    assert.notEqual(first.values, second.values);
    first.values[0] = 99;
    assert.deepEqual(second.values, [7]);
    assert.equal(reads, 1);
    assert.equal(parses, 1);
  }
  finally { resMan.Clear(); }
});

let previousManager;
beforeEach(() => { previousManager = blue.resMan; });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previousManager; } });

test("a Target constructs exactly one graph per caller, with no discarded preparation graph", async () =>
{
  let builds = 0;
  class CountedGraph { static from(values) { builds++; return {values}; } }
  const {resMan} = graphManager();
  resMan.RegisterExtension("count", CjsLoadingObject, {Format: TestGraphFormat, Target: CountedGraph});
  // The load alone, without a caller's build: LoadObject's own lookup.
  const resource = resMan._GetLoadingObject("res:/count.count");
  await resMan.Ready(resource);
  assert.equal(builds, 0);
  await resMan.LoadObject("res:/count.count");
  await resMan.LoadObject("res:/count.count");
  assert.equal(builds, 2);
});
