import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsSchema, compose, impl } from "../../../npm/dist/global/schema/index.js";

function contract()
{
  class IProbe
  {
    GetData() {}
    Run() {}
  }
  CjsSchema.decorateMethod(IProbe, "GetData", compose.abstract, impl.abstract);
  CjsSchema.decorateMethod(IProbe, "Run", compose.abstract, impl.abstract);
  CjsSchema.define(IProbe, { className: "IProbe", fields: {} });
  return IProbe;
}

test("an unimplemented method throws, naming the contract", () =>
{
  const IProbe = contract();
  assert.throws(() => new IProbe().GetData(), /^Error: IProbe\.GetData must be implemented\.$/u);
  assert.throws(() => new IProbe().Run(), /^Error: IProbe\.Run must be implemented\.$/u);
});

test("an implementer that misses one is named as the one that failed", () =>
{
  // Two names answer two questions: what the contract is, and who did not
  // honour it. One name would point at the interface file, which is never the
  // file to change.
  const IProbe = contract();
  class RealProbe extends IProbe
  {
    GetData() { return 42; }
  }
  CjsSchema.define(RealProbe, { className: "RealProbe", fields: {} });

  assert.equal(new RealProbe().GetData(), 42);
  assert.throws(() => new RealProbe().Run(), /^Error: RealProbe does not implement IProbe\.Run\.$/u);
});

test("the decorator installs while impl.abstract still describes", () =>
{
  // compose INSTALLS, impl DESCRIBES, and both are applied. The schema keeps
  // reporting the method as abstract after the body is installed.
  const IProbe = contract();
  assert.equal(CjsSchema.getMethod(IProbe, "Run")?.impl?.abstract, true);
});

test("it refuses anything that is not a method", () =>
{
  assert.throws(() => compose.abstract(null, "Name"), /only supports methods/u);
});
