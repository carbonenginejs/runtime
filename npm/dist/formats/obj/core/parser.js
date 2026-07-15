/**
 * Tiny Wavefront OBJ parser that emits the mesh subset of the shared
 * CarbonEngineJS JSON mesh schema.
 */

const CHANNEL_TEMPLATE = Object.freeze({
  position: null,
  blendIndice: null,
  tangent: null,
  normal: null,
  texcoord0: null,
  texcoord1: null,
  binormal: null,
  blendWeight: null
});

/**
 * Return a finite JSON number.
 *
 * @param {number} value Candidate number.
 * @returns {number} Finite number, or zero.
 */
function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Parse one OBJ float token.
 *
 * @param {string|undefined} value Token text.
 * @param {string} statement Statement name.
 * @param {number} lineNumber One-based source line number.
 * @returns {number} Parsed number.
 */
function parseFloatToken(value, statement, lineNumber) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) {
    throw new Error(`CjsObjFormat: invalid ${statement} number on line ${lineNumber}`);
  }
  return number;
}

/**
 * Parse a positive or negative OBJ index.
 *
 * @param {string} value Index token.
 * @param {number} count Number of source records available.
 * @param {string} kind Human-readable index kind.
 * @param {number} lineNumber One-based source line number.
 * @returns {number} Zero-based resolved index.
 */
function resolveIndex(value, count, kind, lineNumber) {
  const index = Number.parseInt(value, 10);
  if (!Number.isInteger(index) || index === 0) {
    throw new Error(`CjsObjFormat: invalid ${kind} index on line ${lineNumber}`);
  }
  const resolved = index > 0 ? index - 1 : count + index;
  if (resolved < 0 || resolved >= count) {
    throw new Error(`CjsObjFormat: ${kind} index ${index} out of range on line ${lineNumber}`);
  }
  return resolved;
}

/**
 * Parse one face vertex reference.
 *
 * @param {string} token Face vertex token.
 * @param {object} state Parser state.
 * @param {number} lineNumber One-based source line number.
 * @returns {{position: number, texcoord: number, normal: number}} Vertex tuple.
 */
function parseFaceRef(token, state, lineNumber) {
  const parts = token.split("/");
  if (!parts[0]) {
    throw new Error(`CjsObjFormat: face vertex is missing a position index on line ${lineNumber}`);
  }
  return {
    position: resolveIndex(parts[0], state.positions.length / 3, "position", lineNumber),
    texcoord: parts[1] ? resolveIndex(parts[1], state.texcoords.length / 2, "texcoord", lineNumber) : -1,
    normal: parts[2] ? resolveIndex(parts[2], state.normals.length / 3, "normal", lineNumber) : -1
  };
}

/**
 * Add or reuse one output vertex tuple.
 *
 * @param {{position: number, texcoord: number, normal: number}} ref Vertex reference.
 * @param {object} state Parser state.
 * @returns {number} Output vertex index.
 */
function addVertex(ref, state) {
  const key = `${ref.position}/${ref.texcoord}/${ref.normal}`;
  const existing = state.vertexMap.get(key);
  if (existing !== undefined) return existing;
  const index = state.vertexCount++,
    p = ref.position * 3;
  state.vertex.position.push(safeNumber(state.positions[p]), safeNumber(state.positions[p + 1]), safeNumber(state.positions[p + 2]));
  if (ref.texcoord >= 0) {
    const t = ref.texcoord * 2;
    state.vertex.texcoord0.push(safeNumber(state.texcoords[t]), safeNumber(state.texcoords[t + 1]));
  } else {
    state.hasAllTexcoords = false;
    state.vertex.texcoord0.push(0, 0);
  }
  if (ref.normal >= 0) {
    const n = ref.normal * 3;
    state.vertex.normal.push(safeNumber(state.normals[n]), safeNumber(state.normals[n + 1]), safeNumber(state.normals[n + 2]));
  } else {
    state.hasAllNormals = false;
    state.vertex.normal.push(0, 0, 0);
  }
  state.vertexMap.set(key, index);
  return index;
}

/**
 * Current index group name from OBJ group/material state.
 *
 * @param {object} state Parser state.
 * @returns {string} Group name.
 */
function currentIndexGroupName(state) {
  if (state.materialName) return state.materialName;
  if (state.groupName) return state.groupName;
  return "default";
}

/**
 * Get or create the current index group.
 *
 * @param {object} state Parser state.
 * @returns {{name: string, bytesPerIndex: number, faces: number[]}} Index group.
 */
function currentIndexGroup(state) {
  const name = currentIndexGroupName(state);
  let group = state.indexGroupMap.get(name);
  if (!group) {
    group = {
      name,
      bytesPerIndex: 2,
      faces: []
    };
    state.indexGroupMap.set(name, group);
    state.indexGroups.push(group);
  }
  return group;
}

/**
 * Add one triangulated OBJ face.
 *
 * @param {string[]} tokens Face vertex tokens.
 * @param {object} state Parser state.
 * @param {number} lineNumber One-based source line number.
 */
