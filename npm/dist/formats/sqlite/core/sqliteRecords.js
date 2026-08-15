/**
 * SQLite record and varint decoding.
 *
 * The file format is documented by SQLite itself; this decodes the read-only
 * subset a full table scan needs and nothing else.
 */

const TEXT_DECODERS = Object.freeze({
  1: "utf-8",
  2: "utf-16le",
  3: "utf-16be"
});

/**
 * Reads a big-endian base-128 varint, of one to nine bytes.
 *
 * A ninth byte exists only when all eight before it set their continuation bit,
 * and it contributes all eight of its own bits rather than seven. Treating the
 * eighth byte as that terminator instead - which this did until it was
 * checked - returns size 9 for an eight-byte varint, so the caller skips a byte
 * it never read. No container in the corpus holds a varint long enough to
 * expose it, which is why decoding 80,765 rows correctly proved nothing here.
 *
 * @param {Uint8Array} bytes Buffer to read from.
 * @param {number} offset Byte offset.
 * @returns {{ value: number, size: number }} Value and bytes consumed.
 */
function ReadVarint(bytes, offset) {
  let value = 0n;

  // The first eight bytes carry seven bits each, high bit continuing.
  for (let index = 0; index < 8; index += 1) {
    const byte = bytes[offset + index];
    if (byte === undefined) {
      throw SqliteError("A varint runs past the end of the container.");
    }
    value = value << 7n | BigInt(byte & 0x7f);
    if ((byte & 0x80) === 0) {
      return {
        value: Narrow(value),
        size: index + 1
      };
    }
  }

  // Only when all eight continued does a ninth byte exist, and it contributes
  // all eight of its bits rather than seven - the one irregularity in the
  // encoding, and 8x7 + 8 is where the full 64 bits come from.
  const ninth = bytes[offset + 8];
  if (ninth === undefined) {
    throw SqliteError("A nine-byte varint runs past the end of the container.");
  }
  value = value << 8n | BigInt(ninth);
  return {
    value: Narrow(BigInt.asIntN(64, value)),
    size: 9
  };
}

/**
 * Returns a Number when one holds the value exactly, and the BigInt otherwise.
 *
 * A varint reaches 64 bits, so it can carry a rowid past 2^53 that a Number
 * would silently round. Rounding a key is worse than handing back a type the
 * caller has to notice, and it matches how a record's own wide integers are
 * already returned.
 *
 * Sizes and header lengths never come close, so callers doing arithmetic on
 * those keep seeing Numbers.
 *
 * @param {bigint} value Decoded value.
 * @returns {number|bigint} Narrowed value.
 */
function Narrow(value) {
  const narrowed = Number(value);
  return Number.isSafeInteger(narrowed) ? narrowed : value;
}

/**
 * Returns the byte length a serial type occupies in a record body.
 *
 * @param {number} serial Serial type code.
 * @returns {number} Byte length.
 */
function SerialSize(serial) {
  if (serial >= 12) {
    return Math.floor((serial - (serial % 2 === 0 ? 12 : 13)) / 2);
  }

  // 0 and 8/9 are constants stored entirely in the type; 7 is a double.
  return [0, 1, 2, 3, 4, 6, 8, 8, 0, 0][serial] ?? 0;
}

/**
 * Decodes one serial-typed value from a record body.
 *
 * @param {Uint8Array} body Record body bytes.
 * @param {number} offset Offset within the body.
 * @param {number} serial Serial type code.
 * @param {number} encoding Database text encoding (1, 2 or 3).
 * @returns {*} Decoded value.
 */
function ReadSerial(body, offset, serial, encoding) {
  if (serial === 0) {
    return null;
  }
  if (serial === 8) {
    return 0;
  }
  if (serial === 9) {
    return 1;
  }
  if (serial >= 1 && serial <= 6) {
    const size = SerialSize(serial);
    let value = 0n;
    for (let index = 0; index < size; index += 1) {
      value = value << 8n | BigInt(body[offset + index]);
    }

    // These are all signed, so a leading high bit means a negative number.
    const signed = BigInt.asIntN(size * 8, value);
    return Number.isSafeInteger(Number(signed)) ? Number(signed) : signed;
  }
  if (serial === 7) {
    return new DataView(body.buffer, body.byteOffset + offset, 8).getFloat64(0, false);
  }
  const size = SerialSize(serial);
  const slice = body.subarray(offset, offset + size);

  // Even codes from 12 are blobs; odd codes from 13 are text.
  if (serial % 2 === 0) {
    return slice.slice();
  }
  const label = TEXT_DECODERS[encoding];
  if (!label) {
    throw SqliteError(`Unsupported text encoding ${encoding}.`);
  }
  return new TextDecoder(label).decode(slice);
}

/**
 * Decodes a complete record into its column values.
 *
 * @param {Uint8Array} payload Record bytes, overflow already joined.
 * @param {number} encoding Database text encoding.
 * @returns {Array<*>} Column values in order.
 */
function ReadRecord(payload, encoding) {
  const header = ReadVarint(payload, 0);
  const serials = [];
  let cursor = header.size;
  while (cursor < header.value) {
    const serial = ReadVarint(payload, cursor);
    serials.push(serial.value);
    cursor += serial.size;
  }
  const values = [];
  let body = header.value;
  for (const serial of serials) {
    values.push(ReadSerial(payload, body, serial, encoding));
    body += SerialSize(serial);
  }
  return values;
}

/** Creates a tagged error, so a caller can tell a malformed container apart. */
function SqliteError(message) {
  const error = new Error(message);
  error.code = "CJS_SQLITE_INVALID";
  return error;
}

export { ReadRecord, ReadSerial, ReadVarint, SerialSize, SqliteError };
//# sourceMappingURL=sqliteRecords.js.map
