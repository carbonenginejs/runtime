import { normalizeStaticParametricEqChain } from '../internal/busEffects.js';

const SFX_SCHEMA_VERSION = 2;
const NODE_TYPES = new Set(["blend", "parallel", "random", "sequence", "silence", "timed-silence", "sound", "switch"]);
const SWITCH_SCOPES = new Set(["state", "switch"]);
const RTPC_SCOPES = new Set(["global", "object"]);
const RTPC_PROPERTY_SCALING = new Map([["highPass", 0], ["initialDelay", 0], ["lowPass", 0], ["pitch", 0], ["volume", 2]]);
const CONTAINER_SCOPES = new Set(["global", "object"]);
const RANDOM_MODES = new Set(["random", "shuffle"]);
const CONTINUOUS_TRANSITIONS = new Set(["crossfade-amplitude", "crossfade-power", "delay", "disabled", "trigger-rate"]);
const MIN_TRIGGER_RATE_MS = 21;
const EVENT_ACTION_KINDS = new Set(["state", "switch"]);
const VOICE_VOLUME_ACTION_KINDS = new Set(["reset-voice-volume", "set-voice-volume"]);
const BUS_VOLUME_ACTION_KINDS = new Set(["reset-bus-volume", "set-bus-volume"]);
const VOICE_PITCH_ACTION_KINDS = new Set(["reset-voice-pitch", "set-voice-pitch"]);
const VOICE_FILTER_ACTION_KINDS = new Set(["reset-voice-high-pass", "reset-voice-low-pass", "set-voice-high-pass", "set-voice-low-pass"]);
const GAME_PARAMETER_ACTION_KINDS = new Set(["reset-game-parameter", "set-game-parameter"]);
const PLAYBACK_CONTROL_ACTION_KINDS = new Set(["pause", "resume", "stop"]);
const PLAYBACK_CONTROL_SCOPES = new Set(["game-object", "global"]);
const PLAYBACK_CONTROL_MODES = new Set(["all", "all-except", "element"]);

/**
 * Validates one browser-portable authored SFX graph against installed media.
 */
function validateSfxGraph(graph, media = {}, embeddedMedia = {}) {
  RequireRecord(graph, "Audio library SFX graph");
  if (graph.schemaVersion !== SFX_SCHEMA_VERSION) {
    throw new TypeError(`Unsupported audio SFX schema version: ${graph.schemaVersion}`);
  }
  const events = RequireRecord(graph.events, "Audio library SFX events");
  const nodes = RequireRecord(graph.nodes, "Audio library SFX nodes");
  const programs = graph.programs === undefined ? {} : RequireRecord(graph.programs, "Audio library SFX programs");
  ValidateStateTransitions(graph.stateTransitions, "Audio library SFX stateTransitions");
  for (const [rawID, node] of Object.entries(nodes)) {
    const id = NormalizePositiveID(rawID, `Audio library SFX node ${rawID}`);
    RequireRecord(node, `Audio library SFX node ${id}`);
    if (!NODE_TYPES.has(node.type)) {
      throw new TypeError(`Audio library SFX node ${id} has unsupported type ${node.type}`);
    }
    ValidateGain(node, `Audio library SFX node ${id}`);
    ValidateNodePlaybackProperties(node, `Audio library SFX node ${id}`);
    ValidateVoiceLimit(node.voiceLimit, node, `Audio library SFX node ${id} voiceLimit`);
    ValidateRtpcCurves(node.rtpcCurves, `Audio library SFX node ${id} rtpcCurves`);
    ValidateStateProperties(node.stateProperties, `Audio library SFX node ${id} stateProperties`);
    if (node.type !== "sound" && node.sourceEffects !== undefined) {
      throw new TypeError(`Audio library SFX node ${id} sourceEffects require a sound node`);
    }
    if (node.type === "sound" || node.type === "silence" || node.type === "timed-silence") {
      if (node.type === "silence") {
        continue;
      }
      if (node.type === "timed-silence") {
        ValidateTimedSilence(node, `Audio library SFX timed silence ${id}`);
        ValidatePhysicalLeafIdentity(node, id, `Audio library SFX timed silence ${id}`);
        continue;
      }
      const mediaID = NormalizePositiveID(node.mediaId, `Audio library SFX sound ${id} mediaId`);
      if (!media[mediaID] && !embeddedMedia[mediaID]) {
        throw new TypeError(`Audio library SFX sound ${id} references missing source ${mediaID}`);
      }
      if (node.loop !== undefined && typeof node.loop !== "boolean") {
        throw new TypeError(`Audio library SFX sound ${id} loop must be boolean`);
      }
      if (node.playCount !== undefined) {
        NormalizePositiveInteger(node.playCount, `Audio library SFX sound ${id} playCount`);
        if (node.loop === true) {
          throw new TypeError(`Audio library SFX sound ${id} cannot combine loop and playCount`);
        }
      }
      if (node.playbackRate !== undefined) {
        NormalizePositiveNumber(node.playbackRate, `Audio library SFX sound ${id} playbackRate`);
      }
      if (node.spatial !== undefined && typeof node.spatial !== "boolean") {
        throw new TypeError(`Audio library SFX sound ${id} spatial must be boolean`);
      }
      ValidateDryVolumeCurve(node.dryVolumeCurve, `Audio library SFX sound ${id} dryVolumeCurve`);
      if (node.sourceEffects !== undefined) {
        normalizeStaticParametricEqChain(node.sourceEffects, `Audio library SFX sound ${id} sourceEffects`);
      }
      ValidatePhysicalLeafIdentity(node, id, `Audio library SFX sound ${id}`);
      continue;
    }
    if (node.type === "switch") {
      NormalizeName(node.group, `Audio library SFX switch ${id} group`);
      if (!SWITCH_SCOPES.has(node.scope ?? "switch")) {
        throw new TypeError(`Audio library SFX switch ${id} scope must be switch or state`);
      }
      const cases = RequireRecord(node.cases, `Audio library SFX switch ${id} cases`);
      if (!Object.keys(cases).length) {
        throw new TypeError(`Audio library SFX switch ${id} must have at least one case`);
      }
      const foldedCases = new Set();
      for (const [name, child] of Object.entries(cases)) {
        const normalizedName = NormalizeName(name, `Audio library SFX switch ${id} case`);
        const folded = normalizedName.toLowerCase();
        if (foldedCases.has(folded)) {
          throw new TypeError(`Audio library SFX switch ${id} has duplicate case ${name}`);
        }
        foldedCases.add(folded);
        ValidateChild(child, nodes, `Audio library SFX switch ${id} case ${name}`);
      }
      if (node.default !== undefined && node.default !== null) {
        ValidateChild(node.default, nodes, `Audio library SFX switch ${id} default`);
      }
      if (node.continuous !== undefined) {
        ValidateContinuousSwitch(node.continuous, nodes, `Audio library SFX switch ${id} continuous`, node);
      }
      continue;
    }
    if (!Array.isArray(node.children) || !node.children.length) {
      throw new TypeError(`Audio library SFX ${node.type} ${id} must have children`);
    }
    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      ValidateChild(child, nodes, `Audio library SFX ${node.type} ${id} child ${index}`, node.type === "random");
    }
    if (node.type === "random" && node.avoidRepeat !== undefined) {
      NormalizeNonNegativeInteger(node.avoidRepeat, `Audio library SFX random ${id} avoidRepeat`);
    }
    if ((node.type === "random" || node.type === "sequence") && !CONTAINER_SCOPES.has(node.scope ?? "object")) {
      throw new TypeError(`Audio library SFX ${node.type} ${id} scope must be object or global`);
    }
    if (node.type === "random" && !RANDOM_MODES.has(node.mode ?? "random")) {
      throw new TypeError(`Audio library SFX random ${id} mode must be random or shuffle`);
    }
    if (node.type === "sequence" && node.loop !== undefined && typeof node.loop !== "boolean") {
      throw new TypeError(`Audio library SFX sequence ${id} loop must be boolean`);
    }
    if ((node.type === "random" || node.type === "sequence") && node.continuous !== undefined) {
      ValidateContinuousContainer(node.continuous, `Audio library SFX ${node.type} ${id} continuous`, node.type);
    }
  }
  for (const [eventName, roots] of Object.entries(events)) {
    NormalizeName(eventName, "Audio library SFX event name");
    if (!Array.isArray(roots) || !roots.length) {
      throw new TypeError(`Audio library SFX event ${eventName} must have roots`);
    }
    for (let index = 0; index < roots.length; index++) {
      ValidateChild(roots[index], nodes, `Audio library SFX event ${eventName} root ${index}`);
    }
  }
  for (const [eventName, actions] of Object.entries(programs)) {
    NormalizeName(eventName, "Audio library SFX program event name");
    if (!Array.isArray(actions) || !actions.length) {
      throw new TypeError(`Audio library SFX program ${eventName} must have actions`);
    }
    for (let index = 0; index < actions.length; index++) {
      const action = RequireRecord(actions[index], `Audio library SFX program ${eventName} action ${index}`);
      const label = `Audio library SFX program ${eventName} action ${index}`;
      if (action.kind === "play") {
        ValidateChild(action.child, nodes, `${label} child`);
        continue;
      }
      if (PLAYBACK_CONTROL_ACTION_KINDS.has(action.kind)) {
        ValidatePlaybackControlAction(action, label);
        continue;
      }
      if (VOICE_VOLUME_ACTION_KINDS.has(action.kind)) {
        ValidateVoiceVolumeAction(action, label);
        continue;
      }
      if (BUS_VOLUME_ACTION_KINDS.has(action.kind)) {
        ValidateBusVolumeAction(action, label);
        continue;
      }
      if (VOICE_PITCH_ACTION_KINDS.has(action.kind)) {
        ValidateVoicePitchAction(action, label);
        continue;
      }
      if (VOICE_FILTER_ACTION_KINDS.has(action.kind)) {
        ValidateVoiceFilterAction(action, label);
        continue;
      }
      if (GAME_PARAMETER_ACTION_KINDS.has(action.kind)) {
        ValidateGameParameterAction(action, label);
        continue;
      }
      ValidateSetterAction(action, label);
    }
    const projected = actions.filter(action => action.kind === "play").map(action => NormalizeChild(action.child));
    const roots = events[eventName] ?? [];
    if (!ChildrenEqual(projected, roots.map(NormalizeChild))) {
      throw new TypeError(`Audio library SFX event ${eventName} roots must equal its ordered Play projection`);
    }
  }
  ValidateAcyclic(events, nodes);
  ValidateContinuousNesting(nodes);
  ValidateCrossfadeDescendants(nodes);
  return true;
}

