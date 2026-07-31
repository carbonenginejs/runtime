const SFX_SCHEMA_VERSION = 2;
const NODE_TYPES = new Set(["blend", "parallel", "random", "sequence", "silence", "sound", "switch"]);
const SWITCH_SCOPES = new Set(["state", "switch"]);
const RTPC_SCOPES = new Set(["global", "object"]);
const CONTAINER_SCOPES = new Set(["global", "object"]);
const RANDOM_MODES = new Set(["random", "shuffle"]);
const EVENT_ACTION_KINDS = new Set(["state", "switch"]);
const STOP_SCOPES = new Set(["game-object", "global"]);
const STOP_MODES = new Set(["all", "all-except", "element"]);

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
  for (const [rawID, node] of Object.entries(nodes)) {
    const id = NormalizePositiveID(rawID, `Audio library SFX node ${rawID}`);
    RequireRecord(node, `Audio library SFX node ${id}`);
    if (!NODE_TYPES.has(node.type)) {
      throw new TypeError(`Audio library SFX node ${id} has unsupported type ${node.type}`);
    }
    ValidateGain(node, `Audio library SFX node ${id}`);
    ValidateNodePlaybackProperties(node, `Audio library SFX node ${id}`);
    ValidateStateProperties(node.stateProperties, `Audio library SFX node ${id} stateProperties`);
    if (node.type === "sound" || node.type === "silence") {
      if (node.type === "silence") {
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
      if (node.matchIds !== undefined) {
        ValidateMatchIds(node.matchIds, id, `Audio library SFX sound ${id} matchIds`);
      }
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
      if (action.kind === "stop") {
        ValidateStopAction(action, label);
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
        if (action.kind === "stop") {
          return NormalizeStopAction(action);
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
    ...NormalizeStateProperties(node)
  };
  if (node.type === "sound" || node.type === "silence") {
    if (node.type === "silence") {
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
    if (node.matchIds !== undefined) {
      result.matchIds = node.matchIds.map(value => String(Number(value) >>> 0));
    }
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
  return result;
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
  for (const field of ["pitchCents", "initialDelayMs"]) {
    if (value[field] !== undefined) {
      result[field] = Number(value[field]);
    }
  }
  for (const field of ["pitchCentsRanges", "initialDelayRangesMs"]) {
    if (value[field] !== undefined) {
      result[field] = NormalizeRandomRanges(value[field]);
    }
  }
  return result;
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
        })
      }]))
    }))
  };
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
function ValidateStopAction(value, label) {
  const action = RequireRecord(value, label);
  if (!STOP_SCOPES.has(action.scope)) {
    throw new TypeError(`${label} scope must be game-object or global`);
  }
  if (!STOP_MODES.has(action.mode)) {
    throw new TypeError(`${label} mode must be element, all, or all-except`);
  }
  const targetID = NormalizeUnsignedID(action.targetId, `${label} targetId`);
  if (action.mode === "element" && targetID === "0") {
    throw new TypeError(`${label} element targetId must be greater than zero`);
  }
  if (action.mode !== "element" && targetID !== "0") {
    throw new TypeError(`${label} Stop-All targetId must be zero`);
  }
  if (action.targetFlags !== undefined) {
    const targetFlags = NormalizeByte(action.targetFlags, `${label} targetFlags`);
    if (targetFlags & 0x01) {
      throw new TypeError(`${label} bus targets are unsupported`);
    }
  }
  if (action.actionFlags !== undefined) {
    const actionFlags = NormalizeByte(action.actionFlags, `${label} actionFlags`);
    if (actionFlags !== 6) {
      throw new TypeError(`${label} actionFlags must be 6`);
    }
  }
  if (!Array.isArray(action.exceptions)) {
    throw new TypeError(`${label} exceptions must be an array`);
  }
  const seen = new Set();
  if (action.mode === "element" && action.exceptions.length) {
    throw new TypeError(`${label} element Stops cannot have exceptions`);
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
function NormalizeStopAction(action) {
  const result = {
    kind: "stop",
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
  if (value.fadeCurve !== undefined && (!Number.isSafeInteger(Number(value.fadeCurve)) || Number(value.fadeCurve) < 0 || Number(value.fadeCurve) > 8)) {
    throw new TypeError(`${label} fadeCurve must be a Wwise curve value from 0 to 8`);
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
  ValidateRandomRanges(value.pitchCentsRanges, `${label} pitchCentsRanges`);
  ValidateRandomRanges(value.initialDelayRangesMs, `${label} initialDelayRangesMs`);
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
      if (!hasGain && !hasPitch) {
        throw new TypeError(`${label} ${index} case ${name}` + " must define gainDb or pitchCents");
      }
      if (hasGain) {
        NormalizeFiniteNumber(stateCase.gainDb, `${label} ${index} case ${name} gainDb`);
      }
      if (hasPitch) {
        NormalizeFiniteNumber(stateCase.pitchCents, `${label} ${index} case ${name} pitchCents`);
      }
    }
  }
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
function NodeChildren(node) {
  if (node.type === "sound" || node.type === "silence") {
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

export { normalizeSfxGraph, validateSfxGraph };
//# sourceMappingURL=sfxGraph.js.map
