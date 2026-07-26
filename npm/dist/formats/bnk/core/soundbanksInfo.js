/**
 * Readers for Wwise SoundbanksInfo metadata (the `soundbanksinfo.json` file
 * generated next to soundbanks).
 *
 * SoundbanksInfo is the authoring-name authority for soundbank content: it
 * maps media ids to original source paths and lists per-bank events, switch
 * groups, state groups, and game parameters. These helpers normalize that
 * document and join it against `CjsBnkFormat` inspection output; they never
 * touch audio bytes.
 */

/**
 * Compute the Wwise 32-bit id for a name.
 *
 * Wwise derives bank, event, and language ids as the FNV-1 32-bit hash of the
 * lowercased name (verified against EVE build 3421648 bank and language ids).
 *
 * @param {string} name Bank, event, switch, or language name.
 * @returns {number} Unsigned 32-bit Wwise id.
 */
function wwiseIdFromName(name) {
  let hash = 2166136261 >>> 0;
  const text = String(name).toLowerCase();
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash, 16777619) >>> 0;
    hash = (hash ^ text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Converts the current BNK format reader value to soundbanks info document. */
function toSoundbanksInfoDocument(input) {
  let value = input;
  if (value instanceof ArrayBuffer) value = new Uint8Array(value);
  if (ArrayBuffer.isView(value)) value = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof Uint8Array) value = utf8String(value);
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (error) {
      throw new TypeError(`CjsBnkFormat: SoundbanksInfo input is not valid JSON (${error.message})`);
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("CjsBnkFormat: SoundbanksInfo input must be JSON bytes, text, or an object");
  }
  const document = value.SoundBanksInfo || value;
  if (!document || typeof document !== "object" || !Array.isArray(document.SoundBanks)) {
    throw new TypeError("CjsBnkFormat: input has no SoundBanksInfo.SoundBanks document");
  }
  return document;
}

/**
 * Test whether input looks like a Wwise SoundbanksInfo document.
 *
 * @param {Uint8Array|ArrayBuffer|DataView|string|object} input Candidate document.
 * @returns {boolean} True when a SoundBanksInfo bank list is present.
 */
