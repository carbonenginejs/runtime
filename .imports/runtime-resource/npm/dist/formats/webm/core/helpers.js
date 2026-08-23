const OUTPUT_VIDEO = "video";
const OUTPUT_RAW = "raw";
const OUTPUT_JSON = "json";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_RAW,
  inputType: "",
  source: ""
});
const DEBUG_OUTPUTS = Object.freeze({
  mp4: "mp4Json",
  webm: "webmJson"
});

/**
 * Normalizes reader options against their supported defaults for the WebM format
 * reader.
 */
function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsVideoFormat") {
  const values = {
    ...DEFAULT_VALUES,
    ...(base || {}),
    ...(options || {})
  };
  values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "";
  values.emit = normalizeEmit(values.emit, values.inputType, readerName);
  return values;
}

/** Normalizes the requested output representation for the WebM format reader. */
function normalizeEmit(emit, inputType, readerName) {
  if (emit === undefined || emit === null) return OUTPUT_RAW;
  if (emit === OUTPUT_JSON && inputType) return DEBUG_OUTPUTS[inputType] || OUTPUT_JSON;
  if ([OUTPUT_VIDEO, OUTPUT_RAW, OUTPUT_JSON].includes(emit)) return emit;
  if (Object.values(DEBUG_OUTPUTS).includes(emit)) return emit;
  throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/** Returns a byte view over the supplied binary input for the WebM format reader. */
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("Video input must be Uint8Array, ArrayBuffer, or DataView");
}

/** Inspects input using normalized format options for the WebM format reader. */
function inspectWithValues(input, values = DEFAULT_VALUES, expectedType = "") {
  const bytes = toBytes(input);
  const metadata = inspectBytes(bytes);
  if (expectedType && metadata.sourceFormat && metadata.sourceFormat !== expectedType) {
    throw new TypeError(`CjsVideoFormat: expected ${expectedType}, got ${metadata.sourceFormat}`);
  }
  return {
    payloadType: "video",
    mediaTypes: ["video"],
    byteLength: bytes.byteLength,
    sourceFormat: expectedType || values.inputType || metadata.sourceFormat,
    ...metadata
  };
}

/**
 * Reports whether input is supported under normalized format options for the
 * WebM format reader.
 */
