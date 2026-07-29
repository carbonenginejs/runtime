import { readWwiseVar } from './helpers.js';

// Wwise v150 authored-SFX node decoding. Like musicNodes.js, this interprets
// inspect() payload views outside the BNK read path and accepts a suffix only
// when one anchored candidate consumes the payload exactly.

const SUPPORTED_VERSION = 150;
const SFX_CHILD_TYPES = new Set([2, 5, 6, 7, 9]);
const TYPE_NAMES = Object.freeze({
  2: "sound",
  5: "random-sequence-container",
  6: "switch-container",
  9: "blend-container"
});

/**
 * Bounds-aware little-endian cursor used for exact-end Wwise SFX-tail
 * validation.
 */
class SfxCursor {
  /** Creates a cursor over one HIRC payload at a candidate tail offset. */
  constructor(bytes, offset = 0) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.at = offset;
  }

  /** Returns the number of unread payload bytes. */
  get remaining() {
    return this.bytes.byteLength - this.at;
  }

  /** Verifies that a primitive read remains inside the HIRC payload. */
  ensure(size) {
    if (this.at + size > this.bytes.byteLength) {
      throw new RangeError("truncated SFX node");
    }
  }

  /** Reads an unsigned 8-bit integer. */
  u8() {
    this.ensure(1);
    return this.view.getUint8(this.at++);
  }

  /** Reads an unsigned little-endian 16-bit integer. */
  u16() {
    this.ensure(2);
    const value = this.view.getUint16(this.at, true);
    this.at += 2;
    return value;
  }

  /** Reads an unsigned little-endian 32-bit integer. */
  u32() {
    this.ensure(4);
    const value = this.view.getUint32(this.at, true);
    this.at += 4;
    return value;
  }

  /** Reads a signed little-endian 32-bit integer. */
  s32() {
    this.ensure(4);
    const value = this.view.getInt32(this.at, true);
    this.at += 4;
    return value;
  }

  /** Reads a little-endian 32-bit float. */
  f32() {
    this.ensure(4);
    const value = this.view.getFloat32(this.at, true);
    this.at += 4;
    return value;
  }

  /** Reads one MSB-first Wwise variable-length unsigned integer. */
  variable() {
    const result = readWwiseVar(this.bytes, this.at);
    if (!result) {
      throw new RangeError("invalid Wwise variable integer");
    }
    this.at = result.nextOffset;
    return result.value;
  }
}

/**
 * Decodes one v150 HIRC 5 Random/Sequence payload.
 *
 * @returns {object|null} Typed node, or null when no unique exact-end anchor
 * validates.
 */
function parseSfxRandomSequence(payload, knownObjects, {
  bankVersion = SUPPORTED_VERSION
} = {}) {
  return FindRandomSequence(payload, NormalizeKnownObjects(knownObjects), bankVersion).node;
}

/**
 * Decodes one v150 HIRC 6 Switch payload.
 *
 * @returns {object|null} Typed node, or null when no unique exact-end anchor
 * validates.
 */
function parseSfxSwitch(payload, knownObjects, {
  bankVersion = SUPPORTED_VERSION
} = {}) {
  return FindSwitch(payload, NormalizeKnownObjects(knownObjects), bankVersion).node;
}

/**
 * Decodes one v150 HIRC 9 Layer payload without lowering curve semantics.
 *
 * @returns {object|null} Typed node, or null when no unique exact-end anchor
 * validates.
 */
function parseSfxLayer(payload, knownObjects, {
  bankVersion = SUPPORTED_VERSION
} = {}) {
  return FindLayer(payload, NormalizeKnownObjects(knownObjects), bankVersion).node;
}

/**
 * Decodes typed SFX nodes, events, and actions across inspected v150 banks.
 *
 * Raw Wwise identities and semantics are preserved. Runtime schema lowering
 * and optional authoring-name enrichment belong to runtime-audio's builder.
 */
