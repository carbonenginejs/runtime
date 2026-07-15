const OUTPUT_RAW = "raw";
const OUTPUT_JSON = "json";
const OUTPUT_BNK_JSON = "bnkJson";
const OUTPUT_MEDIA = "media";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_RAW,
  inputType: "bnk",
  source: ""
});

/**
 * Advisory names for classic HIRC object type ids.
 *
 * Type ids shifted in later Wwise releases, so these names are hints for
 * debugging and inventory work, not a version-exact schema. Unknown ids are
 * reported as `hirc-type-<n>`.
 */
const HIRC_TYPE_NAMES = Object.freeze({
  1: "settings",
  2: "sound",
  3: "event-action",
  4: "event",
  5: "random-sequence-container",
  6: "switch-container",
  7: "actor-mixer",
  8: "audio-bus",
  9: "blend-container",
  10: "music-segment",
  11: "music-track",
  12: "music-switch-container",
  13: "music-playlist-container",
  14: "attenuation",
  15: "dialogue-event",
  16: "motion-bus",
  17: "motion-fx",
  18: "effect",
  19: "auxiliary-bus",
  20: "lfo",
  21: "envelope",
  22: "audio-device"
});
function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsBnkFormat") {
  const values = {
    ...DEFAULT_VALUES,
    ...(base || {}),
    ...(options || {})
  };
  values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "bnk";
  values.emit = normalizeEmit(values.emit, readerName);
  return values;
}
function normalizeEmit(emit, readerName) {
  if (emit === undefined || emit === null) return OUTPUT_RAW;
  if (emit === OUTPUT_JSON) return OUTPUT_BNK_JSON;
  if ([OUTPUT_RAW, OUTPUT_BNK_JSON, OUTPUT_MEDIA].includes(emit)) return emit;
  throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("Bnk input must be Uint8Array, ArrayBuffer, or DataView");
}

/**
 * Test for a Wwise soundbank BKHD signature.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} True when the bank header chunk is present.
 */
function isBNK(bytes) {
  return bytes.byteLength >= 8 && fourCc(bytes, 0) === "BKHD";
}

/**
 * Inspect Wwise soundbank bytes without copying media payloads.
 *
 * Walks the chunk sequence and decodes the bank header (BKHD), embedded media
 * index (DIDX/DATA), object hierarchy listing (HIRC), and referenced bank
 * names (STID). Unknown chunks are recorded, never rejected; a truncated
 * trailing chunk stops the walk and is flagged.
 *
 * Wwise soundbanks are written little-endian on all platforms EVE ships on;
 * this reader assumes little-endian data.
 *
 * @param {Uint8Array} bytes Soundbank bytes.
 * @returns {object} Soundbank metadata.
 */
function inspectBNK(bytes) {
  const info = {
    sourceFormat: "bnk",
    bankVersion: 0,
    bankId: 0,
    languageId: 0,
    media: [],
    hirc: [],
    names: [],
    chunks: []
  };
  let dataChunkOffset = 0;
  let dataChunkSize = 0;
  let mediaIndex = [];
  let offset = 0;
  while (offset + 8 <= bytes.byteLength) {
    const id = fourCc(bytes, offset);
    const size = readU32(bytes, offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + size > bytes.byteLength) {
      info.chunks.push({
        id,
        offset,
        dataOffset,
        size,
        truncated: true
      });
      break;
    }
    info.chunks.push({
      id,
      offset,
      dataOffset,
      size
    });
    if (id === "BKHD" && size >= 12) {
      info.bankVersion = readU32(bytes, dataOffset);
      info.bankId = readU32(bytes, dataOffset + 4);
      info.languageId = readU32(bytes, dataOffset + 8);
    }
    if (id === "DIDX") {
      mediaIndex = readMediaIndex(bytes, dataOffset, size);
    }
    if (id === "DATA") {
      dataChunkOffset = dataOffset;
      dataChunkSize = size;
    }
    if (id === "HIRC") {
      info.hirc = readHircListing(bytes, dataOffset, size);
    }
    if (id === "STID") {
      info.names = readNameTable(bytes, dataOffset, size);
    }
    offset = dataOffset + size;
  }
  info.media = mediaIndex.map(entry => {
    const absoluteOffset = dataChunkOffset + entry.offset;
    const available = dataChunkOffset > 0 && entry.offset + entry.length <= dataChunkSize && absoluteOffset + entry.length <= bytes.byteLength;
    return {
      id: entry.id,
      offset: entry.offset,
      absoluteOffset: dataChunkOffset > 0 ? absoluteOffset : 0,
      length: entry.length,
      available
    };
  });
  info.mediaCount = info.media.length;
  info.hircCount = info.hirc.length;
  return info;
}
function readMediaIndex(bytes, dataOffset, size) {
  const entries = [];
  const count = Math.floor(size / 12);
  for (let i = 0; i < count; i++) {
    const entryOffset = dataOffset + i * 12;
    entries.push({
      id: readU32(bytes, entryOffset),
      offset: readU32(bytes, entryOffset + 4),
      length: readU32(bytes, entryOffset + 8)
    });
  }
  return entries;
}
function readHircListing(bytes, dataOffset, size) {
  const entries = [];
  if (size < 4) return entries;
  const count = readU32(bytes, dataOffset);
  const end = dataOffset + size;
  let offset = dataOffset + 4;
  for (let i = 0; i < count; i++) {
    if (offset + 9 > end) break;
    const type = bytes[offset];
    const entrySize = readU32(bytes, offset + 1);
    const payloadOffset = offset + 5;
    if (entrySize < 4 || payloadOffset + entrySize > end) break;
    entries.push({
      type,
      typeName: HIRC_TYPE_NAMES[type] || `hirc-type-${type}`,
      id: readU32(bytes, payloadOffset),
      offset: payloadOffset,
      size: entrySize
    });
    offset = payloadOffset + entrySize;
  }
  return entries;
}
function readNameTable(bytes, dataOffset, size) {
  const names = [];
  if (size < 8) return names;
  const count = readU32(bytes, dataOffset + 4);
  const end = dataOffset + size;
  let offset = dataOffset + 8;
  for (let i = 0; i < count; i++) {
    if (offset + 5 > end) break;
    const bankId = readU32(bytes, offset);
    const length = bytes[offset + 4];
    if (offset + 5 + length > end) break;
    names.push({
      bankId,
      name: asciiString(bytes, offset + 5, length)
    });
    offset += 5 + length;
  }
  return names;
}
function inspectWithValues(input, values = DEFAULT_VALUES) {
  const bytes = toBytes(input);
  if (!isBNK(bytes)) {
    throw new TypeError("CjsBnkFormat: expected a Wwise soundbank starting with a BKHD chunk");
  }
  return {
    payloadType: "audio",
    mediaTypes: ["audio"],
    byteLength: bytes.byteLength,
    source: values.source || "buffer",
    ...inspectBNK(bytes)
  };
}

