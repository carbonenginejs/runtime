import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import CjsSqliteFormat, {
  CjsSqliteFormat as NamedCjsSqliteFormat
} from "../../../src/formats/sqlite/index.js";

/**
 * Builds a real SQLite container from statements, and returns its bytes.
 *
 * The containers are manufactured rather than shipped: this package carries no
 * client data, and a fixture captured from one would prove less anyway, because
 * ordinary data never exercises the cases below. `node:sqlite` writes the file
 * and is then available as an oracle for the same rows.
 */
function Build(statements, pragmas = []) {
  const directory = mkdtempSync(join(tmpdir(), "cjs-sqlite-"));
  const path = join(directory, "manufactured.sqlite");
  const database = new DatabaseSync(path);

  try {
    for (const pragma of pragmas) {
      database.exec(pragma);
    }

    for (const statement of statements) {
      database.exec(statement);
    }
  } finally {
    database.close();
  }

  const bytes = new Uint8Array(readFileSync(path));

  return { bytes, path, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

/** Reads every table with `node:sqlite`, to compare against our own decode. */
function Oracle(path, bigints = false) {
  const database = new DatabaseSync(path, { readOnly: true });

  try {
    const tables = database
      .prepare("select name from sqlite_master where type = 'table'")
      .all()
      .map(row => row.name);

    return Object.fromEntries(tables.map(name => {
      const statement = database.prepare(`select * from "${name}"`);

      if (bigints) statement.setReadBigInts(true);

      // node:sqlite returns null-prototype rows; ours are plain objects, and
      // deepEqual treats that difference as a mismatch.
      return [ name, statement.all().map(row => ({ ...row })) ];
    }));
  } finally {
    database.close();
  }
}

test("package subpath exports one public sqlite format class", async () => {
  const mod = await import("../../../src/formats/sqlite/index.js");

  assert.deepEqual(Object.keys(mod).sort(), [ "CjsSqliteFormat", "default" ]);
  assert.equal(mod.default, CjsSqliteFormat);
  assert.equal(NamedCjsSqliteFormat, CjsSqliteFormat);
});

test("recognises a container by signature and refuses anything else", () => {
  const { bytes, cleanup } = Build([ "create table t (a integer)" ]);

  try {
    assert.equal(CjsSqliteFormat.is(bytes), true);
    assert.equal(CjsSqliteFormat.isSupported(bytes).supported, "full");

    // Short, empty, and plausible-but-wrong all have to fail rather than throw
    // somewhere deeper: `.static` wears this extension over two other families.
    assert.equal(CjsSqliteFormat.is(new Uint8Array(0)), false);
    assert.equal(CjsSqliteFormat.is(new Uint8Array(4096)), false);
    assert.equal(CjsSqliteFormat.is(new TextEncoder().encode("SQLite format 4\0")), false);
    assert.equal(CjsSqliteFormat.isSupported(new Uint8Array(200)).supported, "none");
  } finally {
    cleanup();
  }
});

test("every serial type decodes, including the ones stored in the type itself", () => {
  const { bytes, path, cleanup } = Build([
    "create table v (label text, n integer, big integer, negative integer, f real, b blob, absent integer)",
    // 0 and 1 are stored as serial types 8 and 9 with no bytes in the body at
    // all, so a reader that only walks the body loses them.
    "insert into v values ('zero', 0, 9007199254740993, -42, 1.5, x'00ff10', null)",
    "insert into v values ('one', 1, -9007199254740993, -1, -0.25, x'', null)"
  ]);

  try {
    const ours = CjsSqliteFormat.readPayload(bytes).v;

    assert.equal(ours[0].n, 0);
    assert.equal(ours[1].n, 1);
    assert.equal(ours[0].negative, -42);
    assert.equal(ours[1].negative, -1);
    assert.equal(ours[0].f, 1.5);
    assert.equal(ours[1].f, -0.25);
    assert.equal(ours[0].absent, null);
    assert.deepEqual([ ...ours[0].b ], [ 0x00, 0xff, 0x10 ]);
    assert.deepEqual([ ...ours[1].b ], []);

    // Beyond 2^53 a Number silently rounds, so these arrive as BigInt.
    assert.equal(ours[0].big, 9007199254740993n);
    assert.equal(ours[1].big, -9007199254740993n);

    // The JSON output has to stay lossless too, which means decimal strings.
    const json = CjsSqliteFormat.readJSON(bytes).v;

    assert.equal(json[0].big, "9007199254740993");
    assert.deepEqual(json[0].b, [ 0x00, 0xff, 0x10 ]);

    // Read as BigInts, because node:sqlite refuses to narrow the wide column.
    assert.equal(Oracle(path, true).v.length, 2);
  } finally {
    cleanup();
  }
});

test("a value larger than a page is rejoined from its overflow chain", () => {
  // 512 is the smallest page SQLite writes, so a few kilobytes is already a
  // chain of pages rather than one spilled page.
  const long = "x".repeat(40_000);
  const { bytes, path, cleanup } = Build([
    "create table big (id integer primary key, blob_value blob, text_value text)",
    `insert into big values (1, zeroblob(20000), '${long}')`,
    "insert into big values (2, x'aabb', 'short')"
  ], [ "pragma page_size = 512" ]);

  try {
    const ours = CjsSqliteFormat.readPayload(bytes).big;

    assert.equal(ours[0].text_value.length, 40_000);
    assert.equal(ours[0].text_value, long);
    assert.equal(ours[0].blob_value.length, 20_000);
    // Truncation is the failure mode here, so check the far end, not just the
    // length: a short read fills the tail with zeroes and still measures right.
    assert.equal(ours[0].blob_value[19_999], 0);
    assert.equal(ours[1].text_value, "short");

    assert.deepEqual(
      ours.map(row => row.text_value.length),
      Oracle(path).big.map(row => row.text_value.length)
    );
  } finally {
    cleanup();
  }
});

test("rows come back in rowid order across a multi-level b-tree", () => {
  const values = Array.from({ length: 4000 }, (unused, index) =>
    `(${index + 1}, 'row ${index + 1} ${"pad".repeat(20)}')`);
  const { bytes, path, cleanup } = Build([
    "create table many (id integer primary key, label text)",
    `insert into many values ${values.join(",")}`
  ], [ "pragma page_size = 512" ]);

  try {
    const ours = CjsSqliteFormat.readJSON(bytes).many;

    assert.equal(ours.length, 4000);

    // A small page size and 4,000 rows force interior pages. Walking their
    // children in the wrong direction still returns every row, so only the
    // order catches it - which is how it was caught.
    assert.deepEqual(ours.map(row => row.id), Oracle(path).many.map(row => row.id));
    assert.equal(ours[0].id, 1);
    assert.equal(ours[3999].id, 4000);
  } finally {
    cleanup();
  }
});

test("an INTEGER PRIMARY KEY column carries the rowid, which is not in the body", () => {
  const { bytes, cleanup } = Build([
    "create table aliased (id integer primary key, label text)",
    "insert into aliased (id, label) values (7, 'seven')",
    "insert into aliased (label) values ('assigned')"
  ]);

  try {
    const ours = CjsSqliteFormat.readJSON(bytes).aliased;

    // The record stores NULL for this column; the value only exists in the
    // cell's rowid field, so a reader that trusts the body reports null.
    assert.equal(ours[0].id, 7);
    assert.equal(ours[0].label, "seven");
    assert.equal(ours[1].id, 8);
  } finally {
    cleanup();
  }
});

test("a rowid past 2^49 needs the longest varints the format has", () => {
  const { bytes, path, cleanup } = Build([
    "create table wide (id integer primary key, label text)",
    // Each of these needs a longer varint than the last; the largest is the
    // nine-byte form, whose ninth byte contributes eight bits rather than seven.
    "insert into wide values (562949953421312, 'two to the forty-nine')",
    "insert into wide values (72057594037927935, 'two to the fifty-six less one')",
    "insert into wide values (4611686018427387904, 'two to the sixty-two')"
  ]);

  try {
    const ours = CjsSqliteFormat.readJSON(bytes).wide;

    // node:sqlite refuses to narrow these at all, which is the right instinct:
    // beyond 2^53 a Number cannot hold every rowid. This reader returns a
    // BigInt for exactly that reason, and the JSON output a decimal string.
    assert.deepEqual(ours.map(row => row.id), [
      562949953421312, "72057594037927935", "4611686018427387904"
    ]);
    assert.equal(CjsSqliteFormat.readPayload(bytes).wide[1].id, 72057594037927935n);
    assert.equal(Oracle(path, true).wide.length, 3);
    assert.equal(ours[0].label, "two to the forty-nine");
    assert.equal(ours[2].label, "two to the sixty-two");
  } finally {
    cleanup();
  }
});

test("quoted and awkward column names survive the CREATE TABLE parse", () => {
  const { bytes, cleanup } = Build([
    `create table odd (
      "spaced name" text,
      [bracketed] integer,
      \`backticked\` integer,
      plain text default '(not, a column)',
      "quoted ""quote""" text,
      primary key ("spaced name")
    )`,
    "insert into odd values ('a', 1, 2, 'b', 'c')"
  ]);

  try {
    const [ row ] = CjsSqliteFormat.readJSON(bytes).odd;

    // A default containing a comma and brackets is the case that breaks a
    // naive split, and a table-level PRIMARY KEY must not become a column.
    assert.deepEqual(
      Object.keys(row),
      [ "spaced name", "bracketed", "backticked", "plain", "quoted \"quote\"" ]
    );
    assert.equal(row["spaced name"], "a");
    assert.equal(row["quoted \"quote\""], "c");
  } finally {
    cleanup();
  }
});

test("an empty table reads as no rows, and tables() needs no row decode", () => {
  const { bytes, cleanup } = Build([
    "create table empty_one (a integer, b text)",
    "create table filled (a integer)",
    "insert into filled values (1)",
    "create index filled_a on filled (a)"
  ]);

  try {
    const ours = CjsSqliteFormat.readJSON(bytes);

    assert.deepEqual(ours.empty_one, []);
    assert.equal(ours.filled.length, 1);

    // An index is not a table and must not appear as one, even though its
    // b-tree sits in the same file.
    const names = CjsSqliteFormat.tables(bytes).map(entry => entry.name);

    assert.deepEqual(names.sort(), [ "empty_one", "filled" ]);
    assert.equal(CjsSqliteFormat.readJSON(bytes, { tables: [ "filled" ] }).empty_one, undefined);
  } finally {
    cleanup();
  }
});

test("the two-table container shape these files actually use round-trips", () => {
  // The shape every client `.static` of this family carries.
  const { bytes, path, cleanup } = Build([
    "create table cache (key text primary key, value text, time real)",
    "create table indexes (key text primary key, value text)",
    `insert into cache values ('587', '{"name":"a ship","groupID":25}', 1785949659.753)`,
    "insert into indexes values ('groupID.25', '587')"
  ]);

  try {
    const ours = CjsSqliteFormat.readJSON(bytes);
    const oracle = Oracle(path);

    assert.deepEqual(ours.cache, oracle.cache);
    assert.deepEqual(ours.indexes, oracle.indexes);
    assert.equal(JSON.parse(ours.cache[0].value).groupID, 25);
  } finally {
    cleanup();
  }
});

test("malformed bytes fail as a tagged error rather than an internal one", () => {
  const { bytes, cleanup } = Build([ "create table t (a integer)" ]);

  try {
    const truncated = bytes.slice(0, 90);

    assert.throws(() => CjsSqliteFormat.read(truncated), error =>
      error.code === "CJS_SQLITE_FORMAT_INVALID");
    assert.throws(() => CjsSqliteFormat.read("not bytes"), error =>
      error.code === "CJS_SQLITE_FORMAT_INVALID");
  } finally {
    cleanup();
  }
});
