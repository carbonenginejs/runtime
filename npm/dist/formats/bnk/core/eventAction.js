// Exact Wwise v150 HIRC 3 Event Action decoding. The container reader keeps
// the raw payload; this module adds typed action data only when a recognized
// layout consumes that payload exactly.

const WWISE_EVENT_ACTION_VERSION = 150;
const PROPERTY_NAMES = Object.freeze({
  0x39: "delayTime",
  0x3a: "transitionTime",
  0x3b: "probability"
});
const ACTION_NAMES = Object.freeze({
  0x0102: "stop",
  0x0103: "stop",
  0x0105: "stop",
  0x0203: "pause",
  0x0205: "pause",
  0x0303: "resume",
  0x0305: "resume",
  0x0403: "play",
  0x0503: "play-and-continue",
  0x2103: "post-event"
});
const ACTIVE_ACTION_TYPES = new Set([0x0102, 0x0103, 0x0105, 0x0203, 0x0205, 0x0303, 0x0305]);
const PLAY_ACTION_TYPES = new Set([0x0403, 0x0503]);

/**
 * Decodes one exact Wwise v150 HIRC Event Action body.
 *
 * The input begins after the HIRC object's leading u32 identity. Unknown
 * action types, other bank versions, truncated bodies, and recognized bodies
 * with trailing bytes return null so callers retain their shallow/raw view.
 *
 * @param {Uint8Array} payload Event Action body.
 * @param {object} [options] Decode options.
 * @param {number} [options.bankVersion=150] Wwise bank generator version.
 * @returns {object|null} Typed action data, or null when not exact.
 */
