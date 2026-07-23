const ZIGZAG = [0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44, 53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63];
const COSINE = Array.from({
  length: 8
}, (_, x) => Array.from({
  length: 8
}, (_, u) => Math.cos((2 * x + 1) * u * Math.PI / 16)));
const SCALE = Array.from({
  length: 8
}, (_, value) => value === 0 ? 1 / Math.sqrt(2) : 1);
function decodeJpegToRgba(bytes, metadata = {}) {
  const decoder = new BaselineJpegDecoder(bytes);
  const image = decoder.decode();
  return {
    payloadType: "rgba",
    sourceFormat: "jpeg",
    mimeType: "image/jpeg",
    containerOnly: false,
    isDecoded: true,
    rgbaDecodeSupported: true,
    width: image.width,
    height: image.height,
    pixelFormat: "rgba8unorm",
    data: image.data,
    strideBytes: image.width * 4,
    origin: "top-left",
    colorSpace: "srgb",
    alphaMode: "opaque",
    metadata: {
      ...metadata,
      decoder: "software-baseline"
    }
  };
}
function canDecodeJpeg(metadata = {}) {
  return metadata.sourceFormat === "jpeg" && metadata.precision === 8 && metadata.components >= 1 && metadata.components <= 3 && (metadata.marker === 0xc0 || metadata.marker === 0xc1) && metadata.progressive !== true;
}

/**
 * Pure-JS baseline sequential JPEG decoder that parses markers, quantization
 * and Huffman tables, and entropy-coded scans into RGBA pixels.
 */
