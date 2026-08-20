import assert from "node:assert/strict";
import test from "node:test";

import { CjsFormatStore, ResourceRequirement, TriGrannyRes, TriTextureRes } from "../npm/dist/index.js";
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
  assert.deepEqual(store.Get(".dds").map(route => route.Format), [ CjsDdsFormat ]);
  assert.equal(store.Resolve(".dds").Format, CjsDdsFormat);
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

  assert.deepEqual(store.Get(".dds").map(route => route.Format), [ CjsDdsFormat ]);
});


test("a format with nothing declared and nothing supplied is refused, and says why", () =>
{
  // webgl takes an already-built container, not a file, so it declares no
  // extensions. With none supplied either there is nothing to route it under.
  assert.throws(
    () => new CjsFormatStore().Register(CjsWebglFormat),
    error => error.code === "CJS_FORMAT_STORE_NO_EXTENSIONS",
    "no declaration and no argument means no route"
  );
});


test("the caller's extensions override the declaration, which is only a default", () =>
{
  // `Format.extensions` exists so a composition root can register a pile of
  // formats without restating what each reads. It is a convenience, not the
  // routing authority - an application may route whatever suffix it likes to
  // whatever reader it likes, including one that declares nothing.
  const store = new CjsFormatStore()
    .Register(CjsWebglFormat, ".effect")
    .Register(CjsDdsFormat, [ ".texture", ".bitmap" ]);

  assert.equal(store.Resolve(".effect").Format, CjsWebglFormat, "a format that declares nothing still routes");
  assert.deepEqual(store.Extensions(), [ "bitmap", "effect", "texture" ]);

  // The declaration is not consulted at all once the caller has named one.
  assert.equal(store.Has(".dds"), false, "dds declares .dds, but this store was told otherwise");
});


test("RegisterAll takes a pair when an entry needs its own extensions", () =>
{
  const store = new CjsFormatStore().RegisterAll([
    CjsTgaFormat,
    [ CjsWebglFormat, ".effect" ]
  ]);

  assert.deepEqual(store.Extensions(), [ "effect", "tga" ]);
});


test("an extension that normalizes to nothing is refused rather than stored", () =>
{
  // Registering under an empty key is the worst outcome available: it succeeds,
  // routes nothing, and leaves the caller believing the format is reachable.
  const store = new CjsFormatStore();

  for (const empty of [ "", ".", "   " ])
  {
    assert.throws(
      () => store.Register(CjsDdsFormat, empty),
      TypeError,
      `${JSON.stringify(empty)} is not an extension`
    );
  }
  assert.deepEqual(store.Extensions(), []);
});


test("content decides between formats sharing one extension", () =>
{
  // The routing case: one suffix, several containers. Each candidate is asked
  // in registration order and the first to recognise the bytes wins.
  class First
  {
    static read(data) { return data; }
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported(data) { return data?.[0] === 1; }
  }
  class Second
  {
    static read(data) { return data; }
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported(data) { return data?.[0] === 2; }
  }
  const store = new CjsFormatStore().RegisterAll([ First, Second ]);

  assert.deepEqual(store.Get(".shared").map(route => route.Format), [ First, Second ]);
  assert.equal(store.Resolve(".shared", new Uint8Array([ 1 ])).Format, First);
  assert.equal(store.Resolve(".shared", new Uint8Array([ 2 ])).Format, Second);
});


test("a probe that throws declines, and does not mask a later format", () =>
{
  // Probes read headers of files they may not own. One throwing probe must not
  // fail the resolve for a format that would have said yes.
  class Throws
  {
    static read(data) { return data; }
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported() { throw new Error("not my file"); }
  }
  class Accepts
  {
    static read(data) { return data; }
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported() { return true; }
  }
  const store = new CjsFormatStore().RegisterAll([ Throws, Accepts ]);

  assert.equal(store.Resolve(".shared", new Uint8Array([ 9 ])).Format, Accepts);
});


