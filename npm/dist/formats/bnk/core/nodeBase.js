import { readWwiseVar } from './helpers.js';

// Exact Wwise v150 common audio-node decoding. This module is internal to the
// BNK toolkit: it preserves authored facts and byte unions without assigning
// runtime playback or attenuation-curve semantics.

const WWISE_NODE_BASE_VERSION = 150;
const ATTENUATION_PROPERTY_ID = 0x55;
const LOOP_COUNT_PROPERTY_ID = 0x54;
const VALID_CURVE_SCALING = new Set([0, 2, 3, 4]);

/** Bounds-aware little-endian cursor over one HIRC payload. */
class WwiseCursor {
  /**
   * Creates a cursor over a bounded portion of a Wwise payload.
   *
   * @param {Uint8Array} bytes Payload bytes.
   * @param {number} [offset=0] Initial byte offset.
   * @param {number} [end=bytes.byteLength] Exclusive ending offset.
   */
  constructor(bytes, offset = 0, end = bytes?.byteLength) {
    if (!(bytes instanceof Uint8Array) || !Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset < 0 || end < offset || end > bytes.byteLength) {
      throw new TypeError("Invalid Wwise cursor range");
    }
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.at = offset;
    this.end = end;
  }

  /** Gets the number of unread bytes in the bounded range. */
  get remaining() {
    return this.end - this.at;
  }

  /**
   * Verifies that a read of the requested size stays within the range.
   *
   * @param {number} size Number of bytes to read.
   * @throws {RangeError} The read would exceed the bounded range.
   */
  ensure(size) {
    if (!Number.isSafeInteger(size) || size < 0 || this.at + size > this.end) {
      throw new RangeError("truncated Wwise object");
    }
  }

  /** Reads an unsigned 8-bit integer. */
  u8() {
    this.ensure(1);
    return this.view.getUint8(this.at++);
  }

  /** Reads a signed 8-bit integer. */
  s8() {
    this.ensure(1);
    return this.view.getInt8(this.at++);
  }

  /** Reads a little-endian unsigned 16-bit integer. */
  u16() {
    this.ensure(2);
    const value = this.view.getUint16(this.at, true);
    this.at += 2;
    return value;
  }

  /** Reads a little-endian unsigned 32-bit integer. */
  u32() {
    this.ensure(4);
    const value = this.view.getUint32(this.at, true);
    this.at += 4;
    return value;
  }

  /** Reads a little-endian signed 32-bit integer. */
  s32() {
    this.ensure(4);
    const value = this.view.getInt32(this.at, true);
    this.at += 4;
    return value;
  }

  /** Reads a little-endian 32-bit floating-point value. */
  f32() {
    this.ensure(4);
    const value = this.view.getFloat32(this.at, true);
    this.at += 4;
    return value;
  }

  /** Reads a Wwise variable-length unsigned integer. */
  variable() {
    const result = readWwiseVar(this.bytes.subarray(0, this.end), this.at);
    if (!result) {
      throw new RangeError("invalid Wwise variable integer");
    }
    this.at = result.nextOffset;
    return result.value;
  }
}

/**
 * Reads one v150 NodeBase from the current cursor position.
 *
 * The cursor is left at the first type-specific byte.
 */
function readNodeBase(cursor) {
  const fx = ReadInitialFx(cursor);
  const metadata = ReadInitialMetadata(cursor);
  const overrideBusId = cursor.u32();
  const directParentId = cursor.u32();
  const priority = ReadPriority(cursor);
  const {
    properties,
    ranges,
    attenuationId,
    loopCount
  } = ReadInitialProperties(cursor);
  const positioning = ReadPositioning(cursor);
  const aux = ReadAux(cursor);
  const advanced = ReadAdvanced(cursor);
  const state = ReadStateChunk(cursor);
  const rtpcs = readInitialRtpcs(cursor);
  return {
    fx,
    metadata,
    overrideBusId,
    directParentId,
    priority,
    properties,
    ranges,
    attenuationId,
    loopCount,
    positioning,
    aux,
    advanced,
    state,
    rtpcs
  };
}

