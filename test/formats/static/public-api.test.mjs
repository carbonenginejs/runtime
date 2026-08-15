import assert from "node:assert/strict";
import { test } from "node:test";

import CjsStaticFormat, {
  CJS_STATIC_FAMILIES,
  CjsStaticFormat as NamedCjsStaticFormat
} from "../../../src/formats/static/index.js";

const SQLITE_HEADER = "SQLite format 3\0";

function Bytes(...parts)
{
  const chunks = parts.map(part => typeof part === "string"
    ? new TextEncoder().encode(part)
    : Uint8Array.from(part));
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks)
  {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

test("package subpath exports one public static format class", async () =>
{
  const mod = await import("../../../src/formats/static/index.js");

  assert.deepEqual(Object.keys(mod).sort(), [ "CJS_STATIC_FAMILIES", "CjsStaticFormat", "default" ]);
  assert.equal(mod.default, CjsStaticFormat);
  assert.equal(NamedCjsStaticFormat, CjsStaticFormat);
});

test("identifies a SQLite container and now decodes it", () =>
{
  const bytes = Bytes(SQLITE_HEADER, [ 0x10, 0x00, 0x01, 0x01 ]);
  const detected = CjsStaticFormat.describe(bytes);

  assert.equal(detected.family, CJS_STATIC_FAMILIES.SQLITE);
  assert.equal(detected.payloadOffset, 0);

  // This family declined to open until CjsSqliteFormat existed, and the test
  // that replaced this one asserted the refusal. These four bytes are a header
  // and nothing else, so the read fails on the container being truncated - not
  // on a missing driver, which is the distinction worth holding onto.
  assert.equal(detected.decodable, true);
  assert.equal(detected.requires, null);

  assert.throws(
    () => CjsStaticFormat.read(bytes),
    error => error.code === "CJS_SQLITE_INVALID"
  );
});

test("capability names what closes the gap, not just that there is one", () =>
{
  // SQLite requires nothing now; the schema-bound family is the remaining case
  // where this package cannot finish the job alone.
  assert.equal(CjsStaticFormat.describe(Bytes(SQLITE_HEADER)).requires, null);
  assert.equal(
    CjsStaticFormat.describe(Bytes([ 0x01, 0x00, 0x00, 0x00 ], "(dp1\nI1\ns.")).requires,
    null
  );
  assert.equal(
    CjsStaticFormat.describe(Bytes([ 0x08, 0x13, 0x02, 0x00, 0x01, 0x2d ])).requires,
    "schema"
  );
});

test("a supplied SQLite driver is ignored, because none is needed", () =>
{
  const bytes = Bytes(SQLITE_HEADER, [ 0x10, 0x00, 0x01, 0x01 ]);
  let called = false;

  // `options.sqlite` was the seam a caller injected a driver through. It is
  // gone rather than deprecated, so a caller still passing one gets this
  // package's own decode instead of theirs - silently, which is why it is
  // asserted rather than left to be discovered.
  assert.throws(
    () => CjsStaticFormat.read(bytes, { sqlite: () => { called = true; return { opened: true }; } }),
    error => error.code === "CJS_SQLITE_INVALID"
  );
  assert.equal(called, false);
});

test("identifies a prefixed pickle and reports the prefix and payload", () =>
{
  const bytes = Bytes([ 0xa5, 0x02, 0x00, 0x00 ], "(dp1\nS'a'\np2\nI1\ns.");
  const detected = CjsStaticFormat.describe(bytes);

  assert.equal(detected.family, CJS_STATIC_FAMILIES.PICKLE);
  assert.equal(detected.decodable, true);
  assert.equal(detected.payloadOffset, 4);
  assert.equal(detected.prefix, 0x2a5);
  assert.equal(new TextDecoder().decode(CjsStaticFormat.payload(bytes))[0], "(");
});

test("decodes a prefixed pickle through the pickle reader", () =>
{
  const bytes = Bytes([ 0x01, 0x00, 0x00, 0x00 ], "(dp1\nS'a'\np2\nI1\ns.");

  assert.deepEqual(CjsStaticFormat.read(bytes), { a: 1 });
});

test("a list pickle is recognised as well as a dictionary", () =>
{
  const bytes = Bytes([ 0x00, 0x00, 0x00, 0x00 ], "(lp1\nI1\na.");

  assert.equal(CjsStaticFormat.describe(bytes).family, CJS_STATIC_FAMILIES.PICKLE);
});

test("a schema-bound container is reported as unknown, not guessed at", () =>
{
  const bytes = Bytes([ 0x08, 0x13, 0x02, 0x00, 0x01, 0x2d, 0x31, 0x01, 0x81, 0x96 ]);
  const detected = CjsStaticFormat.describe(bytes);

  assert.equal(detected.family, CJS_STATIC_FAMILIES.UNKNOWN);
  assert.equal(detected.decodable, false);
  assert.match(detected.reason, /\.schema companion/u);
  assert.match(detected.reason, /YAML/u);

  assert.throws(
    () => CjsStaticFormat.read(bytes),
    error => error.code === "CJS_STATIC_FAMILY_UNSUPPORTED"
  );
});

test("rejects input that is not bytes", () =>
{
  assert.throws(
    () => CjsStaticFormat.describe("not bytes"),
    error => error.code === "CJS_STATIC_INPUT_INVALID"
  );
});

test("reports the family on the shared probe seam", () =>
{
  const probe = CjsStaticFormat.isSupported(
    Bytes([ 0x01, 0x00, 0x00, 0x00 ], "(dp1\nS'a'\np2\nI1\ns.")
  );

  assert.equal(probe.format, "static");
  assert.equal(probe.preferred, CJS_STATIC_FAMILIES.PICKLE);
  assert.equal(probe.supported, "full");
  assert.equal(probe.metadata.payloadOffset, 4);
  assert.equal(probe.verified, false, "the declaration seam never claims verification");
  assert.equal(
    CjsStaticFormat.inspect(Bytes(SQLITE_HEADER)).preferred,
    CJS_STATIC_FAMILIES.SQLITE
  );
});

test("resolveType is verified, because the extension declares nothing", async () =>
{
  const probe = await CjsStaticFormat.resolveType(Bytes(SQLITE_HEADER));

  assert.equal(probe.verified, true);
  assert.equal(probe.preferred, CJS_STATIC_FAMILIES.SQLITE);
  assert.equal(probe.metadata.declared, null);
  assert.equal(probe.metadata.resolved, CJS_STATIC_FAMILIES.SQLITE);
  assert.equal(probe.metadata.mismatch, false);

  const unknown = await CjsStaticFormat.resolveType(
    Bytes([ 0x08, 0x13, 0x02, 0x00, 0x01, 0x2d, 0x31, 0x01 ])
  );

  assert.equal(unknown.verified, true);
  assert.equal(unknown.preferred, CJS_STATIC_FAMILIES.UNKNOWN);
});
