import { WwiseCursor, boundedCount, readInitialRtpcs, readStateChunk, finite } from './nodeBase.js';

// Exact generic Wwise v150 Fx ShareSet and Fx Custom object decoding. Plug-in
// parameter blocks remain opaque bytes; the resource layer preserves identity,
// media, RTPC, state, and property records without interpreting DSP behavior.

const SUPPORTED_VERSION = 150;
const FX_SHARE_SET_TYPE = 16;
const FX_CUSTOM_TYPE = 17;
const NO_PLUGIN_ID = 0xffffffff;

/**
 * Decodes one complete v150 Fx ShareSet or Fx Custom body.
 *
 * @param {Uint8Array} payload Entry payload view from `inspect()`.
 * @param {object} [options] Bank-version qualification.
 * @returns {object|null} Typed effect body, or null when it is invalid.
 */
function parseEffectNode(payload, {
  bankVersion = SUPPORTED_VERSION
} = {}) {
  if (!(payload instanceof Uint8Array) || Number(bankVersion) !== SUPPORTED_VERSION || payload.byteLength < 4) {
    return null;
  }
  try {
    const cursor = new WwiseCursor(payload);
    const pluginId = cursor.u32();
    let parameterBlock = payload.subarray(cursor.at, cursor.at);
    if (pluginId !== 0 && pluginId !== NO_PLUGIN_ID) {
      const parameterByteLength = cursor.u32();
      cursor.ensure(parameterByteLength);
      parameterBlock = payload.subarray(cursor.at, cursor.at + parameterByteLength);
      cursor.at += parameterByteLength;
    }
    const mediaCount = boundedCount(cursor.u8(), cursor.remaining, 5, 255);
    const media = [];
    for (let index = 0; index < mediaCount; index++) {
      media.push({
        index: cursor.u8(),
        sourceId: cursor.u32()
      });
    }
    const rtpcs = readInitialRtpcs(cursor);
    const state = readStateChunk(cursor);
    const propertyCount = boundedCount(cursor.u16(), cursor.remaining, 6, 65535);
    const propertyValues = [];
    for (let index = 0; index < propertyCount; index++) {
      const propertyId = cursor.variable();
      const accumulation = cursor.u8();
      const value = finite(cursor.f32());
      if (accumulation > 6) {
        throw new RangeError("invalid v150 effect accumulation");
      }
      propertyValues.push({
        propertyId,
        accumulation,
        value
      });
    }
    if (cursor.remaining !== 0) return null;
    return {
      pluginId,
      pluginType: pluginId & 0x0f,
      companyId: pluginId >>> 4 & 0x0fff,
      pluginClassId: pluginId >>> 16,
      parameterBlock,
      media,
      rtpcs,
      state,
      propertyValues,
      byteLength: cursor.at
    };
  } catch {
    return null;
  }
}

/**
 * Decodes every v150 Fx ShareSet and Fx Custom across inspected banks.
 *
 * @param {Array<object>|object} inspections Related `CjsBnkFormat.inspect()` results.
 * @returns {{effects: Map<number, object>, diagnostics: object}} Typed effect catalog and failures.
 */
function effectNodesFromBanks(inspections) {
  const banks = Array.isArray(inspections) ? inspections : [inspections];
  const effects = new Map();
  const failed = [];
  const duplicates = [];
  const unsupportedVersions = [];
  let parsed = 0;
  for (const inspection of banks) {
    const bank = inspection?.source || "";
    const bankVersion = Number(inspection?.bankVersion) >>> 0;
    if (bankVersion !== SUPPORTED_VERSION) {
      unsupportedVersions.push({
        bank,
        version: bankVersion
      });
      continue;
    }
    for (const entry of inspection?.hirc ?? []) {
      if (entry.type !== FX_SHARE_SET_TYPE && entry.type !== FX_CUSTOM_TYPE) {
        continue;
      }
      const decoded = parseEffectNode(entry.payload, {
        bankVersion
      });
      const type = entry.type === FX_SHARE_SET_TYPE ? "effect-share-set" : "effect-custom";
      if (!decoded) {
        failed.push({
          bank,
          version: bankVersion,
          type,
          id: entry.id,
          reason: "invalid v150 effect body"
        });
        continue;
      }
      if (effects.has(entry.id)) {
        duplicates.push({
          id: entry.id,
          previousBank: effects.get(entry.id).bank,
          bank
        });
      }
      parsed++;
      effects.set(entry.id, {
        id: entry.id,
        bank,
        type,
        ...decoded
      });
    }
  }
  return {
    effects,
    diagnostics: {
      parsed,
      failed,
      duplicates,
      unsupportedVersions
    }
  };
}

export { effectNodesFromBanks, parseEffectNode };
//# sourceMappingURL=effectNodes.js.map
