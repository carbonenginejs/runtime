import { WWISE_NODE_BASE_VERSION, parseNodeBaseRange, WwiseCursor, readNodeBase, boundedCount, finite, readInitialRtpcs, readCurvePoints, readInitialRtpc } from './nodeBase.js';

// Wwise v150 authored-SFX node decoding. Like musicNodes.js, this interprets
// inspect() payload views outside the BNK read path and accepts a suffix only
// when one anchored candidate consumes the payload exactly. Common NodeBase
// facts and non-playable hierarchy/attenuation objects stay separate from the
// playback-node map.

const SUPPORTED_VERSION = WWISE_NODE_BASE_VERSION;
const SFX_CHILD_TYPES = new Set([2, 5, 6, 7, 9]);
const TYPE_NAMES = Object.freeze({
  2: "sound",
  5: "random-sequence-container",
  6: "switch-container",
  7: "actor-mixer",
  9: "blend-container",
  14: "attenuation"
});

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
 * Decodes one exact v150 HIRC 7 Actor-Mixer hierarchy object.
 *
 * Actor-Mixers carry inherited NodeBase facts and child identities, but are
 * not themselves playable container behavior.
 *
 * @returns {object|null} Typed hierarchy object, or null when invalid.
 */
function parseSfxActorMixer(payload, {
  bankVersion = SUPPORTED_VERSION
} = {}) {
  return FindActorMixer(payload, bankVersion).node;
}

/**
 * Decodes one exact v150 HIRC 14 attenuation object without assigning curve
 * slots semantic names.
 *
 * @returns {object|null} Typed attenuation object, or null when invalid.
 */
