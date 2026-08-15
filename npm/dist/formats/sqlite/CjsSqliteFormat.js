import { ReadColumns } from './core/sqliteSchema.js';
import { ReadHeader, TableRows } from './core/sqlitePages.js';
import { SqliteError, ReadRecord } from './core/sqliteRecords.js';

const OUTPUT_JSON = "json";
const OUTPUT_PAYLOAD = "payload";
const OUTPUT_RAW = "raw";
const MASTER_ROOT_PAGE = 1;

/**
 * Reads a SQLite 3 container as data.
 *
 * **This is a reader, not a database.** It accepts no SQL and runs no queries.
 * It returns the tables a container holds and every row of them, because that
 * is the whole of what this organization does with a SQLite file: the client's
 * `.static` containers and the prepared static data export are both opened,
 * scanned once, and closed.
 *
 * That scope is what makes it small. A query planner, an index walker, writing,
 * journalling and transactions are most of SQLite and none of this, so none of
 * them are here. Index b-tree pages are never visited: an index holds no data a
 * table scan does not already produce.
 *
 * It exists because `runtime-resource` is browser-safe and ships no SQLite
 * engine, so `.static` containers of the SQLite family previously needed a
 * driver injected by the caller — which meant Node, and in practice the
 * experimental `node:sqlite`. Nothing here touches a filesystem or a binding.
 *
 * Values map as the format defines them: NULL, integers, doubles, text decoded
 * with the database's own encoding, and blobs as `Uint8Array`. An integer wider
 * than `Number.MAX_SAFE_INTEGER` is returned as a `BigInt` rather than silently
 * rounded.
 */
