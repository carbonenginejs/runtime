import { convertWemToOgg } from './wemToOgg.js';
import { decodePtadpcm } from './ptadpcm.js';

const OUTPUT_RAW = "raw";
const OUTPUT_JSON = "json";
const OUTPUT_WEM_JSON = "wemJson";
const OUTPUT_OGG = "ogg";
const OUTPUT_PCM = "pcm";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_RAW,
  inputType: "wem",
  source: ""
});

/**
 * Wwise RIFF format tags mapped to codec names.
 *
 * Tag meanings follow the publicly documented behavior of Wwise media as
 * observed by community tooling (ww2ogg, vgmstream, wwiser). Unknown tags are
 * reported as `wwise-format-0x<tag>` rather than rejected.
 */
const WEM_CODEC_NAMES = Object.freeze({
  0x0001: "pcm",
  0x0002: "wwise-ima-adpcm",
  0x0069: "wwise-ima-adpcm",
  0x0165: "xma2",
  0x0166: "xma2",
  0x3040: "wwise-opus",
  0x3041: "wwise-opus-nx",
  0x3042: "wwise-opus-wem",
  0x8311: "wwise-ptadpcm",
  0xaac0: "aac",
  0xfffe: "pcm-extensible",
  0xffff: "wwise-vorbis"
});

/**
 * Normalizes reader options against their supported defaults for the WEM format
 * reader.
 */
function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsWemFormat") {
  const values = {
    ...DEFAULT_VALUES,
    ...(base || {}),
    ...(options || {})
  };
  values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "wem";
  values.emit = normalizeEmit(values.emit, readerName);
  return values;
}

/** Normalizes the requested output representation for the WEM format reader. */
function normalizeEmit(emit, readerName) {
  if (emit === undefined || emit === null) return OUTPUT_RAW;
  if (emit === OUTPUT_JSON) return OUTPUT_WEM_JSON;
  if ([OUTPUT_RAW, OUTPUT_WEM_JSON, OUTPUT_OGG, OUTPUT_PCM].includes(emit)) return emit;
  throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the WEM format reader. */
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("Wem input must be Uint8Array, ArrayBuffer, or DataView");
}

/**
 * Test for a Wwise RIFF/RIFX WAVE signature.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} True when a RIFF or RIFX WAVE container is present.
 */
function isWEM(bytes) {
  if (bytes.byteLength < 12) return false;
  const container = fourCc(bytes, 0);
  return (container === "RIFF" || container === "RIFX") && fourCc(bytes, 8) === "WAVE";
}

/**
 * Inspect Wwise media bytes without decoding audio data.
 *
 * Reports the chunk map, `fmt ` fields, codec identity, and Vorbis sample
 * count/duration when present. Inspection never throws on unknown chunks or
 * codecs; truncated trailing chunks stop the walk.
 *
 * @param {Uint8Array} bytes Wem bytes.
 * @returns {object} Wem metadata.
 */
function inspectWEM(bytes) {
  const littleEndian = fourCc(bytes, 0) !== "RIFX";
  const info = {
    sourceFormat: "wem",
    container: fourCc(bytes, 0),
    littleEndian,
    riffSize: readU32(bytes, 4, littleEndian),
    codec: "",
    codecTag: 0,
    channels: 0,
    sampleRate: 0,
    byteRate: 0,
    blockAlign: 0,
    bitsPerSample: 0,
    extraSize: 0,
    sampleCount: 0,
    durationSeconds: 0,
    dataOffset: 0,
    dataBytes: 0,
    vorbis: null,
    chunks: []
  };
  let offset = 12;
  let fmtOffset = 0;
  let fmtSize = 0;
  let vorbOffset = 0;
  let vorbSize = 0;
  while (offset + 8 <= bytes.byteLength) {
    const id = fourCc(bytes, offset);
    const size = readU32(bytes, offset + 4, littleEndian);
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
    if (id === "fmt " && size >= 16) {
      fmtOffset = dataOffset;
      fmtSize = size;
      info.codecTag = readU16(bytes, dataOffset, littleEndian);
      info.channels = readU16(bytes, dataOffset + 2, littleEndian);
      info.sampleRate = readU32(bytes, dataOffset + 4, littleEndian);
      info.byteRate = readU32(bytes, dataOffset + 8, littleEndian);
      info.blockAlign = readU16(bytes, dataOffset + 12, littleEndian);
      info.bitsPerSample = readU16(bytes, dataOffset + 14, littleEndian);
      if (size >= 18) info.extraSize = readU16(bytes, dataOffset + 16, littleEndian);
      info.codec = WEM_CODEC_NAMES[info.codecTag] || `wwise-format-0x${info.codecTag.toString(16).padStart(4, "0")}`;
    }
    if (id === "vorb") {
      vorbOffset = dataOffset;
      vorbSize = size;
    }
    if (id === "data") {
      info.dataOffset = dataOffset;
      info.dataBytes = size;
    }
    offset = dataOffset + size + (size & 1);
  }
  if (info.codec === "wwise-vorbis") {
    // Wwise Vorbis stores its sample count in a separate "vorb" chunk, or
    // inline in "fmt " at +0x18 when the fmt chunk is 0x42 bytes.
    if (!vorbOffset && fmtSize === 0x42) {
      vorbOffset = fmtOffset + 0x18;
      vorbSize = fmtSize - 0x18;
    }
    if (vorbOffset && vorbOffset + 4 <= bytes.byteLength) {
      info.sampleCount = readU32(bytes, vorbOffset, littleEndian);
      info.vorbis = {
        vorbOffset,
        vorbSize,
        inline: fmtSize === 0x42,
        sampleCount: info.sampleCount
      };
    }
  }
  if (info.sampleCount && info.sampleRate) {
    info.durationSeconds = info.sampleCount / info.sampleRate;
  } else if ((info.codec === "pcm" || info.codec === "pcm-extensible") && info.byteRate) {
    info.durationSeconds = info.dataBytes / info.byteRate;
  }
  return info;
}