function parseSfxAttenuation(payload, {
  bankVersion = SUPPORTED_VERSION
} = {}) {
  return FindAttenuation(payload, bankVersion).node;
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
  const nodeBases = new Map();
  const actorMixers = new Map();
  const attenuations = new Map();
  const events = new Map();
  const actions = new Map();
  const failed = [];
  const nodeBaseFailed = [];
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
          action: entry.action ?? null,
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
      } else if (entry.type === 7) {
        result = FindActorMixer(entry.payload, version);
      } else if (entry.type === 9) {
        result = FindLayer(entry.payload, knownObjects, version);
      } else if (entry.type === 14) {
        result = FindAttenuation(entry.payload, version);
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
      if (entry.type === 14) {
        attenuations.set(entry.id, {
          id: entry.id,
          bank,
          ...result.node
        });
        continue;
      }
      if (entry.type === 7) {
        actorMixers.set(entry.id, {
          id: entry.id,
          bank,
          ...result.node
        });
        nodeBases.set(entry.id, result.node.nodeBase);
        continue;
      }
      const node = {
        id: entry.id,
        bank,
        ...result.node
      };
      const nodeBaseResult = ReadEntryNodeBase(entry, result, version);
      nodes.set(entry.id, node);
      if (nodeBaseResult.nodeBase) {
        nodeBases.set(entry.id, nodeBaseResult.nodeBase);
      } else {
        nodeBaseFailed.push({
          bank,
          version,
          type: TYPE_NAMES[entry.type],
          id: entry.id,
          reason: nodeBaseResult.reason
        });
      }
    }
  }
  return {
    nodes,
    nodeBases,
    actorMixers,
    attenuations,
    events,
    actions,
    diagnostics: {
      parsed,
      parsedByType,
      failed,
      nodeBaseFailed,
      ambiguous,
      unsupportedVersions,
      duplicates
    }
  };
}
function ReadEntryNodeBase(entry, result, bankVersion) {
  if (entry.type === 2) {
    const start = SoundNodeBaseOffset(entry);
    if (start === null) {
      return {
        nodeBase: null,
        reason: "sound NodeBase offset is unavailable"
      };
    }
    const nodeBase = parseNodeBaseRange(entry.payload, start, entry.payload.byteLength, {
      bankVersion
    });
    return {
      nodeBase,
      reason: nodeBase ? "" : "sound NodeBase did not consume its exact byte range"
    };
  }
  if (result.anchor === undefined) {
    return {
      nodeBase: null,
      reason: "container NodeBase anchor is unavailable"
    };
  }
  const nodeBase = parseNodeBaseRange(entry.payload, 0, result.anchor, {
    bankVersion
  });
  return {
    nodeBase,
    reason: nodeBase ? "" : "container NodeBase did not consume its exact byte range"
  };
}
function SoundNodeBaseOffset(entry) {
  const payload = entry?.payload;
  if (!(payload instanceof Uint8Array) || payload.byteLength < 14) {
    return null;
  }
  const pluginType = Number(entry.pluginType ?? entry.pluginId & 0x0f);
  if (pluginType !== 2) {
    return 14;
  }
  if (payload.byteLength < 18) {
    return null;
  }
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const parameterSize = view.getUint32(14, true);
  const start = 18 + parameterSize;
  return Number.isSafeInteger(start) && start <= payload.byteLength ? start : null;
}
function FindActorMixer(payload, bankVersion) {
  return ParseExact(payload, bankVersion, cursor => {
    const nodeBase = readNodeBase(cursor);
    const count = boundedCount(cursor.u32(), cursor.remaining, 4, 8192);
    const children = [];
    for (let index = 0; index < count; index++) {
      children.push(cursor.u32());
    }
    return {
      type: "actor-mixer",
      nodeBase,
      children
    };
  });
}
function FindAttenuation(payload, bankVersion) {
  return ParseExact(payload, bankVersion, cursor => {
    const heightSpreadRaw = cursor.u8();
    const coneFlags = cursor.u8();
    let cone = null;
    if (coneFlags & 0x01) {
      cone = {
        insideDegrees: finite(cursor.f32()),
        outsideDegrees: finite(cursor.f32()),
        outsideVolume: finite(cursor.f32()),
        lowPass: finite(cursor.f32()),
        highPass: finite(cursor.f32())
      };
    }
    const curveToUse = [];
    for (let index = 0; index < 19; index++) {
      curveToUse.push(cursor.s8());
    }
    const curveCount = boundedCount(cursor.u8(), cursor.remaining, 3, 19);
    const curves = [];
    for (let index = 0; index < curveCount; index++) {
      const scaling = cursor.u8();
      const pointCount = boundedCount(cursor.u16(), cursor.remaining, 12, 65535);
      const rtpc = ReadInitialRTPCFromCurve(cursor, scaling, pointCount);
      curves.push(rtpc);
    }
    return {
      type: "attenuation",
      heightSpreadRaw,
      heightSpread: Boolean(heightSpreadRaw),
      coneFlags,
      cone,
      curveToUse,
      curves,
      rtpcs: readInitialRtpcs(cursor)
    };
  });
}
function ReadInitialRTPCFromCurve(cursor, scaling, pointCount) {
  if (![0, 2, 3, 4].includes(scaling)) {
    throw new RangeError("invalid attenuation curve scaling");
  }
  return {
    scaling,
    points: readCurvePoints(cursor, pointCount)
  };
}
function FindRandomSequence(payload, knownObjects, bankVersion) {
  return FindUnique(payload, bankVersion, cursor => {
    const loopCount = cursor.u16();
    const loopModMin = cursor.u16();
    const loopModMax = cursor.u16();
    const transitionTime = finite(cursor.f32());
    const transitionTimeModMin = finite(cursor.f32());
    const transitionTimeModMax = finite(cursor.f32());
    const avoidRepeatCount = cursor.u16();
    const transitionMode = cursor.u8();
    const randomMode = cursor.u8();
    const containerMode = cursor.u8();
    const flags = cursor.u8();
    if (transitionMode > 5 || randomMode > 1 || containerMode > 1 || flags & ~0x1f) {
      throw new RangeError("invalid Random/Sequence enum");
    }
    const children = ReadChildren(cursor, knownObjects);
    const playlistCount = boundedCount(cursor.u16(), cursor.remaining, 8, 8192);
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
    const assignmentCount = boundedCount(cursor.u32(), cursor.remaining, 8, 8192);
    const assignments = [];
    for (let index = 0; index < assignmentCount; index++) {
      const valueId = cursor.u32();
      const itemCount = boundedCount(cursor.u32(), cursor.remaining, 4, 8192);
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
    const parameterCount = boundedCount(cursor.u32(), cursor.remaining, 14, 8192);
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
    const layerCount = boundedCount(cursor.u32(), cursor.remaining, 15, 1024);
    const layers = [];
    for (let index = 0; index < layerCount; index++) {
      const layerId = cursor.u32();
      const initialRtpcCount = boundedCount(cursor.u16(), cursor.remaining, 14, 4096);
      const initialRtpcs = [];
      for (let rtpc = 0; rtpc < initialRtpcCount; rtpc++) {
        initialRtpcs.push(readInitialRtpc(cursor));
      }
      const controlId = cursor.u32();
      const controlType = cursor.u8();
      const associationCount = boundedCount(cursor.u32(), cursor.remaining, 8, 8192);
      const associations = [];
      if (controlType > 4) {
        throw new RangeError("invalid Layer control type");
      }
      for (let association = 0; association < associationCount; association++) {
        const childId = cursor.u32();
        const pointCount = boundedCount(cursor.u32(), cursor.remaining, 12, 65535);
        if (!childSet.has(childId)) {
          throw new RangeError("invalid Layer association child");
        }
        associations.push({
          childId,
          points: readCurvePoints(cursor, pointCount)
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
function ReadChildren(cursor, knownObjects) {
  const count = boundedCount(cursor.u32(), cursor.remaining, 4, 8192);
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
      const cursor = new WwiseCursor(payload, anchor);
      const node = parse(cursor);
      if (cursor.at === payload.byteLength) {
        candidates.push({
          node,
          anchor
        });
      }
    } catch {
      // This byte was not the exact type-tail anchor.
    }
  }
  if (candidates.length === 1) {
    return {
      node: candidates[0].node,
      anchor: candidates[0].anchor,
      reason: ""
    };
  }
  if (candidates.length > 1) {
    const exactNodeBase = candidates.filter(candidate => parseNodeBaseRange(payload, 0, candidate.anchor, {
      bankVersion
    }));
    if (exactNodeBase.length === 1) {
      return {
        node: exactNodeBase[0].node,
        anchor: exactNodeBase[0].anchor,
        reason: ""
      };
    }
  }
  return {
    node: null,
    reason: candidates.length ? "ambiguous anchors" : "no exact anchor"
  };
}
function ParseExact(payload, bankVersion, parse) {
  if (!(payload instanceof Uint8Array) || Number(bankVersion) !== SUPPORTED_VERSION) {
    return {
      node: null,
      reason: "unsupported bank version"
    };
  }
  try {
    const cursor = new WwiseCursor(payload);
    const node = parse(cursor);
    return cursor.at === payload.byteLength ? {
      node,
      reason: ""
    } : {
      node: null,
      reason: "trailing bytes"
    };
  } catch (cause) {
    return {
      node: null,
      reason: cause instanceof Error ? cause.message : "invalid object"
    };
  }
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

export { parseSfxActorMixer, parseSfxAttenuation, parseSfxLayer, parseSfxRandomSequence, parseSfxSwitch, sfxNodesFromBanks };
//# sourceMappingURL=sfxNodes.js.map