class CjsSqliteFormat {
  /**
   * Reports whether bytes are a SQLite container, by signature.
   *
   * @param {Uint8Array|ArrayBuffer} input Candidate bytes.
   * @returns {boolean} True when the header signature matches.
   */
  static is(input) {
    try {
      ReadHeader(Normalize(input));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reports whether these bytes are a SQLite container, on the signature.
   *
   * The signature is the whole claim: the header either says
   * `SQLite format 3` or it does not, so this is verified by content rather
   * than inferred from a name — which matters because `.static` carries three
   * unrelated families and the extension proves nothing.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @param {object} [options] Probe options.
   * @returns {object} Resource probe.
   */
  static isSupported(input, options = null) {
    return Probe(this.is(input), options);
  }

  // INTERIM, 2026-08-16. No `inspect` alias onto `isSupported`, while nineteen
  // sibling formats have one. The capability-surface decision page names that
  // alias as the confusion it wants removed, but its own "What is not proposed"
  // says not to change things on its strength alone - so this is a divergence
  // awaiting a decision, not a settled position.
  //
  // See maintenance/INTERIM-sqlite-and-static-2026-08-16.md before resolving it,
  // and search for callers of `inspect` on any format first.

  /**
   * Reads every table and row.
   *
   * @param {Uint8Array|ArrayBuffer} input Container bytes.
   * @param {object} [options] Read options.
   * @param {string} [options.output] `json`, `payload` or `raw`.
   * @param {string[]} [options.tables] Read only these tables.
   * @returns {object} Tables keyed by name, each an array of row objects.
   */
  static read(input, options = {}) {
    const output = options.output ?? OUTPUT_JSON;
    const bytes = Normalize(input);
    const header = ReadHeader(bytes);
    const schema = ReadMaster(bytes, header);
    if (output === OUTPUT_RAW) {
      return {
        header,
        schema
      };
    }
    const wanted = options.tables ? new Set(options.tables) : null;
    const tables = {};
    for (const entry of schema) {
      if (entry.type !== "table" || wanted && !wanted.has(entry.name)) {
        continue;
      }

      // A table with no root page holds nothing: a view, or WITHOUT ROWID.
      tables[entry.name] = entry.rootPage ? ReadTable(bytes, header, entry, output === OUTPUT_JSON) : [];
    }
    return tables;
  }

  /** Reads to plain JSON-compatible values, converting blobs to arrays. */
  static readJSON(input, options = {}) {
    return this.read(input, {
      ...options,
      output: OUTPUT_JSON
    });
  }

  /** Reads with blobs left as `Uint8Array` and wide integers as `BigInt`. */
  static readPayload(input, options = {}) {
    return this.read(input, {
      ...options,
      output: OUTPUT_PAYLOAD
    });
  }

  /** Returns the parsed header and `sqlite_master` entries, decoding no rows. */
  static readRaw(input, options = {}) {
    return this.read(input, {
      ...options,
      output: OUTPUT_RAW
    });
  }

  /**
   * Lists the tables a container holds, without reading their rows.
   *
   * @param {Uint8Array|ArrayBuffer} input Container bytes.
   * @returns {Array<object>} One entry per table.
   */
  static tables(input) {
    const bytes = Normalize(input);
    return ReadMaster(bytes, ReadHeader(bytes)).filter(entry => entry.type === "table");
  }
  static Output = Object.freeze({
    JSON: OUTPUT_JSON,
    PAYLOAD: OUTPUT_PAYLOAD,
    RAW: OUTPUT_RAW
  });
  static id = "sqlite";
  static extensions = Object.freeze([".sqlite", ".db", ".sqlite3"]);
  static type = Object.freeze(["data"]);
  static mediaTypes = Object.freeze(["data"]);
  static inputTypes = Object.freeze(["sqlite"]);
  static outputTypes = Object.freeze([OUTPUT_JSON, OUTPUT_PAYLOAD]);
  static debugOutputTypes = Object.freeze([OUTPUT_RAW]);
}

/** Builds the probe shape the resource manager routes on. */
function Probe(recognized, options) {
  return {
    format: "sqlite",
    source: "buffer",
    supported: recognized ? "full" : "none",
    confidence: 1,
    preferred: "sqlite",
    // The header signature is content, not a declaration, so a match is
    // evidence rather than a claim to be checked later.
    verified: true,
    reason: recognized ? "Recognized a SQLite 3 container." : "The header signature is not SQLite 3.",
    variants: [{
      kind: "container",
      codec: "sqlite",
      supported: recognized
    }],
    metadata: {
      family: "sqlite",
      decodable: recognized
    },
    ...(options || {})
  };
}

/** Reads `sqlite_master`, which is always the table b-tree rooted at page 1. */
function ReadMaster(bytes, header) {
  const entries = [];
  for (const row of TableRows(bytes, header, MASTER_ROOT_PAGE)) {
    const [type, name, tableName, rootPage, sql] = ReadRecord(row.payload, header.encoding);
    entries.push({
      type: String(type ?? ""),
      name: String(name ?? ""),
      tableName: String(tableName ?? ""),
      rootPage: Number(rootPage ?? 0),
      sql: sql === null || sql === undefined ? "" : String(sql)
    });
  }
  return entries;
}

/** Reads one table's rows as objects, named from its `CREATE TABLE` text. */
function ReadTable(bytes, header, entry, json) {
  const {
    names,
    rowidAlias
  } = ReadColumns(entry.sql);
  const rows = [];
  for (const row of TableRows(bytes, header, entry.rootPage)) {
    const values = ReadRecord(row.payload, header.encoding);
    const record = {};
    for (let index = 0; index < values.length; index += 1) {
      // Positional names keep a row readable when the statement could not be
      // parsed, rather than dropping columns that certainly hold data.
      const name = names[index] ?? `column${index}`;
      const value = index === rowidAlias && values[index] === null ? row.rowid : values[index];
      record[name] = json ? ToJSON(value) : value;
    }
    rows.push(record);
  }
  return rows;
}

/** Converts a decoded value to something `JSON.stringify` keeps losslessly. */
function ToJSON(value) {
  if (value instanceof Uint8Array) {
    return Array.from(value);
  }

  // A BigInt has no JSON form; a decimal string keeps every digit.
  return typeof value === "bigint" ? value.toString(10) : value;
}

/** Accepts the byte forms every other format here accepts. */
function Normalize(input) {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw SqliteError("A SQLite container must be supplied as bytes.");
}

export { CjsSqliteFormat };
//# sourceMappingURL=CjsSqliteFormat.js.map
