const OUTPUT_IMAGE = "image";
const OUTPUT_RGBA = "rgba";
const OUTPUT_RAW = "raw";
const OUTPUT_JSON = "json";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_RAW,
  inputType: "gif",
  source: ""
});

/**
 * Normalizes reader options against their supported defaults for the GIF format
 * reader.
 */
function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsGifFormat") {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError(`${readerName}: options must be an object`);
  }
  const allowed = new Set(["emit", "inputType", "source"]);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) throw new TypeError(`${readerName}: unknown option ${JSON.stringify(key)}`);
  }
  const values = {
    ...DEFAULT_VALUES,
    ...(base || {}),
    ...options
  };
  if (![OUTPUT_IMAGE, OUTPUT_RGBA, OUTPUT_RAW, OUTPUT_JSON, "gifJson"].includes(values.emit)) {
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(values.emit)}`);
  }
  return values;
}

/** Returns a byte view over the supplied binary input for the GIF format reader. */
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("GIF input must be Uint8Array, ArrayBuffer, or a view");
}

/** Reports whether the current GIF format reader satisfies GIF. */
function isGIF(bytes) {
  return bytes.byteLength >= 13 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a");
}

/** Inspects input using normalized format options for the GIF format reader. */
function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "gif") {
  const bytes = toBytes(input);
  if (!isGIF(bytes)) throw new TypeError("CjsGifFormat: input is not a GIF87a/GIF89a image");
  const metadata = inspectGif(bytes);
  if (expectedType && metadata.sourceFormat !== expectedType) {
    throw new TypeError(`CjsGifFormat: expected ${expectedType}, got ${metadata.sourceFormat}`);
  }
  return {
    ...metadata,
    byteLength: bytes.byteLength,
    source: values.source || "buffer"
  };
}

/**
 * Reports whether input is supported under normalized format options for the GIF
 * format reader.
 */
function probeSupportWithValues(input, values = DEFAULT_VALUES) {
  try {
    const metadata = inspectWithValues(input, values);
    const decoded = metadata.frameCount > 0 && metadata.lzwSupported;
    return {
      format: "gif",
      source: values.source || "buffer",
      supported: decoded ? "full" : "partial",
      confidence: 1,
      preferredOutput: decoded ? "rgba" : "raw",
      reason: decoded ? "GIF frame RGBA decode and compositing are available." : "GIF metadata/raw input is recognized but no decodable image frame was found.",
      metadata,
      variants: [{
        kind: "rgba",
        payloadType: "rgba",
        codec: "rgba8unorm",
        supported: decoded,
        reason: decoded ? "" : "GIF LZW frame decode is unavailable."
      }, {
        kind: "raw",
        payloadType: "raw",
        codec: "gif",
        mimeType: "image/gif",
        supported: true
      }],
      warnings: [],
      errors: []
    };
  } catch (error) {
    return {
      format: "gif",
      source: values.source || "buffer",
      supported: "none",
      confidence: 0,
      preferredOutput: "",
      reason: error.message,
      metadata: null,
      variants: [],
      warnings: [],
      errors: [error.message]
    };
  }
}

/** Reads input using normalized format options for the GIF format reader. */
function readWithValues(input, values = DEFAULT_VALUES) {
  const bytes = toBytes(input);
  const metadata = inspectWithValues(bytes, values);
  if (values.emit === OUTPUT_RAW) {
    return {
      payloadType: "raw",
      sourceFormat: "gif",
      mimeType: "image/gif",
      metadata,
      bytes
    };
  }
  if (values.emit === OUTPUT_JSON || values.emit === "gifJson") return metadata;
  if (values.emit === OUTPUT_RGBA || values.emit === OUTPUT_IMAGE) {
    return decodeFrames(bytes, metadata);
  }
  const error = new Error(`gif: emit "${values.emit}" is not implemented yet`);
  error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
  throw error;
}

/** Converts a parsed payload into a JSON-safe value for the GIF format reader. */
function toJsonValue(value) {
  if (value instanceof Uint8Array) return {
    byteLength: value.byteLength
  };
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, entry] of Object.entries(value)) output[key] = toJsonValue(entry);
    return output;
  }
  return value;
}
function inspectGif(bytes) {
  const width = readU16LE(bytes, 6);
  const height = readU16LE(bytes, 8);
  const packed = bytes[10];
  const hasGlobalPalette = !!(packed & 0x80);
  const globalPaletteCount = hasGlobalPalette ? 1 << (packed & 7) + 1 : 0;
  if (hasGlobalPalette) readPalette(bytes, 13, globalPaletteCount);
  let offset = 13 + globalPaletteCount * 3;
  let frameCount = 0;
  const frames = [];
  let firstFrame = null;
  let graphicsControl = null;
  let loopCount = null;
  while (offset < bytes.length) {
    const marker = bytes[offset++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9) {
        if (bytes[offset++] !== 4) throw new Error("gif: invalid graphics control extension");
        const control = bytes[offset++];
        graphicsControl = {
          disposalMethod: control >>> 2 & 7,
          userInput: !!(control & 2),
          transparent: !!(control & 1),
          delayCentiseconds: readU16LE(bytes, offset)
        };
        offset += 2;
        graphicsControl.transparentIndex = bytes[offset++];
        if (bytes[offset++] !== 0) throw new Error("gif: unterminated graphics control extension");
      } else if (label === 0xff) {
        const size = bytes[offset++];
        const application = ascii(bytes, offset, size);
        offset += size;
        const data = readSubBlocks(bytes, offset);
        offset = data.offset;
        if (application === "NETSCAPE2.0" || application === "ANIMEXTS1.0") {
          if (data.bytes.length >= 3 && data.bytes[0] === 1) loopCount = readU16LE(data.bytes, 1);
        }
      } else {
        offset = skipSubBlocks(bytes, offset);
      }
    } else if (marker === 0x2c) {
      if (offset + 9 > bytes.length) throw new Error("gif: truncated image descriptor");
      const frame = {
        left: readU16LE(bytes, offset),
        top: readU16LE(bytes, offset + 2),
        width: readU16LE(bytes, offset + 4),
        height: readU16LE(bytes, offset + 6),
        packed: bytes[offset + 8],
        graphicsControl
      };
      offset += 9;
      const localPaletteCount = frame.packed & 0x80 ? 1 << (frame.packed & 7) + 1 : 0;
      frame.localPalette = localPaletteCount ? readPalette(bytes, offset, localPaletteCount) : null;
      offset += localPaletteCount * 3;
      frame.lzwMinCodeSize = bytes[offset++];
      const data = readSubBlocks(bytes, offset);
      frame.compressed = data.bytes;
      offset = data.offset;
      frame.interlaced = !!(frame.packed & 0x40);
      frameCount++;
      frames.push(frame);
      if (!firstFrame) firstFrame = frame;
      graphicsControl = null;
    } else if (marker === 0x00) {
      throw new Error("gif: unexpected data before image descriptor");
    } else {
      throw new Error(`gif: unsupported block marker 0x${marker.toString(16)}`);
    }
  }
  return {
    payloadType: "image",
    mediaTypes: ["image"],
    sourceFormat: "gif",
    version: ascii(bytes, 0, 6),
    width,
    height,
    frameCount,
    animated: frameCount > 1,
    loopCount,
    hasGlobalPalette,
    backgroundColorIndex: bytes[11],
    colorResolution: (packed >>> 4 & 7) + 1,
    lzwSupported: frames.length > 0 && frames.every(frame => frame.lzwMinCodeSize >= 2 && frame.lzwMinCodeSize <= 8),
    firstFrame,
    frames
  };
}
function decodeFrames(bytes, metadata) {
  if (!metadata.firstFrame || !metadata.lzwSupported) throw new Error("gif: no supported LZW image frame found");
  const globalPalette = readPalette(bytes, 13, metadata.hasGlobalPalette ? 1 << (bytes[10] & 7) + 1 : 0);
  const canvas = new Uint8Array(metadata.width * metadata.height * 4);
  const frames = [];
  for (const frame of metadata.frames) {
    const restore = frame.graphicsControl?.disposalMethod === 3 ? canvas.slice() : null;
    const palette = frame.localPalette || globalPalette;
    const indices = decodeLzw(frame.compressed, frame.lzwMinCodeSize, frame.width * frame.height);
    const rows = frame.interlaced ? interlacedRows(frame.height) : Array.from({
      length: frame.height
    }, (_, row) => row);
    for (let sourceRow = 0; sourceRow < frame.height; sourceRow++) {
      const targetRow = rows[sourceRow];
      for (let x = 0; x < frame.width; x++) {
        const index = indices[sourceRow * frame.width + x];
        const targetX = frame.left + x;
        const targetY = frame.top + targetRow;
        if (targetX >= metadata.width || targetY >= metadata.height) continue;
        if (frame.graphicsControl?.transparent && index === frame.graphicsControl.transparentIndex) continue;
        const target = (targetY * metadata.width + targetX) * 4;
        const color = palette[index] || [0, 0, 0];
        canvas[target] = color[0];
        canvas[target + 1] = color[1];
        canvas[target + 2] = color[2];
        canvas[target + 3] = 255;
      }
    }
    frames.push({
      index: frames.length,
      delayCentiseconds: frame.graphicsControl?.delayCentiseconds || 0,
      disposalMethod: frame.graphicsControl?.disposalMethod || 0,
      data: canvas.slice()
    });
    const disposal = frame.graphicsControl?.disposalMethod || 0;
    if (disposal === 2) canvas.fill(0);else if (disposal === 3 && restore) canvas.set(restore);
  }
  const data = frames[0].data;
  return {
    payloadType: "rgba",
    sourceFormat: "gif",
    mimeType: "image/gif",
    width: metadata.width,
    height: metadata.height,
    pixelFormat: "rgba8unorm",
    data,
    frames,
    strideBytes: metadata.width * 4,
    origin: "top-left",
    colorSpace: "srgb",
    alphaMode: "straight",
    metadata
  };
}
function decodeLzw(bytes, minimumCodeSize, expectedLength) {
  const clear = 1 << minimumCodeSize;
  const end = clear + 1;
  let codeSize = minimumCodeSize + 1;
  let dictionary = Array.from({
    length: clear
  }, (_, index) => [index]);
  let bitOffset = 0;
  let previous = null;
  const output = [];
  while (bitOffset + codeSize <= bytes.length * 8) {
    let code = 0;
    for (let bit = 0; bit < codeSize; bit++) {
      code |= (bytes[bitOffset >>> 3] >>> (bitOffset & 7) & 1) << bit;
      bitOffset++;
    }
    if (code === clear) {
      dictionary = Array.from({
        length: clear
      }, (_, index) => [index]);
      codeSize = minimumCodeSize + 1;
      previous = null;
      continue;
    }
    if (code === end) break;
    let entry;
    if (code < dictionary.length) entry = dictionary[code];else if (code === dictionary.length && previous) entry = previous.concat(previous[0]);else throw new Error("gif: invalid LZW code");
    output.push(...entry);
    if (previous) {
      dictionary.push(previous.concat(entry[0]));
      if (dictionary.length === 1 << codeSize && codeSize < 12) codeSize++;
    }
    previous = entry;
    if (output.length >= expectedLength) break;
  }
  if (output.length < expectedLength) throw new Error("gif: LZW stream ended before the frame was filled");
  return output.slice(0, expectedLength);
}
function readSubBlocks(bytes, offset) {
  const output = [];
  while (offset < bytes.length) {
    if (offset >= bytes.length) throw new Error("gif: truncated sub-block sequence");
    const length = bytes[offset++];
    if (!length) return {
      bytes: Uint8Array.from(output),
      offset
    };
    if (offset + length > bytes.length) throw new Error("gif: truncated sub-block payload");
    output.push(...bytes.subarray(offset, offset + length));
    offset += length;
  }
  throw new Error("gif: truncated sub-block sequence");
}
function skipSubBlocks(bytes, offset) {
  return readSubBlocks(bytes, offset).offset;
}
function readPalette(bytes, offset, count) {
  const palette = [];
  for (let i = 0; i < count; i++) {
    if (offset + 3 > bytes.length) throw new Error("gif: truncated color table");
    palette.push([bytes[offset], bytes[offset + 1], bytes[offset + 2]]);
    offset += 3;
  }
  return palette;
}
function interlacedRows(height) {
  const rows = [];
  for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) {
    for (let row = start; row < height; row += step) rows.push(row);
  }
  return rows;
}
function ascii(bytes, offset, length) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
function readU16LE(bytes, offset) {
  return bytes[offset] | bytes[offset + 1] << 8;
}

export { DEFAULT_VALUES, OUTPUT_IMAGE, OUTPUT_JSON, OUTPUT_RAW, OUTPUT_RGBA, inspectWithValues, isGIF, normalizeValues, probeSupportWithValues, readWithValues, toBytes, toJsonValue };
//# sourceMappingURL=helpers.js.map