test("nothing recognising the bytes resolves to null rather than a guess", () =>
{
  class Never
  {
    static read(data) { return data; }
    static extensions = Object.freeze([ ".shared" ]);
    static isSupported() { return false; }
  }
  class AlsoNever
  {
    static read(data) { return data; }
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
    static read(data) { return data; }
    static extensions = Object.freeze([ ".only" ]);
    static isSupported() { probed = true; return false; }
  }
  const store = new CjsFormatStore().Register(Only);

  assert.equal(store.Resolve(".only", new Uint8Array([ 9 ])).Format, Only);
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


test("one format serves several outputs, and the requested one selects the route", () =>
{
  // The dds case. `.dds` decoded to RGBA and `.dds` kept as a compressed
  // texture are the same file, the same format and the same reader, differing
  // only in what was asked of it. ccpwgl had nowhere to put that, so every
  // call site carried it.
  const store = new CjsFormatStore()
    .Register(CjsDdsFormat, { extensions: ".dds", output: "texture" })
    .Register(CjsDdsFormat, { extensions: ".dds", output: "rgba" });

  assert.equal(store.Get(".dds").length, 2, "same format, same reader, two routes");
  assert.equal(store.Resolve(".dds", undefined, { output: "rgba" }).output, "rgba");
  assert.equal(store.Resolve(".dds", undefined, { output: "texture" }).output, "texture");

  // An output nothing was registered for is a miss. Falling back to a route
  // that produces something else would hand back the wrong representation
  // while reporting success, which is worse than not answering.
  assert.equal(store.Resolve(".dds", undefined, { output: "video" }), null);

  // With no output asked for, registration order is the policy.
  assert.equal(store.Resolve(".dds").output, "texture");
});


test("a route will not claim an output its format does not declare", () =>
{
  // Registration is the place to catch this. A route promising `video` from a
  // dds would otherwise resolve happily and fail at the read.
  assert.throws(
    () => new CjsFormatStore().Register(CjsDdsFormat, { extensions: ".dds", output: "video" }),
    TypeError,
    "dds declares texture, image and rgba"
  );
});


test("a route will not name a reader that does not exist", () =>
{
  // The same argument one level down: a misspelled reader would surface as a
  // failed load of the first matching file, a long way from the registration
  // that caused it.
  assert.throws(
    () => new CjsFormatStore().Register(CjsDdsFormat, { extensions: ".dds", read: "readDds" }),
    TypeError,
    "there is no readDds"
  );
});


test("routes over one format are distinct when reader or output differ", () =>
{
  // Registering the same route twice is a no-op, but two routes that differ in
  // how they read are not duplicates - that is the whole point of naming them.
  const store = new CjsFormatStore()
    .Register(CjsDdsFormat, { extensions: ".dds", output: "rgba" })
    .Register(CjsDdsFormat, { extensions: ".dds", output: "rgba" })
    .Register(CjsDdsFormat, { extensions: ".dds", output: "texture" });

  assert.equal(store.Get(".dds").length, 2);
});


test("the route applies its output as the reader's emit", () =>
{
  // What a registered output actually does at the read.
  let seen = null;
  class Recording
  {
    static extensions = Object.freeze([ ".rec" ]);
    static outputTypes = Object.freeze([ "alpha", "beta" ]);
    static read(data, options) { seen = options; return data; }
  }
  const store = new CjsFormatStore().Register(Recording, { extensions: ".rec", output: "beta" });

  store.Resolve(".rec").Read("bytes");
  assert.equal(seen.emit, "beta", "the registered output becomes the emit");

  // A caller naming an emit still wins, because it knows what the registration
  // could not.
  store.Resolve(".rec").Read("bytes", { emit: "alpha" });
  assert.equal(seen.emit, "alpha");
});


test("a resource's requirement is not a format output, and must not filter routes", () =>
{
  // requirement selects the resource CLASS - CjsResMan.RegisterResourceType
  // keys on it, and its values are texture, granny, geometry. A format's
  // outputs are a different axis. Folding one into the other made a resource
  // loaded as "granny" filter for routes emitting "granny", find none, and
  // resolve to nothing at all.
  const store = new CjsFormatStore().Register(CjsDdsFormat);
  const resource = new TriTextureRes()
    .Initialize("res:/texture/hull.dds", null, ResourceRequirement.TEXTURE)
    .SetFormatStore(store);

  assert.equal(resource.GetRequirement(), ResourceRequirement.TEXTURE);
  assert.ok(resource.ResolveFormat(), "the requirement must not have filtered the route away");

  // The same, with a requirement no format could ever declare as an output.
  const granny = new TriGrannyRes()
    .Initialize("res:/ship/hull.dds", null, ResourceRequirement.GRANNY)
    .SetFormatStore(store);
  assert.ok(granny.ResolveFormat(), "requirement 'granny' is not an output filter");

  // An output asked for explicitly still filters, which is the real axis.
  assert.equal(resource.ResolveFormat(undefined, { output: "video" }), null);
});