function probeSupportWithValues(input, values = DEFAULT_VALUES, expectedType = "") {
  try {
    const metadata = inspectWithValues(input, values, expectedType);
    const codecs = getTrackCodecSummary(metadata);
    const mimeType = getMediaMimeType(metadata);
    return {
      format: metadata.sourceFormat,
      source: values.source || "buffer",
      supported: metadata.sourceFormat ? "partial" : "none",
      confidence: metadata.sourceFormat ? 1 : 0,
      preferredOutput: "video",
      reason: metadata.sourceFormat ? "Container/header recognized." : "Unrecognized video format.",
      metadata,
      variants: [{
        kind: "raw",
        payloadType: "raw",
        codec: metadata.sourceFormat,
        mimeType,
        supported: true
      }, {
        kind: "container",
        payloadType: "video",
        codec: metadata.sourceFormat,
        mimeType,
        codecs: codecs.codecs,
        videoCodecs: codecs.videoCodecs,
        audioCodecs: codecs.audioCodecs,
        supported: true
      }, {
        kind: "decoded",
        payloadType: "video-frame",
        codec: "frames",
        supported: false,
        reason: "Video decode is not implemented in this package."
      }],
      warnings: [],
      errors: []
    };
  } catch (error) {
    return {
      format: expectedType || values.inputType || "",
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

/** Reads input using normalized format options for the WebM format reader. */
function readWithValues(input, values = DEFAULT_VALUES, expectedType = "") {
  const bytes = toBytes(input);
  const metadata = inspectWithValues(bytes, values, expectedType);
  if (values.emit === OUTPUT_RAW) {
    return {
      payloadType: "raw",
      sourceFormat: metadata.sourceFormat,
      metadata,
      bytes
    };
  }
  if (values.emit === OUTPUT_JSON || values.emit === DEBUG_OUTPUTS[metadata.sourceFormat]) return metadata;
  if (values.emit === OUTPUT_VIDEO && metadata.sourceFormat === "webm") {
    const codecs = getTrackCodecSummary(metadata);
    const mimeType = getMediaMimeType(metadata);
    return {
      payloadType: OUTPUT_VIDEO,
      sourceFormat: "webm",
      container: metadata.container,
      mimeType,
      codecs: codecs.codecs,
      videoCodecs: codecs.videoCodecs,
      audioCodecs: codecs.audioCodecs,
      duration: metadata.duration || 0,
      durationTimescale: metadata.durationTimescale || 1,
      tracks: metadata.tracks || [],
      metadata,
      sourceBytes: bytes
    };
  }
  const error = new Error(`${metadata.sourceFormat}: emit "${values.emit}" is not implemented yet`);
  error.code = "CJS_FORMAT_OUTPUT_NOT_IMPLEMENTED";
  error.sourceFormat = metadata.sourceFormat;
  error.emit = values.emit;
  throw error;
}
function getTrackCodecSummary(metadata) {
  const tracks = Array.isArray(metadata.tracks) ? metadata.tracks : [];
  return {
    codecs: uniqueTrackCodecs(tracks),
    videoCodecs: uniqueTrackCodecs(tracks.filter(track => track.type === "video")),
    audioCodecs: uniqueTrackCodecs(tracks.filter(track => track.type === "audio"))
  };
}
function uniqueTrackCodecs(tracks) {
  return [...new Set(tracks.map(track => track.codec).filter(Boolean))];
}
function getMediaMimeType(metadata) {
  const tracks = Array.isArray(metadata.tracks) ? metadata.tracks : [];
  return tracks.some(track => track.type === "video") ? "video/webm" : "audio/webm";
}

/**
 * Inspects the supplied bytes without decoding their payload for the WebM format
 * reader.
 */
function inspectBytes(bytes) {
  if (isMP4(bytes)) return inspectMP4(bytes);
  if (isWebM(bytes)) return inspectWebM(bytes);
  return {
    sourceFormat: ""
  };
}

/**
 * Reports whether the supplied bytes have an ISO base-media header for the WebM
 * format reader.
 */
function isMP4(bytes) {
  return bytes.byteLength >= 12 && fourCc(bytes, 4) === "ftyp";
}

/**
 * Reports whether the supplied bytes have a WebM EBML header for the WebM format
 * reader.
 */
function isWebM(bytes) {
  return bytes.byteLength >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

/** Converts a parsed payload into a JSON-safe value for the WebM format reader. */
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
function inspectMP4(bytes) {
  return {
    sourceFormat: "mp4",
    brand: fourCc(bytes, 8),
    container: "isobmff"
  };
}
function inspectWebM(bytes) {
  const roots = readEbmlElements(bytes, 0, bytes.byteLength);
  const fallbackRoots = readEbmlElements(bytes, 4, bytes.byteLength);
  const segment = roots.find(element => element.id === 0x18538067) || fallbackRoots.find(element => element.id === 0x18538067);
  if (!segment) {
    return {
      sourceFormat: "webm",
      container: "ebml",
      duration: 0,
      durationTimescale: 1,
      tracks: []
    };
  }
  const children = readEbmlElements(bytes, segment.dataStart, segment.end);
  const info = children.find(element => element.id === 0x1549a966);
  const tracks = children.find(element => element.id === 0x1654ae6b);
  const infoChildren = info ? readEbmlElements(bytes, info.dataStart, info.end) : [];
  const timecodeScale = readEbmlUnsignedValue(bytes, infoChildren.find(element => element.id === 0x2ad7b1)) || 1000000;
  const durationTicks = readEbmlFloatValue(bytes, infoChildren.find(element => element.id === 0x4489)) || 0;
  const duration = Math.round(durationTicks * timecodeScale);
  const clusters = children.filter(element => element.id === 0x1f43b675);
  const blockSummary = readWebmBlocks(bytes, clusters);
  return {
    sourceFormat: "webm",
    container: "ebml",
    timecodeScale,
    duration,
    durationTimescale: 1000000000,
    durationSeconds: duration / 1000000000,
    tracks: tracks ? readWebmTracks(bytes, tracks) : [],
    clusterCount: clusters.length,
    blockCount: blockSummary.blockCount,
    blockTrackIds: blockSummary.trackIds,
    clusterTimecodes: blockSummary.clusterTimecodes,
    blocks: blockSummary.blocks
  };
}
function readWebmTracks(bytes, tracksElement) {
  return readEbmlElements(bytes, tracksElement.dataStart, tracksElement.end).filter(element => element.id === 0xae).map(entry => {
    const fields = readEbmlElements(bytes, entry.dataStart, entry.end);
    const trackType = readEbmlUnsignedValue(bytes, fields.find(field => field.id === 0x83));
    const video = fields.find(field => field.id === 0xe0);
    const audio = fields.find(field => field.id === 0xe1);
    const codecPrivate = fields.find(field => field.id === 0x63a2);
    const result = {
      id: readEbmlUnsignedValue(bytes, fields.find(field => field.id === 0xd7)) || 0,
      type: trackType === 1 ? "video" : trackType === 2 ? "audio" : "unknown",
      codec: readEbmlStringValue(bytes, fields.find(field => field.id === 0x86)) || "",
      language: readEbmlStringValue(bytes, fields.find(field => field.id === 0x22b59c)) || "und"
    };
    const defaultDuration = readEbmlUnsignedValue(bytes, fields.find(field => field.id === 0x23e383));
    if (defaultDuration) result.defaultDuration = defaultDuration;
    if (codecPrivate) result.codecPrivateBytes = codecPrivate.end - codecPrivate.dataStart;
    if (video) {
      const videoFields = readEbmlElements(bytes, video.dataStart, video.end);
      result.width = readEbmlUnsignedValue(bytes, videoFields.find(field => field.id === 0xb0)) || 0;
      result.height = readEbmlUnsignedValue(bytes, videoFields.find(field => field.id === 0xba)) || 0;
    }
    if (audio) {
      const audioFields = readEbmlElements(bytes, audio.dataStart, audio.end);
      result.channels = readEbmlUnsignedValue(bytes, audioFields.find(field => field.id === 0x9f)) || 0;
      result.sampleRate = readEbmlFloatValue(bytes, audioFields.find(field => field.id === 0xb5)) || 0;
      result.bitDepth = readEbmlUnsignedValue(bytes, audioFields.find(field => field.id === 0x6264)) || 0;
    }
    return result;
  });
}
function readWebmBlocks(bytes, clusters) {
  const trackIds = new Set();
  const clusterTimecodes = [];
  const blocks = [];
  let blockCount = 0;
  for (const cluster of clusters) {
    const children = readEbmlElements(bytes, cluster.dataStart, cluster.end);
    const clusterTimecode = readEbmlUnsignedValue(bytes, children.find(child => child.id === 0xe7));
    clusterTimecodes.push(clusterTimecode);
    for (const child of children) {
      if (child.id === 0xa3) {
        blockCount++;
        const block = readWebmBlock(bytes, child, clusterTimecode, true);
        if (block) {
          blocks.push(block);
          trackIds.add(block.trackId);
        }
      } else if (child.id === 0xa0) {
        const groupChildren = readEbmlElements(bytes, child.dataStart, child.end);
        const reference = groupChildren.some(groupChild => groupChild.id === 0xfb);
        for (const groupChild of groupChildren) {
          if (groupChild.id !== 0xa1) continue;
          blockCount++;
          const block = readWebmBlock(bytes, groupChild, clusterTimecode, false);
          if (block) {
            block.keyframe = !reference;
            blocks.push(block);
            trackIds.add(block.trackId);
          }
        }
      }
    }
  }
  return {
    blockCount,
    trackIds: Array.from(trackIds).sort((a, b) => a - b),
    clusterTimecodes,
    blocks
  };
}
function readWebmBlock(bytes, element, clusterTimecode, simple) {
  const track = readEbmlVint(bytes, element.dataStart, element.end);
  if (!track || track.value === null || element.dataStart + track.length + 3 > element.end) return null;
  const timecodeOffset = element.dataStart + track.length;
  const relativeTimecode = bytes[timecodeOffset] << 8 | bytes[timecodeOffset + 1];
  const signedTimecode = relativeTimecode & 0x8000 ? relativeTimecode - 0x10000 : relativeTimecode;
  const flags = bytes[timecodeOffset + 2];
  const lacing = ["none", "xiph", "fixed", "ebml"][flags >> 1 & 0x03];
  const frames = readWebmBlockFrames(bytes, timecodeOffset + 3, element.end, lacing);
  return {
    trackId: track.value,
    timecode: signedTimecode,
    absoluteTimecode: clusterTimecode + signedTimecode,
    keyframe: simple ? !!(flags & 0x80) : false,
    invisible: !!(flags & 0x08),
    lacing,
    frameCount: frames.frameCount,
    frameSizes: frames.frameSizes,
    payloadBytes: frames.payloadBytes,
    ...(frames.error ? {
      lacingError: frames.error
    } : {})
  };
}
function readWebmBlockFrames(bytes, payloadStart, payloadEnd, lacing) {
  const payloadBytes = Math.max(0, payloadEnd - payloadStart);
  if (payloadStart > payloadEnd) return {
    frameCount: 0,
    frameSizes: [],
    payloadBytes: 0,
    error: "invalid-payload-range"
  };
  if (lacing === "none") return {
    frameCount: 1,
    frameSizes: [payloadBytes],
    payloadBytes
  };
  if (payloadStart >= payloadEnd) return {
    frameCount: 0,
    frameSizes: [],
    payloadBytes,
    error: "missing-lacing-header"
  };
  const frameCount = bytes[payloadStart] + 1;
  const dataStart = payloadStart + 1;
  if (frameCount < 2) return {
    frameCount,
    frameSizes: [],
    payloadBytes,
    error: "invalid-laced-frame-count"
  };
  if (lacing === "fixed") return readFixedLacedFrames(payloadBytes, frameCount);
  if (lacing === "xiph") return readXiphLacedFrames(bytes, dataStart, payloadEnd, payloadBytes, frameCount);
  return readEbmlLacedFrames(bytes, dataStart, payloadEnd, payloadBytes, frameCount);
}
function readFixedLacedFrames(payloadBytes, frameCount) {
  const dataBytes = payloadBytes - 1;
  if (dataBytes < 0 || dataBytes % frameCount !== 0) {
    return {
      frameCount,
      frameSizes: [],
      payloadBytes,
      error: "invalid-fixed-lacing-size"
    };
  }
  return {
    frameCount,
    frameSizes: Array.from({
      length: frameCount
    }, () => dataBytes / frameCount),
    payloadBytes
  };
}
function readXiphLacedFrames(bytes, offset, end, payloadBytes, frameCount) {
  const frameSizes = [];
  for (let frame = 0; frame < frameCount - 1; frame++) {
    let size = 0;
    let closed = false;
    while (offset < end) {
      const value = bytes[offset++];
      size += value;
      if (value !== 255) {
        closed = true;
        break;
      }
    }
    if (!closed) return {
      frameCount,
      frameSizes: [],
      payloadBytes,
      error: "unterminated-xiph-lacing-size"
    };
    frameSizes.push(size);
  }
  const remaining = end - offset - frameSizes.reduce((sum, size) => sum + size, 0);
  if (remaining < 0) return {
    frameCount,
    frameSizes: [],
    payloadBytes,
    error: "invalid-xiph-lacing-size"
  };
  frameSizes.push(remaining);
  return {
    frameCount,
    frameSizes,
    payloadBytes
  };
}
function readEbmlLacedFrames(bytes, offset, end, payloadBytes, frameCount) {
  const first = readEbmlVint(bytes, offset, end);
  if (!first || first.value === null) return {
    frameCount,
    frameSizes: [],
    payloadBytes,
    error: "missing-ebml-lacing-size"
  };
  const frameSizes = [first.value];
  offset += first.length;
  for (let frame = 1; frame < frameCount - 1; frame++) {
    const delta = readEbmlSignedVint(bytes, offset, end);
    if (!delta) return {
      frameCount,
      frameSizes: [],
      payloadBytes,
      error: "missing-ebml-lacing-delta"
    };
    const size = frameSizes[frame - 1] + delta.value;
    if (size < 0) return {
      frameCount,
      frameSizes: [],
      payloadBytes,
      error: "invalid-ebml-lacing-size"
    };
    frameSizes.push(size);
    offset += delta.length;
  }
  const remaining = end - offset - frameSizes.reduce((sum, size) => sum + size, 0);
  if (remaining < 0) return {
    frameCount,
    frameSizes: [],
    payloadBytes,
    error: "invalid-ebml-lacing-size"
  };
  frameSizes.push(remaining);
  return {
    frameCount,
    frameSizes,
    payloadBytes
  };
}
function readEbmlElements(bytes, start, end) {
  const elements = [];
  let offset = start;
  while (offset < end) {
    const id = readEbmlId(bytes, offset, end);
    if (!id) break;
    const size = readEbmlVint(bytes, offset + id.length, end);
    if (!size) break;
    const dataStart = offset + id.length + size.length;
    const elementEnd = size.value === null ? end : dataStart + size.value;
    if (elementEnd > end) break;
    elements.push({
      id: id.value,
      dataStart,
      end: elementEnd
    });
    if (size.value === null) break;
    offset = elementEnd;
  }
  return elements;
}
function readEbmlId(bytes, offset, end) {
  if (offset >= end) return null;
  const first = bytes[offset];
  let length = 1;
  let mask = 0x80;
  while (length <= 4 && !(first & mask)) {
    length++;
    mask >>>= 1;
  }
  if (length > 4 || offset + length > end) return null;
  let value = 0;
  for (let i = 0; i < length; i++) value = value * 256 + bytes[offset + i];
  return {
    value,
    length
  };
}
function readEbmlVint(bytes, offset, end, removeMarker) {
  if (offset >= end) return null;
  const first = bytes[offset];
  let length = 1;
  let mask = 0x80;
  while (length <= 8 && !(first & mask)) {
    length++;
    mask >>>= 1;
  }
  if (length > 8 || offset + length > end) return null;
  let value = first & (~mask & 0xff) ;
  for (let i = 1; i < length; i++) value = value * 256 + bytes[offset + i];
  const unknown = value === Math.pow(2, length * 7) - 1;
  return {
    value: unknown ? null : value,
    length
  };
}
function readEbmlSignedVint(bytes, offset, end) {
  const vint = readEbmlVint(bytes, offset, end);
  if (!vint || vint.value === null) return null;
  const bias = Math.pow(2, vint.length * 7 - 1) - 1;
  return {
    value: vint.value - bias,
    length: vint.length
  };
}
function readEbmlUnsignedValue(bytes, element) {
  if (!element) return 0;
  let value = 0;
  for (let offset = element.dataStart; offset < element.end; offset++) value = value * 256 + bytes[offset];
  return value;
}
function readEbmlFloatValue(bytes, element) {
  if (!element || ![4, 8].includes(element.end - element.dataStart)) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return element.end - element.dataStart === 4 ? view.getFloat32(element.dataStart, false) : view.getFloat64(element.dataStart, false);
}
function readEbmlStringValue(bytes, element) {
  if (!element) return "";
  return new TextDecoder().decode(bytes.subarray(element.dataStart, element.end));
}
function fourCc(bytes, offset) {
  return String.fromCharCode(bytes[offset] || 0, bytes[offset + 1] || 0, bytes[offset + 2] || 0, bytes[offset + 3] || 0);
}

export { DEFAULT_VALUES, OUTPUT_JSON, OUTPUT_RAW, OUTPUT_VIDEO, inspectBytes, inspectWithValues, isMP4, isWebM, normalizeEmit, normalizeValues, probeSupportWithValues, readWithValues, toBytes, toJsonValue };
//# sourceMappingURL=helpers.js.map
