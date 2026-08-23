/**
 * Groups a Carbon effect's permutation rows onto the distinct bodies they
 * address.
 *
 * A container's offset table is dense and positionally indexed, and rows alias:
 * several permutations routinely point at one compiled body. Anything that walks
 * bodies rather than permutations needs that grouping first, or it does the same
 * work once per row — a 4,096-row file with 128 distinct bodies would translate
 * each of them thirty-two times.
 *
 * This is pure container geometry: offsets, byte ranges, and byte equality. It
 * carried no reflection when it lived beside the effect-reflection document, and
 * it outlived that document for exactly that reason.
 */

const EFFECT_VERSION = 15;
const EFFECT_BODY_COUNT_MAX = 0x10000;
const UINT32_MAX = 0xffffffff;

/**
 * Validates one offset-table row against the file it indexes.
 *
 * @param {object} record Offset-table row.
 * @param {number} permutationIndex Position of the row in the table.
 * @param {number} sourceByteLength Size of the source file.
 * @returns {{offset:number, byteLength:number}} Normalized source record.
 */
function normalizeBodySourceRecord(record, permutationIndex, sourceByteLength) {
  const end = record?.offset + record?.size;
  if (!record || record.index !== permutationIndex || !Number.isSafeInteger(record.offset) || record.offset < 0 || record.offset > UINT32_MAX || !Number.isSafeInteger(record.size) || record.size < 1 || record.size > UINT32_MAX || !Number.isSafeInteger(end) || record.end !== end || !Number.isSafeInteger(sourceByteLength) || end > sourceByteLength) {
    throw new Error(`Effect body index ${permutationIndex} disagrees with its source record`);
  }
  return Object.freeze({
    offset: record.offset,
    byteLength: record.size
  });
}

/**
 * Rejects source records that partially overlap.
 *
 * Rows may alias exactly — that is how a container shares one body between
 * permutations — but a partial overlap means two bodies claim the same bytes
 * with different extents, which no reading of the file can satisfy.
 *
 * @param {Array<{offset:number, byteLength:number}>} sourceRecords Records.
 */
function validateDisjointBodySourceRecords(sourceRecords) {
  const unique = new Map();
  for (const record of sourceRecords) {
    const key = `${record.offset}:${record.byteLength}`;
    if (!unique.has(key)) unique.set(key, record);
  }
  const ordered = Array.from(unique.values()).sort((left, right) => left.offset - right.offset || left.byteLength - right.byteLength);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (current.offset < previous.offset + previous.byteLength) {
      throw new Error("Effect body source records partially overlap");
    }
  }
}

/**
 * A cheap content key, used only to shrink the set of byte-equality comparisons.
 *
 * @param {Uint8Array} bytes Body bytes.
 * @returns {string} Length-qualified FNV-1a fingerprint.
 */
function fingerprintBytes(bytes) {
  let hash = 0x811c9dc5;
  for (const value of bytes) {
    hash = Math.imul(hash ^ value, 0x01000193) >>> 0;
  }
  return `${bytes.byteLength}:${hash.toString(16).padStart(8, "0")}`;
}

/**
 * Byte equality. The fingerprint narrows candidates; this decides.
 *
 * @param {Uint8Array} left Left bytes.
 * @param {Uint8Array} right Right bytes.
 * @returns {boolean} Whether the two are byte-identical.
 */
function bytesEqual(left, right) {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

/**
 * Groups permutation rows onto the distinct bodies they address.
 *
 * Rows are grouped by byte range first, then by content: two ranges holding
 * identical bytes are one body, which is what makes the count "unique bodies"
 * rather than "distinct offsets".
 *
 * @param {object} effectRes Loaded version-15 effect resource.
 * @returns {ReadonlyArray<object>} Frozen groups, each with its representative
 *     permutation index, source record, and every variant that shares it.
 */
function enumerateUniqueEffectBodies(effectRes) {
  if (!effectRes || typeof effectRes !== "object" || effectRes.m_version !== EFFECT_VERSION || !(effectRes.m_data instanceof Uint8Array) || !Array.isArray(effectRes.m_offsets) || effectRes.m_offsetCount !== effectRes.m_offsets.length || !effectRes.m_offsets.length) {
    throw new TypeError("Effect body inventory requires a loaded version-15 effect resource");
  }
  if (effectRes.m_offsets.length > EFFECT_BODY_COUNT_MAX) {
    throw new RangeError(`Effect body inventory exceeds ${EFFECT_BODY_COUNT_MAX} records`);
  }
  const sourceRecords = effectRes.m_offsets.map((record, permutationIndex) => normalizeBodySourceRecord(record, permutationIndex, effectRes.m_data.byteLength));
  validateDisjointBodySourceRecords(sourceRecords);
  const groups = [];
  const groupByRange = new Map();
  const groupsByFingerprint = new Map();
  for (const [permutationIndex, sourceRecord] of sourceRecords.entries()) {
    const rangeKey = `${sourceRecord.offset}:${sourceRecord.byteLength}`;
    let group = groupByRange.get(rangeKey);
    if (!group) {
      const bytes = effectRes.m_data.subarray(sourceRecord.offset, sourceRecord.offset + sourceRecord.byteLength);
      const fingerprint = fingerprintBytes(bytes);
      const candidates = groupsByFingerprint.get(fingerprint) ?? [];
      group = candidates.find(candidate => bytesEqual(candidate.bytes, bytes));
      if (!group) {
        group = {
          bytes,
          permutationIndex,
          sourceRecord,
          variants: []
        };
        candidates.push(group);
        groupsByFingerprint.set(fingerprint, candidates);
        groups.push(group);
      }
      groupByRange.set(rangeKey, group);
    }
    group.variants.push({
      permutationIndex,
      sourceRecord
    });
  }
  return Object.freeze(groups.map(group => Object.freeze({
    permutationIndex: group.permutationIndex,
    sourceRecord: group.sourceRecord,
    variants: Object.freeze(group.variants.map(variant => Object.freeze(variant)))
  })));
}

export { enumerateUniqueEffectBodies };
//# sourceMappingURL=effectBodyInventory.js.map
