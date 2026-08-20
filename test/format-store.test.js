import assert from "node:assert/strict";
import test from "node:test";

import { CjsFormatStore } from "../npm/dist/index.js";
import { CjsDdsFormat } from "../npm/dist/formats/dds/index.js";
import { CjsTgaFormat } from "../npm/dist/formats/tga/index.js";
import { CjsWebglFormat } from "../npm/dist/formats/webgl/index.js";

// The store is the link between a resource and the formats that populate it.
// It exists so neither imports the other: formats stay tree-shakeable subpaths
// and the composing application decides which ones exist.
// See /docs/internal/decisions/resource-population.md.


test("a format is reachable by every extension it declares", () =>
{
  const store = new CjsFormatStore().Register(CjsDdsFormat);

  assert.equal(store.Has(".dds"), true);
  assert.deepEqual(store.Get(".dds"), [ CjsDdsFormat ]);
  assert.equal(store.Resolve(".dds"), CjsDdsFormat);
});


test("extensions normalize, so routing is not case- or dot-sensitive", () =>
{
  const store = new CjsFormatStore().Register(CjsDdsFormat);

  for (const spelling of [ ".dds", "dds", ".DDS", "DDS" ])
  {
    assert.equal(store.Has(spelling), true, `${spelling} routes`);
  }
});


test("registering the same format twice does not duplicate it", () =>
{
  const store = new CjsFormatStore().Register(CjsDdsFormat).Register(CjsDdsFormat);

  assert.deepEqual(store.Get(".dds"), [ CjsDdsFormat ]);
});


test("a format with no declared extensions is refused, and says why", () =>
{
  // webgl takes an already-built container, not a file. Letting it into an
  // extension store would claim a file route that does not exist.
  assert.throws(
    () => new CjsFormatStore().Register(CjsWebglFormat),
    error => error.code === "CJS_FORMAT_STORE_NO_EXTENSIONS",
    "a format without extensions cannot be routed by extension"
  );
});


test("content decides between formats sharing one extension", () =>
{
  // The routing case: one suffix, several containers. Each candidate is asked
  // in registration order and the first to recognise the bytes wins.
  class First
  {
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported(data) { return data?.[0] === 1; }
  }
  class Second
  {
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported(data) { return data?.[0] === 2; }
  }
  const store = new CjsFormatStore().RegisterAll([ First, Second ]);

  assert.deepEqual(store.Get(".shared"), [ First, Second ]);
  assert.equal(store.Resolve(".shared", new Uint8Array([ 1 ])), First);
  assert.equal(store.Resolve(".shared", new Uint8Array([ 2 ])), Second);
});


test("a probe that throws declines, and does not mask a later format", () =>
{
  // Probes read headers of files they may not own. One throwing probe must not
  // fail the resolve for a format that would have said yes.
  class Throws
  {
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported() { throw new Error("not my file"); }
  }
  class Accepts
  {
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported() { return true; }
  }
  const store = new CjsFormatStore().RegisterAll([ Throws, Accepts ]);

  assert.equal(store.Resolve(".shared", new Uint8Array([ 9 ])), Accepts);
});


test("nothing recognising the bytes resolves to null rather than a guess", () =>
{
  class Never
  {
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported() { return false; }
  }
  class AlsoNever
  {
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported() { return false; }
  }
  const store = new CjsFormatStore().RegisterAll([ Never, AlsoNever ]);

  assert.equal(store.Resolve(".shared", new Uint8Array([ 9 ])), null);
  assert.equal(store.Resolve(".unregistered"), null);
});


test("a single candidate is not probed, so it can reject its own file properly", () =>
{
  // With one candidate the extension already decided. Asking would let the
  // store refuse a file the format would have explained better.
  let probed = false;
  class Only
  {
    static extensions = Object.freeze([ ".only" ]);
    static isSupported() { probed = true; return false; }
  }
  const store = new CjsFormatStore().Register(Only);

  assert.equal(store.Resolve(".only", new Uint8Array([ 9 ])), Only);
  assert.equal(probed, false, "a lone candidate is not asked to defend itself");
});


test("the store imports no concrete format, which is the point of it", () =>
{
  // If the store or a resource imported formats, pulling in one texture
  // resource would drag in every texture format and destroy the tree-shakeable
  // subpaths. Registration is the caller's, so nobody imports anybody.
  const store = new CjsFormatStore();

  assert.deepEqual(store.Extensions(), [], "an unregistered store routes nothing");
  store.RegisterAll([ CjsDdsFormat, CjsTgaFormat ]);
  assert.deepEqual(store.Extensions(), [ "dds", "tga" ]);
  store.Clear();
  assert.deepEqual(store.Extensions(), []);
});
