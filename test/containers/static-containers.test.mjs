import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  ReadEmbeddedSchemaContainer,
  ReadSchemaBoundContainer,
  ReadStaticContainer
} from "../../src/containers/index.js";

/**
 * Manufactures a `.static` of the SQLite family.
 *
 * No client file is committed here and none is needed: the family is a SQLite
 * database with a `cache` table whose values are JSON, and that is a thing a
 * test can build.
 */
function BuildCacheContainer(rows, { table = "cache" } = {})
{
  const directory = mkdtempSync(join(tmpdir(), "cjs-static-"));
  const path = join(directory, "manufactured.static");
  const database = new DatabaseSync(path);

  try
  {
    database.exec(`CREATE TABLE ${table} (key TEXT, value TEXT, time INTEGER)`);

    for (const [ key, value ] of rows)
    {
      database
        .prepare(`INSERT INTO ${table} (key, value, time) VALUES (?, ?, 0)`)
        .run(String(key), value);
    }
  }
  finally
  {
    database.close();
  }

  const bytes = new Uint8Array(readFileSync(path));

  rmSync(directory, { recursive: true, force: true });

  return bytes;
}

/**
 * A `.static` of the pickle family: a four-byte little-endian length, then that
 * many bytes of protocol-0 pickle.
 *
 * The length prefix is the family, not decoration. Bare pickle bytes are
 * identified as `unknown` rather than as a pickle, which is correct - and is
 * what this fixture got wrong on the first attempt.
 */
function BuildPickleContainer(pickle = "(dp0\n.")
{
  const body = new TextEncoder().encode(pickle);
  const bytes = new Uint8Array(4 + body.byteLength);

  new DataView(bytes.buffer).setUint32(0, body.byteLength, true);
  bytes.set(body, 4);

  return bytes;
}

test("the SQLite family decodes to records keyed by their container key", async () =>
{
  const bytes = BuildCacheContainer([
    [ 587, JSON.stringify({ typeID: 587, name: "Rifter" }) ],
    [ 588, JSON.stringify({ typeID: 588, name: "Rupture" }) ]
  ]);

  const records = await ReadStaticContainer(bytes, "res:/manufactured.static");

  // Keys stay strings so 64-bit identities survive; values are the stored JSON.
  assert.deepEqual(Object.keys(records), [ "587", "588" ]);
  assert.equal(records["587"].name, "Rifter");
  assert.equal(records["588"].typeID, 588);
});

test("a stored value that is not JSON names the record that failed", async () =>
{
  const bytes = BuildCacheContainer([ [ 1, "{ not json" ] ]);

  await assert.rejects(
    () => ReadStaticContainer(bytes, "res:/manufactured.static"),
    (error) =>
    {
      assert.equal(error.code, "CJS_STATIC_FORMAT_RECORD_INVALID");
      assert.equal(error.key, "1");
      assert.match(error.message, /record 1 is not JSON/u);
      return true;
    }
  );
});

test("a SQLite container without a cache table is refused by shape", async () =>
{
  const bytes = BuildCacheContainer([ [ 1, "{}" ] ], { table: "indexes" });

  await assert.rejects(
    () => ReadStaticContainer(bytes, "res:/manufactured.static"),
    (error) => error.code === "CJS_STATIC_FORMAT_SHAPE_INVALID"
  );
});

test("each reader refuses a family that is not its own", async () =>
{
  const sqlite = BuildCacheContainer([ [ 1, "{}" ] ]);

  // Routing is by signature, never by extension: all three of these wear
  // `.static` and only one of them is what each reader wants.
  await assert.rejects(
    () => ReadStaticContainer(BuildPickleContainer(), "res:/manufactured.static"),
    (error) =>
    {
      assert.equal(error.code, "CJS_STATIC_FORMAT_FAMILY_UNSUPPORTED");
      assert.equal(error.family, "pickle");
      assert.match(error.message, /not a sqlite one/u);
      return true;
    }
  );

  await assert.rejects(
    () => ReadSchemaBoundContainer(sqlite, new Uint8Array(8), "res:/manufactured.static"),
    (error) =>
    {
      assert.equal(error.code, "CJS_STATIC_FORMAT_FAMILY_UNSUPPORTED");
      assert.equal(error.family, "sqlite");
      return true;
    }
  );
});

test("the embedded-schema reader refuses a length it cannot use", () =>
{
  // Shorter than the four-byte length itself.
  assert.throws(
    () => ReadEmbeddedSchemaContainer(new Uint8Array(2), "res:/manufactured.static"),
    (error) => error.code === "CJS_STATIC_FORMAT_SHAPE_INVALID"
  );

  // A length that runs past the end of the input. Reading on would hand the
  // payload's bytes to a pickle reader and fail somewhere far from the cause.
  const overrun = new Uint8Array(16);
  new DataView(overrun.buffer).setUint32(0, 0xffff, true);

  assert.throws(
    () => ReadEmbeddedSchemaContainer(overrun, "res:/manufactured.static"),
    (error) =>
    {
      assert.equal(error.code, "CJS_STATIC_FORMAT_SHAPE_INVALID");
      assert.match(error.message, /usable schema length/u);
      return true;
    }
  );

  // Zero is refused as well: a container declaring no schema is not one this
  // reader can route, and slicing on it would silently produce an empty schema.
  const zero = new Uint8Array(16);

  assert.throws(
    () => ReadEmbeddedSchemaContainer(zero, "res:/manufactured.static"),
    (error) => error.code === "CJS_STATIC_FORMAT_SHAPE_INVALID"
  );
});