/**
 * Returns one deterministic plain-JSON SFX graph after validation.
 */
function normalizeSfxGraph(graph, media = {}, embeddedMedia = {}) {
  validateSfxGraph(graph, media, embeddedMedia);
  const nodes = {};
  for (const id of Object.keys(graph.nodes).sort((left, right) => Number(left) - Number(right))) {
    nodes[id] = NormalizeNode(graph.nodes[id]);
  }
  const events = {};
  for (const name of Object.keys(graph.events).sort()) {
    events[name] = graph.events[name].map(NormalizeChild);
  }
  const result = {
    schemaVersion: SFX_SCHEMA_VERSION,
    generator: String(graph.generator ?? "@carbonenginejs/runtime-audio/library-builder"),
    events,
    nodes
  };
  if (graph.stateTransitions?.length) {
    result.stateTransitions = NormalizeStateTransitions(graph.stateTransitions);
  }
  if (graph.programs && Object.keys(graph.programs).length) {
    result.programs = {};
    for (const name of Object.keys(graph.programs).sort()) {
      result.programs[name] = graph.programs[name].map(action => {
        if (action.kind === "play") {
          return {
            kind: "play",
            child: NormalizeChild(action.child)
          };
        }
        if (PLAYBACK_CONTROL_ACTION_KINDS.has(action.kind)) {
          return NormalizePlaybackControlAction(action);
        }
        if (VOICE_VOLUME_ACTION_KINDS.has(action.kind)) {
          return NormalizeVoiceVolumeAction(action);
        }
        if (BUS_VOLUME_ACTION_KINDS.has(action.kind)) {
          return NormalizeBusVolumeAction(action);
        }
        if (VOICE_PITCH_ACTION_KINDS.has(action.kind)) {
          return NormalizeVoicePitchAction(action);
        }
        if (VOICE_FILTER_ACTION_KINDS.has(action.kind)) {
          return NormalizeVoiceFilterAction(action);
        }
        if (GAME_PARAMETER_ACTION_KINDS.has(action.kind)) {
          return NormalizeGameParameterAction(action);
        }
        return NormalizeSetterAction(action);
      });
    }
  }
  return result;
}
function NormalizeSetterAction(action) {
  return {
    kind: action.kind,
    group: String(action.group),
    value: String(action.value)
  };
}
function NormalizeNode(node) {
  const result = {
    type: node.type,
    ...NormalizeGain(node),
    ...NormalizeNodePlaybackProperties(node),
    ...NormalizeVoiceLimit(node.voiceLimit),
    ...NormalizeRtpcCurves(node),
    ...NormalizeStateProperties(node)
  };
  if (node.type === "sound" || node.type === "silence" || node.type === "timed-silence") {
    if (node.type === "silence") {
      return result;
    }
    if (node.type === "timed-silence") {
      result.durationMs = Number(node.durationMs);
      NormalizePhysicalLeafIdentity(result, node);
      return result;
    }
    result.mediaId = String(Number(node.mediaId) >>> 0);
    if (node.loop !== undefined) {
      result.loop = node.loop;
    }
    if (node.playCount !== undefined) {
      result.playCount = Number(node.playCount);
    }
    if (node.playbackRate !== undefined) {
      result.playbackRate = Number(node.playbackRate);
    }
    if (node.spatial !== undefined) {
      result.spatial = node.spatial;
    }
    if (node.dryVolumeCurve !== undefined) {
      result.dryVolumeCurve = {
        scaling: Number(node.dryVolumeCurve.scaling),
        points: node.dryVolumeCurve.points.map(point => ({
          x: Number(point.x),
          value: Number(point.value),
          ...(point.interpolation === undefined ? {} : {
            interpolation: Number(point.interpolation)
          })
        }))
      };
    }
    if (node.sourceEffects !== undefined) {
      result.sourceEffects = normalizeStaticParametricEqChain(node.sourceEffects, `Audio library SFX sound ${node.mediaId} sourceEffects`).map(effect => ({
        ...effect,
        bands: effect.bands.map(band => ({
          ...band
        }))
      }));
    }
    NormalizePhysicalLeafIdentity(result, node);
    return result;
  }
  if (node.type === "switch") {
    result.scope = node.scope ?? "switch";
    result.group = String(node.group);
    result.cases = {};
    for (const name of Object.keys(node.cases).sort()) {
      result.cases[name] = NormalizeChild(node.cases[name]);
    }
    if (node.default !== undefined && node.default !== null) {
      result.default = NormalizeChild(node.default);
    }
    if (node.continuous !== undefined) {
      result.continuous = NormalizeContinuousSwitch(node.continuous);
    }
    return result;
  }
  result.children = node.children.map(NormalizeChild);
  if (node.type === "random") {
    result.mode = node.mode ?? "random";
    result.scope = node.scope ?? "object";
    if (node.avoidRepeat !== undefined) {
      result.avoidRepeat = Number(node.avoidRepeat);
    }
  }
  if (node.type === "sequence") {
    result.scope = node.scope ?? "object";
    if (node.loop !== undefined) {
      result.loop = node.loop;
    }
  }
  if ((node.type === "random" || node.type === "sequence") && node.continuous !== undefined) {
    result.continuous = NormalizeContinuousContainer(node.continuous, node.type);
  }
  return result;
}
function NormalizePhysicalLeafIdentity(result, node) {
  if (node.matchIds !== undefined) {
    result.matchIds = node.matchIds.map(value => String(Number(value) >>> 0));
  }
  if (node.outputBusId !== undefined) {
    result.outputBusId = String(Number(node.outputBusId) >>> 0);
    result.busPathIds = (node.busPathIds ?? [node.outputBusId]).map(value => String(Number(value) >>> 0));
    if (node.authoredBusVolumeDb !== undefined) {
      result.authoredBusVolumeDb = Number(node.authoredBusVolumeDb);
    }
    if (node.authoredBusMakeUpGainDb !== undefined) {
      result.authoredBusMakeUpGainDb = Number(node.authoredBusMakeUpGainDb);
    }
    if (node.authoredOutputBusVolumeDb !== undefined) {
      result.authoredOutputBusVolumeDb = Number(node.authoredOutputBusVolumeDb);
    }
  }
}
function NormalizeContinuousContainer(value, type) {
  const result = {
    loopCount: Number(value.loopCount),
    transition: value.transition
  };
  if (value.transition === "crossfade-amplitude" || value.transition === "crossfade-power" || value.transition === "delay" || value.transition === "trigger-rate") {
    result.transitionMs = Number(value.transitionMs ?? 0);
    if (value.transitionRangeMs !== undefined) {
      result.transitionRangeMs = {
        min: Number(value.transitionRangeMs.min),
        max: Number(value.transitionRangeMs.max)
      };
    }
  }
  if (type === "sequence") {
    result.resetPlaylistEachPlay = value.resetPlaylistEachPlay !== false;
  }
  return result;
}
function NormalizeContinuousSwitch(value) {
  return {
    transitions: Object.fromEntries(Object.keys(value.transitions).sort((left, right) => Number(left) - Number(right)).map(nodeID => [String(Number(nodeID) >>> 0), {
      fadeOutMs: Number(value.transitions[nodeID].fadeOutMs),
      fadeInMs: Number(value.transitions[nodeID].fadeInMs)
    }]))
  };
}
function ValidateContinuousSwitch(value, nodes, label, node) {
  const continuous = RequireRecord(value, label);
  const transitions = RequireRecord(continuous.transitions, `${label} transitions`);
  const reachable = ReachableNodeIDs(NodeChildren(node), nodes);
  for (const [rawID, rawTransition] of Object.entries(transitions)) {
    const id = NormalizePositiveID(rawID, `${label} transition ${rawID}`);
    if (!nodes[id]) {
      throw new TypeError(`${label} transition references missing node ${id}`);
    }
    if (!reachable.has(id)) {
      throw new TypeError(`${label} transition references unreachable node ${id}`);
    }
    const transition = RequireRecord(rawTransition, `${label} transition ${id}`);
    NormalizeNonNegativeInteger(transition.fadeOutMs, `${label} transition ${id} fadeOutMs`);
    NormalizeNonNegativeInteger(transition.fadeInMs, `${label} transition ${id} fadeInMs`);
  }
}
function ReachableNodeIDs(children, nodes) {
  const reachable = new Set();
  const pending = [...children];
  while (pending.length) {
    const child = pending.pop();
    const id = String(Number(IsRecord(child) ? child.nodeId : child) >>> 0);
    if (reachable.has(id)) {
      continue;
    }
    reachable.add(id);
    const nested = nodes[id];
    if (!nested || nested.type === "sound" || nested.type === "silence") {
      continue;
    }
    const nestedChildren = NodeChildren(nested);
    if (Array.isArray(nestedChildren)) {
      pending.push(...nestedChildren);
    }
  }
  return reachable;
}
function ValidateContinuousContainer(value, label, type) {
  const continuous = RequireRecord(value, label);
  const loopCount = NormalizeNonNegativeInteger(continuous.loopCount, `${label} loopCount`);
  if (loopCount > 32767) {
    throw new TypeError(`${label} loopCount must not exceed 32767`);
  }
  if (!CONTINUOUS_TRANSITIONS.has(continuous.transition)) {
    throw new TypeError(`${label} transition must be disabled, crossfade-amplitude, ` + "crossfade-power, delay, or trigger-rate");
  }
  if (continuous.transition === "disabled") {
    if (continuous.transitionMs !== undefined || continuous.transitionRangeMs !== undefined) {
      throw new TypeError(`${label} disabled transition cannot define timing`);
    }
  } else {
    const transitionMs = NormalizeFiniteNumber(continuous.transitionMs ?? 0, `${label} transitionMs`);
    if (transitionMs < 0) {
      throw new TypeError(`${label} transitionMs must be non-negative`);
    }
    let minimumTransitionMs = transitionMs;
    if (continuous.transitionRangeMs !== undefined) {
      const range = RequireRecord(continuous.transitionRangeMs, `${label} transitionRangeMs`);
      const min = NormalizeFiniteNumber(range.min, `${label} transitionRangeMs min`);
      const max = NormalizeFiniteNumber(range.max, `${label} transitionRangeMs max`);
      if (max < min) {
        throw new TypeError(`${label} transitionRangeMs max must be at least min`);
      }
      minimumTransitionMs += min;
    }
    if (continuous.transition === "trigger-rate" && minimumTransitionMs < MIN_TRIGGER_RATE_MS) {
      throw new TypeError(`${label} trigger-rate minimum must be at least ` + `${MIN_TRIGGER_RATE_MS}ms`);
    }
  }
  if (type === "sequence" && continuous.resetPlaylistEachPlay !== undefined && typeof continuous.resetPlaylistEachPlay !== "boolean") {
    throw new TypeError(`${label} resetPlaylistEachPlay must be boolean`);
  }
  if (type === "random" && continuous.resetPlaylistEachPlay !== undefined) {
    throw new TypeError(`${label} resetPlaylistEachPlay is sequence-only`);
  }
}
function NormalizeChild(child) {
  if (!IsRecord(child)) {
    return {
      nodeId: String(Number(child) >>> 0)
    };
  }
  const result = {
    nodeId: String(Number(child.nodeId) >>> 0),
    ...NormalizeGain(child),
    ...NormalizeRtpcCurves(child),
    ...NormalizeActionTiming(child)
  };
  if (child.weight !== undefined) {
    result.weight = Number(child.weight);
  }
  return result;
}
function NormalizeGain(value) {
  const result = {};
  if (value.gainDb !== undefined) {
    result.gainDb = Number(value.gainDb);
  }
  if (value.gainCurves !== undefined) {
    result.gainCurves = value.gainCurves.map(curve => ({
      rtpc: String(curve.rtpc),
      scope: curve.scope ?? "object",
      ...(curve.defaultValue === undefined ? {} : {
        defaultValue: Number(curve.defaultValue)
      }),
      points: curve.points.map(point => ({
        x: Number(point.x),
        ...(point.gain === undefined ? {
          gainDb: Number(point.gainDb)
        } : {
          gain: Number(point.gain)
        }),
        ...(point.interpolation === undefined ? {} : {
          interpolation: Number(point.interpolation)
        })
      }))
    }));
  }
  if (value.gainDbRanges !== undefined) {
    result.gainDbRanges = NormalizeRandomRanges(value.gainDbRanges);
  }
  return result;
}
function NormalizeNodePlaybackProperties(value) {
  const result = {};
  for (const field of ["pitchCents", "lowPass", "highPass", "initialDelayMs"]) {
    if (value[field] !== undefined) {
      result[field] = Number(value[field]);
    }
  }
  for (const field of ["pitchCentsRanges", "lowPassRanges", "highPassRanges", "initialDelayRangesMs"]) {
    if (value[field] !== undefined) {
      result[field] = NormalizeRandomRanges(value[field]);
    }
  }
  return result;
}
function NormalizeVoiceLimit(value) {
  if (value === undefined) {
    return {};
  }
  return {
    voiceLimit: {
      counterId: String(Number(value.counterId) >>> 0),
      scope: value.scope,
      maxInstances: Number(value.maxInstances),
      behavior: value.behavior
    }
  };
}
function NormalizeRtpcCurves(value) {
  if (value.rtpcCurves === undefined) {
    return {};
  }
  return {
    rtpcCurves: value.rtpcCurves.map(curve => ({
      rtpc: String(curve.rtpc).trim(),
      scope: curve.scope ?? "object",
      property: String(curve.property).trim(),
      scaling: Number(curve.scaling),
      ...(curve.defaultValue === undefined ? {} : {
        defaultValue: Number(curve.defaultValue)
      }),
      points: curve.points.map(point => ({
        x: Number(point.x),
        value: Number(point.value),
        ...(point.interpolation === undefined ? {} : {
          interpolation: Number(point.interpolation)
        })
      }))
    }))
  };
}
function NormalizeStateProperties(value) {
  if (value.stateProperties === undefined) {
    return {};
  }
  return {
    stateProperties: value.stateProperties.map(property => ({
      group: String(property.group),
      cases: Object.fromEntries(Object.keys(property.cases).sort().map(name => [name, {
        ...(property.cases[name].gainDb === undefined ? {} : {
          gainDb: Number(property.cases[name].gainDb)
        }),
        ...(property.cases[name].pitchCents === undefined ? {} : {
          pitchCents: Number(property.cases[name].pitchCents)
        }),
        ...(property.cases[name].lowPass === undefined ? {} : {
          lowPass: Number(property.cases[name].lowPass)
        }),
        ...(property.cases[name].highPass === undefined ? {} : {
          highPass: Number(property.cases[name].highPass)
        })
      }]))
    }))
  };
}

