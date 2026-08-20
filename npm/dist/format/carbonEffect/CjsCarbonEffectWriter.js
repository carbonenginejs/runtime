import { CjsByteWriter } from '../CjsByteWriter.js';
import { CjsStringTable } from '../CjsStringTable.js';
import { CjsFormatWriteError } from '../CjsFormatError.js';
import { resolveWriteVersion, writeEffectDescription, collectArena, internArena } from './carbonEffectRecords.js';
import { CARBON_EFFECT_SOURCE_HASH_BYTES } from './CjsCarbonEffectReader.js';
export { CARBON_EFFECT_RECORD_BYTES } from './CjsCarbonEffectReader.js';

// Source: trinity/shadercompiler/ShaderCompiler.cpp:717-845 (alias dedupe, file assembly)

const textEncoder = new TextEncoder();

/**
 * Byte count of one permutation record's fixed part: `u32 name`,
 * `u8 defaultOption`, `u32 description`, `u8 type`, `u8 optionCount`
 * (`ShaderCompiler.cpp:757-761`).
 */
const PERMUTATION_FIXED_BYTES = 11;

/**
 * FNV-1a over every byte, used to bucket body-dedupe candidates.
 *
 * @param {Uint8Array} bytes Byte run to hash.
 * @returns {number} 32-bit hash.
 */
function hashBytes(bytes) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Reports whether two byte runs are identical.
 *
 * @param {Uint8Array} a First byte run.
 * @param {Uint8Array} b Second byte run.
 * @returns {boolean} True when the runs match exactly.
 */
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

/**
 * Normalises a source hash to the 32 ASCII bytes the header slot holds.
 *
 * @param {string|ArrayBufferView|Uint8Array} value 32 hex characters or 32 bytes.
 * @returns {Uint8Array} Exactly 32 bytes.
 */
function normalizeSourceHash(value) {
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value instanceof Uint8Array ? value : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (bytes.length !== CARBON_EFFECT_SOURCE_HASH_BYTES) {
    throw new CjsFormatWriteError(`Source hash must be exactly ${CARBON_EFFECT_SOURCE_HASH_BYTES} bytes`, {
      byteLength: bytes.length
    });
  }
  return bytes;
}

/**
 * Normalises a compiler version to the four bytes the header slot holds.
 *
 * The slot is `uint8_t[4]` — `{major, minor, patch, tweak}` from
 * `ShaderCompilerConfig.h.in:5`, of which Carbon's rebuild check compares only
 * the first three (`ModifiedTime.cpp:77`). Carbon's own runtime skips the field
 * entirely (`Tr2EffectRes.cpp:246-249`).
 *
 * @param {number[]|ArrayBufferView|Uint8Array} value Four version components.
 * @returns {Uint8Array} Exactly 4 bytes.
 */
function normalizeCompilerVersion(value) {
  const bytes = Array.isArray(value) ? Uint8Array.from(value, part => Number(part) & 0xff) : value instanceof Uint8Array ? value : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (bytes.length !== 4) {
    throw new CjsFormatWriteError("Compiler version must be exactly 4 bytes", {
      byteLength: bytes.length
    });
  }
  return bytes;
}

/**
 * Assembles a Carbon compiled-effect container from fully resolved parts.
 *
 * This is the low-level primitive: every arena reference in `permutationRows`
 * is already a byte offset and every body is already serialised, so the
 * function reproduces exactly Carbon's header order, alias dedupe and
 * body-offset arithmetic and nothing else. Re-emitting a file through this
 * function with its own arena and body bytes must reproduce it byte for byte.
 *
 * Body-offset base is `4 + 4 + 32 + headerSize + stringTable.GetSize()`
 * (`ShaderCompiler.cpp:801`), where `headerSize` is the byte size of the
 * permutation block plus the offset table (`:765`) and `GetSize()` includes the
 * arena's own `u32` length prefix (`StringTable.cpp:82-85`).
 *
 * @param {object} parts Resolved container parts.
 * @param {number} [parts.version] Container data version to emit; must be one of
 *     `CARBON_EFFECT_WRITE_VERSIONS`. Defaults to the current version.
 * @param {number[]|Uint8Array} parts.compilerVersion Four version bytes.
 * @param {string|Uint8Array} parts.sourceHash 32 ASCII hash bytes.
 * @param {Uint8Array} parts.stringTableBytes Arena payload, without its prefix.
 * @param {object[]} parts.permutationRows Permutation axes with resolved offsets.
 * @param {Array<{index:number, bytes:Uint8Array}>} parts.bodies Serialised bodies.
 * @returns {Uint8Array} Container bytes.
 */
