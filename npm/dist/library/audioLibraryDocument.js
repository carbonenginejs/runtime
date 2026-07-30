import { normalizeSfxGraph, validateSfxGraph } from './sfxGraph.js';

const AUDIO_LIBRARY_SCHEMA = "carbonenginejs.audioLibrary";
const AUDIO_LIBRARY_VERSION = 2;

/** Validates one complete plain audio-library document. */
function validateAudioLibraryDocument(value) {
  RequireRecord(value, "Audio library");
  if (value.schema !== AUDIO_LIBRARY_SCHEMA) {
    throw new TypeError(`Unsupported audio-library schema: ${value.schema}`);
  }
  if (value.schemaVersion !== AUDIO_LIBRARY_VERSION) {
    throw new TypeError(`Unsupported audio-library schema version: ${value.schemaVersion}`);
  }
  const metadata = RequireRecord(value.metadata, "Audio library metadata");
  RequireRecord(metadata.Events, "Audio library metadata.Events");
  RequireRecord(metadata.SoundBanks, "Audio library metadata.SoundBanks");
  RequireRecord(metadata.WemFileIDs, "Audio library metadata.WemFileIDs");
  RequireRecord(value.media, "Audio library media");
  RequireRecord(value.banks, "Audio library banks");
  ValidateEventMetadata(metadata.Events);
  ValidateBanks(value.banks);
  ValidateEmbeddedMedia(value.embeddedMedia, value.banks);
  ValidateEventMedia(value.eventMedia, value.eventMediaLanguage, value.media, value.embeddedMedia ?? {});
  if (value.sfx !== undefined) {
    validateSfxGraph(value.sfx, value.media, value.embeddedMedia ?? {});
    for (const eventName of Object.keys(value.sfx.events)) {
      if (!metadata.Events[eventName]) {
        throw new TypeError(`Audio library SFX event ${eventName} has no metadata event`);
      }
    }
  }
  ValidateMusic(value.music, value.media, value.embeddedMedia ?? {});
  ValidateEventOwnership(value.sfx, value.music);
  return true;
}
function ValidateEventMetadata(events) {
  for (const [name, event] of Object.entries(events)) {
    RequireRecord(event, `Audio library metadata event ${name}`);
    if (event.is2D !== undefined && event.is2D !== 0 && event.is2D !== 1) {
      throw new TypeError(`Audio library metadata event ${name} is2D must be 0 or 1`);
    }
    if (event.maxRadiusAttenuation !== undefined && (!Number.isFinite(event.maxRadiusAttenuation) || event.maxRadiusAttenuation < 0)) {
      throw new TypeError(`Audio library metadata event ${name} maxRadiusAttenuation must be a non-negative finite number`);
    }
  }
}
function ValidateEventOwnership(sfx, music) {
  if (!sfx || !music) {
    return;
  }
  for (const eventName of Object.keys(sfx.events)) {
    if (Array.isArray(music.eventTargets?.[eventName])) {
      throw new TypeError(`Audio event ${eventName} cannot be owned by both SFX and music graphs`);
    }
  }
}

/**
 * Validates and returns an immutable detached audio-library document.
 *
 * Applications may obtain the input through an API, a packaged module, a
 * download, or the optional library builder. Runtime-audio never discovers
 * or acquires those inputs.
 */
