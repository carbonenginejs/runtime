import { CjsFormatWriteError } from './CjsFormatError.js';

// Source: trinity/shadercompiler/StringTable.cpp, trinity/shadercompiler/StringTable.h

const textEncoder = new TextEncoder();

/**
 * The null arena reference. `StringTable::GetOffset` returns this for an
 * invalid or unknown reference (`StringTable.cpp:52-68`), and Carbon's reader
 * tolerates it at exactly one wire position: a stage's default-constant-value
 * offset when the accompanying size is zero
 * (`Tr2EffectDescription.cpp:80-91`). Everywhere else it fails the load.
 */
const CJS_STRING_TABLE_NULL_REFERENCE = 0xffffffff;

/**
 * Compares two byte runs the way Carbon's `Blob::operator<` does: `memcmp`
 * over the shorter length, then shorter-wins on a tie
 * (`StringTable.h:109-122`).
 *
 * @param {Uint8Array} a First byte run.
 * @param {Uint8Array} b Second byte run.
 * @returns {number} Negative, zero, or positive ordering result.
 */
function compareTableBlobs(a, b) {
  const shared = Math.min(a.length, b.length);
  for (let index = 0; index < shared; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

/**
 * FNV-1a over every byte, used only to bucket dedupe candidates.
 *
 * Carbon hashes a stride-sampled subset (`StringTable.h:124-134`); hashing all
 * bytes costs the same asymptotically and collides less. Either way the
 * decision is made by the full byte comparison that follows, so the choice of
 * hash cannot change the emitted arena.
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
 * Carbon's compiled-effect string table: a deduplicated blob arena whose
 * offsets are assigned by a bytewise sort rather than by insertion order.
 *
 * The arena holds three kinds of entry, distinguished only by how the wire
 * refers to them:
 *
 * - NUL-terminated strings, added with the terminator (`strlen + 1`,
 *   `StringTable.cpp:18-21`), referenced by a bare `u32` offset;
 * - sized blobs — shader bytecode, program source, default constant values —
 *   added with exactly their own bytes and no terminator
 *   (`StringTable.cpp:23-41`), referenced by a `{u32 size, u32 offset}` pair;
 * - nothing else. Carbon persists no manifest: `StringTable::Write` emits a
 *   `u32` payload size and the payload (`StringTable.cpp:110-143`), and every
 *   reference site resolves its own entry.
 *
 * Two deliberate departures from Carbon, both of which make byte-identical
 * output more likely rather than less:
 *
 * - `m_size` is initialised. Carbon's constructor leaves it indeterminate
 *   (`StringTable.cpp:9-12`, `StringTable.h:170`) and gets away with it only
 *   because the one instance is a zero-initialised global.
 * - adding after an offset has been handed out is an error rather than a silent
 *   resort. In Carbon, `GetOffset` re-sorts whenever the table is dirty
 *   (`StringTable.cpp:59-62`), which reassigns *every* offset — including
 *   offsets already baked into packed bodies. Carbon avoids the corruption by
 *   interning all late strings before the packing pass; we fail closed instead.
 */
class CjsStringTable {
  #blobs = [];
  #buckets = new Map();
  #byteLength = 0;
  #offsets = null;
  #handedOutOffsets = false;

  /**
   * Returns the arena payload byte count, excluding the `u32` size prefix.
   *
   * This is Carbon's `m_size` and the value the reader bounds-checks every
   * offset against.
   *
   * @returns {number} Payload byte count.
   */
  get byteLength() {
    return this.#byteLength;
  }

  /**
   * Returns the byte count the arena occupies in the file, including its own
   * `u32` size prefix.
   *
   * This is Carbon's `GetSize()` (`StringTable.cpp:82-85`), the term used by
   * the body-offset base arithmetic.
   *
   * @returns {number} On-disk byte count.
   */
  get containerSize() {
    return this.#byteLength + 4;
  }

  /**
   * Returns the number of distinct entries in the arena.
   *
   * @returns {number} Deduplicated entry count.
   */
  get entryCount() {
    return this.#blobs.length;
  }

  /**
   * Interns a NUL-terminated string and returns its reference.
   *
   * @param {string} value Text to intern, stored with a trailing NUL.
   * @returns {number} Arena reference for later `offsetOf`.
   */
  addString(value) {
    const text = textEncoder.encode(String(value));
    const bytes = new Uint8Array(text.length + 1);
    bytes.set(text, 0);
    return this.#add(bytes);
  }

  /**
   * Interns exact bytes with no terminator and returns their reference.
   *
   * @param {ArrayBufferView|Uint8Array} value Bytes to intern.
   * @returns {number} Arena reference for later `offsetOf`.
   */
  addBytes(value) {
    const source = value instanceof Uint8Array ? value : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return this.#add(Uint8Array.from(source));
  }

  /**
   * Assigns every entry its final offset by Carbon's bytewise sort.
   *
   * Idempotent while the table is unchanged. Returns this table so it can be
   * chained onto construction.
   *
   * @returns {CjsStringTable} This table.
   */
  finish() {
    if (this.#offsets) return this;
    const order = this.#blobs.map((blob, index) => index);
    order.sort((a, b) => compareTableBlobs(this.#blobs[a], this.#blobs[b]));
    const offsets = new Array(this.#blobs.length);
    let cursor = 0;
    for (const index of order) {
      offsets[index] = cursor;
      cursor += this.#blobs[index].length;
    }
    this.#offsets = offsets;
    return this;
  }

  /**
   * Resolves an arena reference to its byte offset.
   *
   * `null` and `undefined` resolve to the `0xffffffff` null reference, so a
   * caller can pass an absent optional field straight through.
   *
   * @param {number|null|undefined} reference Reference from `addString`/`addBytes`.
   * @returns {number} Byte offset, or `0xffffffff` for a null reference.
   */
  offsetOf(reference) {
    if (reference === null || reference === undefined) {
      return CJS_STRING_TABLE_NULL_REFERENCE;
    }
    if (!Number.isInteger(reference) || reference < 0 || reference >= this.#blobs.length) {
      throw new CjsFormatWriteError("Unknown string-table reference", {
        reference,
        entryCount: this.#blobs.length
      });
    }
    this.finish();
    this.#handedOutOffsets = true;
    return this.#offsets[reference];
  }

  /**
   * Returns the interned bytes behind a reference.
   *
   * @param {number} reference Reference from `addString`/`addBytes`.
   * @returns {Uint8Array} View over the interned bytes.
   */
  bytesOf(reference) {
    if (!Number.isInteger(reference) || reference < 0 || reference >= this.#blobs.length) {
      throw new CjsFormatWriteError("Unknown string-table reference", {
        reference,
        entryCount: this.#blobs.length
      });
    }
    return this.#blobs[reference];
  }

  /**
   * Materialises the arena payload in sorted order.
   *
   * @returns {Uint8Array} Arena payload, without the `u32` size prefix.
   */
  toBytes() {
    this.finish();
    const out = new Uint8Array(this.#byteLength);
    for (let index = 0; index < this.#blobs.length; index += 1) {
      out.set(this.#blobs[index], this.#offsets[index]);
    }
    return out;
  }

  /**
   * Writes the arena exactly as `StringTable::Write` does: a `u32` payload
   * size followed by the payload (`StringTable.cpp:110-143`).
   *
   * @param {import("./CjsByteWriter.js").CjsByteWriter} writer Target writer.
   */
  write(writer) {
    this.finish();
    writer.u32(this.#byteLength);
    if (this.#byteLength === 0) return;
    writer.bytes(this.toBytes());
  }

  /**
   * Interns a byte run, returning an existing reference when the bytes match
   * exactly. Dedupe is on full content and length, with no suffix merging —
   * Carbon's `Blob::operator==` (`StringTable.h:104-107`).
   *
   * @param {Uint8Array} bytes Owned bytes to intern.
   * @returns {number} Arena reference.
   */
  #add(bytes) {
    const key = hashBytes(bytes);
    const bucket = this.#buckets.get(key);
    if (bucket) {
      for (const candidate of bucket) {
        if (compareTableBlobs(this.#blobs[candidate], bytes) === 0) {
          return candidate;
        }
      }
    }
    if (this.#handedOutOffsets) {
      throw new CjsFormatWriteError("String-table entry added after offsets were resolved; every offset already handed out would shift", {
        byteLength: bytes.length
      });
    }
    const reference = this.#blobs.length;
    this.#blobs.push(bytes);
    this.#byteLength += bytes.length;
    this.#offsets = null;
    if (bucket) bucket.push(reference);else this.#buckets.set(key, [reference]);
    return reference;
  }
}

export { CJS_STRING_TABLE_NULL_REFERENCE, CjsStringTable, compareTableBlobs };
//# sourceMappingURL=CjsStringTable.js.map
