import { validateCewgpuChunkTag } from './tags.js';

const CEWGPU_MAGIC = "CWGP";
const CEWGPU_VERSION = 1;
const textEncoder = new TextEncoder();

/**
 * Builds CarbonEngineJS CEWGPU package bytes.
 */
class CewgpuPackageBuilder {
  /**
  * Builds a CEWGPU v1 package from ordered chunks.
  *
  * @param {Array<[string, string|object|Uint8Array|ArrayBuffer|ArrayBufferView]>} chunks Ordered package chunks.
  * @returns {Uint8Array} Package bytes.
  */
  static build(chunks) {
    const tags = new Set();
    const encodedChunks = chunks.map(([tag, value]) => ({
      tag: normalizeTag(tag, tags),
      bytes: normalizeChunkValue(value)
    }));
    const size = CEWGPU_MAGIC.length + 8 + encodedChunks.reduce((sum, chunk) => sum + 8 + chunk.bytes.length, 0);
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    let offset = 0;
    offset = writeAscii(out, offset, CEWGPU_MAGIC);
    view.setUint32(offset, CEWGPU_VERSION, true);
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
 * @param {Set<string>} tags Tags already present in the package.
 * @returns {string} Normalized tag.
 */
function normalizeTag(tag, tags) {
  const normalized = validateCewgpuChunkTag(tag);
  if (tags.has(normalized)) {
    throw new Error(`CEWGPU package contains duplicate chunk tag ${normalized}`);
  }
  tags.add(normalized);
  return normalized;
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
  throw new Error("Unsupported CEWGPU chunk value");
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

export { CewgpuPackageBuilder };
//# sourceMappingURL=CewgpuPackageBuilder.js.map