/** Parses one NodeBase that must consume exactly the supplied byte range. */
function parseNodeBaseRange(bytes, start, end, {
  bankVersion = WWISE_NODE_BASE_VERSION
} = {}) {
  if (!(bytes instanceof Uint8Array) || Number(bankVersion) !== WWISE_NODE_BASE_VERSION) {
    return null;
  }
  try {
    const cursor = new WwiseCursor(bytes, start, end);
    const nodeBase = readNodeBase(cursor);
    return cursor.at === end ? nodeBase : null;
  } catch {
    return null;
  }
}

/** Reads the v150 initial-RTPC list shared by NodeBase and attenuation. */
function readInitialRtpcs(cursor) {
  const count = boundedCount(cursor.u16(), cursor.remaining, 14, 4096);
  const rtpcs = [];
  for (let index = 0; index < count; index++) {
    rtpcs.push(readInitialRtpc(cursor));
  }
  return rtpcs;
}

/** Reads one v150 initial RTPC. */
function readInitialRtpc(cursor) {
  const controlId = cursor.u32();
  const controlType = cursor.u8();
  const accumulation = cursor.u8();
  const parameterId = cursor.variable();
  const curveId = cursor.u32();
  const scaling = cursor.u8();
  const pointCount = boundedCount(cursor.u16(), cursor.remaining, 12, 65535);
  if (controlType > 4 || accumulation > 6 || !VALID_CURVE_SCALING.has(scaling)) {
    throw new RangeError("invalid initial RTPC enum");
  }
  return {
    controlId,
    controlType,
    accumulation,
    parameterId,
    curveId,
    scaling,
    points: readCurvePoints(cursor, pointCount)
  };
}

/** Reads exact Wwise graph points without inferring curve meaning. */
function readCurvePoints(cursor, count) {
  const points = [];
  for (let index = 0; index < count; index++) {
    const from = finite(cursor.f32());
    const to = finite(cursor.f32());
    const interpolation = cursor.u32();
    if (interpolation > 9) {
      throw new RangeError("invalid curve interpolation");
    }
    points.push({
      from,
      to,
      interpolation
    });
  }
  return points;
}

/** Validates an encoded count before allocating or iterating it. */
function boundedCount(value, remaining, stride, maximum) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum || value * stride > remaining) {
    throw new RangeError("invalid Wwise object count");
  }
  return value;
}