function writeCarbonEffectFile(parts) {
  const version = resolveWriteVersion(parts.version);
  const compilerVersion = normalizeCompilerVersion(parts.compilerVersion ?? [0, 0, 0, 0]);
  const sourceHash = normalizeSourceHash(parts.sourceHash ?? "0".repeat(CARBON_EFFECT_SOURCE_HASH_BYTES));
  const stringTableBytes = parts.stringTableBytes ?? new Uint8Array(0);
  const permutationRows = parts.permutationRows ?? [];
  const bodies = parts.bodies ?? [];
  if (bodies.length === 0) {
    throw new CjsFormatWriteError("A Carbon effect container needs at least one body");
  }
  if (permutationRows.length > 0xff) {
    throw new CjsFormatWriteError("Permutation axis count does not fit in a u8", {
      count: permutationRows.length
    });
  }
  const ordered = bodies.slice().sort((a, b) => a.index - b.index);
  for (let position = 0; position < ordered.length; position += 1) {
    if (ordered[position].index !== position) {
      throw new CjsFormatWriteError("Carbon effect bodies must be dense and start at index 0; the reader indexes the offset table positionally", {
        position,
        index: ordered[position].index
      });
    }
  }
  let permutationBytes = 1;
  for (const row of permutationRows) {
    if (row.options.length > 0xff) {
      throw new CjsFormatWriteError("Permutation option count does not fit in a u8", {
        name: row.name,
        count: row.options.length
      });
    }
    permutationBytes += PERMUTATION_FIXED_BYTES + row.options.length * 4;
  }
  const headerSize = (ordered.length * 3 + 1) * 4 + permutationBytes;
  const base = 4 + 4 + CARBON_EFFECT_SOURCE_HASH_BYTES + headerSize + (stringTableBytes.length + 4);

  // Carbon compares packed bodies pairwise and points a duplicate's row at the
  // surviving twin, so the offset table stays dense while the file stores each
  // distinct body once (`ShaderCompiler.cpp:717-744`, `:804-820`). Keying the
  // first occurrence by content reaches the same rows in one pass.
  const byContent = new Map();
  const records = [];
  const uniqueBodies = [];
  let cursor = base;
  for (const body of ordered) {
    const key = hashBytes(body.bytes);
    const candidates = byContent.get(key);
    const existing = candidates?.find(candidate => bytesEqual(candidate.bytes, body.bytes));
    if (existing) {
      records.push({
        index: body.index,
        offset: existing.offset,
        size: existing.size
      });
      continue;
    }
    const record = {
      index: body.index,
      offset: cursor,
      size: body.bytes.length
    };
    if (candidates) candidates.push({
      bytes: body.bytes,
      ...record
    });else byContent.set(key, [{
      bytes: body.bytes,
      ...record
    }]);
    records.push(record);
    uniqueBodies.push(body.bytes);
    cursor += body.bytes.length;
  }
  const writer = new CjsByteWriter(cursor);
  writer.u32(version);
  writer.bytes(compilerVersion);
  writer.bytes(sourceHash);
  writer.u32(stringTableBytes.length);
  if (stringTableBytes.length > 0) writer.bytes(stringTableBytes);
  writer.u8(permutationRows.length);
  for (const row of permutationRows) {
    writer.u32(row.nameOffset);
    writer.u8(row.defaultOption);
    writer.u32(row.descriptionOffset);
    writer.u8(row.type);
    writer.u8(row.options.length);
    for (const optionOffset of row.options) {
      writer.u32(optionOffset);
    }
  }
  writer.u32(records.length);
  for (const record of records) {
    writer.u32(record.index);
    writer.u32(record.offset);
    writer.u32(record.size);
  }
  if (writer.length !== base) {
    throw new CjsFormatWriteError("Carbon effect header size arithmetic disagrees with the bytes written", {
      written: writer.length,
      expected: base,
      headerSize,
      permutationBytes
    });
  }
  for (const bytes of uniqueBodies) {
    writer.bytes(bytes);
  }
  return writer.toBytes();
}

/**
 * Builder for a Carbon compiled-effect container.
 *
 * Interning and emission are two passes over the same records, in that order,
 * because an arena offset is only stable once every entry is present: adding
 * after an offset has been handed out would shift every offset already written.
 * `collectArena` runs the first pass and `internArena` the second, and because
 * both drive the same `writeEffectDescription` walk they cannot fall out of
 * step with each other.
 */
class CjsCarbonEffectWriter {
  #table;
  #permutations = [];
  #bodies = [];
  #compilerVersion;
  #sourceHash;
  #backend;
  #version;