function parseEventAction(payload, {
  bankVersion = WWISE_EVENT_ACTION_VERSION
} = {}) {
  if (!(payload instanceof Uint8Array) || Number(bankVersion) !== WWISE_EVENT_ACTION_VERSION) {
    return null;
  }
  try {
    const cursor = new ActionCursor(payload);
    const actionType = cursor.u16();
    const actionName = ACTION_NAMES[actionType];
    if (!actionName) {
      return null;
    }
    const targetId = cursor.u32();
    const targetFlags = cursor.u8();
    const properties = ReadProperties(cursor);
    const ranges = ReadRanges(cursor);
    const result = {
      actionType,
      actionName,
      actionFamily: actionType >> 8 & 0xff,
      actionMode: ActionMode(actionType & 0xff),
      actionScope: ActionScope(actionType & 0xff),
      targetId,
      targetIsBus: (targetFlags & 0x01) !== 0,
      targetFlags,
      properties,
      ranges,
      ...ProjectKnownProperties(properties, ranges)
    };
    if (PLAY_ACTION_TYPES.has(actionType)) {
      result.fadeCurve = cursor.u8();
      result.bankId = cursor.u32();
      result.bankType = cursor.u32();
    } else if (ACTIVE_ACTION_TYPES.has(actionType)) {
      result.fadeCurve = cursor.u8();
      result.actionFlags = cursor.u8();
      const exceptionCount = cursor.varUint();
      const exceptions = [];
      if (exceptionCount > 65536) {
        return null;
      }
      for (let index = 0; index < exceptionCount; index++) {
        const exceptionTargetId = cursor.u32();
        const exceptionTargetFlags = cursor.u8();
        exceptions.push({
          targetId: exceptionTargetId,
          targetIsBus: (exceptionTargetFlags & 0x01) !== 0,
          targetFlags: exceptionTargetFlags
        });
      }
      result.exceptions = exceptions;
    }
    return cursor.at === payload.byteLength ? result : null;
  } catch (error) {
    if (error instanceof RangeError) {
      return null;
    }
    throw error;
  }
}
function ReadProperties(cursor) {
  const count = cursor.u8();
  if (count > 255 || cursor.remaining < count + count * 4) {
    throw new RangeError("Event Action property bundle is truncated");
  }
  const ids = [];
  const values = [];
  for (let index = 0; index < count; index++) {
    ids.push(cursor.u8());
  }
  for (let index = 0; index < count; index++) {
    values.push(cursor.u32());
  }
  return ids.map((id, index) => {
    const rawValue = values[index];
    return {
      id,
      name: PROPERTY_NAMES[id] ?? `property-${id}`,
      value: PropertyValue(id, rawValue),
      rawValue
    };
  });
}
function ReadRanges(cursor) {
  const count = cursor.u8();
  if (count > 255 || cursor.remaining < count + count * 8) {
    throw new RangeError("Event Action range bundle is truncated");
  }
  const ids = [];
  for (let index = 0; index < count; index++) {
    ids.push(cursor.u8());
  }
  return ids.map(id => {
    const rawMin = cursor.u32();
    const rawMax = cursor.u32();
    return {
      id,
      name: PROPERTY_NAMES[id] ?? `property-${id}`,
      min: RangeValue(id, rawMin),
      max: RangeValue(id, rawMax),
      rawMin,
      rawMax
    };
  });
}
function ProjectKnownProperties(properties, ranges) {
  const result = {};
  for (const property of properties) {
    if (property.id === 0x39) result.delayTimeMs = property.value;else if (property.id === 0x3a) {
      result.transitionTimeMs = property.value;
    } else if (property.id === 0x3b) {
      result.probability = property.value;
    }
  }
  for (const range of ranges) {
    const value = {
      min: range.min,
      max: range.max
    };
    if (range.id === 0x39) result.delayRangeMs = value;else if (range.id === 0x3a) result.transitionRangeMs = value;
  }
  return result;
}
function PropertyValue(id, rawValue) {
  if (id === 0x39 || id === 0x3a) {
    return rawValue | 0;
  }
  if (id === 0x3b) {
    const bytes = new ArrayBuffer(4);
    const view = new DataView(bytes);
    view.setUint32(0, rawValue, true);
    return view.getFloat32(0, true);
  }
  return rawValue;
}
function RangeValue(id, rawValue) {
  return id === 0x39 || id === 0x3a ? rawValue | 0 : rawValue;
}
function ActionMode(value) {
  if (value === 0x02 || value === 0x03) return "element";
  if (value === 0x04 || value === 0x05) return "all";
  if (value === 0x08 || value === 0x09) return "all-except";
  return "unknown";
}
function ActionScope(value) {
  if (value === 0x02 || value === 0x04 || value === 0x08) {
    return "global";
  }
  if (value === 0x03 || value === 0x05 || value === 0x09) {
    return "game-object";
  }
  return "unknown";
}

/** Bounds-aware cursor over one Wwise Event Action payload. */
class ActionCursor {
  /**
   * Creates a cursor at the start of an Event Action payload.
   *
   * @param {Uint8Array} bytes Event Action payload bytes.
   */
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.at = 0;
  }

  /** Gets the number of unread payload bytes. */
  get remaining() {
    return this.bytes.byteLength - this.at;
  }

  /**
   * Verifies that a read fits within the payload.
   *
   * @param {number} size Number of bytes to read.
   * @throws {RangeError} The payload is truncated.
   */
  require(size) {
    if (this.at + size > this.bytes.byteLength) {
      throw new RangeError("Event Action payload is truncated");
    }
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

  /** Reads a canonical Wwise variable-length unsigned integer. */
  varUint() {
    let value = 0;
    for (let count = 0; count < 5; count++) {
      const byte = this.u8();
      if (count === 0 && byte === 0x80) {
        throw new RangeError("Event Action exception count is non-canonical");
      }
      if (value > 0x01ffffff) {
        throw new RangeError("Event Action exception count overflows u32");
      }
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) {
        return value >>> 0;
      }
    }
    throw new RangeError("Event Action exception count is truncated");
  }
}

export { WWISE_EVENT_ACTION_VERSION, parseEventAction };
//# sourceMappingURL=eventAction.js.map
