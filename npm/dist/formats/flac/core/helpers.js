const OUTPUT_RAW = "raw";
const OUTPUT_PCM = "pcm";
const OUTPUT_JSON = "json";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_RAW,
  inputType: "",
  source: ""
});
const DEBUG_OUTPUT = "flacJson";
function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsFlacFormat") {
  const values = {
    ...DEFAULT_VALUES,
    ...(base || {}),
    ...(options || {})
  };
  values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "";
  if (![OUTPUT_RAW, OUTPUT_PCM, OUTPUT_JSON, DEBUG_OUTPUT].includes(values.emit)) {
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(values.emit)}`);
  }
  return values;
}
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("FLAC input must be Uint8Array, ArrayBuffer, or DataView");
}
function isFLAC(bytes) {
  return bytes.byteLength >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43;
}
function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "") {
  const bytes = toBytes(input);
  if (!isFLAC(bytes)) throw new TypeError("CjsFlacFormat: input is not a FLAC stream");
  const sourceFormat = expectedType || values.inputType || "flac";
  if (sourceFormat !== "flac") throw new TypeError(`CjsFlacFormat: expected ${sourceFormat}, got flac`);
  return {
    payloadType: "audio",
    mediaTypes: ["audio"],
    byteLength: bytes.byteLength,
    ...inspectBytes(bytes)
  };
}
function isSupportedWithValues(input, values = DEFAULT_VALUES, expectedType = "") {
  try {
    const metadata = inspectWithValues(input, values, expectedType);
    return {
      format: "flac",
      source: values.source || "buffer",
      supported: "partial",
      confidence: 1,
      preferred: "flac",
      reason: "FLAC metadata and raw source are recognized; PCM decoding remains a backend/decoder task.",
      metadata,
      variants: [{
        kind: "raw",
        payloadType: "raw",
        codec: "flac",
        mimeType: "audio/flac",
        supported: true,
        containerOnly: true,
        isDecoded: false,
        pcmDecodeSupported: false
      }, {
        kind: "pcm",
        payloadType: "pcm",
        codec: "pcm",
        supported: false,
        reason: "FLAC PCM decode/output is not implemented in this package."
      }],
      warnings: [],
      errors: []
    };
  } catch (error) {
    return {
      format: expectedType || values.inputType || "flac",
      source: values.source || "buffer",
      supported: "none",
      confidence: 0,
      preferred: "",
      reason: error.message,
      metadata: null,
      variants: [],
      warnings: [],
      errors: [error.message]
    };
  }
}
function readWithValues(input, values = DEFAULT_VALUES, expectedType = "") {
  const bytes = toBytes(input);
  const metadata = inspectWithValues(bytes, values, expectedType);
  if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUT) return metadata;
  if (values.emit === OUTPUT_PCM) {
    const error = new Error("flac: PCM decode/output is not implemented in this package");
    error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
    error.sourceFormat = "flac";
    error.emit = values.emit;
    throw error;
  }
  return {
    payloadType: OUTPUT_RAW,
    sourceFormat: "flac",
    mimeType: "audio/flac",
    containerOnly: true,
    isDecoded: false,
    pcmDecodeSupported: false,
    metadata,
    bytes
  };
}
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
function inspectBytes(bytes) {
  const blocks = [];
  let offset = 4;
  let streamInfo = null;
  let comments = null;
  let seekTable = [];
  const pictures = [];
  let hasLastMetadataBlock = false;
  while (offset + 4 <= bytes.byteLength) {
    const header = bytes[offset];
    const type = header & 0x7f;
    const isLast = !!(header & 0x80);
    const length = readU24BE(bytes, offset + 1);
    const dataStart = offset + 4;
    const end = dataStart + length;
    if (end > bytes.byteLength) throw new Error(`FLAC metadata block ${type} is truncated`);
    const block = {
      type,
      isLast,
      offset,
      byteLength: length
    };
    if (type === 0) {
      if (length < 34) throw new Error("FLAC STREAMINFO block is truncated");
      streamInfo = readStreamInfo(bytes, dataStart);
      Object.assign(block, streamInfo);
    } else if (type === 4) {
      comments = readVorbisComment(bytes, dataStart, end);
      Object.assign(block, {
        vendor: comments.vendor,
        comments: comments.comments
      });
    } else if (type === 3) {
      seekTable = readSeekTable(bytes, dataStart, length);
      block.points = seekTable;
    } else if (type === 6) {
      const picture = readPicture(bytes, dataStart, end);
      pictures.push(picture);
      Object.assign(block, picture);
    }
    blocks.push(block);
    offset = end;
    if (isLast) {
      hasLastMetadataBlock = true;
      break;
    }
  }
  if (!streamInfo) throw new Error("FLAC stream has no STREAMINFO block");
  return {
    sourceFormat: "flac",
    container: "flac",
    audioFormat: "flac",
    sampleRate: streamInfo.sampleRate,
    channels: streamInfo.channels,
    bitsPerSample: streamInfo.bitsPerSample,
    totalSamples: streamInfo.totalSamples,
    durationSamples: streamInfo.totalSamples,
    durationSeconds: streamInfo.sampleRate ? streamInfo.totalSamples / streamInfo.sampleRate : 0,
    streamInfo,
    comments,
    seekTable,
    pictures,
    metadataBlockCount: blocks.length,
    hasLastMetadataBlock,
    audioDataOffset: offset,
    audioDataBytes: Math.max(0, bytes.byteLength - offset),
    metadataBlocks: blocks
  };
}
function readStreamInfo(bytes, offset) {
  const sampleRate = bytes[offset + 10] * 4096 + bytes[offset + 11] * 16 + (bytes[offset + 12] >> 4);
  const channels = (bytes[offset + 12] >> 1 & 0x07) + 1;
  const bitsPerSample = ((bytes[offset + 12] & 1) << 4 | bytes[offset + 13] >> 4) + 1;
  const totalSamples = (bytes[offset + 13] & 0x0f) * 0x100000000 + readU32BE(bytes, offset + 14);
  return {
    minBlockSize: readU16BE(bytes, offset),
    maxBlockSize: readU16BE(bytes, offset + 2),
    minFrameSize: readU24BE(bytes, offset + 4),
    maxFrameSize: readU24BE(bytes, offset + 7),
    sampleRate,
    channels,
    bitsPerSample,
    totalSamples,
    md5: Array.from(bytes.subarray(offset + 18, offset + 34), value => value.toString(16).padStart(2, "0")).join("")
  };
}
function readVorbisComment(bytes, start, end) {
  let offset = start;
  if (offset + 8 > end) throw new Error("FLAC Vorbis comment block is truncated");
  const vendorLength = readU32LE(bytes, offset);
  offset += 4;
  if (offset + vendorLength + 4 > end) throw new Error("FLAC Vorbis vendor string is truncated");
  const vendor = new TextDecoder().decode(bytes.subarray(offset, offset + vendorLength));
  offset += vendorLength;
  const count = readU32LE(bytes, offset);
  offset += 4;
  const result = [];
  for (let index = 0; index < count; index++) {
    if (offset + 4 > end) throw new Error("FLAC Vorbis comment list is truncated");
    const length = readU32LE(bytes, offset);
    offset += 4;
    if (offset + length > end) throw new Error("FLAC Vorbis comment is truncated");
    result.push(new TextDecoder().decode(bytes.subarray(offset, offset + length)));
    offset += length;
  }
  return {
    vendor,
    comments: result
  };
}
function readSeekTable(bytes, start, length) {
  if (length % 18 !== 0) throw new Error("FLAC SEEKTABLE block has an invalid length");
  const points = [];
  for (let offset = start; offset < start + length; offset += 18) {
    points.push({
      sampleNumber: readU64BE(bytes, offset),
      offset: readU64BE(bytes, offset + 8),
      numberSamples: readU16BE(bytes, offset + 16)
    });
  }
  return points;
}
function readPicture(bytes, start, end) {
  let offset = start;
  if (offset + 4 > end) throw new Error("FLAC picture block is truncated");
  const pictureType = readU32BE(bytes, offset);
  offset += 4;
  const mimeLength = readU32BE(bytes, offset);
  offset += 4;
  if (offset + mimeLength + 4 > end) throw new Error("FLAC picture MIME type is truncated");
  const mimeType = new TextDecoder().decode(bytes.subarray(offset, offset + mimeLength));
  offset += mimeLength;
  const descriptionLength = readU32BE(bytes, offset);
  offset += 4;
  if (offset + descriptionLength + 20 > end) throw new Error("FLAC picture description is truncated");
  const description = new TextDecoder().decode(bytes.subarray(offset, offset + descriptionLength));
  offset += descriptionLength;
  const width = readU32BE(bytes, offset);
  const height = readU32BE(bytes, offset + 4);
  const colorDepth = readU32BE(bytes, offset + 8);
  const colors = readU32BE(bytes, offset + 12);
  const dataLength = readU32BE(bytes, offset + 16);
  if (offset + 20 + dataLength > end) throw new Error("FLAC picture data is truncated");
  return {
    pictureType,
    mimeType,
    description,
    width,
    height,
    colorDepth,
    colors,
    dataByteLength: dataLength
  };
}
function readU16BE(bytes, offset) {
  return bytes[offset] << 8 | bytes[offset + 1];
}
function readU24BE(bytes, offset) {
  return bytes[offset] * 0x10000 + bytes[offset + 1] * 0x100 + bytes[offset + 2];
}
function readU32BE(bytes, offset) {
  return bytes[offset] * 0x1000000 + bytes[offset + 1] * 0x10000 + bytes[offset + 2] * 0x100 + bytes[offset + 3];
}
function readU32LE(bytes, offset) {
  return bytes[offset] + bytes[offset + 1] * 0x100 + bytes[offset + 2] * 0x10000 + bytes[offset + 3] * 0x1000000;
}
function readU64BE(bytes, offset) {
  const high = readU32BE(bytes, offset);
  const low = readU32BE(bytes, offset + 4);
  return high > 0x1fffff ? null : high * 0x100000000 + low;
}

export { DEFAULT_VALUES, OUTPUT_JSON, OUTPUT_PCM, OUTPUT_RAW, inspectWithValues, isFLAC, isSupportedWithValues, normalizeValues, readWithValues, toBytes, toJsonValue };
//# sourceMappingURL=helpers.js.map
