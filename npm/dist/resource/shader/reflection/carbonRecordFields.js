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
function recordText(ref) {
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
function recordRawValue(bytes) {
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
function recordRawBits(value) {
  rawValueBuffer.setFloat32(0, Number.isFinite(value) ? value : 0, true);
  return rawValueBuffer.getUint32(0, true);
}

/**
 * Wraps text as the arena string reference the writer interns.
 *
 * The offset is always 0: the writer assigns real offsets while building the
 * arena, and any value here would be discarded. Carrying the text is the whole
 * job.
 *
 * @param {string} value Text value.
 * @returns {{offset:number,value:string}} String reference.
 */
function toRecordText(value) {
  return {
    offset: 0,
    value: String(value ?? "")
  };
}

/**
 * Encodes a `u32` bit pattern as an annotation record's four raw bytes.
 *
 * The inverse of {@link recordRawValue}, and raw for the same reason: the value
 * is written through one union member and read through another, so no numeric
 * conversion may happen on the way out either.
 *
 * @param {number} rawValue Unsigned 32-bit pattern.
 * @returns {Uint8Array} Four little-endian bytes.
 */
function toRecordRawValue(rawValue) {
  const bytes = new Uint8Array(4);
  rawValueBuffer.setUint32(0, rawValue >>> 0, true);
  for (let index = 0; index < 4; index += 1) {
    bytes[index] = rawValueBuffer.getUint8(index);
  }
  return bytes;
}

/**
 * Decodes a `*Raw` sampler field back to the float the record stores.
 *
 * The inverse of {@link recordRawBits}. Assigning the raw `u32` straight across
 * would write `4286578687.0` where the file says `-3.4028235e38`, and every
 * structural check in the container would accept it.
 *
 * @param {number} bits Raw 32-bit pattern.
 * @returns {number} The float those bits encode.
 */
function toRecordFloat(bits) {
  rawValueBuffer.setUint32(0, (bits ?? 0) >>> 0, true);
  return rawValueBuffer.getFloat32(0, true);
}

/**
 * Wraps bytes as the record codec's sized blob reference.
 *
 * A zero-length blob keeps the offset word the file carried, because the writer
 * passes it straight through rather than interning anything. That word is
 * usually `0xffffffff`, but not always — measured across the shipped corpus,
 * 150 of 4833 files carry a live-looking offset behind a zero size, and
 * normalizing it changes the bytes and can make two distinct bodies collapse
 * into one. An empty payload and an absent one are not the same thing.
 *
 * @param {Uint8Array} bytes Payload bytes.
 * @param {number} [declaredSize] Size to declare when tracked separately.
 * @param {number} [unsetOffset] Offset word to keep when the size is zero.
 * @returns {{size:number,offset:number,bytes:Uint8Array}} Blob reference.
 */
function toRecordBlob(bytes, declaredSize, unsetOffset = 0xffffffff) {
  const owned = bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
  const size = declaredSize ?? owned.byteLength;
  return {
    size,
    offset: size === 0 ? unsetOffset >>> 0 : 0,
    bytes: owned
  };
}

/**
 * Returns a blob reference's payload bytes, or an empty view when the reference
 * was never set.
 *
 * @param {{size:number,offset:number,bytes:Uint8Array}|null|undefined} ref Blob.
 * @returns {Uint8Array} Owned-by-the-container view over the payload.
 */
function recordBytes(ref) {
  const bytes = ref?.bytes;
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
}

export { recordBytes, recordRawBits, recordRawValue, recordText, toRecordBlob, toRecordFloat, toRecordRawValue, toRecordText };
//# sourceMappingURL=carbonRecordFields.js.map