/**
 * Extract embedded media payloads as views over the soundbank bytes.
 *
 * Returned `bytes` are subarray views, not copies; callers that outlive the
 * source buffer should copy them.
 *
 * @param {Uint8Array} bytes Soundbank bytes.
 * @param {object} metadata Inspection result for those bytes.
 * @param {number} [mediaId] Optional single media id filter.
 * @returns {Array<object>} Extracted media items.
 */
function extractMedia(bytes, metadata, mediaId) {
  const items = [];
  for (const entry of metadata.media) {
    if (mediaId !== undefined && entry.id !== mediaId) continue;
    if (!entry.available) continue;
    const payload = bytes.subarray(entry.absoluteOffset, entry.absoluteOffset + entry.length);
    items.push({
      id: entry.id,
      length: entry.length,
      isWem: payload.length >= 12 && (fourCc(payload, 0) === "RIFF" || fourCc(payload, 0) === "RIFX") && fourCc(payload, 8) === "WAVE",
      bytes: payload
    });
  }
  return items;
}
function isSupportedWithValues(input, values = DEFAULT_VALUES) {
  try {
    const metadata = inspectWithValues(input, values);
    const extractable = metadata.media.some(entry => entry.available);
    return {
      format: "bnk",
      source: values.source || "buffer",
      supported: "partial",
      confidence: 1,
      preferred: extractable ? OUTPUT_MEDIA : "raw",
      reason: extractable ? "Soundbank recognized; embedded media can be extracted undecoded." : "Soundbank recognized; it carries no extractable embedded media.",
      metadata,
      variants: [{
        kind: "raw",
        payloadType: "raw",
        codec: "wwise-soundbank",
        mimeType: "application/octet-stream",
        supported: true,
        containerOnly: true,
        isDecoded: false,
        pcmDecodeSupported: false
      }, {
        kind: OUTPUT_MEDIA,
        payloadType: OUTPUT_MEDIA,
        codec: "wem",
        supported: extractable,
        containerOnly: true,
        isDecoded: false,
        reason: extractable ? "" : "No DIDX/DATA media entries are present."
      }],
      warnings: [],
      errors: []
    };
  } catch (error) {
    return {
      format: "bnk",
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
function readWithValues(input, values = DEFAULT_VALUES) {
  const bytes = toBytes(input);
  const metadata = inspectWithValues(bytes, values);
  if (values.emit === OUTPUT_BNK_JSON) return metadata;
  if (values.emit === OUTPUT_MEDIA) {
    return {
      payloadType: OUTPUT_MEDIA,
      sourceFormat: "bnk",
      containerOnly: true,
      isDecoded: false,
      metadata,
      items: extractMedia(bytes, metadata)
    };
  }
  return {
    payloadType: "raw",
    sourceFormat: "bnk",
    mimeType: "application/octet-stream",
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
function asciiString(bytes, offset, length) {
  let value = "";
  for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[offset + i]);
  return value;
}
function fourCc(bytes, offset, length = 4) {
  let value = "";
  for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[offset + i] || 0);
  return value;
}
function readU32(bytes, offset) {
  return (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16 | bytes[offset + 3] * 0x1000000) >>> 0;
}

export { DEFAULT_VALUES, HIRC_TYPE_NAMES, OUTPUT_BNK_JSON, OUTPUT_JSON, OUTPUT_MEDIA, OUTPUT_RAW, extractMedia, inspectBNK, inspectWithValues, isBNK, isSupportedWithValues, normalizeEmit, normalizeValues, readWithValues, toBytes, toJsonValue };
//# sourceMappingURL=helpers.js.map
