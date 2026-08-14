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

test("identifies a SQLite container and declines to open it", () =>
{
  const bytes = Bytes(SQLITE_HEADER, [ 0x10, 0x00, 0x01, 0x01 ]);
  const detected = CjsStaticFormat.detect(bytes);

  assert.equal(detected.family, CJS_STATIC_FAMILIES.SQLITE);
  assert.equal(detected.decodable, false);
  assert.equal(detected.payloadOffset, 0);
  assert.match(detected.reason, /driver/u);

  assert.throws(
    () => CjsStaticFormat.read(bytes),
    error => error.code === "CJS_STATIC_DRIVER_REQUIRED" && error.family === "sqlite"
  );
});

test("a supplied SQLite driver reads the container anywhere", () =>
{
  const bytes = Bytes(SQLITE_HEADER, [ 0x10, 0x00, 0x01, 0x01 ]);
  const seen = [];

  const result = CjsStaticFormat.read(bytes, {
    sqlite: payload =>
    {
      seen.push(payload.byteLength);

      return { opened: true };
    }
  });

  assert.deepEqual(result, { opened: true });
  assert.deepEqual(seen, [ bytes.byteLength ]);
});

test("identifies a prefixed pickle and reports the prefix and payload", () =>
{
  const bytes = Bytes([ 0xa5, 0x02, 0x00, 0x00 ], "(dp1\nS'a'\np2\nI1\ns.");
  const detected = CjsStaticFormat.detect(bytes);

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

  assert.equal(CjsStaticFormat.detect(bytes).family, CJS_STATIC_FAMILIES.PICKLE);
});

test("a schema-bound container is reported as unknown, not guessed at", () =>
{
  const bytes = Bytes([ 0x08, 0x13, 0x02, 0x00, 0x01, 0x2d, 0x31, 0x01, 0x81, 0x96 ]);
  const detected = CjsStaticFormat.detect(bytes);

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
    () => CjsStaticFormat.detect("not bytes"),
    error => error.code === "CJS_STATIC_INPUT_INVALID"
  );
});
