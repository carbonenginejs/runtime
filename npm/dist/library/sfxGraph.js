const SFX_SCHEMA_VERSION = 1;
const NODE_TYPES = new Set(["blend", "parallel", "random", "sequence", "silence", "sound", "switch"]);
const SWITCH_SCOPES = new Set(["state", "switch"]);
const RTPC_SCOPES = new Set(["global", "object"]);
const CONTAINER_SCOPES = new Set(["global", "object"]);
const RANDOM_MODES = new Set(["random", "shuffle"]);

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
  for (const [rawID, node] of Object.entries(nodes)) {
    const id = NormalizePositiveID(rawID, `Audio library SFX node ${rawID}`);
    RequireRecord(node, `Audio library SFX node ${id}`);
    if (!NODE_TYPES.has(node.type)) {
      throw new TypeError(`Audio library SFX node ${id} has unsupported type ${node.type}`);
    }
    ValidateGain(node, `Audio library SFX node ${id}`);
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
      if (node.playbackRate !== undefined) {
        NormalizePositiveNumber(node.playbackRate, `Audio library SFX sound ${id} playbackRate`);
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
  return {
    schemaVersion: SFX_SCHEMA_VERSION,
    generator: String(graph.generator ?? "@carbonenginejs/runtime-audio/library-builder"),
    events,
    nodes
  };
}
function NormalizeNode(node) {
  const result = {
    type: node.type,
    ...NormalizeGain(node)
  };
  if (node.type === "sound" || node.type === "silence") {
    if (node.type === "silence") {
      return result;
    }
    result.mediaId = String(Number(node.mediaId) >>> 0);
    if (node.loop !== undefined) {
      result.loop = node.loop;
    }
    if (node.playbackRate !== undefined) {
      result.playbackRate = Number(node.playbackRate);
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
    ...NormalizeGain(child)
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
        gainDb: Number(point.gainDb)
      }))
    }));
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
    if (child.weight !== undefined) {
      if (!allowWeight) {
        throw new TypeError(`${label} cannot have weight`);
      }
      NormalizePositiveNumber(child.weight, `${label} weight`);
    }
  }
}
function ValidateGain(value, label) {
  if (value.gainDb !== undefined) {
    NormalizeFiniteNumber(value.gainDb, `${label} gainDb`);
  }
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
    for (let pointIndex = 0; pointIndex < curve.points.length; pointIndex++) {
      const point = RequireRecord(curve.points[pointIndex], `${label} gain curve ${index} point ${pointIndex}`);
      const x = NormalizeFiniteNumber(point.x, `${label} gain curve ${index} point ${pointIndex} x`);
      NormalizeFiniteNumber(point.gainDb, `${label} gain curve ${index} point ${pointIndex} gainDb`);
      if (x <= previous) {
        throw new TypeError(`${label} gain curve ${index} points must have increasing x`);
      }
      previous = x;
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

export { normalizeSfxGraph, validateSfxGraph };
//# sourceMappingURL=sfxGraph.js.map