class BaselineJpegDecoder {
  #bytes;
  #offset = 0;
  #quantization = new Map();
  #huffman = new Map();
  #frame = null;
  #scan = null;
  #restartInterval = 0;
  constructor(bytes) {
    this.#bytes = bytes;
  }
  decode() {
    this.readMarker(0xd8);
    while (this.#offset < this.#bytes.length) {
      const marker = this.nextMarker();
      if (marker === 0xd9) break;
      if (marker === 0xda) {
        this.readScanHeader();
        return this.decodeScan();
      }
      if (marker === 0xdb) this.readQuantizationTables();else if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) this.readFrame(marker);else if (marker === 0xc4) this.readHuffmanTables();else if (marker === 0xdd) this.readRestartInterval();else if (marker >= 0xe0 && marker <= 0xef || marker === 0xfe) this.skipSegment();else if (marker === 0xd8 || marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;else this.skipSegment();
    }
    throw new Error("jpeg: no baseline scan found");
  }
  readFrame(marker) {
    const length = this.readU16();
    const precision = this.readU8();
    const height = this.readU16();
    const width = this.readU16();
    const components = this.readU8();
    if (precision !== 8) throw new Error(`jpeg: unsupported sample precision ${precision}`);
    if (!width || !height || !components || components > 3) throw new Error("jpeg: unsupported frame layout");
    const list = [];
    let maxH = 0,
      maxV = 0;
    for (let i = 0; i < components; i++) {
      const id = this.readU8();
      const sampling = this.readU8();
      const component = {
        id,
        h: sampling >>> 4,
        v: sampling & 0x0f,
        quantizationId: this.readU8(),
        dc: 0,
        ac: 0,
        previousDc: 0,
        plane: null,
        planeWidth: 0,
        planeHeight: 0
      };
      if (!component.h || !component.v || component.h > 4 || component.v > 4) {
        throw new Error("jpeg: unsupported component sampling");
      }
      maxH = Math.max(maxH, component.h);
      maxV = Math.max(maxV, component.v);
      list.push(component);
    }
    const consumed = 8 + components * 3;
    if (length !== consumed) this.#offset += Math.max(0, length - consumed);
    if (marker === 0xc2) throw new Error("jpeg: progressive scans are not supported by the software decoder");
    this.#frame = {
      width,
      height,
      precision,
      components: list,
      maxH,
      maxV
    };
  }
  readQuantizationTables() {
    const end = this.#offset + this.readU16() - 2;
    while (this.#offset < end) {
      const info = this.readU8();
      const precision = info >>> 4;
      const id = info & 0x0f;
      if (precision > 1) throw new Error("jpeg: unsupported 16-bit quantization table");
      const table = new Uint16Array(64);
      for (let i = 0; i < 64; i++) table[ZIGZAG[i]] = precision ? this.readU16() : this.readU8();
      this.#quantization.set(id, table);
    }
    this.#offset = end;
  }
  readHuffmanTables() {
    const end = this.#offset + this.readU16() - 2;
    while (this.#offset < end) {
      const info = this.readU8();
      const table = new Array(17).fill(null).map(() => []);
      const counts = [];
      for (let length = 1; length <= 16; length++) counts.push(this.readU8());
      let code = 0;
      let valueIndex = 0;
      for (let length = 1; length <= 16; length++) {
        for (let i = 0; i < counts[length - 1]; i++) {
          table[length].push({
            code,
            value: this.#bytes[this.#offset + valueIndex]
          });
          valueIndex++;
          code++;
        }
        code <<= 1;
      }
      this.#offset += valueIndex;
      this.#huffman.set(`${info >>> 4}:${info & 0x0f}`, table);
    }
    this.#offset = end;
  }
  readRestartInterval() {
    const length = this.readU16();
    if (length !== 4) throw new Error("jpeg: invalid restart interval segment");
    this.#restartInterval = this.readU16();
  }
  readScanHeader() {
    const length = this.readU16();
    const count = this.readU8();
    if (!this.#frame || count !== this.#frame.components.length) throw new Error("jpeg: unsupported scan component count");
    const byId = new Map(this.#frame.components.map(component => [component.id, component]));
    for (let i = 0; i < count; i++) {
      const id = this.readU8();
      const tables = this.readU8();
      const component = byId.get(id);
      if (!component) throw new Error(`jpeg: scan references unknown component ${id}`);
      component.dc = tables >>> 4;
      component.ac = tables & 0x0f;
    }
    const spectralStart = this.readU8();
    const spectralEnd = this.readU8();
    const successive = this.readU8();
    if (spectralStart !== 0 || spectralEnd !== 63 || successive !== 0) {
      throw new Error("jpeg: progressive or non-sequential scan is not supported");
    }
    const consumed = 6 + count * 2;
    if (length !== consumed) this.#offset += Math.max(0, length - consumed);
    this.#scan = {
      byId
    };
  }
  decodeScan() {
    const frame = this.#frame;
    const mcuWidth = 8 * frame.maxH;
    const mcuHeight = 8 * frame.maxV;
    const mcuColumns = Math.ceil(frame.width / mcuWidth);
    const mcuRows = Math.ceil(frame.height / mcuHeight);
    for (const component of frame.components) {
      component.planeWidth = mcuColumns * component.h * 8;
      component.planeHeight = mcuRows * component.v * 8;
      component.plane = new Uint8Array(component.planeWidth * component.planeHeight);
    }
    const reader = new EntropyReader(this.#bytes, this.#offset);
    let mcuIndex = 0;
    for (let row = 0; row < mcuRows; row++) {
      for (let column = 0; column < mcuColumns; column++) {
        for (const component of frame.components) {
          for (let y = 0; y < component.v; y++) {
            for (let x = 0; x < component.h; x++) {
              const block = this.decodeBlock(reader, component);
              const originX = (column * component.h + x) * 8;
              const originY = (row * component.v + y) * 8;
              writeBlock(component.plane, component.planeWidth, originX, originY, block);
            }
          }
        }
        mcuIndex++;
        if (this.#restartInterval && mcuIndex % this.#restartInterval === 0 && mcuIndex < mcuColumns * mcuRows) {
          reader.align();
          reader.consumeRestart();
          for (const component of frame.components) component.previousDc = 0;
        }
      }
    }
    const data = new Uint8Array(frame.width * frame.height * 4);
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const offset = (y * frame.width + x) * 4;
        if (frame.components.length === 1) {
          const value = frame.components[0].plane[y * frame.components[0].planeWidth + x];
          data[offset] = value;
          data[offset + 1] = value;
          data[offset + 2] = value;
        } else {
          const yValue = sampleComponent(frame.components[0], x, y, frame.width, frame.height);
          const cb = sampleComponent(frame.components[1], x, y, frame.width, frame.height) - 128;
          const cr = sampleComponent(frame.components[2], x, y, frame.width, frame.height) - 128;
          data[offset] = clampByte(yValue + 1.402 * cr);
          data[offset + 1] = clampByte(yValue - 0.344136 * cb - 0.714136 * cr);
          data[offset + 2] = clampByte(yValue + 1.772 * cb);
        }
        data[offset + 3] = 255;
      }
    }
    return {
      width: frame.width,
      height: frame.height,
      data
    };
  }
  decodeBlock(reader, component) {
    const quantization = this.#quantization.get(component.quantizationId);
    const dcTable = this.#huffman.get(`0:${component.dc}`);
    const acTable = this.#huffman.get(`1:${component.ac}`);
    if (!quantization || !dcTable || !acTable) throw new Error("jpeg: missing quantization or Huffman table");
    const coefficients = new Int32Array(64);
    const category = decodeHuffman(reader, dcTable);
    const delta = receiveExtend(reader, category);
    component.previousDc += delta;
    coefficients[0] = component.previousDc;
    let index = 1;
    while (index < 64) {
      const value = decodeHuffman(reader, acTable);
      if (value === 0) break;
      if (value === 0xf0) {
        index += 16;
        continue;
      }
      index += value >>> 4;
      if (index >= 64) throw new Error("jpeg: invalid AC coefficient run");
      coefficients[ZIGZAG[index]] = receiveExtend(reader, value & 0x0f);
      index++;
    }
    for (let i = 0; i < 64; i++) coefficients[i] *= quantization[i];
    return inverseDct(coefficients);
  }
  readU8() {
    if (this.#offset >= this.#bytes.length) throw new Error("jpeg: unexpected end of input");
    return this.#bytes[this.#offset++];
  }
  readU16() {
    return this.readU8() << 8 | this.readU8();
  }
  readMarker(expected = null) {
    const marker = this.nextMarker();
    if (expected !== null && marker !== expected) throw new Error("jpeg: missing SOI marker");
    return marker;
  }
  nextMarker() {
    while (this.#offset < this.#bytes.length && this.#bytes[this.#offset++] !== 0xff) {
      // Scan forward to the next marker prefix.
    }
    while (this.#offset < this.#bytes.length && this.#bytes[this.#offset] === 0xff) this.#offset++;
    if (this.#offset >= this.#bytes.length) throw new Error("jpeg: unexpected end while reading marker");
    return this.#bytes[this.#offset++];
  }
  skipSegment() {
    const length = this.readU16();
    if (length < 2 || this.#offset + length - 2 > this.#bytes.length) throw new Error("jpeg: invalid segment length");
    this.#offset += length - 2;
  }
}

/**
 * Bit-level reader over JPEG entropy-coded data that handles byte stuffing
 * and restart markers for the baseline decoder.
 */
class EntropyReader {
  #bytes;
  #offset;
  #buffer = 0;
  #bits = 0;
  #marker = null;
  constructor(bytes, offset) {
    this.#bytes = bytes;
    this.#offset = offset;
  }
  readBit() {
    if (!this.#bits) {
      let value = this.#bytes[this.#offset++];
      if (value === 0xff) {
        while (this.#bytes[this.#offset] === 0xff) this.#offset++;
        const marker = this.#bytes[this.#offset++];
        if (marker !== 0x00) {
          this.#marker = marker;
          throw new Error("jpeg: unexpected marker in entropy data");
        }
        value = 0xff;
      }
      if (value === undefined) throw new Error("jpeg: unexpected end in entropy data");
      this.#buffer = value;
      this.#bits = 8;
    }
    return this.#buffer >>> --this.#bits & 1;
  }
  readBits(count) {
    let value = 0;
    for (let i = 0; i < count; i++) value = value << 1 | this.readBit();
    return value;
  }
  align() {
    this.#bits = 0;
  }
  consumeRestart() {
    while (this.#bytes[this.#offset] === 0xff) this.#offset++;
    const marker = this.#bytes[this.#offset++];
    if (marker < 0xd0 || marker > 0xd7) throw new Error("jpeg: missing restart marker");
  }
}
function decodeHuffman(reader, table) {
  let code = 0;
  for (let length = 1; length <= 16; length++) {
    code = code << 1 | reader.readBit();
    const entry = table[length].find(item => item.code === code);
    if (entry) return entry.value;
  }
  throw new Error("jpeg: invalid Huffman code");
}
function receiveExtend(reader, size) {
  if (!size) return 0;
  const value = reader.readBits(size);
  const threshold = 1 << size - 1;
  return value < threshold ? value - ((1 << size) - 1) : value;
}
function inverseDct(coefficients) {
  const output = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      for (let v = 0; v < 8; v++) {
        for (let u = 0; u < 8; u++) {
          sum += SCALE[u] * SCALE[v] * coefficients[v * 8 + u] * COSINE[x][u] * COSINE[y][v];
        }
      }
      output[y * 8 + x] = clampByte(128 + sum / 4);
    }
  }
  return output;
}
function writeBlock(plane, planeWidth, originX, originY, block) {
  for (let y = 0; y < 8; y++) {
    const targetY = originY + y;
    if (targetY >= plane.length / planeWidth) continue;
    for (let x = 0; x < 8; x++) {
      const targetX = originX + x;
      if (targetX < planeWidth) plane[targetY * planeWidth + targetX] = block[y * 8 + x];
    }
  }
}
function sampleComponent(component, x, y, width, height) {
  const sampleX = Math.min(component.planeWidth - 1, Math.floor(x * component.planeWidth / width));
  const sampleY = Math.min(component.planeHeight - 1, Math.floor(y * component.planeHeight / height));
  return component.plane[sampleY * component.planeWidth + sampleX];
}
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export { canDecodeJpeg, decodeJpegToRgba };
//# sourceMappingURL=jpeg.js.map