/** Rejects non-finite authored curve/position values. */
function finite(value) {
  if (!Number.isFinite(value)) {
    throw new RangeError("non-finite Wwise object value");
  }
  return value;
}
function ReadInitialFx(cursor) {
  const overrideParentRaw = cursor.u8();
  const count = cursor.u8();
  const bypassAllRaw = count ? cursor.u8() : 0;
  const slots = [];
  boundedCount(count, cursor.remaining, 6, 255);
  for (let index = 0; index < count; index++) {
    const slot = cursor.u8();
    const fxId = cursor.u32();
    const flags = cursor.u8();
    slots.push({
      index: slot,
      fxId,
      flags,
      bypass: Boolean(flags & 0x01),
      shareSet: Boolean(flags & 0x02),
      rendered: Boolean(flags & 0x04)
    });
  }
  return {
    overrideParentRaw,
    overrideParent: Boolean(overrideParentRaw),
    bypassAllRaw,
    bypassAll: Boolean(bypassAllRaw),
    slots
  };
}
function ReadInitialMetadata(cursor) {
  const overrideParentRaw = cursor.u8();
  const count = cursor.u8();
  const slots = [];
  boundedCount(count, cursor.remaining, 6, 255);
  for (let index = 0; index < count; index++) {
    const slot = cursor.u8();
    const fxId = cursor.u32();
    const shareSetRaw = cursor.u8();
    slots.push({
      index: slot,
      fxId,
      shareSetRaw,
      shareSet: Boolean(shareSetRaw)
    });
  }
  return {
    overrideParentRaw,
    overrideParent: Boolean(overrideParentRaw),
    slots
  };
}
function ReadPriority(cursor) {
  const flags = cursor.u8();
  return {
    flags,
    overrideParent: Boolean(flags & 0x01),
    applyDistanceFactor: Boolean(flags & 0x02),
    overrideMidiEventsBehavior: Boolean(flags & 0x04),
    overrideMidiNoteTracking: Boolean(flags & 0x08),
    enableMidiNoteTracking: Boolean(flags & 0x10),
    midiBreakLoopOnNoteOff: Boolean(flags & 0x20)
  };
}
function ReadInitialProperties(cursor) {
  const propertyCount = boundedCount(cursor.u8(), cursor.remaining, 5, 255);
  const propertyIds = [];
  for (let index = 0; index < propertyCount; index++) {
    propertyIds.push(cursor.u8());
  }
  const properties = propertyIds.map(id => {
    const rawValue = cursor.u32();
    if (id === LOOP_COUNT_PROPERTY_ID) {
      return {
        id,
        rawValue,
        valueType: "loop-count",
        value: rawValue
      };
    }
    if (id === ATTENUATION_PROPERTY_ID) {
      return {
        id,
        rawValue,
        valueType: "id",
        value: rawValue
      };
    }
    return {
      id,
      rawValue,
      valueType: "union",
      floatValue: FloatFromBits(rawValue)
    };
  });
  const rangeCount = boundedCount(cursor.u8(), cursor.remaining, 9, 255);
  const rangeIds = [];
  for (let index = 0; index < rangeCount; index++) {
    rangeIds.push(cursor.u8());
  }
  const ranges = rangeIds.map(id => {
    const minRaw = cursor.u32();
    const maxRaw = cursor.u32();
    return {
      id,
      minRaw,
      maxRaw,
      minFloat: FloatFromBits(minRaw),
      maxFloat: FloatFromBits(maxRaw)
    };
  });
  const attenuationProperties = properties.filter(property => property.id === ATTENUATION_PROPERTY_ID);
  const loopCountProperties = properties.filter(property => property.id === LOOP_COUNT_PROPERTY_ID);
  if (attenuationProperties.length > 1) {
    throw new RangeError("duplicate v150 Wwise attenuation property");
  }
  if (loopCountProperties.length > 1) {
    throw new RangeError("duplicate v150 Wwise loop-count property");
  }
  const loopCount = loopCountProperties[0]?.value ?? null;
  if (loopCount !== null && loopCount > 32767) {
    throw new RangeError("invalid v150 Wwise loop count");
  }
  return {
    properties,
    ranges,
    attenuationId: attenuationProperties[0]?.value ?? null,
    // Wwise serializes this property only when looping is enabled.
    // Zero means infinite; positive values are finite authored repeats.
    loopCount
  };
}
function ReadPositioning(cursor) {
  const flags = cursor.u8();
  const overrideParent = Boolean(flags & 0x01);
  const listenerRelative = Boolean(flags & 0x02);
  const pannerType = flags >>> 2 & 0x03;
  const positionType = flags >>> 5 & 0x03;
  let spatial = null;
  let automation = null;
  if (positionType === 3) {
    throw new RangeError("invalid v150 Wwise position type");
  }
  if (overrideParent && listenerRelative) {
    const spatialFlags = cursor.u8();
    spatial = {
      flags: spatialFlags,
      mode: spatialFlags & 0x03,
      enableAttenuation: Boolean(spatialFlags & 0x08),
      holdEmitterPositionOrientation: Boolean(spatialFlags & 0x10),
      holdListenerOrientation: Boolean(spatialFlags & 0x20),
      enableDiffraction: Boolean(spatialFlags & 0x40)
    };
    if (positionType !== 0) {
      automation = ReadAutomation(cursor);
    }
  }
  return {
    flags,
    overrideParent,
    listenerRelative,
    pannerType,
    positionType,
    spatial,
    automation
  };
}
function ReadAutomation(cursor) {
  const pathMode = cursor.u8();
  const transitionTime = cursor.s32();
  const vertexCount = boundedCount(cursor.u32(), cursor.remaining, 16, 65535);
  const vertices = [];
  for (let index = 0; index < vertexCount; index++) {
    vertices.push({
      x: finite(cursor.f32()),
      y: finite(cursor.f32()),
      z: finite(cursor.f32()),
      duration: cursor.s32()
    });
  }
  const playlistCount = boundedCount(cursor.u32(), cursor.remaining, 20, 65535);
  const playlist = [];
  for (let index = 0; index < playlistCount; index++) {
    playlist.push({
      verticesOffset: cursor.u32(),
      numVertices: cursor.u32()
    });
  }
  const ranges = [];
  for (let index = 0; index < playlistCount; index++) {
    ranges.push({
      x: finite(cursor.f32()),
      y: finite(cursor.f32()),
      z: finite(cursor.f32())
    });
  }
  return {
    pathMode,
    transitionTime,
    vertices,
    playlist,
    ranges
  };
}
function ReadAux(cursor) {
  const flags = cursor.u8();
  const hasAux = Boolean(flags & 0x08);
  const auxIds = [];
  if (hasAux) {
    for (let index = 0; index < 4; index++) {
      auxIds.push(cursor.u32());
    }
  }
  return {
    flags,
    overrideUserAux: Boolean(flags & 0x04),
    hasAux,
    overrideReflectionsAux: Boolean(flags & 0x10),
    auxIds,
    reflectionsAuxBusId: cursor.u32()
  };
}
function ReadAdvanced(cursor) {
  const flags = cursor.u8();
  const virtualQueueBehavior = cursor.u8();
  const maxInstances = cursor.u16();
  const belowThresholdBehavior = cursor.u8();
  const hdrFlags = cursor.u8();
  if (virtualQueueBehavior > 2 || belowThresholdBehavior > 3) {
    throw new RangeError("invalid v150 Wwise advanced setting");
  }
  return {
    flags,
    killNewest: Boolean(flags & 0x01),
    useVirtualBehavior: Boolean(flags & 0x02),
    ignoreParentMaxInstances: Boolean(flags & 0x08),
    overrideVirtualVoiceBehavior: Boolean(flags & 0x10),
    virtualQueueBehavior,
    maxInstances,
    belowThresholdBehavior,
    hdrFlags,
    overrideHdrEnvelope: Boolean(hdrFlags & 0x01),
    overrideAnalysis: Boolean(hdrFlags & 0x02),
    normalizeLoudness: Boolean(hdrFlags & 0x04),
    enableEnvelope: Boolean(hdrFlags & 0x08)
  };
}
function ReadStateChunk(cursor) {
  const propertyCount = boundedCount(cursor.variable(), cursor.remaining, 3, 4096);
  const properties = [];
  for (let index = 0; index < propertyCount; index++) {
    const propertyId = cursor.variable();
    const accumulation = cursor.u8();
    const inDbRaw = cursor.u8();
    if (accumulation > 6 || inDbRaw > 1) {
      throw new RangeError("invalid v150 Wwise state property");
    }
    properties.push({
      propertyId,
      accumulation,
      inDbRaw,
      inDb: Boolean(inDbRaw)
    });
  }
  const groupCount = boundedCount(cursor.variable(), cursor.remaining, 6, 4096);
  const groups = [];
  for (let index = 0; index < groupCount; index++) {
    const groupId = cursor.u32();
    const syncType = cursor.u8();
    const stateCount = boundedCount(cursor.variable(), cursor.remaining, 6, 4096);
    const states = [];
    if (syncType > 9) {
      throw new RangeError("invalid v150 Wwise state sync type");
    }
    for (let stateIndex = 0; stateIndex < stateCount; stateIndex++) {
      const stateId = cursor.u32();
      const valueCount = boundedCount(cursor.u16(), cursor.remaining, 6, 65535);
      const propertyIds = [];
      for (let valueIndex = 0; valueIndex < valueCount; valueIndex++) {
        propertyIds.push(cursor.u16());
      }
      const values = propertyIds.map(propertyId => ({
        propertyId,
        value: finite(cursor.f32())
      }));
      states.push({
        stateId,
        values
      });
    }
    groups.push({
      groupId,
      syncType,
      states
    });
  }
  return {
    properties,
    groups
  };
}
function FloatFromBits(value) {
  const bytes = new ArrayBuffer(4);
  const view = new DataView(bytes);
  view.setUint32(0, value, true);
  return view.getFloat32(0, true);
}

export { WWISE_NODE_BASE_VERSION, WwiseCursor, boundedCount, finite, parseNodeBaseRange, readCurvePoints, readInitialRtpc, readInitialRtpcs, readNodeBase };
//# sourceMappingURL=nodeBase.js.map