function installAudioLibraryDocument(value) {
  validateAudioLibraryDocument(value);
  const normalized = value.sfx === undefined ? value : {
    ...value,
    sfx: normalizeSfxGraph(value.sfx, value.media, value.embeddedMedia ?? {})
  };
  if (normalized.sfx) {
    normalized.metadata = NormalizeSfxLoopMetadata(value.metadata, normalized.sfx);
  }
  return CloneJSONValue(normalized, "audio library");
}
function NormalizeSfxLoopMetadata(metadata, sfx) {
  const events = {
    ...metadata.Events
  };
  for (const [eventName, roots] of Object.entries(sfx.events)) {
    const source = events[eventName];
    const fallback = Boolean(source.isLoop);
    const mayLoop = roots.some(root => ChildMayLoop(root, sfx.nodes, fallback, new Set()));
    events[eventName] = {
      ...source,
      isLoop: mayLoop ? 1 : 0
    };
  }
  return {
    ...metadata,
    Events: events
  };
}
function ChildMayLoop(child, nodes, fallback, active) {
  const id = String(Number(child && typeof child === "object" ? child.nodeId : child) >>> 0);
  const node = nodes[id];
  if (!node || active.has(id)) {
    return false;
  }
  if (node.type === "sound") {
    return node.loop === undefined ? fallback : node.loop;
  }
  if (node.type === "silence") {
    return false;
  }
  const next = new Set(active);
  next.add(id);
  if (node.type === "switch") {
    return [...Object.values(node.cases), ...(node.default === undefined ? [] : [node.default])].some(value => ChildMayLoop(value, nodes, fallback, next));
  }
  return node.children.some(value => ChildMayLoop(value, nodes, fallback, next));
}
function ValidateBanks(banks) {
  for (const [sourceID, bank] of Object.entries(banks)) {
    RequireRecord(bank, `Audio library bank ${sourceID}`);
    const bankID = NormalizeUnsignedID(bank.bankID, `Audio library bank ${sourceID} bankID`);
    const languageID = NormalizeUnsignedID(bank.languageID, `Audio library bank ${sourceID} languageID`);
    const expected = `${bankID}:${languageID}`;
    if (sourceID !== expected || String(bank.sourceID ?? "") !== expected) {
      throw new TypeError(`Audio library bank identity must be ${expected}: ${sourceID}`);
    }
  }
}
function ValidateEmbeddedMedia(embeddedMedia, banks) {
  if (embeddedMedia === undefined) {
    return;
  }
  RequireRecord(embeddedMedia, "Audio library embeddedMedia");
  for (const [mediaID, value] of Object.entries(embeddedMedia)) {
    NormalizePositiveID(mediaID, `Audio library embedded media ${mediaID}`);
    const records = Array.isArray(value) ? value : [value];
    if (!records.length) {
      throw new TypeError(`Audio library embedded media ${mediaID} has no sources`);
    }
    for (const record of records) {
      RequireRecord(record, `Audio library embedded media ${mediaID}`);
      if (!banks[String(record.bank ?? "")]) {
        throw new TypeError(`Audio library embedded media ${mediaID} references unknown bank ${record.bank}`);
      }
      NormalizeNonNegativeInteger(record.offset, `Audio library embedded media ${mediaID} offset`);
      NormalizePositiveInteger(record.byteLength, `Audio library embedded media ${mediaID} byteLength`);
    }
  }
}
function ValidateEventMedia(eventMedia, language, media, embeddedMedia) {
  if (eventMedia === undefined) {
    return;
  }
  RequireRecord(eventMedia, "Audio library eventMedia");
  NormalizeLanguage(language ?? "");
  for (const [eventName, values] of Object.entries(eventMedia)) {
    if (!Array.isArray(values)) {
      throw new TypeError(`Audio library eventMedia.${eventName} must be an array`);
    }
    const ids = values.map(value => NormalizePositiveID(value, `Audio library eventMedia.${eventName}`));
    if (new Set(ids).size !== ids.length) {
      throw new TypeError(`Audio library eventMedia.${eventName} has duplicate sources`);
    }
    for (const id of ids) {
      if (!media[id] && !embeddedMedia[id]) {
        throw new TypeError(`Audio library eventMedia.${eventName} references missing source ${id}`);
      }
    }
  }
}
function ValidateMusic(music, media, embeddedMedia) {
  if (music === undefined) {
    return;
  }
  RequireRecord(music, "Audio library music");
  if (music.schemaVersion !== 1) {
    throw new TypeError(`Unsupported audio music schema version: ${music.schemaVersion}`);
  }
  if (!Array.isArray(music.banks)) {
    throw new TypeError("Audio library music banks must be an array");
  }
  const nodes = RequireRecord(music.nodes, "Audio library music nodes");
  const bankNames = music.banks.map(NormalizeBankName);
  if (new Set(bankNames).size !== bankNames.length) {
    throw new TypeError("Audio library music banks must be unique");
  }
  for (const [id, node] of Object.entries(nodes)) {
    NormalizePositiveID(id, `Audio library music node ${id}`);
    RequireRecord(node, `Audio library music node ${id}`);
    if (!bankNames.includes(NormalizeBankName(node.bank))) {
      throw new TypeError(`Audio library music node ${id} references unknown bank ${node.bank}`);
    }
    for (const childID of node.children ?? []) {
      if (!nodes[NormalizePositiveID(childID, `Audio library music node ${id} child`)]) {
        throw new TypeError(`Audio library music node ${id} references missing child ${childID}`);
      }
    }
    if (node.type === "music-track") {
      for (const source of node.sources ?? []) {
        const sourceID = NormalizePositiveID(source.sourceId, `Audio library music track ${id} source`);
        if (!media[sourceID] && !embeddedMedia[sourceID]) {
          throw new TypeError(`Audio library music track ${id} references missing source ${sourceID}`);
        }
      }
    }
  }
  for (const field of ["eventTargets", "eventStops"]) {
    const table = RequireRecord(music[field], `Audio library music ${field}`);
    for (const [name, values] of Object.entries(table)) {
      if (!Array.isArray(values)) {
        throw new TypeError(`Audio library music ${field}.${name} must be an array`);
      }
      for (const value of values) {
        const id = NormalizePositiveID(value, `Audio library music ${field}.${name}`);
        if (!nodes[id]) {
          throw new TypeError(`Audio library music ${field}.${name} references missing node ${id}`);
        }
      }
    }
  }
  RequireRecord(music.switchSetters, "Audio library music switchSetters");
}
function RequireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}
function NormalizeUnsignedID(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 0xffffffff) {
    throw new TypeError(`${label} must be an unsigned 32-bit integer`);
  }
  return String(number >>> 0);
}
function NormalizePositiveID(value, label) {
  const id = NormalizeUnsignedID(value, label);
  if (id === "0") {
    throw new TypeError(`${label} must be greater than zero`);
  }
  return id;
}
function NormalizeNonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return number;
}
function NormalizePositiveInteger(value, label) {
  const number = NormalizeNonNegativeInteger(value, label);
  if (number === 0) {
    throw new TypeError(`${label} must be greater than zero`);
  }
  return number;
}
function NormalizeLanguage(value) {
  const language = String(value ?? "").trim().replaceAll("_", "-").toLowerCase();
  if (language && !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(language)) {
    throw new TypeError(`Invalid audio language tag: ${value}`);
  }
  return language;
}
function NormalizeBankName(value) {
  const name = String(value ?? "").trim().replaceAll("\\", "/").split("/").pop().toLowerCase();
  if (!name) {
    throw new TypeError("Audio library bank name is required");
  }
  return name;
}
function CloneJSONValue(value, label) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${label} contains a non-finite number`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry, index) => CloneJSONValue(entry, `${label}[${index}]`)));
  }
  if (!value || typeof value !== "object") {
    throw new TypeError(`${label} contains a non-JSON value`);
  }
  const result = {};
  for (const key of Object.keys(value)) {
    result[key] = CloneJSONValue(value[key], `${label}.${key}`);
  }
  return Object.freeze(result);
}

export { installAudioLibraryDocument, validateAudioLibraryDocument };
//# sourceMappingURL=audioLibraryDocument.js.map