/** Inspects input using normalized format options for the WEM format reader. */
function inspectWithValues(input, values = DEFAULT_VALUES) {
  const bytes = toBytes(input);
  if (!isWEM(bytes)) {
    throw new TypeError("CjsWemFormat: expected a RIFF/RIFX WAVE (wem) container");
  }
  return {
    payloadType: "audio",
    mediaTypes: ["audio"],
    byteLength: bytes.byteLength,
    source: values.source || "buffer",
    ...inspectWEM(bytes)
  };
}

/**
 * Reports whether input is supported under normalized format options for the WEM
 * format reader.
 */
function isSupportedWithValues(input, values = DEFAULT_VALUES) {
  try {
    const metadata = inspectWithValues(input, values);
    const oggSupport = getOggSupport(metadata);
    const pcmSupport = getPcmSupport(metadata);
    return {
      format: "wem",
      source: values.source || "buffer",
      supported: metadata.codec ? "partial" : "none",
      confidence: metadata.codec ? 1 : 0.5,
      preferred: oggSupport.supported ? OUTPUT_OGG : pcmSupport.supported ? OUTPUT_PCM : "raw",
      reason: metadata.codec ? oggSupport.supported ? "Wwise Vorbis recognized; repacks losslessly to Ogg Vorbis." : metadata.codec === "wwise-vorbis" ? oggSupport.reason : "Wwise media container recognized; payloads pass through undecoded." : "RIFF/RIFX container recognized but no fmt chunk was found.",
      metadata,
      variants: [{
        kind: "raw",
        payloadType: "raw",
        codec: metadata.codec || "unknown",
        mimeType: "application/octet-stream",
        supported: true,
        containerOnly: true,
        isDecoded: false,
        pcmDecodeSupported: false
      }, {
        kind: OUTPUT_OGG,
        payloadType: "raw",
        codec: "vorbis",
        mimeType: "audio/ogg",
        supported: oggSupport.supported,
        containerOnly: true,
        isDecoded: false,
        reason: oggSupport.supported ? "" : oggSupport.reason
      }, {
        kind: OUTPUT_PCM,
        payloadType: OUTPUT_PCM,
        codec: "float32",
        supported: pcmSupport.supported,
        containerOnly: false,
        isDecoded: true,
        pcmDecodeSupported: pcmSupport.supported,
        reason: pcmSupport.supported ? "" : pcmSupport.reason
      }],
      warnings: [],
      errors: []
    };
  } catch (error) {
    return {
      format: "wem",
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

// PCM decode routing by codec: PTADPCM decodes through its own module;
// uncompressed 16-bit PCM deinterleaves directly. Compressed codecs with
// their own containers (Vorbis, Opus, XMA) are not decoded here - Vorbis
// repacks to Ogg instead (OUTPUT_OGG).
function decodeToPcm(bytes, metadata) {
  if (metadata.codec === "wwise-ptadpcm") {
    return decodePtadpcm(bytes, metadata);
  }
  if ((metadata.codec === "pcm" || metadata.codec === "pcm-extensible") && metadata.bitsPerSample === 16) {
    const channels = Math.max(1, metadata.channels);
    const sampleCount = Math.floor(metadata.dataBytes / (2 * channels));
    const channelData = [];
    for (let channel = 0; channel < channels; channel++) {
      channelData.push(new Float32Array(sampleCount));
    }
    for (let i = 0; i < sampleCount; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const at = metadata.dataOffset + (i * channels + channel) * 2;
        const raw = bytes[at] | bytes[at + 1] << 8;
        channelData[channel][i] = (raw >= 0x8000 ? raw - 0x10000 : raw) / 32768;
      }
    }
    return {
      channelData,
      sampleCount,
      sampleRate: metadata.sampleRate,
      channels
    };
  }
  const error = new Error(`wem: pcm decode is not supported for codec ${metadata.codec || "unknown"}`);
  error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
  error.sourceFormat = "wem";
  throw error;
}
function getPcmSupport(metadata) {
  if (metadata.codec === "wwise-ptadpcm") return {
    supported: true,
    reason: ""
  };
  if ((metadata.codec === "pcm" || metadata.codec === "pcm-extensible") && metadata.bitsPerSample === 16) {
    return {
      supported: true,
      reason: ""
    };
  }
  return {
    supported: false,
    reason: "PCM decode covers PTADPCM and 16-bit PCM; use the ogg emit for Wwise Vorbis."
  };
}
function getOggSupport(metadata) {
  if (metadata.codec !== "wwise-vorbis") {
    return {
      supported: false,
      reason: "Only Wwise Vorbis media can be repacked to Ogg."
    };
  }
  const vorbSize = metadata.vorbis?.vorbSize;
  if (vorbSize === 0x28 || vorbSize === 0x2c) {
    return {
      supported: false,
      reason: "Wwise Vorbis recognized, but old header-triad Wwise Vorbis is not supported by this repacker."
    };
  }
  if (!metadata.vorbis) {
    return {
      supported: false,
      reason: "Wwise Vorbis recognized, but no Vorbis layout metadata was found."
    };
  }
  return {
    supported: true,
    reason: ""
  };
}

/** Reads input using normalized format options for the WEM format reader. */
function readWithValues(input, values = DEFAULT_VALUES) {
  const bytes = toBytes(input);
  const metadata = inspectWithValues(bytes, values);
  if (values.emit === OUTPUT_WEM_JSON) return metadata;
  if (values.emit === OUTPUT_OGG) {
    if (metadata.codec !== "wwise-vorbis") {
      const error = new Error(`wem: only Wwise Vorbis can be repacked to Ogg (found ${metadata.codec || "unknown"})`);
      error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
      error.sourceFormat = "wem";
      throw error;
    }
    const ogg = convertWemToOgg(bytes, {
      codebooks: values.codebooks
    });
    return {
      payloadType: "raw",
      sourceFormat: "wem",
      outputFormat: "ogg",
      codec: "vorbis",
      mimeType: "audio/ogg",
      containerOnly: true,
      isDecoded: false,
      pcmDecodeSupported: false,
      sampleCount: ogg.sampleCount,
      sampleRate: ogg.sampleRate,
      channels: ogg.channels,
      durationSeconds: ogg.durationSeconds,
      loop: ogg.loop,
      pageCount: ogg.pageCount,
      metadata,
      bytes: ogg.bytes
    };
  }
  if (values.emit === OUTPUT_PCM) {
    const decoded = decodeToPcm(bytes, metadata);
    return {
      payloadType: OUTPUT_PCM,
      sourceFormat: "wem",
      outputFormat: OUTPUT_PCM,
      codec: "float32",
      sourceCodec: metadata.codec,
      isDecoded: true,
      pcmDecodeSupported: true,
      sampleCount: decoded.sampleCount,
      sampleRate: decoded.sampleRate,
      channels: decoded.channels,
      durationSeconds: decoded.sampleRate ? decoded.sampleCount / decoded.sampleRate : 0,
      channelData: decoded.channelData,
      metadata
    };
  }
  if (values.emit === OUTPUT_RAW) {
    return {
      payloadType: "raw",
      sourceFormat: "wem",
      codec: metadata.codec,
      mimeType: "application/octet-stream",
      containerOnly: true,
      isDecoded: false,
      pcmDecodeSupported: false,
      metadata,
      bytes
    };
  }
  const error = new Error(`wem: emit "${values.emit}" is not implemented yet`);
  error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
  error.sourceFormat = "wem";
  error.emit = values.emit;
  throw error;
}

/** Converts a parsed payload into a JSON-safe value for the WEM format reader. */
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
function fourCc(bytes, offset, length = 4) {
  let value = "";
  for (let i = 0; i < length; i++) value += String.fromCharCode(bytes[offset + i] || 0);
  return value;
}
function readU16(bytes, offset, littleEndian) {
  return littleEndian ? bytes[offset] | bytes[offset + 1] << 8 : bytes[offset] << 8 | bytes[offset + 1];
}
function readU32(bytes, offset, littleEndian) {
  return littleEndian ? (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16 | bytes[offset + 3] * 0x1000000) >>> 0 : bytes[offset] * 0x1000000 + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3] >>> 0;
}

export { DEFAULT_VALUES, OUTPUT_JSON, OUTPUT_OGG, OUTPUT_PCM, OUTPUT_RAW, OUTPUT_WEM_JSON, WEM_CODEC_NAMES, inspectWEM, inspectWithValues, isSupportedWithValues, isWEM, normalizeEmit, normalizeValues, readWithValues, toBytes, toJsonValue };
//# sourceMappingURL=helpers.js.map
