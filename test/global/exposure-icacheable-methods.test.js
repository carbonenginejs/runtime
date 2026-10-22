import assert from "node:assert/strict";
import test from "node:test";
import { exposure as be } from "#be";
import { CjsSchema, meta } from "../../src/global/schema/index.js";

// decorator-upgrade.md § 00 rare macros: Carbon's MAP_ICACHEABLE_METHODS() (ICacheable.h:21) is one line that
// registers MAP_METHOD_AND_WRAP rows for IsMemoryUsageKnown and GetMemoryUsage.
test("mapICacheableMethods registers both ICacheable rows", () =>
{
  class Cached
  {
    IsMemoryUsageKnown() { return true; }
    GetMemoryUsage() { return 4; }
  }
  CjsSchema.decorateMethod(Cached, "IsMemoryUsageKnown", meta.implemented);
  CjsSchema.decorateMethod(Cached, "GetMemoryUsage", meta.implemented);
  be.mapICacheableMethods()(Cached);
  for (const name of [ "IsMemoryUsageKnown", "GetMemoryUsage" ])
  {
    const row = CjsSchema.getMethod(Cached, name);
    assert.equal(row.carbon.method, true, name);
    assert.equal(row.exposure.macro, "MAP_METHOD_AND_WRAP", name);
    assert.equal(row.impl.status, "implemented", name);
  }
});

test("mapICacheableMethods refuses a class without the ICacheable methods", () =>
{
  class Bare {}
  assert.throws(() => be.mapICacheableMethods()(Bare), /IsMemoryUsageKnown/);
});