/** Normalizes one validated portable Wwise State-transition catalog. */
function NormalizeStateTransitions(value) {
  return [...value].sort((left, right) => Number(left.groupId) - Number(right.groupId)).map(group => ({
    groupId: NormalizeUnsignedID(group.groupId, "Audio library SFX State groupId"),
    ...(group.group === undefined ? {} : {
      group: String(group.group).trim()
    }),
    defaultTransitionMs: Number(group.defaultTransitionMs),
    ...(group.states === undefined ? {} : {
      states: [...group.states].sort((left, right) => Number(left.stateId) - Number(right.stateId)).map(state => ({
        stateId: NormalizeUnsignedID(state.stateId, "Audio library SFX State stateId"),
        state: String(state.state).trim()
      }))
    }),
    transitions: [...group.transitions].sort((left, right) => Number(left.fromId) - Number(right.fromId) || Number(left.toId) - Number(right.toId)).map(transition => ({
      fromId: NormalizeUnsignedID(transition.fromId, "Audio library SFX State transition fromId"),
      ...(transition.from === undefined ? {} : {
        from: String(transition.from).trim()
      }),
      toId: NormalizeUnsignedID(transition.toId, "Audio library SFX State transition toId"),
      ...(transition.to === undefined ? {} : {
        to: String(transition.to).trim()
      }),
      transitionMs: Number(transition.transitionMs)
    }))
  }));
}
function NormalizeRandomRanges(ranges) {
  return ranges.map(range => ({
    min: Number(range.min),
    max: Number(range.max)
  }));
}
function NormalizeActionTiming(value) {
  const result = {};
  for (const field of ["delayMs", "fadeInMs", "probability"]) {
    if (value[field] !== undefined) {
      result[field] = Number(value[field]);
    }
  }
  for (const field of ["delayRangeMs", "fadeInRangeMs"]) {
    if (value[field] !== undefined) {
      result[field] = {
        min: Number(value[field].min),
        max: Number(value[field].max)
      };
    }
  }
  if (value.fadeCurve !== undefined) {
    result.fadeCurve = Number(value.fadeCurve);
  }
  return result;
}
function ValidateChild(child, nodes, label, allowWeight = false) {
  const nodeID = NormalizePositiveID(IsRecord(child) ? child.nodeId : child, `${label} nodeId`);
  if (!nodes[nodeID]) {
    throw new TypeError(`${label} references missing node ${nodeID}`);
  }
  if (IsRecord(child)) {
    ValidateGain(child, label);
    ValidateRtpcCurves(child.rtpcCurves, `${label} rtpcCurves`);
    ValidateActionTiming(child, label);
    if (child.weight !== undefined) {
      if (!allowWeight) {
        throw new TypeError(`${label} cannot have weight`);
      }
      NormalizePositiveNumber(child.weight, `${label} weight`);
    }
  }
}
function ValidateSetterAction(value, label) {
  const action = RequireRecord(value, label);
  if (!EVENT_ACTION_KINDS.has(action.kind)) {
    throw new TypeError(`${label} kind must be switch or state`);
  }
  NormalizeName(action.group, `${label} group`);
  NormalizeName(action.value, `${label} value`);
}
function ValidateVoiceVolumeAction(value, label) {
  const action = RequireRecord(value, label);
  if (!VOICE_VOLUME_ACTION_KINDS.has(action.kind)) {
    throw new TypeError(`${label} kind must be set-voice-volume or reset-voice-volume`);
  }
  if (!PLAYBACK_CONTROL_SCOPES.has(action.scope)) {
    throw new TypeError(`${label} scope must be game-object or global`);
  }
  if (action.mode !== "element") {
    throw new TypeError(`${label} mode must be element`);
  }
  NormalizePositiveID(action.targetId, `${label} targetId`);
  if (action.targetFlags !== undefined) {
    const targetFlags = NormalizeByte(action.targetFlags, `${label} targetFlags`);
    if (targetFlags !== 0) {
      throw new TypeError(`${label} targetFlags must be 0`);
    }
  }
  if (action.kind === "set-voice-volume") {
    if (action.valueMode !== "absolute" && action.valueMode !== "relative") {
      throw new TypeError(`${label} valueMode must be absolute or relative`);
    }
    ValidateVoiceVolumeDb(action.volumeDb, `${label} volumeDb`);
    if (action.volumeRangeDb !== undefined) {
      const range = RequireRecord(action.volumeRangeDb, `${label} volumeRangeDb`);
      const min = ValidateVoiceVolumeDb(range.min, `${label} volumeRangeDb min`);
      const max = ValidateVoiceVolumeDb(range.max, `${label} volumeRangeDb max`);
      if (min > max) {
        throw new TypeError(`${label} volumeRangeDb min must not exceed max`);
      }
      ValidateVoiceVolumeDb(Number(action.volumeDb) + min, `${label} minimum randomized volumeDb`);
      ValidateVoiceVolumeDb(Number(action.volumeDb) + max, `${label} maximum randomized volumeDb`);
    }
  } else if (action.valueMode !== undefined || action.volumeDb !== undefined || action.volumeRangeDb !== undefined) {
    throw new TypeError(`${label} Reset cannot carry a volume value`);
  }
  if (action.probability !== undefined) {
    throw new TypeError(`${label} probability is unsupported`);
  }
  ValidateActionTiming({
    delayMs: action.delayMs,
    delayRangeMs: action.delayRangeMs
  }, label);
  ValidateTransitionTiming(action, label);
}
function ValidateBusVolumeAction(value, label) {
  const action = RequireRecord(value, label);
  if (!BUS_VOLUME_ACTION_KINDS.has(action.kind)) {
    throw new TypeError(`${label} kind must be set-bus-volume or reset-bus-volume`);
  }
  if (!PLAYBACK_CONTROL_SCOPES.has(action.scope)) {
    throw new TypeError(`${label} scope must be game-object or global`);
  }
  const setting = action.kind === "set-bus-volume";
  if (setting && action.mode !== "element" || !setting && !PLAYBACK_CONTROL_MODES.has(action.mode) || action.scope === "game-object" && action.mode !== "element") {
    throw new TypeError(`${label} has an unsupported Bus Volume mode`);
  }
  if (action.mode === "element") {
    NormalizePositiveID(action.targetId, `${label} targetId`);
  } else if (NormalizeUnsignedID(action.targetId, `${label} targetId`) !== "0") {
    throw new TypeError(`${label} ${action.mode} targetId must be 0`);
  }
  if (NormalizeByte(action.targetFlags, `${label} targetFlags`) !== 1) {
    throw new TypeError(`${label} targetFlags must be 1`);
  }
  if (!Array.isArray(action.exceptions)) {
    throw new TypeError(`${label} exceptions must be an array`);
  }
  if (action.mode !== "all-except" && action.exceptions.length) {
    throw new TypeError(`${label} exceptions require all-except mode`);
  }
  const exceptionIds = new Set();
  for (let index = 0; index < action.exceptions.length; index++) {
    const exception = RequireRecord(action.exceptions[index], `${label} exception ${index}`);
    const exceptionId = NormalizePositiveID(exception.targetId, `${label} exception ${index} targetId`);
    if (exceptionIds.has(exceptionId)) {
      throw new TypeError(`${label} has duplicate exception ${exceptionId}`);
    }
    exceptionIds.add(exceptionId);
    if (NormalizeByte(exception.targetFlags, `${label} exception ${index} targetFlags`) !== 1) {
      throw new TypeError(`${label} exception ${index} targetFlags must be 1`);
    }
  }
  if (setting) {
    if (action.valueMode !== "absolute" && action.valueMode !== "relative") {
      throw new TypeError(`${label} valueMode must be absolute or relative`);
    }
    ValidateVoiceVolumeDb(action.busVolumeDb, `${label} busVolumeDb`);
    if (action.busVolumeRangeDb !== undefined) {
      const range = RequireRecord(action.busVolumeRangeDb, `${label} busVolumeRangeDb`);
      const min = ValidateVoiceVolumeDb(range.min, `${label} busVolumeRangeDb min`);
      const max = ValidateVoiceVolumeDb(range.max, `${label} busVolumeRangeDb max`);
      if (min > max) {
        throw new TypeError(`${label} busVolumeRangeDb min must not exceed max`);
      }
      ValidateVoiceVolumeDb(Number(action.busVolumeDb) + min, `${label} minimum randomized busVolumeDb`);
      ValidateVoiceVolumeDb(Number(action.busVolumeDb) + max, `${label} maximum randomized busVolumeDb`);
    }
  } else if (action.valueMode !== undefined || action.busVolumeDb !== undefined || action.busVolumeRangeDb !== undefined) {
    throw new TypeError(`${label} Reset cannot carry a volume value`);
  }
  if (action.probability !== undefined) {
    throw new TypeError(`${label} probability is unsupported`);
  }
  ValidateActionTiming({
    delayMs: action.delayMs,
    delayRangeMs: action.delayRangeMs
  }, label);
  ValidateTransitionTiming(action, label);
}
function ValidateGameParameterAction(value, label) {
  const action = RequireRecord(value, label);
  if (!GAME_PARAMETER_ACTION_KINDS.has(action.kind)) {
    throw new TypeError(`${label} kind must be set-game-parameter or reset-game-parameter`);
  }
  NormalizeName(action.rtpc, `${label} rtpc`);
  if (!PLAYBACK_CONTROL_SCOPES.has(action.scope)) {
    throw new TypeError(`${label} scope must be game-object or global`);
  }
  if (action.bypassTransition !== undefined && typeof action.bypassTransition !== "boolean") {
    throw new TypeError(`${label} bypassTransition must be boolean`);
  }
  if (action.defaultValue === undefined) {
    throw new TypeError(`${label} requires an authored defaultValue`);
  } else {
    NormalizeFiniteNumber(action.defaultValue, `${label} defaultValue`);
  }
  if (action.kind === "set-game-parameter") {
    if (action.valueMode !== "absolute" && action.valueMode !== "relative") {
      throw new TypeError(`${label} valueMode must be absolute or relative`);
    }
    NormalizeFiniteNumber(action.gameParameterValue, `${label} gameParameterValue`);
    if (action.gameParameterRange !== undefined) {
      const range = RequireRecord(action.gameParameterRange, `${label} gameParameterRange`);
      const min = NormalizeFiniteNumber(range.min, `${label} gameParameterRange min`);
      const max = NormalizeFiniteNumber(range.max, `${label} gameParameterRange max`);
      if (min > max) {
        throw new TypeError(`${label} gameParameterRange min must not exceed max`);
      }
    }
  } else if (action.valueMode !== undefined || action.gameParameterValue !== undefined || action.gameParameterRange !== undefined) {
    throw new TypeError(`${label} Reset cannot carry a game-parameter value`);
  }
  if (action.probability !== undefined) {
    throw new TypeError(`${label} probability is unsupported`);
  }
  ValidateActionTiming({
    delayMs: action.delayMs,
    delayRangeMs: action.delayRangeMs
  }, label);
  ValidateTransitionTiming(action, label);
}
function ValidateVoiceVolumeDb(value, label) {
  const number = NormalizeFiniteNumber(value, label);
  if (number < -200 || number > 200) {
    throw new TypeError(`${label} must be between -200 and 200 dB`);
  }
  return number;
}
function ValidateVoicePitchAction(value, label) {
  const action = RequireRecord(value, label);
  if (!VOICE_PITCH_ACTION_KINDS.has(action.kind)) {
    throw new TypeError(`${label} kind must be set-voice-pitch or reset-voice-pitch`);
  }
  if (!PLAYBACK_CONTROL_SCOPES.has(action.scope)) {
    throw new TypeError(`${label} scope must be game-object or global`);
  }
  if (action.mode !== "element") {
    throw new TypeError(`${label} mode must be element`);
  }
  NormalizePositiveID(action.targetId, `${label} targetId`);
  if (action.targetFlags !== undefined) {
    const targetFlags = NormalizeByte(action.targetFlags, `${label} targetFlags`);
    if (targetFlags !== 0) {
      throw new TypeError(`${label} targetFlags must be 0`);
    }
  }
  if (action.kind === "set-voice-pitch") {
    if (action.valueMode !== "absolute" && action.valueMode !== "relative") {
      throw new TypeError(`${label} valueMode must be absolute or relative`);
    }
    ValidateVoicePitchCents(action.pitchCents, `${label} pitchCents`);
    if (action.pitchRangeCents !== undefined) {
      const range = RequireRecord(action.pitchRangeCents, `${label} pitchRangeCents`);
      const min = ValidateVoicePitchCents(range.min, `${label} pitchRangeCents min`);
      const max = ValidateVoicePitchCents(range.max, `${label} pitchRangeCents max`);
      if (min > max) {
        throw new TypeError(`${label} pitchRangeCents min must not exceed max`);
      }
      ValidateVoicePitchCents(Number(action.pitchCents) + min, `${label} minimum randomized pitchCents`);
      ValidateVoicePitchCents(Number(action.pitchCents) + max, `${label} maximum randomized pitchCents`);
    }
  } else if (action.valueMode !== undefined || action.pitchCents !== undefined || action.pitchRangeCents !== undefined) {
    throw new TypeError(`${label} Reset cannot carry a pitch value`);
  }
  if (action.probability !== undefined) {
    throw new TypeError(`${label} probability is unsupported`);
  }
  ValidateActionTiming({
    delayMs: action.delayMs,
    delayRangeMs: action.delayRangeMs
  }, label);
  ValidateTransitionTiming(action, label);
}
function ValidateVoicePitchCents(value, label) {
  const number = NormalizeFiniteNumber(value, label);
  if (number < -2400 || number > 2400) {
    throw new TypeError(`${label} must be between -2400 and 2400 cents`);
  }
  return number;
}
function ValidateVoiceFilterAction(value, label) {
  const action = RequireRecord(value, label);
  if (!VOICE_FILTER_ACTION_KINDS.has(action.kind)) {
    throw new TypeError(`${label} kind must be a Voice LPF or HPF action`);
  }
  if (!PLAYBACK_CONTROL_SCOPES.has(action.scope)) {
    throw new TypeError(`${label} scope must be game-object or global`);
  }
  const setting = action.kind.startsWith("set-");
  if (setting && action.mode !== "element" || !setting && !PLAYBACK_CONTROL_MODES.has(action.mode)) {
    throw new TypeError(`${label} has an unsupported Voice Filter mode`);
  }
  if (action.mode === "element") {
    NormalizePositiveID(action.targetId, `${label} targetId`);
  } else {
    const targetId = NormalizeUnsignedID(action.targetId, `${label} targetId`);
    if (targetId !== "0") {
      throw new TypeError(`${label} ${action.mode} targetId must be 0`);
    }
  }
  if (action.targetFlags !== undefined) {
    const targetFlags = NormalizeByte(action.targetFlags, `${label} targetFlags`);
    if (targetFlags !== 0) {
      throw new TypeError(`${label} targetFlags must be 0`);
    }
  }
  if (!Array.isArray(action.exceptions)) {
    throw new TypeError(`${label} exceptions must be an array`);
  }
  if (action.mode !== "all-except" && action.exceptions.length) {
    throw new TypeError(`${label} exceptions require all-except mode`);
  }
  const exceptionIds = new Set();
  for (let index = 0; index < action.exceptions.length; index++) {
    const exception = RequireRecord(action.exceptions[index], `${label} exception ${index}`);
    const exceptionId = NormalizePositiveID(exception.targetId, `${label} exception ${index} targetId`);
    if (exceptionIds.has(exceptionId)) {
      throw new TypeError(`${label} has duplicate exception ${exceptionId}`);
    }
    exceptionIds.add(exceptionId);
    if (exception.targetFlags !== undefined && NormalizeByte(exception.targetFlags, `${label} exception ${index} targetFlags`) !== 0) {
      throw new TypeError(`${label} exception ${index} targetFlags must be 0`);
    }
  }
  const lowPass = action.kind.endsWith("low-pass");
  const property = lowPass ? "lowPass" : "highPass";
  const rangeField = `${property}Range`;
  const wrongProperty = lowPass ? "highPass" : "lowPass";
  const wrongRangeField = `${wrongProperty}Range`;
  if (action[wrongProperty] !== undefined || action[wrongRangeField] !== undefined) {
    throw new TypeError(`${label} cannot carry ${wrongProperty} fields`);
  }
  if (setting) {
    if (action.valueMode !== "absolute" && action.valueMode !== "relative") {
      throw new TypeError(`${label} valueMode must be absolute or relative`);
    }
    const base = ValidateVoiceFilterPercent(action[property], `${label} ${property}`);
    if (action[rangeField] !== undefined) {
      const range = RequireRecord(action[rangeField], `${label} ${rangeField}`);
      const min = ValidateVoiceFilterPercent(range.min, `${label} ${rangeField} min`);
      const max = ValidateVoiceFilterPercent(range.max, `${label} ${rangeField} max`);
      if (min > max) {
        throw new TypeError(`${label} ${rangeField} min must not exceed max`);
      }
      ValidateVoiceFilterPercent(base + min, `${label} minimum randomized ${property}`);
      ValidateVoiceFilterPercent(base + max, `${label} maximum randomized ${property}`);
    }
  } else if (action.valueMode !== undefined || action.lowPass !== undefined || action.lowPassRange !== undefined || action.highPass !== undefined || action.highPassRange !== undefined) {
    throw new TypeError(`${label} Reset cannot carry a filter value`);
  }
  if (action.probability !== undefined) {
    throw new TypeError(`${label} probability is unsupported`);
  }
  ValidateActionTiming({
    delayMs: action.delayMs,
    delayRangeMs: action.delayRangeMs
  }, label);
  ValidateTransitionTiming(action, label);
}
function ValidateVoiceFilterPercent(value, label) {
  const number = NormalizeFiniteNumber(value, label);
  if (number < -100 || number > 100) {
    throw new TypeError(`${label} must be between -100 and 100 percent`);
  }
  return number;
}
function ValidatePlaybackControlAction(value, label) {
  const action = RequireRecord(value, label);
  if (!PLAYBACK_CONTROL_ACTION_KINDS.has(action.kind)) {
    throw new TypeError(`${label} kind must be pause, resume, or stop`);
  }
  if (!PLAYBACK_CONTROL_SCOPES.has(action.scope)) {
    throw new TypeError(`${label} scope must be game-object or global`);
  }
  if (!PLAYBACK_CONTROL_MODES.has(action.mode)) {
    throw new TypeError(`${label} mode must be element, all, or all-except`);
  }
  const targetID = NormalizeUnsignedID(action.targetId, `${label} targetId`);
  if (action.mode === "element" && targetID === "0") {
    throw new TypeError(`${label} element targetId must be greater than zero`);
  }
  if (action.mode !== "element" && targetID !== "0") {
    throw new TypeError(action.kind === "stop" ? `${label} Stop-All targetId must be zero` : `${label} ${action.kind} All targetId must be zero`);
  }
  if (action.targetFlags !== undefined) {
    const targetFlags = NormalizeByte(action.targetFlags, `${label} targetFlags`);
    if (targetFlags & 0x01) {
      throw new TypeError(`${label} bus targets are unsupported`);
    }
  }
  if (action.actionFlags !== undefined) {
    const actionFlags = NormalizeByte(action.actionFlags, `${label} actionFlags`);
    const expected = action.kind === "pause" ? 7 : 6;
    if (actionFlags !== expected) {
      throw new TypeError(`${label} actionFlags must be ${expected}`);
    }
  }
  if (!Array.isArray(action.exceptions)) {
    throw new TypeError(`${label} exceptions must be an array`);
  }
  const seen = new Set();
  if (action.mode === "element" && action.exceptions.length) {
    throw new TypeError(action.kind === "stop" ? `${label} element Stops cannot have exceptions` : `${label} element ${action.kind} actions cannot have exceptions`);
  }
  for (let index = 0; index < action.exceptions.length; index++) {
    const exception = RequireRecord(action.exceptions[index], `${label} exception ${index}`);
    const id = NormalizePositiveID(exception.targetId, `${label} exception ${index} targetId`);
    if (seen.has(id)) {
      throw new TypeError(`${label} has duplicate exception ${id}`);
    }
    seen.add(id);
    if (exception.targetFlags !== undefined) {
      const targetFlags = NormalizeByte(exception.targetFlags, `${label} exception ${index} targetFlags`);
      if (targetFlags & 0x01) {
        throw new TypeError(`${label} bus exceptions are unsupported`);
      }
    }
  }
  ValidateActionTiming({
    delayMs: action.delayMs,
    delayRangeMs: action.delayRangeMs,
    probability: action.probability
  }, label);
  ValidateTransitionTiming(action, label);
}
function ChildrenEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function ValidateTransitionTiming(value, label) {
  ValidateActionTiming({
    fadeInMs: value.transitionMs,
    fadeInRangeMs: value.transitionRangeMs,
    fadeCurve: value.curve
  }, label);
}
function ValidateMatchIds(value, nodeID, label) {
  if (!Array.isArray(value) || !value.length) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
  const normalized = value.map((entry, index) => NormalizePositiveID(entry, `${label} ${index}`));
  if (normalized[0] !== nodeID) {
    throw new TypeError(`${label} must begin with node ${nodeID}`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new TypeError(`${label} must not contain duplicates`);
  }
}
function ValidateBusPathIds(value, outputBusId, label) {
  if (!Array.isArray(value) || !value.length) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
  const normalized = value.map((entry, index) => NormalizePositiveID(entry, `${label} ${index}`));
  if (normalized[0] !== outputBusId) {
    throw new TypeError(`${label} must begin with output bus ${outputBusId}`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new TypeError(`${label} must not contain duplicates`);
  }
}
function NormalizePlaybackControlAction(action) {
  const result = {
    kind: action.kind,
    targetId: String(Number(action.targetId) >>> 0),
    scope: action.scope,
    mode: action.mode,
    curve: Number(action.curve ?? 4),
    exceptions: action.exceptions.map(exception => ({
      targetId: String(Number(exception.targetId) >>> 0),
      ...(exception.targetFlags === undefined ? {} : {
        targetFlags: Number(exception.targetFlags)
      })
    }))
  };
  for (const field of ["targetFlags", "actionFlags", "delayMs", "probability", "transitionMs"]) {
    if (action[field] !== undefined) {
      result[field] = Number(action[field]);
    }
  }
  for (const field of ["delayRangeMs", "transitionRangeMs"]) {
    if (action[field] !== undefined) {
      result[field] = {
        min: Number(action[field].min),
        max: Number(action[field].max)
      };
    }
  }
  return result;
}
function NormalizeVoiceVolumeAction(action) {
  const result = {
    kind: action.kind,
    targetId: String(Number(action.targetId) >>> 0),
    scope: action.scope,
    mode: "element",
    curve: Number(action.curve ?? 4)
  };
  for (const field of ["targetFlags", "delayMs", "transitionMs"]) {
    if (action[field] !== undefined) {
      result[field] = Number(action[field]);
    }
  }
  for (const field of ["delayRangeMs", "transitionRangeMs"]) {
    if (action[field] !== undefined) {
      result[field] = {
        min: Number(action[field].min),
        max: Number(action[field].max)
      };
    }
  }
  if (action.kind === "set-voice-volume") {
    result.valueMode = action.valueMode;
    result.volumeDb = Number(action.volumeDb);
    if (action.volumeRangeDb !== undefined) {
      result.volumeRangeDb = {
        min: Number(action.volumeRangeDb.min),
        max: Number(action.volumeRangeDb.max)
      };
    }
  }
  return result;
}
function NormalizeBusVolumeAction(action) {
  const result = {
    kind: action.kind,
    targetId: NormalizeUnsignedID(action.targetId, "Audio library SFX Bus Volume targetId"),
    targetFlags: Number(action.targetFlags),
    scope: action.scope,
    mode: action.mode,
    curve: Number(action.curve ?? 4),
    exceptions: action.exceptions.map(exception => ({
      targetId: String(Number(exception.targetId) >>> 0),
      targetFlags: Number(exception.targetFlags)
    }))
  };
  for (const field of ["delayMs", "transitionMs"]) {
    if (action[field] !== undefined) {
      result[field] = Number(action[field]);
    }
  }
  for (const field of ["delayRangeMs", "transitionRangeMs"]) {
    if (action[field] !== undefined) {
      result[field] = {
        min: Number(action[field].min),
        max: Number(action[field].max)
      };
    }
  }
  if (action.kind === "set-bus-volume") {
    result.valueMode = action.valueMode;
    result.busVolumeDb = Number(action.busVolumeDb);
    if (action.busVolumeRangeDb !== undefined) {
      result.busVolumeRangeDb = {
        min: Number(action.busVolumeRangeDb.min),
        max: Number(action.busVolumeRangeDb.max)
      };
    }
  }
  return result;
}
function NormalizeVoicePitchAction(action) {
  const result = {
    kind: action.kind,
    targetId: String(Number(action.targetId) >>> 0),
    scope: action.scope,
    mode: "element",
    curve: Number(action.curve ?? 4)
  };
  for (const field of ["targetFlags", "delayMs", "transitionMs"]) {
    if (action[field] !== undefined) {
      result[field] = Number(action[field]);
    }
  }
  for (const field of ["delayRangeMs", "transitionRangeMs"]) {
    if (action[field] !== undefined) {
      result[field] = {
        min: Number(action[field].min),
        max: Number(action[field].max)
      };
    }
  }
  if (action.kind === "set-voice-pitch") {
    result.valueMode = action.valueMode;
    result.pitchCents = Number(action.pitchCents);
    if (action.pitchRangeCents !== undefined) {
      result.pitchRangeCents = {
        min: Number(action.pitchRangeCents.min),
        max: Number(action.pitchRangeCents.max)
      };
    }
  }
  return result;
}
function NormalizeVoiceFilterAction(action) {
  const result = {
    kind: action.kind,
    targetId: NormalizeUnsignedID(action.targetId, "Audio library SFX Voice Filter targetId"),
    scope: action.scope,
    mode: action.mode,
    curve: Number(action.curve ?? 4),
    exceptions: action.exceptions.map(exception => ({
      targetId: String(Number(exception.targetId) >>> 0),
      ...(exception.targetFlags === undefined ? {} : {
        targetFlags: Number(exception.targetFlags)
      })
    }))
  };
  for (const field of ["targetFlags", "delayMs", "transitionMs"]) {
    if (action[field] !== undefined) {
      result[field] = Number(action[field]);
    }
  }
  for (const field of ["delayRangeMs", "transitionRangeMs"]) {
    if (action[field] !== undefined) {
      result[field] = {
        min: Number(action[field].min),
        max: Number(action[field].max)
      };
    }
  }
  if (action.kind.startsWith("set-")) {
    const property = action.kind.endsWith("low-pass") ? "lowPass" : "highPass";
    const rangeField = `${property}Range`;
    result.valueMode = action.valueMode;
    result[property] = Number(action[property]);
    if (action[rangeField] !== undefined) {
      result[rangeField] = {
        min: Number(action[rangeField].min),
        max: Number(action[rangeField].max)
      };
    }
  }
  return result;
}
function NormalizeGameParameterAction(action) {
  const result = {
    kind: action.kind,
    rtpc: String(action.rtpc),
    scope: action.scope,
    curve: Number(action.curve ?? 4),
    bypassTransition: Boolean(action.bypassTransition ?? false)
  };
  for (const field of ["defaultValue", "delayMs", "transitionMs"]) {
    if (action[field] !== undefined) {
      result[field] = Number(action[field]);
    }
  }
  for (const field of ["delayRangeMs", "transitionRangeMs"]) {
    if (action[field] !== undefined) {
      result[field] = {
        min: Number(action[field].min),
        max: Number(action[field].max)
      };
    }
  }
  if (action.kind === "set-game-parameter") {
    result.valueMode = action.valueMode;
    result.gameParameterValue = Number(action.gameParameterValue);
    if (action.gameParameterRange !== undefined) {
      result.gameParameterRange = {
        min: Number(action.gameParameterRange.min),
        max: Number(action.gameParameterRange.max)
      };
    }
  }
  return result;
}
function ValidateActionTiming(value, label) {
  for (const [field, description] of [["delayMs", "delayMs"], ["fadeInMs", "fadeInMs"]]) {
    if (value[field] !== undefined) {
      const number = NormalizeFiniteNumber(value[field], `${label} ${description}`);
      if (number < 0) {
        throw new TypeError(`${label} ${description} must be non-negative`);
      }
    }
  }
  for (const field of ["delayRangeMs", "fadeInRangeMs"]) {
    if (value[field] === undefined) {
      continue;
    }
    const range = RequireRecord(value[field], `${label} ${field}`);
    const min = NormalizeFiniteNumber(range.min, `${label} ${field} min`);
    const max = NormalizeFiniteNumber(range.max, `${label} ${field} max`);
    if (max < min) {
      throw new TypeError(`${label} ${field} max must be at least min`);
    }
  }
  if (value.probability !== undefined) {
    const probability = NormalizeFiniteNumber(value.probability, `${label} probability`);
    if (probability < 0 || probability > 100) {
      throw new TypeError(`${label} probability must be between 0 and 100`);
    }
  }
  if (value.fadeCurve !== undefined && (!Number.isSafeInteger(Number(value.fadeCurve)) || Number(value.fadeCurve) < 0 || Number(value.fadeCurve) > 9)) {
    throw new TypeError(`${label} fadeCurve must be a Wwise curve value from 0 to 9`);
  }
}
function ValidateGain(value, label) {
  if (value.gainDb !== undefined) {
    NormalizeFiniteNumber(value.gainDb, `${label} gainDb`);
  }
  ValidateRandomRanges(value.gainDbRanges, `${label} gainDbRanges`);
  if (value.gainCurves === undefined) {
    return;
  }
  if (!Array.isArray(value.gainCurves)) {
    throw new TypeError(`${label} gainCurves must be an array`);
  }
  for (let index = 0; index < value.gainCurves.length; index++) {
    const curve = RequireRecord(value.gainCurves[index], `${label} gain curve ${index}`);
    NormalizeName(curve.rtpc, `${label} gain curve ${index} rtpc`);
    if (!RTPC_SCOPES.has(curve.scope ?? "object")) {
      throw new TypeError(`${label} gain curve ${index} scope must be object or global`);
    }
    if (!Array.isArray(curve.points) || !curve.points.length) {
      throw new TypeError(`${label} gain curve ${index} must have points`);
    }
    if (curve.defaultValue !== undefined) {
      NormalizeFiniteNumber(curve.defaultValue, `${label} gain curve ${index} defaultValue`);
    }
    let previous = -Infinity;
    let valueField = null;
    for (let pointIndex = 0; pointIndex < curve.points.length; pointIndex++) {
      const point = RequireRecord(curve.points[pointIndex], `${label} gain curve ${index} point ${pointIndex}`);
      const x = NormalizeFiniteNumber(point.x, `${label} gain curve ${index} point ${pointIndex} x`);
      const hasGainDb = point.gainDb !== undefined;
      const hasGain = point.gain !== undefined;
      if (hasGainDb === hasGain) {
        throw new TypeError(`${label} gain curve ${index} point ${pointIndex}` + " must have exactly one of gainDb or gain");
      }
      const field = hasGain ? "gain" : "gainDb";
      if (valueField === null) {
        valueField = field;
      } else if (field !== valueField) {
        throw new TypeError(`${label} gain curve ${index} points must use one gain unit`);
      }
      if (hasGain) {
        const gain = NormalizeFiniteNumber(point.gain, `${label} gain curve ${index} point ${pointIndex} gain`);
        if (gain < 0 || gain > 1) {
          throw new TypeError(`${label} gain curve ${index} point ${pointIndex}` + " gain must be between 0 and 1");
        }
      } else {
        NormalizeFiniteNumber(point.gainDb, `${label} gain curve ${index} point ${pointIndex} gainDb`);
      }
      if (point.interpolation !== undefined && (!Number.isSafeInteger(Number(point.interpolation)) || Number(point.interpolation) < 0 || Number(point.interpolation) > 9)) {
        throw new TypeError(`${label} gain curve ${index} point ${pointIndex}` + " interpolation must be a Wwise curve value from 0 to 9");
      }
      if (x < previous) {
        throw new TypeError(`${label} gain curve ${index} points must have non-decreasing x`);
      }
      previous = x;
    }
  }
}
function ValidateNodePlaybackProperties(value, label) {
  if (value.pitchCents !== undefined) {
    NormalizeFiniteNumber(value.pitchCents, `${label} pitchCents`);
  }
  if (value.initialDelayMs !== undefined && NormalizeFiniteNumber(value.initialDelayMs, `${label} initialDelayMs`) < 0) {
    throw new TypeError(`${label} initialDelayMs must be non-negative`);
  }
  for (const field of ["lowPass", "highPass"]) {
    if (value[field] !== undefined) {
      NormalizeFiniteNumber(value[field], `${label} ${field}`);
    }
  }
  ValidateRandomRanges(value.pitchCentsRanges, `${label} pitchCentsRanges`);
  ValidateRandomRanges(value.lowPassRanges, `${label} lowPassRanges`);
  ValidateRandomRanges(value.highPassRanges, `${label} highPassRanges`);
  ValidateRandomRanges(value.initialDelayRangesMs, `${label} initialDelayRangesMs`);
}
function ValidateTimedSilence(node, label) {
  if (node.durationMs === undefined) {
    throw new TypeError(`${label} durationMs is required`);
  }
  NormalizePositiveNumber(node.durationMs, `${label} durationMs`);
  if (node.durationRangeMs !== undefined) {
    throw new TypeError(`${label} durationRangeMs is not supported`);
  }
}
function ValidatePhysicalLeafIdentity(node, id, label) {
  if (node.matchIds !== undefined) {
    ValidateMatchIds(node.matchIds, id, `${label} matchIds`);
  }
  if (node.outputBusId !== undefined) {
    const outputBusId = NormalizePositiveID(node.outputBusId, `${label} outputBusId`);
    if (node.busPathIds !== undefined) {
      ValidateBusPathIds(node.busPathIds, outputBusId, `${label} busPathIds`);
    }
    if (node.authoredBusVolumeDb !== undefined) {
      NormalizeFiniteNumber(node.authoredBusVolumeDb, `${label} authoredBusVolumeDb`);
    }
    if (node.authoredBusMakeUpGainDb !== undefined) {
      NormalizeFiniteNumber(node.authoredBusMakeUpGainDb, `${label} authoredBusMakeUpGainDb`);
    }
    if (node.authoredOutputBusVolumeDb !== undefined) {
      NormalizeFiniteNumber(node.authoredOutputBusVolumeDb, `${label} authoredOutputBusVolumeDb`);
    }
  } else if (node.busPathIds !== undefined || node.authoredBusVolumeDb !== undefined || node.authoredBusMakeUpGainDb !== undefined || node.authoredOutputBusVolumeDb !== undefined) {
    throw new TypeError(`${label} bus routing requires outputBusId`);
  }
}
function ValidateVoiceLimit(value, node, label) {
  if (value === undefined) {
    return;
  }
  const limit = RequireRecord(value, label);
  if (node.type !== "sound" && node.type !== "timed-silence") {
    throw new TypeError(`${label} is supported only on sound or timed-silence nodes`);
  }
  NormalizePositiveID(limit.counterId, `${label} counterId`);
  if (limit.scope !== "game-object" || Number(limit.maxInstances) !== 1 || limit.behavior !== "reject-newest") {
    throw new TypeError(`${label} must be the supported game-object cap-one reject-newest policy`);
  }
}
function ValidateRtpcCurves(value, label) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || !value.length) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
  for (let index = 0; index < value.length; index++) {
    const curve = RequireRecord(value[index], `${label} ${index}`);
    const property = NormalizeName(curve.property, `${label} ${index} property`);
    const expectedScaling = RTPC_PROPERTY_SCALING.get(property);
    NormalizeName(curve.rtpc, `${label} ${index} rtpc`);
    if (!RTPC_SCOPES.has(curve.scope ?? "object")) {
      throw new TypeError(`${label} ${index} scope must be object or global`);
    }
    if (expectedScaling === undefined) {
      throw new TypeError(`${label} ${index} property must be volume, pitch, lowPass, highPass, or initialDelay`);
    }
    if (Number(curve.scaling) !== expectedScaling) {
      throw new TypeError(`${label} ${index} scaling must be ${expectedScaling}` + ` for ${property}`);
    }
    if (curve.defaultValue !== undefined) {
      NormalizeFiniteNumber(curve.defaultValue, `${label} ${index} defaultValue`);
    }
    if (!Array.isArray(curve.points) || !curve.points.length) {
      throw new TypeError(`${label} ${index} must have points`);
    }
    let previous = -Infinity;
    for (let pointIndex = 0; pointIndex < curve.points.length; pointIndex++) {
      const point = RequireRecord(curve.points[pointIndex], `${label} ${index} point ${pointIndex}`);
      const x = NormalizeFiniteNumber(point.x, `${label} ${index} point ${pointIndex} x`);
      NormalizeFiniteNumber(point.value, `${label} ${index} point ${pointIndex} value`);
      if (point.interpolation !== undefined && (!Number.isSafeInteger(Number(point.interpolation)) || Number(point.interpolation) < 0 || Number(point.interpolation) > 9)) {
        throw new TypeError(`${label} ${index} point ${pointIndex}` + " interpolation must be a Wwise curve value from 0 to 9");
      }
      if (x < previous) {
        throw new TypeError(`${label} ${index} points must have non-decreasing x`);
      }
      previous = x;
    }
  }
}
function ValidateDryVolumeCurve(value, label) {
  if (value === undefined) {
    return;
  }
  const curve = RequireRecord(value, label);
  if (Number(curve.scaling) !== 2) {
    throw new TypeError(`${label} scaling must be 2 for dry volume`);
  }
  if (!Array.isArray(curve.points) || !curve.points.length) {
    throw new TypeError(`${label} must have points`);
  }
  let previous = -Infinity;
  for (let index = 0; index < curve.points.length; index++) {
    const point = RequireRecord(curve.points[index], `${label} point ${index}`);
    const x = NormalizeFiniteNumber(point.x, `${label} point ${index} x`);
    if (x < 0) {
      throw new TypeError(`${label} point ${index} x must be non-negative`);
    }
    if (x < previous) {
      throw new TypeError(`${label} points must have non-decreasing x`);
    }
    NormalizeFiniteNumber(point.value, `${label} point ${index} value`);
    if (point.interpolation !== undefined && (!Number.isSafeInteger(Number(point.interpolation)) || Number(point.interpolation) < 0 || Number(point.interpolation) > 9)) {
      throw new TypeError(`${label} point ${index}` + " interpolation must be a Wwise curve value from 0 to 9");
    }
    previous = x;
  }
}
function ValidateStateProperties(value, label) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || !value.length) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
  for (let index = 0; index < value.length; index++) {
    const property = RequireRecord(value[index], `${label} ${index}`);
    NormalizeName(property.group, `${label} ${index} group`);
    const cases = RequireRecord(property.cases, `${label} ${index} cases`);
    if (!Object.keys(cases).length) {
      throw new TypeError(`${label} ${index} cases must not be empty`);
    }
    const normalizedNames = new Set();
    for (const [name, rawCase] of Object.entries(cases)) {
      const normalizedName = NormalizeName(name, `${label} ${index} case`).toLowerCase();
      if (normalizedNames.has(normalizedName)) {
        throw new TypeError(`${label} ${index} has duplicate case ${name}`);
      }
      normalizedNames.add(normalizedName);
      const stateCase = RequireRecord(rawCase, `${label} ${index} case ${name}`);
      const hasGain = stateCase.gainDb !== undefined;
      const hasPitch = stateCase.pitchCents !== undefined;
      const hasLowPass = stateCase.lowPass !== undefined;
      const hasHighPass = stateCase.highPass !== undefined;
      if (!hasGain && !hasPitch && !hasLowPass && !hasHighPass) {
        throw new TypeError(`${label} ${index} case ${name}` + " must define gainDb, pitchCents, lowPass, or highPass");
      }
      if (hasGain) {
        NormalizeFiniteNumber(stateCase.gainDb, `${label} ${index} case ${name} gainDb`);
      }
      if (hasPitch) {
        NormalizeFiniteNumber(stateCase.pitchCents, `${label} ${index} case ${name} pitchCents`);
      }
      if (hasLowPass) {
        NormalizeFiniteNumber(stateCase.lowPass, `${label} ${index} case ${name} lowPass`);
      }
      if (hasHighPass) {
        NormalizeFiniteNumber(stateCase.highPass, `${label} ${index} case ${name} highPass`);
      }
    }
  }
}

