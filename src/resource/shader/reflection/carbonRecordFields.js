// Shared field accessors for Carbon v15 description records.
//
// The record tree is what the one Carbon effect reader emits
// (`format/carbonEffect/carbonEffectRecords.js`). Each reflection class maps its
// own record, but three field encodings recur across all of them and are worth
// naming once rather than open-coding at every call site:
//
//   - a string is an arena reference `{offset, value}`, not a string;
//   - an annotation value is four raw little-endian bytes, because Carbon writes
//     it through one union member and reads it through another, so the bytes are
//     the only faithful carrier;
//   - a blob is `{size, offset, bytes}` with `offset === 0xffffffff` meaning the
//     reference was never set, which is not the same as an empty payload.
//
// These are read-direction only. The write direction lives in
// `carbonDescriptionFromPortable.js` and must not import from here: the two
// directions are checked against each other by the round-trip tests, and sharing
// a helper would let one mistake satisfy both sides.

const rawValueBuffer = new DataView(new ArrayBuffer(4));

/**
 * Reads the text out of an arena string reference.
 *
 * @param {{offset:number,value:string}|null|undefined} ref String reference.
 * @returns {string} The referenced text, or "" when unset.
 */
export function recordText(ref)
{
  return String(ref?.value ?? "");
}

/**
 * Decodes an annotation record's four raw bytes as the `u32` bit pattern the
 * reflection classes carry as `rawValue`.
 *
 * Carbon stores the value as a `{float,int32_t}` union and the type byte decides
 * which member is meaningful, so the bits travel untyped and each annotation type
 * reinterprets them itself. Decoding to a number here — rather than to a float —
 * is what keeps a value like `-FLT_MAX` exact.
 *
 * @param {Uint8Array|null|undefined} bytes Four little-endian bytes.
 * @returns {number} The unsigned 32-bit pattern those bytes carry.
 */
export function recordRawValue(bytes)
{
  if (!bytes || bytes.length < 4) return 0;
  rawValueBuffer.setUint8(0, bytes[0]);
  rawValueBuffer.setUint8(1, bytes[1]);
  rawValueBuffer.setUint8(2, bytes[2]);
  rawValueBuffer.setUint8(3, bytes[3]);
  return rawValueBuffer.getUint32(0, true);
}

/**
 * Re-encodes a record's `float` as the `u32` bit pattern the reflection classes
 * carry in their `*Raw` sampler fields.
 *
 * The container stores sampler LOD and border values as real floats, but the
 * class keeps the bits, so a value like `-FLT_MAX` survives serialization without
 * a decimal round trip. Reading the float and re-encoding it here is exact: the
 * record's value came from a `f32` read, so it is already representable.
 *
 * @param {number} value Float value from a sampler record.
 * @returns {number} The unsigned 32-bit pattern encoding that float.
 */
export function recordRawBits(value)
{
  rawValueBuffer.setFloat32(0, Number.isFinite(value) ? value : 0, true);
  return rawValueBuffer.getUint32(0, true);
}

/**
 * Returns a blob reference's payload bytes, or an empty view when the reference
 * was never set.
 *
 * @param {{size:number,offset:number,bytes:Uint8Array}|null|undefined} ref Blob.
 * @returns {Uint8Array} Owned-by-the-container view over the payload.
 */
export function recordBytes(ref)
{
  const bytes = ref?.bytes;
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
}