function sfxNodesFromBanks(inspections) {
  const banks = Array.isArray(inspections) ? inspections : [inspections];
  const knownObjects = new Map();
  const duplicates = [];
  for (const inspection of banks) {
    for (const entry of inspection?.hirc ?? []) {
      if (knownObjects.has(entry.id)) {
        duplicates.push({
          id: entry.id,
          previousBank: knownObjects.get(entry.id).bank,
          bank: inspection.source || ""
        });
      }
      knownObjects.set(entry.id, {
        ...entry,
        bank: inspection.source || ""
      });
    }
  }
  const nodes = new Map();
  const events = new Map();
  const actions = new Map();
  const failed = [];
  const ambiguous = [];
  const unsupportedVersions = [];
  const parsedByType = {};
  let parsed = 0;
  for (const inspection of banks) {
    const version = Number(inspection?.bankVersion) >>> 0;
    const bank = inspection?.source || "";
    if (version !== SUPPORTED_VERSION) {
      unsupportedVersions.push({
        bank,
        version
      });
      continue;
    }
    for (const entry of inspection?.hirc ?? []) {
      if (entry.type === 4) {
        events.set(entry.id, {
          id: entry.id,
          type: "event",
          bank,
          actionIds: [...(entry.actionIds ?? [])]
        });
        continue;
      }
      if (entry.type === 3) {
        actions.set(entry.id, {
          id: entry.id,
          type: "event-action",
          bank,
          actionType: entry.actionType,
          targetId: entry.targetId,
          payload: entry.payload
        });
        continue;
      }
      let result = null;
      if (entry.type === 2) {
        if (entry.pluginId === undefined || entry.sourceId === undefined) {
          result = {
            node: null,
            reason: "missing typed sound fields"
          };
        } else {
          result = {
            node: {
              type: "sound",
              pluginId: entry.pluginId,
              pluginType: entry.pluginType ?? entry.pluginId & 0x0f,
              streamType: entry.streamType,
              sourceId: entry.sourceId,
              inMemoryMediaSize: entry.inMemoryMediaSize
            },
            reason: ""
          };
        }
      } else if (entry.type === 5) {
        result = FindRandomSequence(entry.payload, knownObjects, version);
      } else if (entry.type === 6) {
        result = FindSwitch(entry.payload, knownObjects, version);
      } else if (entry.type === 9) {
        result = FindLayer(entry.payload, knownObjects, version);
      } else {
        continue;
      }
      if (!result.node) {
        const failure = {
          bank,
          version,
          type: TYPE_NAMES[entry.type],
          id: entry.id,
          reason: result.reason
        };
        failed.push(failure);
        if (result.reason === "ambiguous anchors") {
          ambiguous.push(failure);
        }
        continue;
      }
      parsed++;
      parsedByType[result.node.type] = (parsedByType[result.node.type] ?? 0) + 1;
      nodes.set(entry.id, {
        id: entry.id,
        bank,
        ...result.node
      });
    }
  }
  return {
    nodes,
    events,
    actions,
    diagnostics: {
      parsed,
      parsedByType,
      failed,
      ambiguous,
      unsupportedVersions,
      duplicates
    }
  };
}
function FindRandomSequence(payload, knownObjects, bankVersion) {
  return FindUnique(payload, bankVersion, cursor => {
    const loopCount = cursor.u16();
    const loopModMin = cursor.u16();
    const loopModMax = cursor.u16();
    const transitionTime = Finite(cursor.f32());
    const transitionTimeModMin = Finite(cursor.f32());
    const transitionTimeModMax = Finite(cursor.f32());
    const avoidRepeatCount = cursor.u16();
    const transitionMode = cursor.u8();
    const randomMode = cursor.u8();
    const containerMode = cursor.u8();
    const flags = cursor.u8();
    if (transitionMode > 5 || randomMode > 1 || containerMode > 1 || flags & ~0x1f) {
      throw new RangeError("invalid Random/Sequence enum");
    }
    const children = ReadChildren(cursor, knownObjects);
    const playlistCount = BoundedCount(cursor.u16(), cursor.remaining, 8, 8192);
    const childSet = new Set(children);
    const playlist = [];
    for (let index = 0; index < playlistCount; index++) {
      const playId = cursor.u32();
      const weight = cursor.s32();
      if (!childSet.has(playId) || weight < 0) {
        throw new RangeError("invalid Random/Sequence playlist");
      }
      playlist.push({
        playId,
        weight
      });
    }
    return {
      type: containerMode === 0 ? "random" : "sequence",
      loopCount,
      loopModMin,
      loopModMax,
      transitionTime,
      transitionTimeModMin,
      transitionTimeModMax,
      avoidRepeatCount,
      transitionMode,
      randomMode,
      usingWeight: Boolean(flags & 0x01),
      resetPlaylistEachPlay: Boolean(flags & 0x02),
      restartBackward: Boolean(flags & 0x04),
      continuous: Boolean(flags & 0x08),
      global: Boolean(flags & 0x10),
      children,
      playlist
    };
  });
}
function FindSwitch(payload, knownObjects, bankVersion) {
  return FindUnique(payload, bankVersion, cursor => {
    const groupType = cursor.u8();
    const groupId = cursor.u32();
    const defaultValueId = cursor.u32();
    const continuousValidation = cursor.u8();
    if (groupType > 1 || continuousValidation > 1) {
      throw new RangeError("invalid Switch enum");
    }
    const children = ReadChildren(cursor, knownObjects);
    const assignmentCount = BoundedCount(cursor.u32(), cursor.remaining, 8, 8192);
    const assignments = [];
    for (let index = 0; index < assignmentCount; index++) {
      const valueId = cursor.u32();
      const itemCount = BoundedCount(cursor.u32(), cursor.remaining, 4, 8192);
      const childIds = [];
      for (let item = 0; item < itemCount; item++) {
        const childId = cursor.u32();
        childIds.push(childId);
      }
      assignments.push({
        valueId,
        childIds
      });
    }
    const parameterCount = BoundedCount(cursor.u32(), cursor.remaining, 14, 8192);
    const parameters = [];
    for (let index = 0; index < parameterCount; index++) {
      const childId = cursor.u32();
      const flags1 = cursor.u8();
      const flags2 = cursor.u8();
      const onSwitchMode = flags2 & 0x07;
      if (flags1 & ~0x03 || flags2 & ~0x07 || onSwitchMode > 1) {
        throw new RangeError("invalid Switch parameter");
      }
      parameters.push({
        childId,
        firstOnly: Boolean(flags1 & 0x01),
        continuePlayback: Boolean(flags1 & 0x02),
        onSwitchMode,
        fadeOutMs: cursor.s32(),
        fadeInMs: cursor.s32()
      });
    }

    // Essential and partial banks may retain raw SwitchList and parameter
    // references to nodes that are not serialized in direct Children.
    // Consumers decide whether those referenced nodes are available.
    return {
      type: "switch",
      groupType,
      groupId,
      defaultValueId,
      continuousValidation: Boolean(continuousValidation),
      children,
      assignments,
      parameters
    };
  });
}
function FindLayer(payload, knownObjects, bankVersion) {
  return FindUnique(payload, bankVersion, cursor => {
    const children = ReadChildren(cursor, knownObjects);
    const childSet = new Set(children);
    const layerCount = BoundedCount(cursor.u32(), cursor.remaining, 15, 1024);
    const layers = [];
    for (let index = 0; index < layerCount; index++) {
      const layerId = cursor.u32();
      const initialRtpcCount = BoundedCount(cursor.u16(), cursor.remaining, 14, 4096);
      const initialRtpcs = [];
      for (let rtpc = 0; rtpc < initialRtpcCount; rtpc++) {
        initialRtpcs.push(ReadInitialRTPC(cursor));
      }
      const controlId = cursor.u32();
      const controlType = cursor.u8();
      const associationCount = BoundedCount(cursor.u32(), cursor.remaining, 8, 8192);
      const associations = [];
      if (controlType > 4) {
        throw new RangeError("invalid Layer control type");
      }
      for (let association = 0; association < associationCount; association++) {
        const childId = cursor.u32();
        const pointCount = BoundedCount(cursor.u32(), cursor.remaining, 12, 65535);
        if (!childSet.has(childId)) {
          throw new RangeError("invalid Layer association child");
        }
        associations.push({
          childId,
          points: ReadPoints(cursor, pointCount)
        });
      }
      layers.push({
        layerId,
        initialRtpcs,
        controlId,
        controlType,
        associations
      });
    }
    const continuousValidation = cursor.u8();
    if (continuousValidation > 1) {
      throw new RangeError("invalid Layer validation mode");
    }
    return {
      type: "layer",
      children,
      layers,
      continuousValidation: Boolean(continuousValidation)
    };
  });
}
function ReadInitialRTPC(cursor) {
  const controlId = cursor.u32();
  const controlType = cursor.u8();
  const accumulation = cursor.u8();
  const parameterId = cursor.variable();
  const curveId = cursor.u32();
  const scaling = cursor.u8();
  const pointCount = BoundedCount(cursor.u16(), cursor.remaining, 12, 65535);
  if (controlType > 4 || accumulation > 6 || scaling > 5) {
    throw new RangeError("invalid initial RTPC enum");
  }
  return {
    controlId,
    controlType,
    accumulation,
    parameterId,
    curveId,
    scaling,
    points: ReadPoints(cursor, pointCount)
  };
}
function ReadPoints(cursor, count) {
  const points = [];
  for (let index = 0; index < count; index++) {
    const from = Finite(cursor.f32());
    const to = Finite(cursor.f32());
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
function ReadChildren(cursor, knownObjects) {
  const count = BoundedCount(cursor.u32(), cursor.remaining, 4, 8192);
  const children = [];
  for (let index = 0; index < count; index++) {
    const id = cursor.u32();
    const type = KnownType(knownObjects.get(id));
    if (!SFX_CHILD_TYPES.has(type)) {
      throw new RangeError("invalid SFX child identity");
    }
    children.push(id);
  }
  return children;
}
function FindUnique(payload, bankVersion, parse) {
  if (!(payload instanceof Uint8Array) || Number(bankVersion) !== SUPPORTED_VERSION) {
    return {
      node: null,
      reason: "unsupported bank version"
    };
  }
  const candidates = [];
  for (let anchor = 0; anchor < payload.byteLength; anchor++) {
    try {
      const cursor = new SfxCursor(payload, anchor);
      const node = parse(cursor);
      if (cursor.at === payload.byteLength) {
        candidates.push(node);
      }
    } catch {
      // This byte was not the exact type-tail anchor.
    }
  }
  if (candidates.length === 1) {
    return {
      node: candidates[0],
      reason: ""
    };
  }
  return {
    node: null,
    reason: candidates.length ? "ambiguous anchors" : "no exact anchor"
  };
}
function NormalizeKnownObjects(value) {
  if (value instanceof Map) {
    return value;
  }
  const map = new Map();
  for (const entry of value ?? []) {
    if (typeof entry === "number") {
      map.set(entry, {
        type: 2
      });
    } else if (entry?.id !== undefined) {
      map.set(Number(entry.id) >>> 0, entry);
    }
  }
  return map;
}
function KnownType(value) {
  return typeof value === "number" ? value : value?.type;
}
function BoundedCount(value, remaining, stride, maximum) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum || value * stride > remaining) {
    throw new RangeError("invalid SFX node count");
  }
  return value;
}
function Finite(value) {
  if (!Number.isFinite(value)) {
    throw new RangeError("non-finite SFX node value");
  }
  return value;
}

export { parseSfxLayer, parseSfxRandomSequence, parseSfxSwitch, sfxNodesFromBanks };
//# sourceMappingURL=sfxNodes.js.map
