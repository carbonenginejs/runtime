const CEWG_MAGIC = "CEWG";
const CEWG_VERSION = 1;
const textEncoder = new TextEncoder();

/**
 * Builds CarbonEngineJS CEWG shader package bytes.
 */
class CewgPackageBuilder {
  /**
  * Builds a CEWG v1 package from ordered chunks.
  *
  * @param {Array<[string, string|object|Uint8Array|ArrayBuffer|ArrayBufferView]>} chunks Ordered package chunks.
  * @returns {Uint8Array} Package bytes.
  */
  static build(chunks) {
    const encodedChunks = chunks.map(([tag, value]) => ({
      tag: normalizeTag(tag),
      bytes: normalizeChunkValue(value)
    }));
    const tags = new Set();
    for (const chunk of encodedChunks) {
      if (tags.has(chunk.tag)) {
        throw new Error(`CEWG package contains duplicate chunk tag ${chunk.tag}`);
      }
      tags.add(chunk.tag);
    }
    const size = CEWG_MAGIC.length + 8 + encodedChunks.reduce((sum, chunk) => sum + 8 + chunk.bytes.length, 0);
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    let offset = 0;
    offset = writeAscii(out, offset, CEWG_MAGIC);
    view.setUint32(offset, CEWG_VERSION, true);
    offset += 4;
    view.setUint32(offset, encodedChunks.length, true);
    offset += 4;
    for (const chunk of encodedChunks) {
      offset = writeAscii(out, offset, chunk.tag);
      view.setUint32(offset, chunk.bytes.length, true);
      offset += 4;
      out.set(chunk.bytes, offset);
      offset += chunk.bytes.length;
    }
    return out;
  }
}

/**
 * Normalizes a package chunk tag.
 *
 * @param {string} tag Four-character chunk tag.
 * @returns {string} Normalized tag.
 */
function normalizeTag(tag) {
  if (typeof tag !== "string" || tag.length !== 4 || [...tag].some(character => {
    const code = character.charCodeAt(0);
    return code < 0x21 || code > 0x7e;
  })) {
    throw new Error(`CEWG chunk tag must contain four printable ASCII characters: ${tag}`);
  }
  return tag;
}

/**
 * Normalizes a package chunk payload.
 *
 * @param {string|object|Uint8Array|ArrayBuffer|ArrayBufferView} value Chunk payload.
 * @returns {Uint8Array} Payload bytes.
 */
function normalizeChunkValue(value) {
  if (typeof value === "string") {
    return textEncoder.encode(value);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value && typeof value === "object") {
    return textEncoder.encode(`${JSON.stringify(value)}\n`);
  }
  throw new Error("Unsupported CEWG chunk value");
}

/**
 * Writes ASCII text into a byte buffer.
 *
 * @param {Uint8Array} out Output buffer.
 * @param {number} offset Current byte offset.
 * @param {string} value ASCII text.
 * @returns {number} Updated byte offset.
 */
function writeAscii(out, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    out[offset + i] = value.charCodeAt(i) & 0xff;
  }
  return offset + value.length;
}

export { CewgPackageBuilder };
//# sourceMappingURL=CewgPackageBuilder.js.map
