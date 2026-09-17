import assert from "node:assert/strict";
import { test } from "node:test";
import CjsLibrary, { CjsLibrary as NamedCjsLibrary } from "../../../npm/dist/core/index.js";

// CjsLibrary was emptied on 2026-09-17; see its head comment for what was
// removed and why. The 17 tests that stood here covered the service registry,
// the capability table and the resourceBehaviors strategy chain, none of which
// exist any more. They are not commented out or skipped: a skipped test for a
// deleted mechanism is a claim that the mechanism is coming back in that shape,
// and what replaces it is decided otherwise in
// /docs/internal/decisions/composition-root-is-the-wrapper.md.
//
// What stays is the one thing still true: the package surface is unchanged, so
// nothing importing the root breaks while the real library is written.

test("the core package still exports CjsLibrary as its default and named root", () =>
{
  assert.equal(typeof CjsLibrary, "function");
  assert.equal(CjsLibrary, NamedCjsLibrary);
  assert.equal(new CjsLibrary() instanceof CjsLibrary, true);
});
