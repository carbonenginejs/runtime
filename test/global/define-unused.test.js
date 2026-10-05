import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import { CjsUnusedMethodError, CJS_UNUSED_METHOD, CjsError } from "../../src/global/utils/errors/index.js";
import { CjsBlueClasses } from "../../src/global/blue/CjsBlueClasses.js";

test("define({ unused }) installs throwers raising CjsUnusedMethodError", () =>
{
  class UnusedHost { Used() { return 1; } }
  CjsSchema.define(UnusedHost, { className: "DefineUnusedHost", unused: [ "Dropped", " Other " ], methods: { Used: [ meta.blue.method, meta.implemented ] } });
  const host = new UnusedHost();
  assert.equal(host.Used(), 1);
  for (const name of [ "Dropped", "Other" ])
  {
    assert.throws(() => host[name](), error =>
      error instanceof CjsUnusedMethodError && error instanceof CjsError
      && error.code === CJS_UNUSED_METHOD && error.className === "DefineUnusedHost" && error.methodName === name);
    assert.equal(CjsSchema.getMethod(UnusedHost, name), null, "an unused method is not exposed");
  }
  assert.deepEqual(CjsSchema.getSchema(UnusedHost).unused, [ "Dropped", "Other" ]);
});

test("a name cannot be both unused and declared or defined", () =>
{
  class Declared {}
  assert.throws(() => CjsSchema.define(Declared, { className: "DefineUnusedDeclared", unused: [ "Run" ], methods: { Run: [ meta.blue.method ] } }), /also declares/);
  class Defined { Run() {} }
  assert.throws(() => CjsSchema.define(Defined, { className: "DefineUnusedDefined", unused: [ "Run" ] }), /also declares/);
  for (const unused of [ "Run", [ "" ], [ 3 ], [ "Run", "Run" ] ])
  {
    class Invalid {}
    assert.throws(() => CjsSchema.define(Invalid, { className: "DefineUnusedInvalid", unused }), TypeError);
  }
});

test("the CjsBlueClasses stubs are unused, not notImplemented", () =>
{
  const classes = new CjsBlueClasses();
  for (const name of [ "FindVariable", "UpdateObjectCount", "ProcessPendingDeletes", "ProcessAllPendingDeletes",
    "SetPendingDeletesEnabled", "IsPendingDeletesEnabled", "RegisterThunker", "GetRtti" ])
  {
    assert.throws(() => classes[name](), CjsUnusedMethodError, name);
  }
});
