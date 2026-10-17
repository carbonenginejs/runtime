import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsSchema, meta, blue } from "../../../npm/dist/global/schema/index.js";

function probeInterface()
{
  class IProbe
  {
    GetData() {}
    Run(_count, _out = null) {}
  }
  CjsSchema.decorateMethod(IProbe, "GetData", meta.abstract);
  CjsSchema.decorateMethod(IProbe, "Run", blue.abstract);
  CjsSchema.define(IProbe, { className: "IProbe", fields: {} });
  return IProbe;
}

test("an unimplemented method throws, naming the interface and the declared parameters", () =>
{
  const IProbe = probeInterface();
  assert.throws(() => new IProbe().GetData(), /^Error: IProbe\.GetData\(\) must be implemented\.$/u);
  assert.throws(() => new IProbe().Run(), /^Error: IProbe\.Run\(count, out\) must be implemented\.$/u);
});

test("an implementer that misses one is named as the one that failed", () =>
{
  // Two names answer two questions: what the interface is, and who did not
  // honour it. One name would point at the interface file, which is never the
  // file to change.
  const IProbe = probeInterface();
  class RealProbe extends IProbe
  {
    GetData() { return 42; }
  }
  CjsSchema.define(RealProbe, { className: "RealProbe", fields: {} });

  assert.equal(new RealProbe().GetData(), 42);
  assert.throws(() => new RealProbe().Run(), /^Error: RealProbe does not implement IProbe\.Run\(count, out\)\.$/u);
});

test("a contract copied in by blue.inherit still names the contract", () =>
{
  const IProbe = probeInterface();
  class InheritingProbe {}
  blue.inherit(IProbe)(InheritingProbe, { kind: "class" });
  CjsSchema.blue.define(InheritingProbe, { className: "InheritingProbe" });

  assert.throws(() => new InheritingProbe().Run(), /^Error: InheritingProbe does not implement IProbe\.Run\(count, out\)\.$/u);
});

test("the decorator installs and describes", () =>
{
  // meta.abstract and blue.abstract record status `abstract` AND install the
  // throwing body; blue.abstract also stamps the method as Carbon's.
  const IProbe = probeInterface();
  assert.equal(CjsSchema.getMethod(IProbe, "GetData")?.impl?.status, "abstract");
  assert.equal(CjsSchema.getMethod(IProbe, "GetData")?.carbon, undefined);
  assert.equal(CjsSchema.getMethod(IProbe, "Run")?.impl?.status, "abstract");
  assert.equal(CjsSchema.getMethod(IProbe, "Run")?.carbon?.method, true);
  assert.equal(IProbe.prototype.Run.length, 1, "the thrower keeps the declared arity");
});

test("a define({ methods }) entry installs the body at registration", () =>
{
  class IListed
  {
    Endl() { return "not abstract"; }
  }
  CjsSchema.blue.define(IListed, { className: "IListed", methods: { Endl: blue.abstract } });
  assert.throws(() => new IListed().Endl(), /^Error: IListed\.Endl\(\) must be implemented\.$/u);
});

test("it refuses anything that is not a method, and requires is retired", () =>
{
  assert.throws(() => meta.abstract(null, "Name"), /only supports methods/u);
  assert.equal("requires" in meta, false);
});
