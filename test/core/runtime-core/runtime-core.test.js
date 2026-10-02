import assert from "node:assert/strict";
import { test } from "node:test";
import CjsLibrary, { CjsLibrary as NamedCjsLibrary } from "../../../npm/dist/core/index.js";

// Service startup, rollback and shutdown contracts are exercised in
// test/global/blue-services.test.js; this test preserves the public root identity.

test("the core package still exports CjsLibrary as its default and named root", () =>
{
  assert.equal(typeof CjsLibrary, "function");
  assert.equal(CjsLibrary, NamedCjsLibrary);
  assert.equal(new CjsLibrary() instanceof CjsLibrary, true);
});
