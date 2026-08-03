import { sha256Bytes } from './sha256.js';

const EFFECT_PERMUTATION_GRAPH_FORMAT = "CJS_EFFECT_PERMUTATION_GRAPH";
const EFFECT_PERMUTATION_GRAPH_VERSION = 1;
const EFFECT_PERMUTATION_GRAPH_CHUNK = "PGRF";
const SHA256 = /^[0-9a-f]{64}$/u;
const UINT8_MAX = 0xff;
const UINT32_MAX = 0xffffffff;
const MAX_EFFECT_PERMUTATIONS = 0x10000;

/**
 * Build a complete source permutation topology without claiming that every
 * body has portable reflection or backend programs.
 *
 * @param {object} effectRes Raw format-hlsl effect resource.
 * @returns {object} JSON-safe permutation graph.
 */
function buildEffectPermutationGraph(effectRes) {
  if (!effectRes || typeof effectRes !== "object") {
    throw new TypeError("Effect permutation graph requires a decoded effect resource");
  }
  const sourceBytes = effectRes.m_data;
  if (!(sourceBytes instanceof Uint8Array)) {
    throw new TypeError("Effect permutation graph requires exact source bytes");
  }
  const axes = normalizeAxes(effectRes.m_permutations);
  const permutationCount = permutationProduct(axes);
  const offsets = effectRes.m_offsets;
  if (!Array.isArray(offsets) || offsets.length !== permutationCount || effectRes.m_offsetCount !== offsets.length) {
    throw new Error("Effect permutation graph requires one source body record per permutation");
  }
  const sourceRecords = offsets.map((record, permutationIndex) => normalizeSourceRecord(record, permutationIndex, sourceBytes.byteLength));
  validateDisjointSourceRecords(sourceRecords, "Effect permutation source body records partially overlap");
  const bodies = [];
  const bodyCandidatesByDigest = new Map();
  const bodyBySourceRecord = new Map();
  const variants = sourceRecords.map((sourceRecord, permutationIndex) => {
    const sourceRecordKey = `${sourceRecord.offset}:${sourceRecord.byteLength}`;
    let body = bodyBySourceRecord.get(sourceRecordKey);
    if (!body) {
      const bodyBytes = sourceBytes.subarray(sourceRecord.offset, sourceRecord.offset + sourceRecord.byteLength);
      const digest = sha256Bytes(bodyBytes);
      body = (bodyCandidatesByDigest.get(digest) || []).find(candidate => bytesEqual(candidate.bytes, bodyBytes));
      if (!body && bodyCandidatesByDigest.has(digest)) {
        throw new Error("Effect permutation graph body SHA-256 collision detected");
      }
      if (!body) {
        body = {
          bytes: bodyBytes,
          record: Object.freeze({
            key: `body${bodies.length}`,
            byteLength: bodyBytes.byteLength,
            sha256: digest
          })
        };
        bodyCandidatesByDigest.set(digest, [body]);
        bodies.push(body.record);
      }
      bodyBySourceRecord.set(sourceRecordKey, body);
    }
    return Object.freeze({
      permutationIndex,
      optionIndices: Object.freeze(decodeOptionIndices(permutationIndex, axes)),
      bodyKey: body.record.key,
      sourceRecord
    });
  });
  const graph = Object.freeze({
    format: EFFECT_PERMUTATION_GRAPH_FORMAT,
    formatVersion: EFFECT_PERMUTATION_GRAPH_VERSION,
    coverage: Object.freeze({
      permutations: "complete",
      bodies: "identity-only",
      reflection: "absent"
    }),
    axes: Object.freeze(axes),
    variants: Object.freeze(variants),
    bodies: Object.freeze(bodies)
  });
  validateEffectPermutationGraph(graph, {
    sourceByteLength: sourceBytes.byteLength
  });
  return graph;
}

/**
 * Validate a source permutation graph independently of the original effect
 * bytes.
 *
 * @param {object} graph Candidate graph.
 * @param {object} [options] Optional source-envelope limits.
 * @param {number} [options.sourceByteLength] Exact enclosing source byte length.
 * @returns {{permutationCount:number,uniqueBodyCount:number}} Validated counts.
 */