function isSoundbanksInfo(input) {
  try {
    toSoundbanksInfoDocument(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse SoundbanksInfo into a normalized camelCase summary.
 *
 * @param {Uint8Array|ArrayBuffer|DataView|string|object} input SoundbanksInfo JSON bytes, text, or object.
 * @returns {object} Normalized document summary with per-bank details.
 */
function parseSoundbanksInfo(input) {
  const document = toSoundbanksInfoDocument(input);
  const banks = document.SoundBanks.map(normalizeBank);
  const summary = {
    platform: document.Platform || "",
    basePlatform: document.BasePlatform || "",
    schemaVersion: document.SchemaVersion || "",
    soundBankVersion: document.SoundBankVersion || "",
    bankCount: banks.length,
    mediaCount: 0,
    streamingMediaCount: 0,
    eventCount: 0,
    languages: [],
    banks
  };
  const languages = new Set();
  for (const bank of banks) {
    summary.mediaCount += bank.media.length;
    summary.streamingMediaCount += bank.media.filter(entry => entry.streaming).length;
    summary.eventCount += bank.events.length;
    if (bank.language) languages.add(bank.language);
  }
  summary.languages = [...languages].sort();
  return summary;
}
function normalizeBank(bank) {
  return {
    id: String(bank.Id ?? ""),
    type: bank.Type || "",
    language: bank.Language || "",
    shortName: bank.ShortName || "",
    path: bank.Path || "",
    media: (bank.Media || []).map(entry => ({
      id: String(entry.Id ?? ""),
      shortName: entry.ShortName || "",
      cachePath: entry.CachePath || "",
      language: entry.Language || "",
      streaming: entry.Streaming === "true",
      location: entry.Location || ""
    })),
    events: (bank.Events || []).map(entry => ({
      id: String(entry.Id ?? ""),
      name: entry.Name || ""
    })),
    switchGroups: (bank.SwitchGroups || []).map(group => ({
      id: String(group.Id ?? ""),
      name: group.Name || "",
      switches: (group.Switches || []).map(entry => ({
        id: String(entry.Id ?? ""),
        name: entry.Name || ""
      }))
    })),
    stateGroups: (bank.StateGroups || []).map(group => ({
      id: String(group.Id ?? ""),
      name: group.Name || "",
      states: (group.States || []).map(entry => ({
        id: String(entry.Id ?? ""),
        name: entry.Name || ""
      }))
    })),
    gameParameters: (bank.GameParameters || []).map(entry => ({
      id: String(entry.Id ?? ""),
      name: entry.Name || ""
    }))
  };
}

/**
 * Build id-keyed lookup tables from SoundbanksInfo.
 *
 * Media ids repeat across language variants of the same bank, so
 * `mediaById[id]` is an array of entries; event ids are unique.
 *
 * @param {Uint8Array|ArrayBuffer|DataView|string|object} input SoundbanksInfo JSON bytes, text, or object.
 * @returns {object} Catalog with banksById, mediaById, eventsById, and eventsByName.
 */
function buildSoundbanksCatalog(input) {
  const parsed = parseSoundbanksInfo(input);
  const catalog = {
    platform: parsed.platform,
    soundBankVersion: parsed.soundBankVersion,
    bankCount: parsed.bankCount,
    mediaCount: parsed.mediaCount,
    eventCount: parsed.eventCount,
    languages: parsed.languages,
    banksById: {},
    bankVariantsById: {},
    mediaById: {},
    eventsById: {},
    eventsByName: {}
  };
  for (const bank of parsed.banks) {
    if (!catalog.banksById[bank.id]) catalog.banksById[bank.id] = bank;
    if (!catalog.bankVariantsById[bank.id]) catalog.bankVariantsById[bank.id] = [];
    catalog.bankVariantsById[bank.id].push(bank);
    for (const entry of bank.media) {
      const reference = {
        ...entry,
        bankId: bank.id,
        bankName: bank.shortName
      };
      if (!catalog.mediaById[entry.id]) catalog.mediaById[entry.id] = [];
      catalog.mediaById[entry.id].push(reference);
    }
    for (const entry of bank.events) {
      const reference = {
        ...entry,
        bankId: bank.id,
        bankName: bank.shortName
      };
      catalog.eventsById[entry.id] = reference;
      catalog.eventsByName[entry.name] = reference;
    }
  }
  return catalog;
}

/**
 * Join a `CjsBnkFormat` inspection result with a SoundbanksInfo catalog.
 *
 * Annotates the bank's embedded media and HIRC event listing with authoring
 * names. Entries with no catalog match keep `null` name fields rather than
 * being dropped, so counts stay aligned with the inspected bank. Language
 * variants of a bank share one bank id; the inspected BKHD `languageId`
 * (an FNV-1 hash of the language name) selects the exact variant.
 *
 * @param {object} bankInfo `CjsBnkFormat` inspect output.
 * @param {object} catalog `buildSoundbanksCatalog` output.
 * @returns {object} Bank/media/event annotations for the inspected bank.
 */
function joinSoundbanksInfo(bankInfo, catalog) {
  const bankId = String(bankInfo.bankId ?? "");
  const variants = catalog.bankVariantsById[bankId] || [];
  const bank = variants.find(variant => wwiseIdFromName(variant.language) === bankInfo.languageId) || catalog.banksById[bankId] || null;
  const bankLanguage = bank ? bank.language : "";
  const media = (bankInfo.media || []).map(entry => {
    const references = catalog.mediaById[String(entry.id)] || [];
    const match = references.find(reference => reference.bankId === bankId && reference.language === bankLanguage) || references.find(reference => reference.bankId === bankId) || references[0] || null;
    return {
      id: entry.id,
      length: entry.length,
      available: entry.available,
      shortName: match ? match.shortName : null,
      cachePath: match ? match.cachePath : null,
      language: match ? match.language : null,
      streaming: match ? match.streaming : null
    };
  });
  const events = (bankInfo.hirc || []).filter(entry => entry.typeName === "event").map(entry => {
    const match = catalog.eventsById[String(entry.id)] || null;
    return {
      id: entry.id,
      name: match ? match.name : null,
      bankName: match ? match.bankName : null
    };
  });
  return {
    bankId,
    bank,
    media,
    namedMediaCount: media.filter(entry => entry.shortName !== null).length,
    events,
    namedEventCount: events.filter(entry => entry.name !== null).length
  };
}
function utf8String(bytes) {
  if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8").decode(bytes);
  let value = "";
  for (let i = 0; i < bytes.length; i++) value += String.fromCharCode(bytes[i]);
  return value;
}

export { buildSoundbanksCatalog, isSoundbanksInfo, joinSoundbanksInfo, parseSoundbanksInfo, toSoundbanksInfoDocument, wwiseIdFromName };
//# sourceMappingURL=soundbanksInfo.js.map
