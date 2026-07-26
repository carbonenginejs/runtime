/**
 * Bounds-aware `DataView` cursor that provides the primitive reads and
 * end-of-stream checks the Black transport decodes with.
 */
class CjsBlackBinaryReader {
  /**
   * Creates a CjsBlackBinaryReader over caller-provided Black bytes and reader
   * options.
   */
  constructor(dataView, context = null) {
    if (!(dataView instanceof DataView)) {
      throw new TypeError("CjsBlackBinaryReader expected a DataView");
    }
    this.data = dataView;
    this.context = context;
    this.offset = 0;
  }

  /**
   * Returns the number of unread Black bytes for the Black object-graph
   * reader.
   */
  get remaining() {
    return this.data.byteLength - this.offset;
  }

  /**
   * Reports whether the Black cursor consumed every byte for the Black
   * object-graph reader.
   */
  AtEnd() {
    return this.remaining === 0;
  }

  /**
   * Validates end against Black object-graph reader constraints and throws on
   * failure.
   */
  ExpectEnd(message = "Black reader did not reach end") {
    if (!this.AtEnd()) {
      throw new RangeError(`${message}: ${this.remaining} bytes remain`);
    }
  }

  /**
   * Validates U32 against Black object-graph reader constraints and throws on
   * failure.
   */
  ExpectU32(expected, message) {
    const actual = this.ReadU32();
    if (actual !== expected) {
      throw new RangeError(`${message}: expected ${expected}, got ${actual}`);
    }
    return actual;
  }

  /** Reads binary reader from the current Black object-graph reader. */
  ReadBinaryReader(byteLength) {
    return new CjsBlackBinaryReader(this.ReadDataView(byteLength), this.context);
  }

  /** Reads bytes from the current Black object-graph reader. */
  ReadBytes(byteLength) {
    const view = this.ReadDataView(byteLength);
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }

  /** Reads C string from the current Black object-graph reader. */
  ReadCString() {
    const startOffset = this.offset;
    while (this.ReadU8() !== 0) {
      // Scan to null terminator.
    }
    const byteOffset = this.data.byteOffset + startOffset;
    const byteLength = this.offset - startOffset - 1;
    const bytes = new Uint8Array(this.data.buffer, byteOffset, byteLength);
    return CjsBlackBinaryReader.utf8Decoder.decode(bytes);
  }

  /** Reads CW string from the current Black object-graph reader. */
  ReadCWString() {
    const startOffset = this.offset;
    while (this.ReadU16() !== 0) {
      // Scan to UTF-16 null terminator.
    }
    const byteOffset = this.data.byteOffset + startOffset;
    const byteLength = this.offset - startOffset - 2;
    const bytes = new Uint8Array(this.data.buffer, byteOffset, byteLength);
    return CjsBlackBinaryReader.utf16Decoder.decode(bytes);
  }

  /** Reads data view from the current Black object-graph reader. */
  ReadDataView(byteLength) {
    if (!Number.isInteger(byteLength) || byteLength < 0) {
      throw new RangeError(`Invalid Black byte length: ${String(byteLength)}`);
    }
    if (this.remaining < byteLength) {
      throw new RangeError(`Black reader needs ${byteLength} bytes but only ${this.remaining} remain`);
    }
    const result = new DataView(this.data.buffer, this.data.byteOffset + this.offset, byteLength);
    this.offset += byteLength;
    return result;
  }

  /**
   * Reads a 32-bit float from the Black cursor for the Black object-graph
   * reader.
   */
  ReadF32() {
    const value = this.data.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Reads a 64-bit float from the Black cursor for the Black object-graph
   * reader.
   */
  ReadF64() {
    const value = this.data.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  /**
   * Reads a signed 8-bit integer from the Black cursor for the Black
   * object-graph reader.
   */
  ReadI8() {
    const value = this.data.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * Reads a signed 16-bit integer from the Black cursor for the Black
   * object-graph reader.
   */
  ReadI16() {
    const value = this.data.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /**
   * Reads a signed 32-bit integer from the Black cursor for the Black
   * object-graph reader.
   */
  ReadI32() {
    const value = this.data.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Reads a signed 64-bit integer from the Black cursor for the Black
   * object-graph reader.
   */
  ReadI64() {
    return this.data.getBigInt64(this.ConsumeOffset(8), true);
  }

  /**
   * Resolves a narrow-string table index from the Black cursor for the Black
   * object-graph reader.
   */
  ReadStringRef() {
    const index = this.ReadU16();
    const strings = this.context?.info?.strings || [];
    if (index >= strings.length) {
      throw new RangeError(`Invalid Black string index: ${index}`);
    }
    return strings[index];
  }

  /** Reads wide string ref from the current Black object-graph reader. */
  ReadWideStringRef() {
    const index = this.ReadU16();
    const strings = this.context?.info?.wideStrings || [];
    if (index >= strings.length) {
      throw new RangeError(`Invalid Black wide string index: ${index}`);
    }
    return strings[index];
  }

  /**
   * Reads an unsigned 8-bit integer from the Black cursor for the Black
   * object-graph reader.
   */
  ReadU8() {
    const value = this.data.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * Reads an unsigned 16-bit integer from the Black cursor for the Black
   * object-graph reader.
   */
  ReadU16() {
    const value = this.data.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /**
   * Reads an unsigned 32-bit integer from the Black cursor for the Black
   * object-graph reader.
   */
  ReadU32() {
    const value = this.data.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Reads an unsigned 64-bit integer from the Black cursor for the Black
   * object-graph reader.
   */
  ReadU64() {
    return this.data.getBigUint64(this.ConsumeOffset(8), true);
  }

  /**
   * Advances the Black cursor by a validated byte count for the Black
   * object-graph reader.
   */
  Skip(byteLength) {
    this.ReadDataView(byteLength);
  }

  /** Consumes offset from the current Black object-graph reader. */
  ConsumeOffset(byteLength) {
    if (this.remaining < byteLength) {
      throw new RangeError(`Black reader needs ${byteLength} bytes but only ${this.remaining} remain`);
    }
    const offset = this.offset;
    this.offset += byteLength;
    return offset;
  }

  /**
   * Creates a bounded Black reader over supported binary input for the Black
   * object-graph reader.
   */
  static from(input, context = null) {
    if (input instanceof CjsBlackBinaryReader) return input;
    if (input instanceof DataView) return new CjsBlackBinaryReader(input, context);
    if (input instanceof ArrayBuffer) return new CjsBlackBinaryReader(new DataView(input), context);
    if (ArrayBuffer.isView(input)) {
      return new CjsBlackBinaryReader(new DataView(input.buffer, input.byteOffset, input.byteLength), context);
    }
    throw new TypeError("Black input must be an ArrayBuffer, DataView, or typed array");
  }
  static utf8Decoder = new TextDecoder("utf-8");
  static utf16Decoder = new TextDecoder("utf-16le");
}

export { CjsBlackBinaryReader };
//# sourceMappingURL=CjsBlackBinaryReader.js.map