function validateEffectPermutationGraph(graph, options = {}) {
  if (!graph || typeof graph !== "object" || Array.isArray(graph) || graph.format !== EFFECT_PERMUTATION_GRAPH_FORMAT || graph.formatVersion !== EFFECT_PERMUTATION_GRAPH_VERSION || !graph.coverage || typeof graph.coverage !== "object" || Array.isArray(graph.coverage) || graph.coverage.permutations !== "complete" || graph.coverage.bodies !== "identity-only" || graph.coverage.reflection !== "absent") {
    throw new Error("PGRF schema or coverage is unsupported");
  }
  const axes = validateGraphAxes(graph.axes);
  const permutationCount = permutationProduct(axes);
  if (!Array.isArray(graph.variants) || graph.variants.length !== permutationCount) {
    throw new Error("PGRF must contain one variant per Cartesian permutation");
  }
  if (!Array.isArray(graph.bodies) || !graph.bodies.length || graph.bodies.length > graph.variants.length) {
    throw new Error("PGRF bodies are malformed");
  }
  const bodies = new Map();
  const bodyDigests = new Set();
  for (const [bodyIndex, body] of graph.bodies.entries()) {
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.key !== "string" || !body.key || body.key !== body.key.trim() || !Number.isSafeInteger(body.byteLength) || body.byteLength < 1 || body.byteLength > UINT32_MAX || typeof body.sha256 !== "string" || !SHA256.test(body.sha256) || bodies.has(body.key) || bodyDigests.has(body.sha256)) {
      throw new Error(`PGRF body ${bodyIndex} is malformed or duplicated`);
    }
    bodyDigests.add(body.sha256);
    bodies.set(body.key, {
      byteLength: body.byteLength,
      references: 0
    });
  }
  const bodyKeyBySourceRecord = new Map();
  const sourceRecords = [];
  for (const [permutationIndex, variant] of graph.variants.entries()) {
    const expectedOptionIndices = decodeOptionIndices(permutationIndex, axes);
    if (!variant || typeof variant !== "object" || Array.isArray(variant) || variant.permutationIndex !== permutationIndex || !Array.isArray(variant.optionIndices) || variant.optionIndices.length !== expectedOptionIndices.length || variant.optionIndices.some((value, index) => value !== expectedOptionIndices[index]) || typeof variant.bodyKey !== "string" || !bodies.has(variant.bodyKey)) {
      throw new Error(`PGRF variant ${permutationIndex} is malformed`);
    }
    const sourceRecord = validateGraphSourceRecord(variant.sourceRecord, permutationIndex, options.sourceByteLength);
    const body = bodies.get(variant.bodyKey);
    if (sourceRecord.byteLength !== body.byteLength) {
      throw new Error(`PGRF variant ${permutationIndex} body length disagrees`);
    }
    const recordKey = `${sourceRecord.offset}:${sourceRecord.byteLength}`;
    const existingBodyKey = bodyKeyBySourceRecord.get(recordKey);
    if (existingBodyKey && existingBodyKey !== variant.bodyKey) {
      throw new Error(`PGRF source record ${recordKey} maps to multiple bodies`);
    }
    bodyKeyBySourceRecord.set(recordKey, variant.bodyKey);
    sourceRecords.push(sourceRecord);
    body.references += 1;
  }
  validateDisjointSourceRecords(sourceRecords, "PGRF source body records partially overlap");
  for (const [bodyKey, body] of bodies) {
    if (!body.references) {
      throw new Error(`PGRF body ${bodyKey} is unreferenced`);
    }
  }
  return Object.freeze({
    permutationCount,
    uniqueBodyCount: bodies.size
  });
}
function normalizeAxes(value) {
  if (!Array.isArray(value) || value.length > UINT8_MAX) {
    throw new TypeError("Effect permutation axes must be an array");
  }
  const names = new Set();
  return value.map((axis, index) => {
    if (!axis || typeof axis !== "object" || typeof axis.name !== "string" || !axis.name || axis.name !== axis.name.trim() || names.has(axis.name) || !Array.isArray(axis.options) || !axis.options.length || axis.options.length > UINT8_MAX || !Number.isSafeInteger(axis.defaultOption) || axis.defaultOption < 0 || axis.defaultOption >= axis.options.length || typeof axis.description !== "string" || !Number.isSafeInteger(axis.type) || axis.type < 0 || axis.type > UINT8_MAX) {
      throw new Error(`Effect permutation axis ${index} is malformed`);
    }
    names.add(axis.name);
    const options = new Set();
    for (const option of axis.options) {
      if (typeof option !== "string" || !option || option !== option.trim() || options.has(option)) {
        throw new Error(`Effect permutation axis ${axis.name} has malformed options`);
      }
      options.add(option);
    }
    return Object.freeze({
      index,
      name: axis.name,
      options: Object.freeze(axis.options.slice()),
      defaultOption: axis.defaultOption,
      description: axis.description,
      type: axis.type
    });
  });
}
function validateGraphAxes(value) {
  if (!Array.isArray(value) || value.length > UINT8_MAX) {
    throw new Error("PGRF axes must be an array");
  }
  const names = new Set();
  return value.map((axis, index) => {
    if (!axis || typeof axis !== "object" || Array.isArray(axis) || axis.index !== index || typeof axis.name !== "string" || !axis.name || axis.name !== axis.name.trim() || names.has(axis.name) || !Array.isArray(axis.options) || !axis.options.length || axis.options.length > UINT8_MAX || !Number.isSafeInteger(axis.defaultOption) || axis.defaultOption < 0 || axis.defaultOption >= axis.options.length || typeof axis.description !== "string" || !Number.isSafeInteger(axis.type) || axis.type < 0 || axis.type > UINT8_MAX) {
      throw new Error(`PGRF axis ${index} is malformed or duplicated`);
    }
    names.add(axis.name);
    const options = new Set();
    for (const option of axis.options) {
      if (typeof option !== "string" || !option || option !== option.trim() || options.has(option)) {
        throw new Error(`PGRF axis ${index} options are malformed`);
      }
      options.add(option);
    }
    return axis;
  });
}
function permutationProduct(axes) {
  let product = 1;
  for (const axis of axes) {
    product *= axis.options.length;
    if (!Number.isSafeInteger(product) || product < 1 || product > MAX_EFFECT_PERMUTATIONS) {
      throw new Error(`Effect permutation count above the implementation limit ` + `${MAX_EFFECT_PERMUTATIONS} is not supported`);
    }
  }
  return product;
}
function decodeOptionIndices(permutationIndex, axes) {
  let value = permutationIndex;
  return axes.map(axis => {
    const optionIndex = value % axis.options.length;
    value = Math.floor(value / axis.options.length);
    return optionIndex;
  });
}
function normalizeSourceRecord(record, permutationIndex, sourceByteLength) {
  if (!record || typeof record !== "object" || record.index !== permutationIndex || !Number.isSafeInteger(record.offset) || record.offset < 0 || record.offset > UINT32_MAX || !Number.isSafeInteger(record.size) || record.size < 1 || record.size > UINT32_MAX || !Number.isSafeInteger(record.end) || record.end !== record.offset + record.size || record.end > sourceByteLength) {
    throw new Error(`Effect permutation ${permutationIndex} has an invalid source body record`);
  }
  return Object.freeze({
    offset: record.offset,
    byteLength: record.size
  });
}
function validateGraphSourceRecord(record, permutationIndex, sourceByteLength) {
  const offset = record?.offset;
  const byteLength = record?.byteLength;
  const end = offset + byteLength;
  if (!record || typeof record !== "object" || Array.isArray(record) || !Number.isSafeInteger(offset) || offset < 0 || offset > UINT32_MAX || !Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > UINT32_MAX || !Number.isSafeInteger(end) || sourceByteLength !== undefined && (!Number.isSafeInteger(sourceByteLength) || sourceByteLength < 1 || end > sourceByteLength)) {
    throw new Error(`PGRF variant ${permutationIndex} source record is malformed`);
  }
  return record;
}
function validateDisjointSourceRecords(records, message) {
  const uniqueRanges = new Map();
  for (const record of records) {
    const key = `${record.offset}:${record.byteLength}`;
    if (!uniqueRanges.has(key)) {
      uniqueRanges.set(key, {
        offset: record.offset,
        end: record.offset + record.byteLength
      });
    }
  }
  const orderedRanges = Array.from(uniqueRanges.values()).sort((left, right) => left.offset - right.offset || left.end - right.end);
  for (let index = 1; index < orderedRanges.length; index += 1) {
    if (orderedRanges[index].offset < orderedRanges[index - 1].end) {
      throw new Error(message);
    }
  }
}
function bytesEqual(left, right) {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

export { EFFECT_PERMUTATION_GRAPH_CHUNK, EFFECT_PERMUTATION_GRAPH_FORMAT, EFFECT_PERMUTATION_GRAPH_VERSION, buildEffectPermutationGraph, validateEffectPermutationGraph };
//# sourceMappingURL=effectPermutationGraph.js.map
