// Exact Wwise v150 STMG Global Settings decoding. The container reader keeps
// the raw chunk entry and attaches this typed view only when the whole payload
// is valid and consumed.

const WWISE_GLOBAL_SETTINGS_VERSION = 150;
const FILTER_BEHAVIORS = new Set([0, 1]);
const SWITCH_CONTROL_TYPES = new Set([0, 1, 2, 3, 4]);
const INTERPOLATIONS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const RAMP_TYPES = new Set([0, 1, 2]);
const BUILT_IN_PARAMETERS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

/**
 * Decodes one exact Wwise v150 STMG Global Settings payload.
 *
 * Other versions, truncated tables, invalid enums or floats, impossible
 * counts, and trailing bytes return null. Numeric enum values are retained so
 * runtime-resource remains a lossless typed reader rather than a policy layer.
 *
 * @param {Uint8Array} payload STMG payload bytes after the chunk header.
 * @param {object} [options] Decode options.
 * @param {number} [options.bankVersion=150] Wwise bank generator version.
 * @returns {object|null} Typed global settings, or null when not exact.
 */
function parseGlobalSettings(payload, {
  bankVersion = WWISE_GLOBAL_SETTINGS_VERSION
} = {}) {
  if (!(payload instanceof Uint8Array) || Number(bankVersion) !== WWISE_GLOBAL_SETTINGS_VERSION) {
    return null;
  }
  try {
    const cursor = new GlobalSettingsCursor(payload);
    const filterBehavior = ReadEnum(cursor.u16(), FILTER_BEHAVIORS, "filter behavior");
    const result = {
      filterBehavior,
      volumeThreshold: cursor.finiteF32(),
      maxVoices: cursor.u16(),
      maxDangerousVirtualVoices: cursor.u16(),
      stateGroups: ReadStateGroups(cursor),
      switchGroups: ReadSwitchGroups(cursor),
      rtpcParameters: ReadRtpcParameters(cursor),
      acousticTextures: ReadAcousticTextures(cursor)
    };
    return cursor.remaining === 0 ? result : null;
  } catch (error) {
    if (error instanceof RangeError) {
      return null;
    }
    throw error;
  }
}
function ReadStateGroups(cursor) {
  const count = cursor.boundedCount(12);
  const groups = [];
  for (let index = 0; index < count; index++) {
    const id = cursor.u32();
    const defaultTransitionTimeMs = cursor.u32();
    const transitionCount = cursor.boundedCount(12);
    const transitions = [];
    for (let transitionIndex = 0; transitionIndex < transitionCount; transitionIndex++) {
      transitions.push({
        fromId: cursor.u32(),
        toId: cursor.u32(),
        transitionTimeMs: cursor.u32()
      });
    }
    groups.push({
      id,
      defaultTransitionTimeMs,
      transitions
    });
  }
  return groups;
}
function ReadSwitchGroups(cursor) {
  const count = cursor.boundedCount(13);
  const groups = [];
  for (let index = 0; index < count; index++) {
    const id = cursor.u32();
    const controlId = cursor.u32();
    const controlType = ReadEnum(cursor.u8(), SWITCH_CONTROL_TYPES, "switch control type");
    const pointCount = cursor.boundedCount(12);
    const points = [];
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      points.push({
        from: cursor.finiteF32(),
        to: cursor.finiteF32(),
        interpolation: ReadEnum(cursor.u32(), INTERPOLATIONS, "switch interpolation")
      });
    }
    groups.push({
      id,
      controlId,
      controlType,
      points
    });
  }
  return groups;
}
function ReadRtpcParameters(cursor) {
  const count = cursor.boundedCount(21);
  const parameters = [];
  for (let index = 0; index < count; index++) {
    parameters.push({
      id: cursor.u32(),
      defaultValue: cursor.finiteF32(),
      rampType: ReadEnum(cursor.u32(), RAMP_TYPES, "RTPC ramp type"),
      rampUp: cursor.finiteF32(),
      rampDown: cursor.finiteF32(),
      builtInParameter: ReadEnum(cursor.u8(), BUILT_IN_PARAMETERS, "built-in parameter")
    });
  }
  return parameters;
}
function ReadAcousticTextures(cursor) {
  const count = cursor.boundedCount(28);
  const textures = [];
  for (let index = 0; index < count; index++) {
    textures.push({
      id: cursor.u32(),
      absorptionOffset: cursor.finiteF32(),
      absorptionLow: cursor.finiteF32(),
      absorptionMidLow: cursor.finiteF32(),
      absorptionMidHigh: cursor.finiteF32(),
      absorptionHigh: cursor.finiteF32(),
      scattering: cursor.finiteF32()
    });
  }
  return textures;
}
function ReadEnum(value, allowed, label) {
  if (!allowed.has(value)) {
    throw new RangeError(`Invalid Wwise ${label} ${value}`);
  }
  return value;
}

/** Bounds-aware little-endian cursor over one Wwise Global Settings payload. */
class GlobalSettingsCursor {
  /**
   * Creates a cursor over the complete payload.
   *
   * @param {Uint8Array} bytes Global Settings payload bytes.
   */
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.at = 0;
  }

  /** Gets the number of unread bytes. */
  get remaining() {
    return this.bytes.byteLength - this.at;
  }

  /**
   * Requires a bounded number of bytes to remain.
   *
   * @param {number} size Required byte count.
   */
  require(size) {
    if (!Number.isSafeInteger(size) || size < 0 || this.at + size > this.bytes.byteLength) {
      throw new RangeError("Global Settings payload is truncated");
    }
  }

  /**
   * Reads a table count and validates its minimum encoded size.
   *
   * @param {number} minimumStride Minimum bytes required per record.
   * @returns {number} Validated record count.
   */
  boundedCount(minimumStride) {
    const count = this.u32();
    if (count > Math.floor(this.remaining / minimumStride)) {
      throw new RangeError("Global Settings table count exceeds payload");
    }
    return count;
  }

  /** Reads an unsigned 8-bit integer. */
  u8() {
    this.require(1);
    return this.bytes[this.at++];
  }

  /** Reads a little-endian unsigned 16-bit integer. */
  u16() {
    this.require(2);
    const value = this.view.getUint16(this.at, true);
    this.at += 2;
    return value;
  }

  /** Reads a little-endian unsigned 32-bit integer. */
  u32() {
    this.require(4);
    const value = this.view.getUint32(this.at, true);
    this.at += 4;
    return value;
  }

  /** Reads a finite little-endian 32-bit floating-point value. */
  finiteF32() {
    this.require(4);
    const value = this.view.getFloat32(this.at, true);
    this.at += 4;
    if (!Number.isFinite(value)) {
      throw new RangeError("Global Settings float must be finite");
    }
    return value;
  }
}

export { WWISE_GLOBAL_SETTINGS_VERSION, parseGlobalSettings };
//# sourceMappingURL=globalSettings.js.map