/** Validates one optional portable Wwise State-transition catalog. */
function ValidateStateTransitions(value, label) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || !value.length) {
    throw new TypeError(`${label} must be a non-empty array`);
  }
  const groupIds = new Set();
  const groupNames = new Set();
  const groupAliases = new Map();
  for (let index = 0; index < value.length; index++) {
    const group = RequireRecord(value[index], `${label} ${index}`);
    const groupId = NormalizeUnsignedID(group.groupId, `${label} ${index} groupId`);
    if (groupIds.has(groupId)) {
      throw new TypeError(`${label} has duplicate groupId ${groupId}`);
    }
    groupIds.add(groupId);
    RegisterIdentityAlias(groupAliases, groupId, groupId, label, "group");
    if (group.group !== undefined) {
      const name = NormalizeName(group.group, `${label} ${index} group`).toLowerCase();
      if (groupNames.has(name)) {
        throw new TypeError(`${label} has duplicate group ${group.group}`);
      }
      groupNames.add(name);
      RegisterIdentityAlias(groupAliases, name, groupId, label, "group");
    }
    NormalizeUint32Number(group.defaultTransitionMs, `${label} ${index} defaultTransitionMs`);
    const aliasesById = new Map();
    const idsByAlias = new Map();
    const stateIdentities = new Map();
    if (group.states !== undefined) {
      if (!Array.isArray(group.states) || !group.states.length) {
        throw new TypeError(`${label} ${index} states must be a non-empty array`);
      }
      for (let stateIndex = 0; stateIndex < group.states.length; stateIndex++) {
        const state = RequireRecord(group.states[stateIndex], `${label} ${index} state ${stateIndex}`);
        const stateId = NormalizeUnsignedID(state.stateId, `${label} ${index} state ${stateIndex} stateId`);
        const stateName = NormalizeName(state.state, `${label} ${index} state ${stateIndex} state`);
        RegisterStateAlias(aliasesById, idsByAlias, stateIdentities, stateId, stateName, `${label} ${index}`);
      }
    }
    if (!Array.isArray(group.transitions)) {
      throw new TypeError(`${label} ${index} transitions must be an array`);
    }
    const routes = new Set();
    for (let transitionIndex = 0; transitionIndex < group.transitions.length; transitionIndex++) {
      const transition = RequireRecord(group.transitions[transitionIndex], `${label} ${index} transition ${transitionIndex}`);
      const fromId = NormalizeUnsignedID(transition.fromId, `${label} ${index} transition ${transitionIndex} fromId`);
      const toId = NormalizeUnsignedID(transition.toId, `${label} ${index} transition ${transitionIndex} toId`);
      const route = `${fromId}:${toId}`;
      RegisterIdentityAlias(stateIdentities, fromId, fromId, `${label} ${index}`, "state");
      RegisterIdentityAlias(stateIdentities, toId, toId, `${label} ${index}`, "state");
      if (routes.has(route)) {
        throw new TypeError(`${label} ${index} has duplicate transition ${route}`);
      }
      routes.add(route);
      if (transition.from !== undefined) {
        const from = NormalizeName(transition.from, `${label} ${index} transition ${transitionIndex} from`);
        RegisterStateAlias(aliasesById, idsByAlias, stateIdentities, fromId, from, `${label} ${index}`);
      }
      if (transition.to !== undefined) {
        const to = NormalizeName(transition.to, `${label} ${index} transition ${transitionIndex} to`);
        RegisterStateAlias(aliasesById, idsByAlias, stateIdentities, toId, to, `${label} ${index}`);
      }
      NormalizeUint32Number(transition.transitionMs, `${label} ${index} transition ${transitionIndex} transitionMs`);
    }
  }
}
function RegisterStateAlias(byId, byAlias, identities, id, name, label) {
  const alias = name.toLowerCase();
  const existingName = byId.get(id);
  const existingId = byAlias.get(alias);
  if (existingName !== undefined && existingName !== name) {
    throw new TypeError(`${label} stateId ${id} conflicts between` + ` ${existingName} and ${name}`);
  }
  if (existingId !== undefined && existingId !== id) {
    throw new TypeError(`${label} state ${name} conflicts between` + ` stateId ${existingId} and ${id}`);
  }
  byId.set(id, name);
  byAlias.set(alias, id);
  RegisterIdentityAlias(identities, id, id, label, "state");
  RegisterIdentityAlias(identities, alias, id, label, "state");
}
function RegisterIdentityAlias(aliases, alias, id, label, kind) {
  const key = String(alias).toLowerCase();
  const existing = aliases.get(key);
  if (existing !== undefined && existing !== id) {
    throw new TypeError(`${label} ${kind} alias ${alias} conflicts between` + ` ${existing} and ${id}`);
  }
  aliases.set(key, id);
}
function ValidateRandomRanges(value, label) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`);
  }
  for (let index = 0; index < value.length; index++) {
    const range = RequireRecord(value[index], `${label} ${index}`);
    const min = NormalizeFiniteNumber(range.min, `${label} ${index} min`);
    const max = NormalizeFiniteNumber(range.max, `${label} ${index} max`);
    if (max < min) {
      throw new TypeError(`${label} ${index} max must be greater than or equal to min`);
    }
  }
}
function ValidateAcyclic(events, nodes) {
  const visited = new Set();
  const active = new Set();
  const visit = rawID => {
    const id = String(Number(IsRecord(rawID) ? rawID.nodeId : rawID) >>> 0);
    if (active.has(id)) {
      throw new TypeError(`Audio library SFX graph contains a cycle at node ${id}`);
    }
    if (visited.has(id)) {
      return;
    }
    active.add(id);
    for (const child of NodeChildren(nodes[id])) {
      visit(child);
    }
    active.delete(id);
    visited.add(id);
  };
  for (const roots of Object.values(events)) {
    for (const root of roots) {
      visit(root);
    }
  }
  for (const id of Object.keys(nodes)) {
    visit(id);
  }
}
function ValidateContinuousNesting(nodes) {
  const visit = (rawID, continuousParent) => {
    const id = String(Number(IsRecord(rawID) ? rawID.nodeId : rawID) >>> 0);
    const node = nodes[id];
    if (continuousParent !== null && node.continuous !== undefined && (nodes[continuousParent]?.type !== "switch" || node.type !== "switch")) {
      throw new TypeError(`Audio library SFX Continuous container ${continuousParent}` + ` cannot contain Continuous container ${id}`);
    }
    const parent = node.continuous === undefined ? continuousParent : id;
    for (const child of NodeChildren(node)) {
      visit(child, parent);
    }
  };
  for (const [id, node] of Object.entries(nodes)) {
    if (node.continuous !== undefined) {
      for (const child of NodeChildren(node)) {
        visit(child, id);
      }
    }
  }
}
function ValidateCrossfadeDescendants(nodes) {
  const visit = (rawID, containerID) => {
    if (IsRecord(rawID) && rawID.probability !== undefined && Number(rawID.probability) !== 100) {
      throw new TypeError(`Audio library SFX Crossfade container ${containerID}` + " requires every child edge to have 100% probability");
    }
    const id = String(Number(IsRecord(rawID) ? rawID.nodeId : rawID) >>> 0);
    const node = nodes[id];
    if (node.continuous !== undefined) {
      throw new TypeError(`Audio library SFX Crossfade container ${containerID}` + ` cannot contain Continuous container ${id}`);
    }
    if (node.type === "sound") {
      if (node.loop !== false && node.playCount === undefined) {
        throw new TypeError(`Audio library SFX Crossfade container ${containerID}` + ` requires explicitly finite sound ${id}`);
      }
      return;
    }
    if (node.type === "silence" || node.type === "timed-silence" || node.type === "switch" || node.type === "blend" || node.type === "parallel") {
      throw new TypeError(`Audio library SFX Crossfade container ${containerID}` + ` requires one voice per child; node ${id} is ${node.type}`);
    }
    if (node.type === "sequence" && node.loop === false) {
      throw new TypeError(`Audio library SFX Crossfade container ${containerID}` + ` cannot contain exhaustible sequence ${id}`);
    }
    for (const child of NodeChildren(node)) {
      visit(child, containerID);
    }
  };
  for (const [id, node] of Object.entries(nodes)) {
    if (node.continuous?.transition !== "crossfade-amplitude" && node.continuous?.transition !== "crossfade-power") {
      continue;
    }
    for (const child of NodeChildren(node)) {
      visit(child, id);
    }
  }
}
function NodeChildren(node) {
  if (node.type === "sound" || node.type === "silence" || node.type === "timed-silence") {
    return [];
  }
  if (node.type === "switch") {
    return [...Object.values(node.cases), ...(node.default === undefined || node.default === null ? [] : [node.default])];
  }
  return node.children;
}
function RequireRecord(value, label) {
  if (!IsRecord(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}
function IsRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function NormalizePositiveID(value, label) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^[0-9]+$/u.test(value))) {
    throw new TypeError(`${label} must be an unsigned 32-bit integer greater than zero`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > 0xffffffff) {
    throw new TypeError(`${label} must be an unsigned 32-bit integer greater than zero`);
  }
  return String(number >>> 0);
}
function NormalizeUnsignedID(value, label) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^[0-9]+$/u.test(value))) {
    throw new TypeError(`${label} must be an unsigned 32-bit integer`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 0xffffffff) {
    throw new TypeError(`${label} must be an unsigned 32-bit integer`);
  }
  return String(number >>> 0);
}
function NormalizeByte(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 0xff) {
    throw new TypeError(`${label} must be an unsigned byte`);
  }
  return number;
}
function NormalizeName(value, label) {
  const name = String(value ?? "").trim();
  if (!name) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return name;
}
function NormalizeFiniteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return number;
}
function NormalizeUint32Number(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 0xffffffff) {
    throw new TypeError(`${label} must be an unsigned 32-bit integer`);
  }
  return number;
}
function NormalizePositiveNumber(value, label) {
  const number = NormalizeFiniteNumber(value, label);
  if (number <= 0) {
    throw new TypeError(`${label} must be greater than zero`);
  }
  return number;
}
function NormalizeNonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return number;
}
function NormalizePositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return number;
}

export { NormalizeStateTransitions, ValidateStateTransitions, normalizeSfxGraph, validateSfxGraph };
//# sourceMappingURL=sfxGraph.js.map