  /**
   * Creates an empty container builder.
   *
   * @param {object} [options] Builder options.
   * @param {number} [options.version] Container data version to emit; must be
   *     one of `CARBON_EFFECT_WRITE_VERSIONS`. Defaults to the current
   *     version. Rejected at construction, not at `finish()`, so a caller
   *     learns it asked for something unwritable before doing the work.
   * @param {number[]|Uint8Array} [options.compilerVersion] Four version bytes.
   * @param {string|Uint8Array} [options.sourceHash] 32 ASCII hash bytes.
   * @param {CjsStringTable} [options.stringTable] Arena to intern into.
   * @param {boolean} [options.backend] Emit the optional trailing block per pass.
   */
  constructor(options = {}) {
    this.#version = resolveWriteVersion(options.version);
    this.#table = options.stringTable ?? new CjsStringTable();
    this.#compilerVersion = options.compilerVersion ?? [0, 0, 0, 0];
    this.#sourceHash = options.sourceHash ?? "0".repeat(CARBON_EFFECT_SOURCE_HASH_BYTES);
    this.#backend = options.backend === true;
  }

  /**
   * Returns the arena this builder interns into.
   *
   * @returns {CjsStringTable} String table.
   */
  get stringTable() {
    return this.#table;
  }

  /**
   * Adds a permutation axis.
   *
   * @param {object} axis Axis description.
   * @param {string} axis.name Axis name.
   * @param {number} [axis.defaultOption] Index of the default option.
   * @param {string} [axis.description] Axis description text.
   * @param {number} [axis.type] Axis type byte.
   * @param {string[]} axis.options Option names.
   * @returns {CjsCarbonEffectWriter} This builder.
   */
  addPermutation(axis) {
    this.#permutations.push({
      name: String(axis.name ?? ""),
      defaultOption: axis.defaultOption ?? 0,
      description: String(axis.description ?? ""),
      type: axis.type ?? 0,
      options: (axis.options ?? []).map(option => String(option))
    });
    return this;
  }

  /**
   * Adds one permutation's description record tree.
   *
   * @param {number} index Permutation index.
   * @param {object} description Description record tree.
   * @returns {CjsCarbonEffectWriter} This builder.
   */
  addBody(index, description) {
    this.#bodies.push({
      index,
      description,
      bytes: null
    });
    return this;
  }

  /**
   * Adds one permutation's already-serialised description bytes.
   *
   * Used when re-emitting a file whose arena is being reused verbatim: the
   * bytes already carry resolved offsets into that arena, so they must not be
   * re-interned.
   *
   * @param {number} index Permutation index.
   * @param {Uint8Array} bytes Serialised description blob.
   * @returns {CjsCarbonEffectWriter} This builder.
   */
  addRawBody(index, bytes) {
    this.#bodies.push({
      index,
      description: null,
      bytes: Uint8Array.from(bytes)
    });
    return this;
  }

  /**
   * Interns, serialises and assembles the container.
   *
   * @returns {Uint8Array} Container bytes.
   */
  toBytes() {
    for (const axis of this.#permutations) {
      axis.nameRef = this.#table.addString(axis.name);
      axis.descriptionRef = this.#table.addString(axis.description);
      axis.optionRefs = axis.options.map(option => this.#table.addString(option));
    }
    for (const body of this.#bodies) {
      if (body.description) {
        writeEffectDescription(new CjsByteWriter(), body.description, {
          arena: collectArena(this.#table),
          backend: this.#backend,
          version: this.#version
        });
      }
    }
    this.#table.finish();
    const arena = internArena(this.#table);
    const bodies = this.#bodies.map(body => {
      if (body.bytes) return {
        index: body.index,
        bytes: body.bytes
      };
      const writer = new CjsByteWriter();
      writeEffectDescription(writer, body.description, {
        arena,
        backend: this.#backend,
        version: this.#version
      });
      return {
        index: body.index,
        bytes: writer.toBytes()
      };
    });
    const permutationRows = this.#permutations.map(axis => ({
      name: axis.name,
      nameOffset: this.#table.offsetOf(axis.nameRef),
      defaultOption: axis.defaultOption,
      descriptionOffset: this.#table.offsetOf(axis.descriptionRef),
      type: axis.type,
      options: axis.optionRefs.map(reference => this.#table.offsetOf(reference))
    }));
    return writeCarbonEffectFile({
      version: this.#version,
      compilerVersion: this.#compilerVersion,
      sourceHash: this.#sourceHash,
      stringTableBytes: this.#table.toBytes(),
      permutationRows,
      bodies
    });
  }
}

export { CARBON_EFFECT_SOURCE_HASH_BYTES, CjsCarbonEffectWriter, writeCarbonEffectFile };
//# sourceMappingURL=CjsCarbonEffectWriter.js.map
