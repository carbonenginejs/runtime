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