function addFace(tokens, state, lineNumber) {
  if (tokens.length < 3) {
    throw new Error(`CjsObjFormat: face on line ${lineNumber} has fewer than three vertices`);
  }
  const refs = tokens.map(token => parseFaceRef(token, state, lineNumber)),
    group = currentIndexGroup(state),
    first = addVertex(refs[0], state);
  for (let i = 1; i < refs.length - 1; i++) {
    group.faces.push(first, addVertex(refs[i], state), addVertex(refs[i + 1], state));
  }
}

/**
 * Compute min/max bounds from a flat position channel.
 *
 * @param {number[]} positions Flat xyz positions.
 * @returns {{minBounds: number[], maxBounds: number[]}} Bounds.
 */
function computeBounds(positions) {
  if (!positions.length) {
    return {
      minBounds: [0, 0, 0],
      maxBounds: [0, 0, 0]
    };
  }
  const minBounds = [positions[0], positions[1], positions[2]],
    maxBounds = [positions[0], positions[1], positions[2]];
  for (let i = 3; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const value = positions[i + c];
      if (value < minBounds[c]) minBounds[c] = value;
      if (value > maxBounds[c]) maxBounds[c] = value;
    }
  }
  return {
    minBounds,
    maxBounds
  };
}

/**
 * Create an empty shared-schema vertex channel container.
 *
 * @returns {object} Vertex channel container.
 */
function createVertexChannels() {
  const channels = {};
  for (const key of Object.keys(CHANNEL_TEMPLATE)) {
    channels[key] = [];
  }
  return channels;
}

/**
 * Derive a stable mesh name from OBJ/source metadata.
 *
 * @param {object} state Parser state.
 * @returns {string} Mesh name.
 */
function meshName(state) {
  if (state.objectName) return state.objectName;
  if (state.groupName) return state.groupName;
  const file = state.source.split(/[\\/]/).pop() || "";
  const stem = file.replace(/\.[^.]*$/, "");
  return stem && stem !== "memory" ? stem : "obj_mesh";
}

/**
 * Finalize parser state into the shared JSON root object.
 *
 * @param {object} state Parser state.
 * @returns {object} Shared JSON root object.
 */
function finalize(state) {
  if (state.vertexCount === 0) {
    throw new Error("CjsObjFormat: OBJ contains no faces");
  }
  if (!state.hasAllTexcoords) state.vertex.texcoord0 = [];
  if (!state.hasAllNormals) state.vertex.normal = [];
  const bytesPerIndex = state.vertexCount > 0xffff ? 4 : 2;
  for (const group of state.indexGroups) {
    group.bytesPerIndex = bytesPerIndex;
  }
  const {
    minBounds,
    maxBounds
  } = computeBounds(state.vertex.position);
  return {
    grannyFileFormatRevision: 0,
    grannyFileSource: state.source,
    meshes: [{
      name: meshName(state),
      morphTargets: [],
      minBounds,
      maxBounds,
      boneBindings: [],
      vertex: state.vertex,
      indices: state.indexGroups
    }],
    models: [],
    animations: []
  };
}

/**
 * Parse OBJ text into a shared CarbonEngineJS JSON mesh graph.
 *
 * @param {string} text OBJ text.
 * @param {object} [options] Parser options.
 * @param {string} [options.source] Source name for metadata/errors.
 * @returns {object} Shared JSON root object.
 */
function parseObjText(text, {
  source = "memory"
} = {}) {
  const state = {
    source,
    positions: [],
    texcoords: [],
    normals: [],
    objectName: "",
    groupName: "",
    materialName: "",
    vertex: createVertexChannels(),
    vertexMap: new Map(),
    vertexCount: 0,
    hasAllTexcoords: true,
    hasAllNormals: true,
    indexGroups: [],
    indexGroupMap: new Map()
  };
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i].replace(/#.*/, "").trim();
    if (!line) continue;
    const [statement, ...args] = line.split(/\s+/);
    switch (statement) {
      case "v":
        state.positions.push(parseFloatToken(args[0], "v", lineNumber), parseFloatToken(args[1], "v", lineNumber), parseFloatToken(args[2], "v", lineNumber));
        break;
      case "vt":
        state.texcoords.push(parseFloatToken(args[0], "vt", lineNumber), args[1] === undefined ? 0 : parseFloatToken(args[1], "vt", lineNumber));
        break;
      case "vn":
        state.normals.push(parseFloatToken(args[0], "vn", lineNumber), parseFloatToken(args[1], "vn", lineNumber), parseFloatToken(args[2], "vn", lineNumber));
        break;
      case "f":
        addFace(args, state, lineNumber);
        break;
      case "o":
        if (args.length) state.objectName = args.join(" ");
        break;
      case "g":
        state.groupName = args.join(" ");
        break;
      case "usemtl":
        state.materialName = args.join(" ");
        break;
    }
  }
  return finalize(state);
}

export { parseObjText };
//# sourceMappingURL=parser.js.map
