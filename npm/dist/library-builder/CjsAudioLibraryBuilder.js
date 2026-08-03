import { audioMetadataFromSoundbanksInfo } from '../audioMetadata.js';
import { validateAudioLibraryDocument } from '../library/audioLibraryDocument.js';
import { normalizeSfxGraph, NormalizeStateTransitions } from '../library/sfxGraph.js';
import { CjsBnkFormat } from '@carbonenginejs/runtime-resource/formats/bnk';
import { normalizeBusGraphCatalog } from '../internal/busGraph.js';
import { PARAMETRIC_EQ_PLUGIN_ID, parseStaticParametricEqBytes } from '../internal/busEffects.js';

// Browser-safe audio-library construction. Acquisition remains caller-owned:
// the builder accepts index values, metadata values, and optional injected
// bank-byte/inspection capabilities without discovering files or services.
const MUSIC_BANK_NAMES = Object.freeze(["music.bnk", "music_essential.bnk"]);
const MUSIC_HIRC_TYPES = new Set([10, 11, 12, 13]);
const SFX_PLAY_ACTION = 0x0403;
const SFX_PLAY_EVENT_ACTION = 0x2103;
const SFX_STOP_ACTION_FAMILY = 0x01;
const SFX_PAUSE_ACTION_FAMILY = 0x02;
const SFX_RESUME_ACTION_FAMILY = 0x03;
const SFX_SET_VOICE_PITCH_ACTION_FAMILY = 0x08;
const SFX_RESET_VOICE_PITCH_ACTION_FAMILY = 0x09;
const SFX_SET_VOICE_VOLUME_ACTION_FAMILY = 0x0a;
const SFX_RESET_VOICE_VOLUME_ACTION_FAMILY = 0x0b;
const SFX_SET_BUS_VOLUME_ACTION_FAMILY = 0x0c;
const SFX_RESET_BUS_VOLUME_ACTION_FAMILY = 0x0d;
const SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY = 0x0e;
const SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY = 0x0f;
const SFX_SET_STATE_ACTION_FAMILY = 0x12;
const SFX_SET_GAME_PARAMETER_ACTION_FAMILY = 0x13;
const SFX_RESET_GAME_PARAMETER_ACTION_FAMILY = 0x14;
const SFX_SET_SWITCH_ACTION_FAMILY = 0x19;
const SFX_SET_VOICE_HIGH_PASS_ACTION_FAMILY = 0x20;
const SFX_RESET_VOICE_HIGH_PASS_ACTION_FAMILY = 0x30;
const SFX_VOICE_FILTER_ACTION_FORMS = new Map([[0x02, {
  scope: "global",
  mode: "element"
}], [0x03, {
  scope: "game-object",
  mode: "element"
}], [0x04, {
  scope: "global",
  mode: "all"
}], [0x05, {
  scope: "game-object",
  mode: "all"
}], [0x08, {
  scope: "global",
  mode: "all-except"
}], [0x09, {
  scope: "game-object",
  mode: "all-except"
}]]);
const SFX_BUS_VOLUME_ACTION_FORMS = new Map([[0x0c02, {
  setting: true,
  scope: "global",
  mode: "element"
}], [0x0c03, {
  setting: true,
  scope: "game-object",
  mode: "element"
}], [0x0d02, {
  setting: false,
  scope: "global",
  mode: "element"
}], [0x0d03, {
  setting: false,
  scope: "game-object",
  mode: "element"
}], [0x0d04, {
  setting: false,
  scope: "global",
  mode: "all"
}], [0x0d08, {
  setting: false,
  scope: "global",
  mode: "all-except"
}]]);
const SFX_UNSUPPORTED_PLAY_ACTIONS = new Set([0x0503]);
const SFX_VOLUME_PROPERTY = 0;
const SFX_PITCH_PROPERTY = 1;
const SFX_LOW_PASS_PROPERTY = 2;
const SFX_HIGH_PASS_PROPERTY = 3;
const BUS_VOLUME_RTPC_PROPERTY = 4;
// Wwise v150 AkPropID::MaxNumInstances. This is scheduling policy, not DSP.
const BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY = 53;
const BUS_RTPC_PROPERTIES = new Map([[SFX_VOLUME_PROPERTY, "voice-volume"], [BUS_VOLUME_RTPC_PROPERTY, "bus-volume"]]);
const BUS_PITCH_STATE_PROPERTY = 1;
const BUS_LOW_PASS_STATE_PROPERTY = 2;
const BUS_HIGH_PASS_STATE_PROPERTY = 3;
const BUS_VOLUME_STATE_PROPERTY = 4;
const BUS_STATE_FIELDS = new Map([[BUS_PITCH_STATE_PROPERTY, "pitchCents"], [BUS_LOW_PASS_STATE_PROPERTY, "lowPass"], [BUS_HIGH_PASS_STATE_PROPERTY, "highPass"], [BUS_VOLUME_STATE_PROPERTY, "gainDb"]]);
const DUCK_VOICE_VOLUME_PROPERTY = 0;
const DUCK_BUS_VOLUME_PROPERTY = 4;
const SFX_INITIAL_DELAY_PROPERTY = 34;
const WWISE_PRIORITY_PROPERTY = 0x06;
const WWISE_OUTPUT_BUS_VOLUME_PROPERTY = 0x0d;
const WWISE_USER_AUX_VOLUME_PROPERTY = 0x08;
const WWISE_USER_AUX_LOW_PASS_PROPERTY = 0x10;
const WWISE_USER_AUX_HIGH_PASS_PROPERTY = 0x14;
const WWISE_REFLECTIONS_VOLUME_PROPERTY = 0x1a;
const WWISE_SILENCE_SOURCE_PLUGIN_ID = 0x00650002;
const SFX_ADDITIVE_ACCUMULATION = 2;
const SFX_FILTER_ACCUMULATION = 6;
const SFX_IMMEDIATE_STATE_SYNC = 0;
const AUDIO_LANGUAGE_TAGS = Object.freeze({
  chinese: "zh-cn",
  "chinese(prc)": "zh-cn",
  "english(us)": "en-us",
  "french(france)": "fr-fr",
  german: "de",
  japanese: "ja",
  korean: "ko",
  russian: "ru",
  sfx: "",
  spanish: "es"
});

/**
 * Builds a deterministic schema-v2 audio-library document from caller-supplied
 * values and bank access.
 */
class CjsAudioLibraryBuilder {
  static schema = "carbonenginejs.audioLibrary";
  static schemaVersion = 2;

  /** Normalizes audio rows from index text, a file index, or an iterable. */
  static parseIndexEntries(indexValue) {
    return normalizeIndexEntries(indexValue);
  }

  /** Projects inspected Wwise event edges onto canonical event names. */
  static createEventMediaTable(metadata, bankResults) {
    const namesByID = new Map();
    for (const [name, record] of metadataEntries(metadata?.Events, "Audio metadata Events")) {
      namesByID.set(record.eventID >>> 0, name);
    }
    const table = {};
    for (const result of bankResults) {
      for (const [eventID, wemIDs] of result.eventMedia) {
        const name = namesByID.get(eventID >>> 0);
        if (!name) {
          continue;
        }
        const merged = new Set(table[name] ?? []);
        for (const wemID of wemIDs) {
          merged.add(String(wemID));
        }
        table[name] = [...merged].sort((a, b) => Number(a) - Number(b));
      }
    }
    return table;
  }

  /**
   * Projects exact event-to-media reachability from a validated SFX graph.
   *
   * Every possible authored branch is included. Events absent from the
   * graph are intentionally absent from the result rather than falling back
   * to heuristic container-byte scanning.
   */
  static createSfxEventMediaTable(sfx) {
    return CreateSfxEventMediaTable(sfx);
  }

  /**
   * Resolves event graphs with explicit bank and language precedence.
   *
   * Localized variants share a bank ID and reuse HIRC object IDs. One
   * requested language is therefore selected before graph resolution rather
   * than unioning incompatible event choices. Source-name ordering preserves
   * authored overlay behavior such as music_essential replacing the
   * corresponding base music objects.
   */
  static createEventMediaGraphs(inspections, options = {}) {
    if (!Array.isArray(inspections)) {
      throw new TypeError("Audio event-media construction requires bank inspections");
    }
    const {
      language = "",
      ...graphOptions
    } = options;
    const selected = SelectLanguageInspections(inspections, language);
    return [CjsBnkFormat.wwise.eventMediaFromBanks(selected, graphOptions)];
  }

  /**
   * Projects the conservative v150 Step SFX subset from typed BNK nodes.
   *
   * runtime-resource owns HIRC decoding. This method only names and lowers
   * codec sounds, Step Random/Sequence, Step Switch/State containers, and
   * supported non-continuous Layer containers and crossfades. It also returns a sparse
   * event-metadata projection after resolving NodeBase positioning through
   * hierarchy-only Actor-Mixers. Unsupported events are omitted whole and
   * described in diagnostics; unresolved spatial inheritance omits only
   * that metadata projection.
   */
  static createSfxGraph({
    inspections,
    metadata,
    soundbanksInfo = null,
    enrichment = null,
    media = {},
    embeddedMedia = {},
    buses = null
  } = {}) {
    if (!Array.isArray(inspections)) {
      throw new TypeError("Audio SFX construction requires bank inspections");
    }
    const parsed = CjsBnkFormat.wwise.sfxNodesFromBanks(inspections);
    const parsedEffects = CjsBnkFormat.wwise.effectNodesFromBanks(inspections);
    const eventNames = new Map();
    for (const [name, record] of metadataEntries(metadata?.Events, "Audio metadata Events")) {
      eventNames.set(Number(record.eventID) >>> 0, name);
    }
    return LowerSfxGraph({
      parsed,
      effects: parsedEffects.effects,
      buses,
      eventNames,
      musicNodeIds: new Set(inspections.flatMap(inspection => (inspection.hirc ?? []).filter(entry => MUSIC_HIRC_TYPES.has(entry.type)).map(entry => Number(entry.id) >>> 0))),
      names: CreateSfxNameCatalog(soundbanksInfo, enrichment, inspections),
      media,
      embeddedMedia
    });
  }

  /**
   * Builds the dynamic-music section from already inspected BNK files.
   *
   * Inspections must carry their source bank name. The format package owns
   * all HIRC payload decoding; this method only validates and projects the
   * parsed graph into the audio-library contract.
   */
  static createMusicGraph({
    inspections,
    eventInspections = inspections,
    metadata,
    soundbanksInfo = null,
    enrichment = null,
    media = {},
    embeddedMedia = {},
    musicBankNames = MUSIC_BANK_NAMES,
    buses = null
  } = {}) {
    if (!Array.isArray(inspections)) {
      throw new TypeError("Audio music construction requires bank inspections");
    }
    if (!Array.isArray(eventInspections)) {
      throw new TypeError("Audio music event construction requires bank inspections");
    }
    const byName = new Map();
    for (const inspection of inspections) {
      const name = bankSourceName(inspection?.source);
      if (!name) {
        throw new TypeError("Audio bank inspection is missing its source name");
      }
      if (byName.has(name)) {
        throw new TypeError(`Duplicate audio bank inspection source: ${name}`);
      }
      byName.set(name, inspection);
    }
    const requiredNames = musicBankNames.map(bankSourceName);
    for (const name of requiredNames) {
      if (!byName.has(name)) {
        throw new Error(`Music construction requires inspected bank: ${name}`);
      }
    }
    const musicInspections = musicBankNames.map(name => byName.get(bankSourceName(name)));
    const musicEntries = musicInspections.flatMap(inspection => (inspection.hirc ?? []).filter(entry => MUSIC_HIRC_TYPES.has(entry.type)));
    const musicEntryCount = musicEntries.length;
    const uniqueMusicEntryCount = new Set(musicEntries.map(entry => entry.id >>> 0)).size;
    let parsed;
    try {
      // Authored duplicate IDs are resolved in bank order. The essential
      // bank is intentionally later and therefore replaces the base
      // definition, matching Wwise loading and the transitional builder.
      parsed = CjsBnkFormat.wwise.musicNodesFromBanks(musicInspections);
    } catch (cause) {
      throw new Error("Music-node parsing failed", {
        cause
      });
    }
    if (parsed.diagnostics.failed.length) {
      const details = parsed.diagnostics.failed.map(failure => `${failure.bank}:${failure.type}:${failure.id}`).join(", ");
      throw new Error(`Music-node parsing failed: ${details}`);
    }
    if (parsed.diagnostics.parsed !== musicEntryCount || parsed.nodes.size !== uniqueMusicEntryCount) {
      throw new Error("Music-node parsing did not preserve every authored entry");
    }
    const names = CreateSfxNameCatalog(soundbanksInfo, enrichment, eventInspections);
    const nodes = {};
    for (const [id, value] of [...parsed.nodes.entries()].sort(([left], [right]) => left - right)) {
      const {
        id: parsedID,
        nodeBase,
        ...node
      } = value;
      if (parsedID >>> 0 !== id >>> 0) {
        throw new Error(`Music-node identity mismatch: ${parsedID} !== ${id}`);
      }
      const routing = node.type === "music-track" ? CreateMusicBusRouting(parsed.nodes, id, buses) : null;
      const rtpcCurves = node.type === "music-track" ? CreateMusicRtpcCurves(nodeBase, names) : [];
      nodes[id] = {
        ...node,
        ...(routing ?? {}),
        ...(rtpcCurves.length ? {
          rtpcCurves
        } : {})
      };
    }
    validateMusicNodeReferences(nodes, media, embeddedMedia);
    const eventProjection = this.createMusicEventProjection({
      inspections: eventInspections,
      metadata,
      nodes
    });
    return {
      schemaVersion: 1,
      generator: "@carbonenginejs/runtime-audio/library-builder",
      banks: musicBankNames.map(bankSourceName),
      nodes,
      ...eventProjection
    };
  }

  /**
   * Projects typed Wwise actions from every selected bank onto music nodes.
   *
   * Music events are identified by their authored targets and argument
   * groups, not by a bank location or event-name convention.
   */
  static createMusicEventProjection({
    inspections,
    metadata,
    nodes
  } = {}) {
    if (!Array.isArray(inspections)) {
      throw new TypeError("Audio music event projection requires bank inspections");
    }
    if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) {
      throw new TypeError("Audio music event projection requires music nodes");
    }
    return createMusicEventProjection(inspections, metadata, nodes);
  }

  /** Classifies embedded media by its four-byte container magic. */
  static mediaTypeFromMagic(bytes, offset = 0) {
    const value = toUint8Array(bytes);
    const at = Number(offset);
    if (!Number.isSafeInteger(at) || at < 0 || at + 4 > value.byteLength) {
      return "unknown";
    }
    const magic = String.fromCharCode(value[at], value[at + 1], value[at + 2], value[at + 3]);
    if (magic === "RIFF" || magic === "RIFX") {
      return "wem";
    }
    if (magic === "MIDI") {
      return "midi";
    }
    if (magic === "PLUG") {
      return "plugin";
    }
    return "unknown";
  }

  /** Applies additive audio metadata enrichment over a built library. */
  static applyEnrichment(library, enrichment) {
    if (!library || typeof library !== "object" || Array.isArray(library)) {
      throw new TypeError("Audio-library enrichment requires a library object");
    }
    const metadata = createAudioMetadata({
      metadata: library.metadata,
      enrichment
    });
    const result = {
      ...library,
      metadata: sortedKeys({
        Events: sortedKeys(metadata.Events),
        SoundBanks: sortedKeys(metadata.SoundBanks),
        WemFileIDs: sortedKeys(metadata.WemFileIDs)
      })
    };
    if (enrichment?.sfx) {
      result.sfx = normalizeSfxGraph(enrichment.sfx, library.media ?? {}, library.embeddedMedia ?? {});
    }
    validateAudioLibraryDocument(result);
    return result;
  }

  /**
   * Builds a complete library by reading every indexed bank through one
   * caller-supplied capability. The capability may delegate acquisition and
   * inspection to workers; this class never discovers a network endpoint.
   */
  static async buildFromBanks(options = {}) {
    const loadBank = normalizeBankLoader(options);
    const inspectBank = options.inspectBank ?? defaultInspectBank;
    const eventMediaLanguage = normalizeEventMediaLanguage(options.language ?? "en-us");
    const includeMusic = options.music === true;
    const includeSfx = options.includeSfx === true;
    const signal = options.signal ?? null;
    if (includeSfx && (options.sfx || options.enrichment?.sfx)) {
      throw new TypeError("Audio SFX construction cannot combine includeSfx with a supplied sfx graph");
    }
    if (options.onSfxDiagnostics !== undefined && typeof options.onSfxDiagnostics !== "function") {
      throw new TypeError("Audio onSfxDiagnostics must be a function");
    }
    const preliminaryOptions = {
      ...options,
      sfx: null,
      music: null,
      enrichment: options.enrichment ? {
        ...options.enrichment,
        sfx: null
      } : options.enrichment
    };
    let library = this.build(preliminaryOptions);
    if (typeof inspectBank !== "function") {
      throw new TypeError("Audio inspectBank must be a function");
    }
    requireMusicBanks(library, includeMusic);
    const inspections = [];
    const bankIdentities = {};
    const embeddedMedia = {};
    for (const [sourceID, bank] of Object.entries(library.banks)) {
      throwIfAborted(signal);
      let loaded;
      try {
        loaded = await loadBank(bank, {
          sourceID,
          signal
        });
      } catch (cause) {
        throw new Error(`Unable to load audio bank ${sourceID}: ${bank.resPath}`, {
          cause
        });
      }
      throwIfAborted(signal);
      const source = bankSourceName(bank.resPath);
      const prepared = normalizeLoadedBank(loaded, sourceID);
      const inspection = prepared.inspection ?? (await inspectBank(prepared.bytes, {
        bank,
        source,
        sourceID,
        signal
      }));
      const compact = compactBankInspection(inspection, source, bank);
      const inspectedSourceID = `${compact.bankId}:${compact.languageId}`;
      bankIdentities[bank.resPath.toLowerCase()] = {
        bankID: compact.bankId,
        languageID: compact.languageId
      };
      inspections.push(compact);
      for (const record of compact.media) {
        const id = String(record.id);
        if (!record.available || library.media[id]) {
          continue;
        }
        const mediaType = record.mediaType ?? (prepared.bytes ? this.mediaTypeFromMagic(prepared.bytes, record.absoluteOffset) : "unknown");
        addSourceRecord(embeddedMedia, id, {
          sourceID: `embedded:${id}:${inspectedSourceID}`,
          bank: inspectedSourceID,
          offset: record.absoluteOffset,
          byteLength: record.length,
          language: bank.language,
          mediaType
        });
      }
    }
    const graphInspections = SelectLanguageInspections(inspections, eventMediaLanguage);
    const busCatalog = includeSfx || includeMusic ? CreateTypedBusCatalog(graphInspections) : null;
    const busNames = busCatalog ? CreateSfxNameCatalog(options.soundbanksInfo, options.enrichment, graphInspections) : null;
    const busRtpcs = busCatalog ? CreateBusRtpcCatalog(busCatalog, busNames) : null;
    const musicBusIds = includeMusic && busCatalog ? CreateMusicRouteBusIds(inspections.filter(inspection => MUSIC_BANK_NAMES.includes(bankSourceName(inspection.source))), busCatalog) : new Set();
    const sfxBusIds = includeSfx && busCatalog ? CreateSfxRouteBusIds(graphInspections, busCatalog) : new Set();
    const routedBusIds = new Set([...sfxBusIds, ...musicBusIds]);
    const busStates = busCatalog ? CreateBusStateCatalog(busCatalog, busNames, musicBusIds) : null;
    const busDucking = busCatalog ? CreateBusDuckingCatalog(busCatalog) : null;
    const busEffects = busCatalog ? CreateBusEffectCatalog(graphInspections, busCatalog, routedBusIds) : null;
    const busGraph = busCatalog && routedBusIds.size ? CreateBusGraphCatalog(graphInspections, includeMusic ? inspections.filter(inspection => MUSIC_BANK_NAMES.includes(bankSourceName(inspection.source))) : [], busCatalog) : null;
    let eventMedia = {};
    if (!includeSfx) {
      const merged = this.createEventMediaGraphs(graphInspections, {
        knownWemIds: Object.keys(library.media),
        language: eventMediaLanguage
      });
      eventMedia = this.createEventMediaTable(library.metadata, merged);
    }
    const completeOptions = {
      ...options,
      music: includeMusic || options.music === false ? null : options.music,
      bankIdentities,
      eventMedia,
      eventMediaLanguage,
      embeddedMedia,
      busRtpcs,
      busStates,
      busDucking,
      busEffects,
      busGraph
    };
    let assembledOptions = completeOptions;
    library = this.build(assembledOptions);
    if (includeSfx) {
      const sfx = this.createSfxGraph({
        inspections: graphInspections,
        metadata: library.metadata,
        soundbanksInfo: options.soundbanksInfo,
        enrichment: options.enrichment,
        media: library.media,
        embeddedMedia: library.embeddedMedia ?? {},
        buses: busCatalog
      });
      options.onSfxDiagnostics?.(sfx.diagnostics);
      if (Object.keys(sfx.events).length || Object.keys(sfx.programs).length) {
        assembledOptions = {
          ...assembledOptions,
          bankProjection: sfx.metadataProjection,
          eventMedia: this.createSfxEventMediaTable(sfx),
          sfx
        };
        library = this.build(assembledOptions);
      }
    }
    if (includeMusic) {
      const music = this.createMusicGraph({
        inspections: inspections.filter(inspection => MUSIC_BANK_NAMES.includes(bankSourceName(inspection.source))),
        eventInspections: graphInspections,
        metadata: library.metadata,
        soundbanksInfo: options.soundbanksInfo,
        enrichment: options.enrichment,
        media: library.media,
        embeddedMedia: library.embeddedMedia ?? {},
        buses: busCatalog
      });
      assembledOptions = {
        ...assembledOptions,
        music
      };
      library = this.build(assembledOptions);
    }
    return library;
  }

  /** Builds a deterministic source catalog without opening bank bytes. */
  static build(options = {}) {
    const {
      indexEntries = [],
      metadata: metadataInput = null,
      soundbanksInfo,
      bankProjection = null,
      enrichment = null,
      eventMedia = null,
      eventMediaLanguage = null,
      embeddedMedia = null,
      bankIdentities = null,
      sfx: sfxInput = null,
      music = null,
      busRtpcs = null,
      busStates = null,
      busDucking = null,
      busEffects = null,
      busGraph = null,
      sourceTarget = null,
      sourceGame = null,
      sourceProvider = null,
      sourceBuild = null,
      generatedAt = null
    } = options;
    const source = normalizeSourceIdentity({
      target: sourceTarget,
      game: sourceGame,
      provider: sourceProvider,
      build: sourceBuild
    });
    const entries = normalizeIndexEntries(indexEntries);
    const metadata = createAudioMetadata({
      metadata: metadataInput,
      soundbanksInfo,
      bankProjection,
      enrichment
    });
    const sfx = sfxInput ?? enrichment?.sfx ?? null;
    const authoredBanks = createAuthoredBankCatalog(soundbanksInfo, metadata);
    const media = {};
    const banks = createBankTable(entries, authoredBanks, bankIdentities);
    for (const entry of entries) {
      const lower = entry.logicalPath.toLowerCase();
      const base = lower.split("/").pop();
      if (base.endsWith(".wem")) {
        const id = base.slice(0, -4);
        addSourceRecord(media, id, {
          resPath: entry.logicalPath,
          storagePath: entry.storagePath,
          byteLength: entry.byteLength,
          checksum: entry.checksum,
          essential: lower.includes("/essential_media/"),
          language: languageSegment(lower)
        });
      }
    }
    const library = {
      schema: this.schema,
      schemaVersion: this.schemaVersion,
      metadata: sortedKeys({
        Events: sortedKeys(metadata.Events),
        SoundBanks: sortedKeys(metadata.SoundBanks),
        WemFileIDs: sortedKeys(metadata.WemFileIDs)
      }),
      media: normalizeSourceTable(media),
      banks: sortedKeys(banks)
    };
    if (eventMedia && Object.keys(eventMedia).length) {
      library.eventMedia = sortedKeys(eventMedia);
      library.eventMediaLanguage = eventMediaLanguage === null ? "" : String(eventMediaLanguage);
    }
    if (embeddedMedia && Object.keys(embeddedMedia).length) {
      library.embeddedMedia = normalizeSourceTable(embeddedMedia);
    }
    if (sfx !== null) {
      library.sfx = normalizeSfxGraph(sfx, library.media, library.embeddedMedia ?? {});
    }
    if (music !== null) {
      validateMusicGraph(music, library.media, library.embeddedMedia ?? {});
      library.music = normalizeMusicGraph(music);
    }
    if (busRtpcs !== null && Object.keys(busRtpcs.buses ?? {}).length) {
      library.busRtpcs = NormalizeBusRtpcCatalog(busRtpcs);
    }
    if (busStates !== null && Object.keys(busStates.buses ?? {}).length) {
      library.busStates = NormalizeBusStateCatalog(busStates);
    }
    if (busDucking !== null && Object.keys(busDucking.sources ?? {}).length) {
      library.busDucking = NormalizeBusDuckingCatalog(busDucking);
    }
    if (busEffects !== null && Object.keys(busEffects.buses ?? {}).length) {
      library.busEffects = NormalizeBusEffectCatalog(busEffects);
    }
    if (busGraph !== null && Object.keys(busGraph.buses ?? {}).length) {
      library.busGraph = normalizeBusGraphCatalog(MarkBusGraphVolumeActionControls(busGraph, library.sfx), library.embeddedMedia ?? {});
    }
    if (source) {
      library.sourceTarget = source.target;
      library.sourceGame = source.game;
      library.sourceProvider = source.provider;
      library.sourceBuild = source.build;
    }
    if (generatedAt !== null) {
      library.generatedAt = String(generatedAt);
    }
    validateAudioLibraryDocument(library);
    return library;
  }
}
function MarkBusGraphVolumeActionControls(busGraph, sfx) {
  const buses = Object.fromEntries(Object.entries(busGraph.buses ?? {}).map(([busId, bus]) => [busId, {
    ...bus
  }]));
  const busIds = Object.keys(buses);
  for (const actions of Object.values(sfx?.programs ?? {})) {
    for (const action of actions) {
      if (action?.kind !== "set-bus-volume" && action?.kind !== "reset-bus-volume") {
        continue;
      }
      const excluded = new Set((action.exceptions ?? []).map(value => String(value.targetId)));
      const targets = action.mode === "element" ? [String(action.targetId)] : busIds.filter(busId => action.mode !== "all-except" || !excluded.has(busId));
      for (const busId of targets) {
        if (!buses[busId]) continue;
        buses[busId].busVolumeActionControlled = true;
        if (action.kind !== "set-bus-volume") continue;
        const maximum = Number(action.busVolumeDb) + Number(action.busVolumeRangeDb?.max ?? 0);
        const mayIncrease = action.valueMode === "absolute" || !Number.isFinite(maximum) || maximum > 0;
        if (mayIncrease) buses[busId].busVolumeMayIncrease = true;
      }
    }
  }
  return {
    ...busGraph,
    buses
  };
}
function LowerSfxGraph({
  parsed,
  effects,
  buses,
  eventNames,
  musicNodeIds,
  names,
  media,
  embeddedMedia
}) {
  const nodes = {};
  const events = {};
  const programs = {};
  const lowered = new Map();
  const leavesByNode = new Map();
  const containsContinuousByNode = new Map();
  const containsNonSwitchContinuousByNode = new Map();
  const neverCompletesByNode = new Map();
  const leavesByEvent = new Map();
  const stopTargetsByEvent = new Map();
  const active = new Set();
  const crossfadeFiniteSounds = new Set();
  const omittedEvents = [];
  const usedIDs = new Set([...parsed.nodes.keys()].map(value => String(value >>> 0)));
  let syntheticID = 0xffffffff;
  const allocate = node => {
    while (syntheticID > 0 && usedIDs.has(String(syntheticID))) {
      syntheticID--;
    }
    if (syntheticID === 0) {
      throw new Error("Audio SFX construction exhausted node identities");
    }
    const id = String(syntheticID--);
    usedIDs.add(id);
    nodes[id] = node;
    return id;
  };
  const aggregate = childIDs => {
    if (!childIDs.length) {
      return allocate({
        type: "silence"
      });
    }
    if (childIDs.length === 1) {
      return childIDs[0];
    }
    return allocate({
      type: "parallel",
      children: childIDs.map(nodeId => ({
        nodeId
      }))
    });
  };
  const aggregateRoots = (roots, force = false) => {
    if (roots.length === 1 && !force) {
      return roots[0];
    }
    return {
      nodeId: allocate({
        type: "parallel",
        children: roots
      })
    };
  };
  const qualifyCrossfadeChildren = (rawIDs, containerID) => {
    const pending = [...rawIDs];
    const visited = new Set();
    const qualifiedSounds = new Set();
    while (pending.length) {
      const rawID = pending.pop();
      const id = Number(rawID) >>> 0;
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);
      const source = parsed.nodes.get(id);
      if (!source) {
        throw new Error(`missing typed node ${id}`);
      }
      if (source.type === "switch" || source.type === "layer") {
        throw new Error(`crossfade container ${containerID} reaches ` + `${source.type} ${id}`);
      }
      if ((source.type === "random" || source.type === "sequence") && source.continuous) {
        throw new Error(`nested continuous container ${id}`);
      }
      if (source.type === "sound" && parsed.nodeBases?.get(id)?.loopCount === 0) {
        throw new Error(`crossfade container ${containerID} reaches ` + `infinite sound ${id}`);
      }
      if (source.type === "sound") {
        qualifiedSounds.add(String(id));
      }
      for (const childID of source.children ?? []) {
        pending.push(childID);
      }
    }
    for (const key of qualifiedSounds) {
      crossfadeFiniteSounds.add(key);
      if (nodes[key]?.type === "sound" && nodes[key].loop === undefined) {
        nodes[key].loop = false;
      }
    }
  };
  const lower = rawID => {
    const id = String(Number(rawID) >>> 0);
    if (lowered.has(id)) {
      return lowered.get(id);
    }
    if (active.has(id)) {
      throw new Error(`cycle at node ${id}`);
    }
    const source = parsed.nodes.get(Number(id));
    if (!source) {
      throw new Error(`missing typed node ${id}`);
    }
    active.add(id);
    try {
      let node;
      let neverCompletes = false;
      const leaves = new Set();
      let childContainsContinuous = false;
      let childContainsNonSwitchContinuous = false;
      const lowerChild = childID => {
        const loweredID = lower(childID);
        const childKey = String(Number(childID) >>> 0);
        AddSet(leaves, leavesByNode.get(childKey));
        childContainsContinuous ||= Boolean(containsContinuousByNode.get(childKey));
        childContainsNonSwitchContinuous ||= Boolean(containsNonSwitchContinuousByNode.get(childKey));
        return loweredID;
      };
      if (source.type === "sound") {
        const mediaID = String(source.sourceId >>> 0);
        const loopCount = parsed.nodeBases?.get(Number(id))?.loopCount;
        const matchIds = CreateSfxMatchIds(parsed, id);
        const routing = CreateSfxBusRouting(parsed, id, buses);
        if (source.pluginType === 1 && !media[mediaID] && !embeddedMedia[mediaID]) {
          throw new Error(`sound ${id} references unavailable media ${mediaID}`);
        }
        const identity = {
          ...(matchIds.length > 1 ? {
            matchIds
          } : {}),
          ...(routing ?? {})
        };
        if (source.pluginType === 1) {
          node = {
            type: "sound",
            mediaId: mediaID,
            ...identity,
            ...CreateSfxSoundEffectProjection(parsed, effects, id),
            ...(loopCount === 0 ? {
              loop: true
            } : Number.isSafeInteger(loopCount) && loopCount > 0 ? {
              loop: false,
              playCount: loopCount
            } : crossfadeFiniteSounds.has(id) ? {
              loop: false
            } : {})
          };
          neverCompletes = node.loop === true;
        } else if (source.pluginType === 2 && source.pluginId === WWISE_SILENCE_SOURCE_PLUGIN_ID) {
          if (loopCount !== null && loopCount !== undefined) {
            throw new Error(`looping silence source ${id}`);
          }
          node = {
            type: "timed-silence",
            durationMs: ParseStaticWwiseSilenceDuration(effects, source, id),
            ...identity
          };
        } else {
          throw new Error(`source plug-in sound ${id}`);
        }
        leaves.add(Number(id) >>> 0);
      } else if (source.type === "random" || source.type === "sequence") {
        if (source.restartBackward) {
          throw new Error(`reverse sequence ${id}`);
        }
        if (source.continuous && (source.loopModMin !== 0 || source.loopModMax !== 0)) {
          throw new Error(`randomized continuous loop count ${id}`);
        }
        if (source.continuous && source.loopCount > 32767) {
          throw new Error(`continuous loop count exceeds 32767 at ${id}`);
        }
        if (source.continuous && source.transitionMode !== 0 && source.transitionMode !== 1 && source.transitionMode !== 2 && source.transitionMode !== 3 && source.transitionMode !== 5) {
          throw new Error(`unsupported continuous transition ${source.transitionMode} at ${id}`);
        }
        if (source.continuous && (source.transitionMode === 1 || source.transitionMode === 2)) {
          qualifyCrossfadeChildren(source.playlist.length ? source.playlist.map(item => item.playId) : source.children, id);
        }
        if (source.continuous && source.transitionMode === 5 && source.transitionTime + source.transitionTimeModMin < 21) {
          throw new Error(`continuous trigger rate below 21ms at ${id}`);
        }
        const playlist = source.playlist.length ? source.playlist : source.children.map(playId => ({
          playId,
          weight: 1
        }));
        const children = [];
        for (const item of playlist) {
          if (source.type === "random" && source.usingWeight && item.weight <= 0) {
            continue;
          }
          children.push({
            nodeId: lowerChild(item.playId),
            ...(source.type === "random" && source.usingWeight ? {
              weight: item.weight
            } : {})
          });
        }
        if (!children.length) {
          throw new Error(`empty ${source.type} ${id}`);
        }
        // A Continuous Random cannot reach another selection when
        // every candidate is infinite. Wwiser applies the same
        // all-looping-children reduction: retain the one authored
        // Random choice and let its selected child own the only live
        // Continuous clock.
        const absorbsInfiniteChildren = source.type === "random" && source.continuous && source.loopCount === 0 && source.transitionMode === 0 && childContainsContinuous && children.every(child => neverCompletesByNode.get(String(child.nodeId)) === true);
        const nestedChild = children.length === 1 ? nodes[String(children[0].nodeId)] : null;
        // Wwise hangar warnings use one bounded nested clock: an
        // infinite outer Sequence waits after physical completion of
        // a finite, reset-on-play Trigger Rate Sequence. Keeping this
        // qualification structural prevents deeper or mixed nested
        // schedulers from entering the runtime accidentally.
        const supportsNestedTriggerRateDelay = source.type === "sequence" && source.continuous && source.loopCount === 0 && source.transitionMode === 3 && Object.keys(children[0]).length === 1 && nestedChild?.type === "sequence" && Object.keys(nestedChild).every(key => ["type", "scope", "children", "continuous"].includes(key)) && nestedChild.continuous?.loopCount === 1 && nestedChild.continuous.transition === "trigger-rate" && nestedChild.continuous.resetPlaylistEachPlay !== false && nestedChild.children.every(child => !containsContinuousByNode.get(String(child.nodeId)));
        // Jita's level-three incidental branch uses the second
        // bounded form: an infinite single-child Random/Delay around
        // a two-choice amplitude-Crossfade Sequence. Admit only its
        // static inner playback terms; dynamic terms would need to be
        // resampled each time the parent replays the child.
        const supportsNestedCrossfadeDelay = source.type === "random" && source.continuous && source.loopCount === 0 && source.transitionMode === 3 && source.randomMode === 0 && source.resetPlaylistEachPlay && Object.keys(children[0]).length === 1 && nestedChild?.type === "sequence" && Object.keys(nestedChild).every(key => ["type", "scope", "children", "continuous", "gainDb", "pitchCents", "lowPass", "highPass", "initialDelayMs"].includes(key)) && nestedChild.children.length === 2 && nestedChild.continuous?.loopCount === 1 && nestedChild.continuous.transition === "crossfade-amplitude" && nestedChild.continuous.resetPlaylistEachPlay === false && nestedChild.children.every(child => !containsContinuousByNode.get(String(child.nodeId)));
        if (source.continuous && childContainsContinuous && !absorbsInfiniteChildren && !supportsNestedTriggerRateDelay && !supportsNestedCrossfadeDelay) {
          throw new Error(`nested continuous container ${id}`);
        }
        neverCompletes = absorbsInfiniteChildren || source.continuous && source.loopCount === 0;
        node = {
          type: source.type,
          // Wwise applies Continuous playback per game object even
          // when the serialized container scope flag is global.
          scope: source.continuous ? "object" : source.global ? "global" : "object",
          children,
          ...(source.type === "random" ? {
            mode: source.randomMode === 1 ? "shuffle" : "random",
            avoidRepeat: source.avoidRepeatCount
          } : {}),
          ...(source.continuous && !absorbsInfiniteChildren ? {
            continuous: {
              loopCount: source.loopCount,
              transition: source.transitionMode === 1 ? "crossfade-amplitude" : source.transitionMode === 2 ? "crossfade-power" : source.transitionMode === 3 ? "delay" : source.transitionMode === 5 ? "trigger-rate" : "disabled",
              ...(source.transitionMode === 1 || source.transitionMode === 2 || source.transitionMode === 3 || source.transitionMode === 5 ? {
                transitionMs: source.transitionTime,
                ...(source.transitionTimeModMin !== 0 || source.transitionTimeModMax !== 0 ? {
                  transitionRangeMs: {
                    min: source.transitionTimeModMin,
                    max: source.transitionTimeModMax
                  }
                } : {})
              } : {}),
              ...(source.type === "sequence" ? {
                resetPlaylistEachPlay: source.resetPlaylistEachPlay
              } : {})
            }
          } : {})
        };
      } else if (source.type === "switch") {
        if (source.continuousValidation && source.parameters.some(parameter => parameter.firstOnly || parameter.continuePlayback || parameter.onSwitchMode !== 1)) {
          throw new Error(`unsupported continuous switch ${id}`);
        }
        // Step switches choose once per post, so their default Stop
        // mode is dormant; only live-continuation flags or fades
        // require the unsupported continuous-switch scheduler.
        if (!source.continuousValidation && source.parameters.some(parameter => parameter.firstOnly || parameter.continuePlayback || parameter.fadeOutMs !== 0 || parameter.fadeInMs !== 0)) {
          throw new Error(`transitioned switch ${id}`);
        }
        const scope = source.groupType === 1 ? "state" : "switch";
        const group = names.groups.get(`${scope}:${source.groupId}`);
        if (!group?.name) {
          throw new Error(`unnamed ${scope} group ${source.groupId}`);
        }
        const cases = {};
        let defaultChild = null;
        const transitions = {};
        const parameters = new Map(source.parameters.map(parameter => [Number(parameter.childId) >>> 0, parameter]));
        for (const assignment of source.assignments) {
          const valueName = group.values.get(assignment.valueId);
          if (!valueName) {
            throw new Error(`unnamed ${scope} value ${assignment.valueId}`);
          }
          const childIDs = assignment.childIds.map(childID => {
            const child = lowerChild(childID);
            if (source.continuousValidation) {
              const parameter = parameters.get(Number(childID) >>> 0);
              if (!parameter) {
                throw new Error(`missing continuous switch parameter ${childID} at ${id}`);
              }
              transitions[child] = {
                fadeOutMs: parameter.fadeOutMs,
                fadeInMs: parameter.fadeInMs
              };
            }
            return child;
          });
          const child = aggregate(childIDs);
          cases[valueName] = {
            nodeId: child
          };
          if (assignment.valueId === source.defaultValueId) {
            defaultChild = child;
          }
        }
        if (!Object.keys(cases).length) {
          throw new Error(`empty switch ${id}`);
        }
        if (defaultChild === null) {
          defaultChild = aggregate([]);
        }
        if (source.continuousValidation && childContainsNonSwitchContinuous) {
          throw new Error(`nested non-switch continuous container ${id}`);
        }
        node = {
          type: "switch",
          scope,
          group: group.name,
          cases,
          default: {
            nodeId: defaultChild
          },
          ...(source.continuousValidation ? {
            continuous: {
              transitions
            }
          } : {})
        };
      } else if (source.type === "layer") {
        // A Layer record only controls children named by its explicit
        // association list. With no associations there is no live
        // child-admission region to validate, so the children retain
        // their ordinary parallel lifetime. Keep associated
        // RTPC-driven Continuous Layers fail-closed until their child
        // admission and boundary semantics are implemented.
        if (source.continuousValidation && source.layers.some(layer => layer.associations.length)) {
          throw new Error(`continuous layer ${id}`);
        }
        const children = source.children.map(nodeId => ({
          nodeId: lowerChild(nodeId)
        }));
        const childByID = new Map(source.children.map((childID, index) => [Number(childID) >>> 0, children[index]]));
        let curveCount = 0;
        for (const layer of source.layers) {
          const associations = layer.associations;
          if (!associations.length) {
            continue;
          }
          if (layer.controlType !== 0 && associations.some(association => association.points.length)) {
            throw new Error(`unsupported layer control type ${layer.controlType}`);
          }
          const parameter = associations.some(association => association.points.length) ? names.parameters.get(Number(layer.controlId) >>> 0) : null;
          if (associations.some(association => association.points.length) && !parameter) {
            throw new Error(`unnamed game parameter ${layer.controlId}`);
          }
          for (const association of associations) {
            const child = childByID.get(Number(association.childId) >>> 0);
            if (!child) {
              throw new Error(`missing layer child ${association.childId}`);
            }
            if (association.points.length) {
              const points = association.points.map(point => {
                if (point.to < 0 || point.to > 1) {
                  throw new Error(`invalid layer gain ${point.to}`);
                }
                return {
                  x: point.from,
                  gain: point.to,
                  interpolation: point.interpolation
                };
              });
              (child.gainCurves ??= []).push({
                rtpc: parameter,
                scope: "object",
                points
              });
              curveCount++;
            }
            for (const rtpc of layer.initialRtpcs) {
              const curve = CreateSfxRtpcCurve(rtpc, names);
              if (!curve) {
                throw new Error("unsupported layer RTPC property " + `${rtpc.parameterId}`);
              }
              (child.rtpcCurves ??= []).push(curve);
            }
          }
        }
        if (!children.length) {
          throw new Error(`empty layer ${id}`);
        }
        node = {
          type: curveCount ? "blend" : "parallel",
          children
        };
      } else {
        throw new Error(`unsupported node type ${source.type}`);
      }
      Object.assign(node, CreateSfxNodeBasePlaybackProjection(parsed, id, names), source.type === "sound" ? CreateSfxSoundVoiceLimitProjection(parsed, id, buses) : {});
      nodes[id] = node;
      lowered.set(id, id);
      leavesByNode.set(id, leaves);
      containsContinuousByNode.set(id, childContainsContinuous || node.continuous !== undefined);
      containsNonSwitchContinuousByNode.set(id, childContainsNonSwitchContinuous || node.continuous !== undefined && node.type !== "switch");
      neverCompletesByNode.set(id, neverCompletes);
      return id;
    } finally {
      active.delete(id);
    }
  };
  const loweredEvents = new Map();
  const activeEvents = new Set();
  const lowerEvent = rawID => {
    const eventID = Number(rawID) >>> 0;
    if (loweredEvents.has(eventID)) {
      return loweredEvents.get(eventID);
    }
    if (activeEvents.has(eventID)) {
      throw new Error(`Play-Event cycle at event ${eventID}`);
    }
    const event = parsed.events.get(eventID);
    if (!event) {
      throw new Error(`missing Play-Event target ${eventID}`);
    }
    const result = {
      roots: [],
      leaves: new Set(),
      stopTargets: new Set(),
      setters: [],
      program: [],
      unsupportedActions: []
    };
    activeEvents.add(eventID);
    try {
      for (const actionID of event.actionIds) {
        const action = parsed.actions.get(actionID);
        if (!action) {
          throw new Error(`missing action ${actionID}`);
        }
        if (SFX_UNSUPPORTED_PLAY_ACTIONS.has(action.actionType)) {
          throw new Error(`unsupported play action 0x${action.actionType.toString(16)}`);
        }
        if (action.actionType === SFX_PLAY_ACTION) {
          if (musicNodeIds.has(Number(action.targetId) >>> 0)) {
            continue;
          }
          const child = ReadSfxPlayActionChild({
            nodeId: lower(action.targetId)
          }, action, true);
          result.roots.push(child);
          result.program.push({
            kind: "play",
            child
          });
          AddSet(result.leaves, leavesByNode.get(String(Number(action.targetId) >>> 0)));
        } else if (action.actionType === SFX_PLAY_EVENT_ACTION) {
          const nested = lowerEvent(action.targetId);
          const hasTiming = HasSfxPlayActionTiming(action, false);
          if (hasTiming && nested.program.some(value => value.kind !== "play")) {
            throw new Error(`scheduled Play-Event ${action.id} targets non-play actions`);
          }
          const actionChild = ReadSfxPlayActionChild(nested.roots.length ? aggregateRoots(nested.roots, hasTiming) : null, action, false);
          if (actionChild) {
            result.roots.push(actionChild);
          }
          if (hasTiming) {
            if (actionChild) {
              result.program.push({
                kind: "play",
                child: actionChild
              });
            }
          } else {
            result.program.push(...nested.program);
          }
          AddSet(result.leaves, nested.leaves);
          AddSet(result.stopTargets, nested.stopTargets);
          result.setters.push(...nested.setters);
          result.unsupportedActions.push(...nested.unsupportedActions);
        } else if ([SFX_STOP_ACTION_FAMILY, SFX_PAUSE_ACTION_FAMILY, SFX_RESUME_ACTION_FAMILY].includes(action.actionType >> 8 & 0xff)) {
          const family = action.actionType >> 8 & 0xff;
          const kind = family === SFX_STOP_ACTION_FAMILY ? "stop" : family === SFX_PAUSE_ACTION_FAMILY ? "pause" : "resume";
          const playbackControl = ReadSfxPlaybackControlAction(action, kind);
          result.program.push(playbackControl);
          if (kind === "stop" && playbackControl.mode === "element") {
            result.stopTargets.add(Number(playbackControl.targetId) >>> 0);
          }
        } else if ((action.actionType >> 8 & 0xff) === SFX_SET_VOICE_PITCH_ACTION_FAMILY || (action.actionType >> 8 & 0xff) === SFX_RESET_VOICE_PITCH_ACTION_FAMILY) {
          const voicePitch = ReadSfxVoicePitchAction(action, parsed);
          if (voicePitch) {
            result.program.push(voicePitch);
          }
        } else if ((action.actionType >> 8 & 0xff) === SFX_SET_VOICE_VOLUME_ACTION_FAMILY || (action.actionType >> 8 & 0xff) === SFX_RESET_VOICE_VOLUME_ACTION_FAMILY) {
          const voiceVolume = ReadSfxVoiceVolumeAction(action, parsed);
          if (voiceVolume) {
            result.program.push(voiceVolume);
          }
        } else if ((action.actionType >> 8 & 0xff) === SFX_SET_BUS_VOLUME_ACTION_FAMILY || (action.actionType >> 8 & 0xff) === SFX_RESET_BUS_VOLUME_ACTION_FAMILY) {
          result.program.push(ReadSfxBusVolumeAction(action));
        } else if ([SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY, SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY, SFX_SET_VOICE_HIGH_PASS_ACTION_FAMILY, SFX_RESET_VOICE_HIGH_PASS_ACTION_FAMILY].includes(action.actionType >> 8 & 0xff)) {
          const voiceFilter = ReadSfxVoiceFilterAction(action, parsed);
          if (voiceFilter) {
            result.program.push(voiceFilter);
          }
        } else if ((action.actionType >> 8 & 0xff) === SFX_SET_GAME_PARAMETER_ACTION_FAMILY || (action.actionType >> 8 & 0xff) === SFX_RESET_GAME_PARAMETER_ACTION_FAMILY) {
          result.program.push(ReadSfxGameParameterAction(action, names));
        } else if ((action.actionType >> 8 & 0xff) === SFX_SET_SWITCH_ACTION_FAMILY || (action.actionType >> 8 & 0xff) === SFX_SET_STATE_ACTION_FAMILY) {
          if (HasSfxPlayActionTiming(action, false)) {
            throw new Error(`scheduled setter action ${action.id}`);
          }
          const setter = ReadSfxSetterAction(action, names);
          result.setters.push(setter);
          result.program.push(setter);
        } else {
          result.unsupportedActions.push(action.actionType);
        }
      }
      if (IsMusicEventName(eventNames.get(eventID))) {
        result.program = result.program.filter(value => value.kind === "set-bus-volume" || value.kind === "reset-bus-volume");
        result.leaves.clear();
        result.stopTargets.clear();
        result.setters.length = 0;
        result.unsupportedActions.length = 0;
      }
      result.roots = result.program.filter(action => action.kind === "play").map(action => action.child);
      loweredEvents.set(eventID, result);
      return result;
    } finally {
      activeEvents.delete(eventID);
    }
  };
  for (const [eventID, event] of [...parsed.events.entries()].sort(([left], [right]) => left - right)) {
    const name = eventNames.get(eventID >>> 0);
    if (!name) {
      continue;
    }
    try {
      const {
        roots,
        leaves,
        stopTargets,
        setters,
        program,
        unsupportedActions
      } = lowerEvent(eventID);
      if (stopTargets.size) {
        stopTargetsByEvent.set(name, stopTargets);
      }
      const retainedProgram = IsMusicEventName(name) ? program.filter(action => action.kind === "set-bus-volume" || action.kind === "reset-bus-volume") : program;
      const retainedUnsupportedActions = IsMusicEventName(name) ? [] : unsupportedActions;
      if (retainedProgram.length) {
        if (retainedUnsupportedActions.length) {
          throw new Error("mixed event actions " + retainedUnsupportedActions.map(value => `0x${value.toString(16)}`).join(", "));
        }
        if (roots.length && !IsMusicEventName(name)) {
          events[name] = roots;
          leavesByEvent.set(name, leaves);
        }
        programs[name] = retainedProgram;
      }
    } catch (error) {
      omittedEvents.push({
        id: eventID,
        name,
        reason: error.message
      });
    }
  }
  const spatial = CreateSfxSpatialProjection(parsed, leavesByEvent, nodes);
  const stopRelationships = CreateSfxStopRelationships(parsed, leavesByEvent, stopTargetsByEvent);
  OmitFutureScheduledVoiceLimits(events, programs, nodes);
  const pruned = PruneSfxNodes(events, nodes);
  return {
    schemaVersion: 2,
    generator: "@carbonenginejs/runtime-audio/library-builder",
    events,
    programs,
    nodes: pruned,
    ...(names.stateTransitions.length ? {
      stateTransitions: names.stateTransitions
    } : {}),
    metadataProjection: {
      Events: MergeSfxEventMetadata(spatial.events, stopRelationships.events)
    },
    diagnostics: {
      parser: parsed.diagnostics,
      omittedEvents,
      stopRelationships: stopRelationships.diagnostics,
      spatial: spatial.diagnostics
    }
  };
}
function HasSfxPlayActionTiming(action, includeFade) {
  const details = action.action ?? action;
  return details.delayTimeMs !== undefined || details.delayRangeMs !== undefined || details.probability !== undefined || includeFade;
}

// Playback limiting is evaluated when Wwise starts the pending Sound, not when
// an earlier delayed action or Crossfade prefetch first selects its media. The
// browser arbiter currently admits at selection time, so keep those future
// scheduling shapes out of the otherwise exact cap-one projection.
function OmitFutureScheduledVoiceLimits(events, programs, nodes) {
  const visited = new Set();
  const delayed = value => {
    const base = Number(value?.delayMs) || 0;
    const maximum = Number(value?.delayRangeMs?.max) || 0;
    return base + maximum > 0;
  };
  const visit = (child, future) => {
    const rawID = child && typeof child === "object" ? child.nodeId : child;
    if (rawID === undefined || rawID === null || rawID === "") {
      return;
    }
    const id = String(rawID);
    const risk = future || child && typeof child === "object" && delayed(child);
    const key = `${id}\0${risk ? 1 : 0}`;
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    const node = nodes[id];
    if (!node) {
      return;
    }
    if (node.type === "sound") {
      const maximumRandomDelay = (node.initialDelayRangesMs ?? []).reduce((sum, range) => sum + (Number(range.max) || 0), 0);
      const ownDelay = (Number(node.initialDelayMs) || 0) + maximumRandomDelay > 0 || (node.rtpcCurves ?? []).some(curve => curve.property === "initialDelay");
      if (risk || ownDelay) {
        delete node.voiceLimit;
      }
      return;
    }
    const continuousFuture = node.continuous !== undefined && (node.continuous.transition === "crossfade-amplitude" || node.continuous.transition === "crossfade-power" || node.continuous.transition === "delay" && (Number(node.continuous.transitionMs) || 0) + (Number(node.continuous.transitionRangeMs?.max) || 0) > 0);
    const childFuture = risk || continuousFuture;
    for (const nested of node.children ?? []) {
      visit(nested, childFuture);
    }
    for (const nested of Object.values(node.cases ?? {})) {
      visit(nested, childFuture);
    }
    visit(node.default, childFuture);
  };
  for (const roots of Object.values(events)) {
    for (const root of roots) {
      visit(root, false);
    }
  }
  for (const program of Object.values(programs)) {
    for (const operation of program) {
      if (operation.kind === "play") {
        visit(operation.child, false);
      }
    }
  }
}
function ReadSfxPlayActionChild(child, action, includeFade) {
  if (!child) {
    return null;
  }
  const details = action.action ?? action;
  const result = {
    ...child
  };
  if (details.delayTimeMs !== undefined) {
    result.delayMs = Number(details.delayTimeMs);
  }
  if (details.delayRangeMs !== undefined) {
    result.delayRangeMs = {
      min: Number(details.delayRangeMs.min),
      max: Number(details.delayRangeMs.max)
    };
  }
  if (details.probability !== undefined) {
    result.probability = Number(details.probability);
  }
  if (includeFade && (details.transitionTimeMs !== undefined || details.transitionRangeMs !== undefined)) {
    if (details.transitionTimeMs !== undefined) {
      result.fadeInMs = Number(details.transitionTimeMs);
    }
    if (details.transitionRangeMs !== undefined) {
      result.fadeInRangeMs = {
        min: Number(details.transitionRangeMs.min),
        max: Number(details.transitionRangeMs.max)
      };
    }
    result.fadeCurve = Number(details.fadeCurve ?? 4);
  }
  return result;
}
function ReadSfxVoiceVolumeAction(action, parsed) {
  const details = action.action;
  const actionType = Number(action.actionType) >>> 0;
  const family = actionType >> 8 & 0xff;
  if (!details || family !== SFX_SET_VOICE_VOLUME_ACTION_FAMILY && family !== SFX_RESET_VOICE_VOLUME_ACTION_FAMILY) {
    throw new Error(`untyped Voice Volume action ${action.id}`);
  }
  const targetId = Number(details.targetId) >>> 0;
  const targetFlags = Number(details.targetFlags ?? 0);
  if (details.actionMode !== "element" || details.actionScope !== "game-object" && details.actionScope !== "global") {
    throw new Error(`unsupported Voice Volume target mode ${action.id}`);
  }
  if (!targetId) {
    throw new Error(`unresolved Voice Volume target ${targetId}`);
  }
  if (details.targetIsBus || targetFlags & 0x01) {
    throw new Error(`bus Voice Volume action ${action.id}`);
  }
  if (targetFlags !== 0) {
    throw new Error(`unsupported Voice Volume target flags ${targetFlags}`);
  }
  if (!parsed.nodeBases?.has(targetId)) {
    return null;
  }
  const resetting = family === SFX_RESET_VOICE_VOLUME_ACTION_FAMILY;
  const result = {
    kind: resetting ? "reset-voice-volume" : "set-voice-volume",
    targetId: String(targetId),
    targetFlags,
    scope: details.actionScope,
    mode: "element",
    curve: Number(details.fadeCurve ?? 4)
  };
  if (!resetting) {
    if (details.valueMode !== "absolute" && details.valueMode !== "relative") {
      throw new Error(`unsupported Voice Volume value mode ${action.id}`);
    }
    result.valueMode = details.valueMode;
    result.volumeDb = Number(details.volumeDb);
    result.volumeRangeDb = {
      min: Number(details.volumeRangeDb?.min ?? 0),
      max: Number(details.volumeRangeDb?.max ?? 0)
    };
  }
  if (details.delayTimeMs !== undefined) {
    result.delayMs = Number(details.delayTimeMs);
  }
  if (details.delayRangeMs !== undefined) {
    result.delayRangeMs = {
      min: Number(details.delayRangeMs.min),
      max: Number(details.delayRangeMs.max)
    };
  }
  if (details.transitionTimeMs !== undefined) {
    result.transitionMs = Number(details.transitionTimeMs);
  }
  if (details.transitionRangeMs !== undefined) {
    result.transitionRangeMs = {
      min: Number(details.transitionRangeMs.min),
      max: Number(details.transitionRangeMs.max)
    };
  }
  return result;
}
function ReadSfxVoicePitchAction(action, parsed) {
  const details = action.action;
  const actionType = Number(action.actionType) >>> 0;
  const family = actionType >> 8 & 0xff;
  if (!details || family !== SFX_SET_VOICE_PITCH_ACTION_FAMILY && family !== SFX_RESET_VOICE_PITCH_ACTION_FAMILY) {
    throw new Error(`untyped Voice Pitch action ${action.id}`);
  }
  const targetId = Number(details.targetId) >>> 0;
  const targetFlags = Number(details.targetFlags ?? 0);
  if (details.actionMode !== "element" || details.actionScope !== "game-object" && details.actionScope !== "global") {
    throw new Error(`unsupported Voice Pitch target mode ${action.id}`);
  }
  if (!targetId) {
    throw new Error(`unresolved Voice Pitch target ${targetId}`);
  }
  if (details.targetIsBus || targetFlags & 0x01) {
    throw new Error(`bus Voice Pitch action ${action.id}`);
  }
  if (targetFlags !== 0) {
    throw new Error(`unsupported Voice Pitch target flags ${targetFlags}`);
  }
  if (!parsed.nodeBases?.has(targetId)) {
    return null;
  }
  const resetting = family === SFX_RESET_VOICE_PITCH_ACTION_FAMILY;
  const result = {
    kind: resetting ? "reset-voice-pitch" : "set-voice-pitch",
    targetId: String(targetId),
    targetFlags,
    scope: details.actionScope,
    mode: "element",
    curve: Number(details.fadeCurve ?? 4)
  };
  if (!resetting) {
    if (details.valueMode !== "absolute" && details.valueMode !== "relative") {
      throw new Error(`unsupported Voice Pitch value mode ${action.id}`);
    }
    result.valueMode = details.valueMode;
    result.pitchCents = Number(details.pitchCents);
    result.pitchRangeCents = {
      min: Number(details.pitchRangeCents?.min ?? 0),
      max: Number(details.pitchRangeCents?.max ?? 0)
    };
  }
  if (details.delayTimeMs !== undefined) {
    result.delayMs = Number(details.delayTimeMs);
  }
  if (details.delayRangeMs !== undefined) {
    result.delayRangeMs = {
      min: Number(details.delayRangeMs.min),
      max: Number(details.delayRangeMs.max)
    };
  }
  if (details.transitionTimeMs !== undefined) {
    result.transitionMs = Number(details.transitionTimeMs);
  }
  if (details.transitionRangeMs !== undefined) {
    result.transitionRangeMs = {
      min: Number(details.transitionRangeMs.min),
      max: Number(details.transitionRangeMs.max)
    };
  }
  return result;
}
function ReadSfxBusVolumeAction(action) {
  const details = action.action;
  const actionType = Number(action.actionType) >>> 0;
  const form = SFX_BUS_VOLUME_ACTION_FORMS.get(actionType);
  const kind = form?.setting ? "set-bus-volume" : "reset-bus-volume";
  if (!details) {
    throw new Error(`untyped Bus Volume action ${action.id}`);
  }
  if (!form) {
    throw new Error(`unsupported Bus Volume alias ${action.id}`);
  }
  if (details.actionName !== kind) {
    throw new Error(`untyped Bus Volume action ${action.id}`);
  }
  if (details.actionType !== undefined && Number(details.actionType) >>> 0 !== actionType) {
    throw new Error(`Bus Volume action type mismatch ${action.id}`);
  }
  if (details.actionScope !== form.scope || details.actionMode !== form.mode) {
    throw new Error(`Bus Volume scope/mode mismatch ${action.id}`);
  }
  if (details.probability !== undefined) {
    throw new Error(`probabilistic Bus Volume action ${action.id}`);
  }
  for (const field of ["properties", "ranges"]) {
    if (details[field] === undefined) {
      continue;
    }
    const ids = Array.isArray(details[field]) ? details[field].map(value => Number(value?.id)) : null;
    if (!ids || ids.some(id => id !== 0x39 && id !== 0x3a) || new Set(ids).size !== ids.length) {
      throw new Error(`invalid Bus Volume ${field} ${action.id}`);
    }
  }
  if (!Array.isArray(details.exceptions)) {
    throw new Error(`invalid Bus Volume exceptions ${action.id}`);
  }
  const targetId = NormalizeWwiseUint32(details.targetId, `Bus Volume action ${action.id} targetId`);
  const shallowTargetId = NormalizeWwiseUint32(action.targetId, `Bus Volume action ${action.id} shallow targetId`);
  const targetFlags = Number(details.targetFlags ?? 0);
  if (targetId !== shallowTargetId) {
    throw new Error(`Bus Volume target mismatch ${action.id}`);
  }
  if (form.mode === "element" ? !targetId : targetId !== 0) {
    throw new Error(`invalid Bus Volume target ${action.id}`);
  }
  if (details.targetIsBus !== true || targetFlags !== 1) {
    throw new Error(`invalid Bus Volume target flags ${action.id}`);
  }
  if (form.mode !== "all-except" && details.exceptions.length) {
    throw new Error(`unexpected Bus Volume exceptions ${action.id}`);
  }
  const exceptionIds = new Set();
  const exceptions = details.exceptions.map(exception => {
    const exceptionId = NormalizeWwiseUint32(exception.targetId, `Bus Volume action ${action.id} exception targetId`);
    const exceptionFlags = Number(exception.targetFlags ?? 0);
    if (!exceptionId || exceptionIds.has(exceptionId) || exception.targetIsBus !== true || exceptionFlags !== 1) {
      throw new Error(`invalid Bus Volume exception ${action.id}`);
    }
    exceptionIds.add(exceptionId);
    return {
      targetId: String(exceptionId),
      targetFlags: exceptionFlags
    };
  });
  const result = {
    kind,
    targetId: String(targetId),
    targetFlags,
    scope: form.scope,
    mode: form.mode,
    curve: Number(details.fadeCurve ?? 4),
    exceptions
  };
  if (form.setting) {
    if (details.valueMode !== "absolute" && details.valueMode !== "relative") {
      throw new Error(`unsupported Bus Volume value mode ${action.id}`);
    }
    result.valueMode = details.valueMode;
    result.busVolumeDb = Number(details.busVolumeDb);
    result.busVolumeRangeDb = {
      min: Number(details.busVolumeRangeDb?.min ?? 0),
      max: Number(details.busVolumeRangeDb?.max ?? 0)
    };
  } else if (details.valueMode !== undefined || details.busVolumeDb !== undefined || details.busVolumeRangeDb !== undefined) {
    throw new Error(`Bus Volume Reset carries a value ${action.id}`);
  }
  if (details.delayTimeMs !== undefined) {
    result.delayMs = Number(details.delayTimeMs);
  }
  if (details.delayRangeMs !== undefined) {
    result.delayRangeMs = {
      min: Number(details.delayRangeMs.min),
      max: Number(details.delayRangeMs.max)
    };
  }
  if (details.transitionTimeMs !== undefined) {
    result.transitionMs = Number(details.transitionTimeMs);
  }
  if (details.transitionRangeMs !== undefined) {
    result.transitionRangeMs = {
      min: Number(details.transitionRangeMs.min),
      max: Number(details.transitionRangeMs.max)
    };
  }
  return result;
}
function ReadSfxVoiceFilterAction(action, parsed) {
  const details = action.action;
  const actionType = Number(action.actionType) >>> 0;
  const family = actionType >> 8 & 0xff;
  const lowPass = family === SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY || family === SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY;
  const setting = family === SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY || family === SFX_SET_VOICE_HIGH_PASS_ACTION_FAMILY;
  const resetting = family === SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY || family === SFX_RESET_VOICE_HIGH_PASS_ACTION_FAMILY;
  const property = lowPass ? "lowPass" : "highPass";
  const rangeField = `${property}Range`;
  const kind = `${setting ? "set" : "reset"}-voice-${lowPass ? "low-pass" : "high-pass"}`;
  if (!details || !setting && !resetting || details.actionName !== kind) {
    throw new Error(`untyped Voice Filter action ${action.id}`);
  }
  const actionForm = SFX_VOICE_FILTER_ACTION_FORMS.get(actionType & 0xff);
  if (!actionForm || setting && actionForm.mode !== "element") {
    throw new Error(`unsupported Voice Filter alias ${action.id}`);
  }
  if (details.actionType !== undefined && Number(details.actionType) >>> 0 !== actionType) {
    throw new Error(`Voice Filter action type mismatch ${action.id}`);
  }
  const wrongProperty = lowPass ? "highPass" : "lowPass";
  if (details[wrongProperty] !== undefined || details[`${wrongProperty}Range`] !== undefined) {
    throw new Error(`Voice Filter action ${action.id} carries ${wrongProperty}`);
  }
  if (details.probability !== undefined) {
    throw new Error(`probabilistic Voice Filter action ${action.id}`);
  }
  for (const field of ["properties", "ranges"]) {
    if (details[field] === undefined) {
      continue;
    }
    const ids = Array.isArray(details[field]) ? details[field].map(value => Number(value?.id)) : null;
    if (!ids || ids.some(id => id !== 0x39 && id !== 0x3a) || new Set(ids).size !== ids.length) {
      throw new Error(`invalid Voice Filter ${field} ${action.id}`);
    }
  }
  if (!Array.isArray(details.exceptions)) {
    throw new Error(`invalid Voice Filter exceptions ${action.id}`);
  }
  const targetId = NormalizeWwiseUint32(details.targetId, `Voice Filter action ${action.id} targetId`);
  const shallowTargetId = NormalizeWwiseUint32(action.targetId, `Voice Filter action ${action.id} shallow targetId`);
  const targetFlags = Number(details.targetFlags ?? 0);
  const mode = details.actionMode;
  const scope = details.actionScope;
  const exceptions = details.exceptions;
  if (scope !== actionForm.scope || mode !== actionForm.mode) {
    throw new Error(`Voice Filter scope/mode mismatch ${action.id}`);
  }
  if (mode === "element" && !targetId) {
    throw new Error(`unresolved Voice Filter target ${action.id}`);
  }
  if (targetId !== shallowTargetId) {
    throw new Error(`Voice Filter target mismatch ${action.id}`);
  }
  if (mode !== "element" && targetId !== 0) {
    throw new Error(`Voice Filter ${mode} target must be 0 ${action.id}`);
  }
  if (details.targetIsBus || targetFlags & 0x01) {
    throw new Error(`bus Voice Filter action ${action.id}`);
  }
  if (targetFlags !== 0) {
    throw new Error(`unsupported Voice Filter target flags ${targetFlags}`);
  }
  if (mode !== "all-except" && exceptions.length) {
    throw new Error(`unexpected Voice Filter exceptions ${action.id}`);
  }
  if (mode === "element" && !parsed.nodeBases?.has(targetId)) {
    return null;
  }
  const exceptionIds = new Set();
  const normalizedExceptions = exceptions.map(exception => {
    const exceptionFlags = Number(exception.targetFlags ?? 0);
    const exceptionId = NormalizeWwiseUint32(exception.targetId, `Voice Filter action ${action.id} exception targetId`);
    if (exception.targetIsBus || exceptionFlags & 0x01 || exceptionFlags !== 0) {
      throw new Error(`bus Voice Filter exception ${action.id}`);
    }
    if (!exceptionId || exceptionIds.has(exceptionId)) {
      throw new Error(`invalid Voice Filter exception ${action.id}`);
    }
    exceptionIds.add(exceptionId);
    return {
      targetId: String(exceptionId),
      targetFlags: exceptionFlags
    };
  });
  const result = {
    kind,
    targetId: String(targetId),
    targetFlags,
    scope,
    mode,
    curve: Number(details.fadeCurve ?? 4),
    exceptions: normalizedExceptions
  };
  if (setting) {
    if (details.valueMode !== "absolute" && details.valueMode !== "relative") {
      throw new Error(`unsupported Voice Filter value mode ${action.id}`);
    }
    result.valueMode = details.valueMode;
    result[property] = Number(details[property]);
    result[rangeField] = {
      min: Number(details[rangeField]?.min ?? 0),
      max: Number(details[rangeField]?.max ?? 0)
    };
  } else if (details.valueMode !== undefined || details.lowPass !== undefined || details.lowPassRange !== undefined || details.highPass !== undefined || details.highPassRange !== undefined) {
    throw new Error(`Voice Filter Reset carries a value ${action.id}`);
  }
  if (details.delayTimeMs !== undefined) {
    result.delayMs = Number(details.delayTimeMs);
  }
  if (details.delayRangeMs !== undefined) {
    result.delayRangeMs = {
      min: Number(details.delayRangeMs.min),
      max: Number(details.delayRangeMs.max)
    };
  }
  if (details.transitionTimeMs !== undefined) {
    result.transitionMs = Number(details.transitionTimeMs);
  }
  if (details.transitionRangeMs !== undefined) {
    result.transitionRangeMs = {
      min: Number(details.transitionRangeMs.min),
      max: Number(details.transitionRangeMs.max)
    };
  }
  return result;
}
function ReadSfxGameParameterAction(action, names) {
  const details = action.action;
  const actionType = Number(action.actionType) >>> 0;
  const family = actionType >> 8 & 0xff;
  const resetting = family === SFX_RESET_GAME_PARAMETER_ACTION_FAMILY;
  const expectedName = resetting ? "reset-game-parameter" : "set-game-parameter";
  if (!details || family !== SFX_SET_GAME_PARAMETER_ACTION_FAMILY && family !== SFX_RESET_GAME_PARAMETER_ACTION_FAMILY || details.actionName !== expectedName) {
    throw new Error(`untyped Game Parameter action ${action.id}`);
  }
  const targetId = Number(details.targetId) >>> 0;
  const targetFlags = Number(details.targetFlags ?? 0);
  if (details.actionMode !== "element" || details.actionScope !== "game-object" && details.actionScope !== "global") {
    throw new Error(`unsupported Game Parameter target mode ${action.id}`);
  }
  if (!targetId || targetId !== Number(action.targetId) >>> 0) {
    throw new Error(`unresolved Game Parameter target ${targetId}`);
  }
  if (details.targetIsBus || targetFlags !== 0) {
    throw new Error(`unsupported Game Parameter target flags ${targetFlags}`);
  }
  if (!Array.isArray(details.exceptions) || details.exceptions.length) {
    throw new Error(`unsupported Game Parameter exceptions ${action.id}`);
  }
  if (!HasExactSfxGameParameterProperties(details.properties) || !HasExactSfxGameParameterProperties(details.ranges) || details.probability !== undefined) {
    throw new Error(`unsupported Game Parameter properties ${action.id}`);
  }
  if (typeof details.bypassTransition !== "boolean") {
    throw new Error(`invalid Game Parameter bypass flag ${action.id}`);
  }
  const rtpc = names.parameters.get(targetId);
  if (!rtpc) {
    throw new Error(`unnamed game parameter ${targetId}`);
  }
  const result = {
    kind: expectedName,
    rtpc,
    scope: details.actionScope,
    curve: Number(details.fadeCurve ?? 4),
    bypassTransition: details.bypassTransition
  };
  const defaultValue = names.parameterDefaults.get(targetId);
  if (defaultValue === undefined) {
    throw new Error(`missing Game Parameter default ${targetId}`);
  } else {
    result.defaultValue = defaultValue;
  }
  if (!resetting) {
    if (details.valueMode !== "absolute" && details.valueMode !== "relative") {
      throw new Error(`unsupported Game Parameter value mode ${action.id}`);
    }
    const value = Number(details.gameParameterValue);
    const min = Number(details.gameParameterRange?.min);
    const max = Number(details.gameParameterRange?.max);
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new Error(`invalid Game Parameter value ${action.id}`);
    }
    result.valueMode = details.valueMode;
    result.gameParameterValue = value;
    result.gameParameterRange = {
      min,
      max
    };
  } else if (details.valueMode !== undefined || details.gameParameterValue !== undefined || details.gameParameterRange !== undefined) {
    throw new Error(`invalid Reset Game Parameter value ${action.id}`);
  }
  for (const [source, target] of [["delayTimeMs", "delayMs"], ["transitionTimeMs", "transitionMs"]]) {
    if (details[source] !== undefined) {
      result[target] = Number(details[source]);
    }
  }
  for (const [source, target] of [["delayRangeMs", "delayRangeMs"], ["transitionRangeMs", "transitionRangeMs"]]) {
    if (details[source] !== undefined) {
      result[target] = {
        min: Number(details[source].min),
        max: Number(details[source].max)
      };
    }
  }
  return result;
}
function HasExactSfxGameParameterProperties(values) {
  if (!Array.isArray(values)) {
    return false;
  }
  const ids = values.map(value => Number(value?.id));
  return ids.every(id => id === 0x39 || id === 0x3a) && new Set(ids).size === ids.length;
}
function ReadSfxSetterAction(action, names) {
  const family = Number(action.actionType) >> 8 & 0xff;
  const scope = family === SFX_SET_SWITCH_ACTION_FAMILY ? "switch" : "state";
  const {
    groupID,
    valueID
  } = ReadSetterActionIDs(action.action, action.payload, `${scope} setter action ${action.id}`);
  const group = names.groups.get(`${scope}:${groupID}`);
  const value = group?.values.get(valueID);
  if (!group?.name) {
    throw new Error(`unnamed ${scope} group ${groupID}`);
  }
  if (!value) {
    throw new Error(`unnamed ${scope} value ${valueID}`);
  }
  return {
    kind: scope,
    group: group.name,
    value
  };
}
function ReadSfxPlaybackControlAction(action, kind) {
  const details = action.action ?? action;
  const actionType = Number(action.actionType) >>> 0;
  const targetFlags = Number(details.targetFlags ?? 0);
  const actionFlags = Number(details.actionFlags ?? (kind === "pause" ? 7 : 6));
  const mode = details.actionMode ?? SfxActionMode(actionType & 0xff);
  const scope = details.actionScope ?? SfxActionScope(actionType & 0xff);
  const targetId = Number(details.targetId ?? action.targetId) >>> 0;
  const exceptions = Array.isArray(details.exceptions) ? details.exceptions : [];
  const label = kind === "stop" ? "Stop" : kind === "pause" ? "Pause" : "Resume";
  if (details.targetIsBus || targetFlags & 0x01) {
    throw new Error(`bus ${label} action ${action.id}`);
  }
  if (mode !== "element" && mode !== "all" && mode !== "all-except") {
    throw new Error(`unsupported ${label} mode ${mode}`);
  }
  if (scope !== "game-object" && scope !== "global") {
    throw new Error(`unsupported ${label} scope ${scope}`);
  }
  if (mode === "element" && targetId === 0) {
    throw new Error(`empty ${label} target ${action.id}`);
  }
  const expectedActionFlags = kind === "pause" ? 7 : 6;
  if (actionFlags !== expectedActionFlags) {
    throw new Error(`unsupported ${label} action flags ${actionFlags}`);
  }
  const normalizedExceptions = exceptions.map(exception => {
    const exceptionFlags = Number(exception.targetFlags ?? 0);
    if (exception.targetIsBus || exceptionFlags & 0x01) {
      throw new Error(`bus ${label} exception ${action.id}`);
    }
    return {
      targetId: String(Number(exception.targetId) >>> 0),
      targetFlags: exceptionFlags
    };
  });
  const result = {
    kind,
    targetId: String(targetId),
    targetFlags,
    scope,
    mode,
    curve: Number(details.fadeCurve ?? 4),
    actionFlags,
    exceptions: normalizedExceptions
  };
  if (details.delayTimeMs !== undefined) {
    result.delayMs = Number(details.delayTimeMs);
  }
  if (details.delayRangeMs !== undefined) {
    result.delayRangeMs = {
      min: Number(details.delayRangeMs.min),
      max: Number(details.delayRangeMs.max)
    };
  }
  if (details.transitionTimeMs !== undefined) {
    result.transitionMs = Number(details.transitionTimeMs);
  }
  if (details.transitionRangeMs !== undefined) {
    result.transitionRangeMs = {
      min: Number(details.transitionRangeMs.min),
      max: Number(details.transitionRangeMs.max)
    };
  }
  if (details.probability !== undefined) {
    result.probability = Number(details.probability);
  }
  return result;
}
function SfxActionMode(value) {
  if (value === 0x02 || value === 0x03) return "element";
  if (value === 0x04 || value === 0x05) return "all";
  if (value === 0x08 || value === 0x09) return "all-except";
  return "unknown";
}
function SfxActionScope(value) {
  if (value === 0x02 || value === 0x04 || value === 0x08) {
    return "global";
  }
  if (value === 0x03 || value === 0x05 || value === 0x09) {
    return "game-object";
  }
  return "unknown";
}
function CreateSfxMatchIds(parsed, rawID) {
  const result = [];
  const active = new Set();
  let current = Number(rawID) >>> 0;
  while (current && !active.has(current)) {
    active.add(current);
    result.push(String(current));
    current = Number(parsed.nodeBases?.get(current)?.directParentId) >>> 0;
  }
  return result;
}
function CreateTypedBusCatalog(inspections) {
  const result = CjsBnkFormat.wwise.busNodesFromBanks(inspections);
  if (result.diagnostics.failed.length) {
    const details = result.diagnostics.failed.map(failure => `${failure.bank}:${failure.type}:${failure.id}`).join(", ");
    throw new Error(`Audio bus parsing failed: ${details}`);
  }
  return result.buses;
}
function CreateBusRtpcCatalog(buses, names) {
  const result = {};
  for (const [rawBusId, bus] of [...buses.entries()].sort(([left], [right]) => left - right)) {
    const curves = (bus.rtpcs ?? []).filter(rtpc => BUS_RTPC_PROPERTIES.has(Number(rtpc.parameterId))).map(rtpc => CreateBusRtpcCurve(rtpc, names, BUS_RTPC_PROPERTIES.get(Number(rtpc.parameterId)))).sort((left, right) => left.curveId - right.curveId);
    if (curves.length) {
      result[String(Number(rawBusId) >>> 0)] = curves;
    }
  }
  return {
    schemaVersion: 2,
    buses: result
  };
}
function CreateBusRtpcCurve(rtpc, names, property) {
  const label = property === "voice-volume" ? "Audio Bus Voice Volume" : "Audio Bus Volume";
  const curveId = NormalizeWwiseUint32(rtpc.curveId, `${label} RTPC curve id`);
  const controlId = NormalizeWwiseUint32(rtpc.controlId, `${label} RTPC ${curveId} control id`);
  const rtpcName = names.parameters.get(controlId);
  const defaultValue = names.parameterDefaults.get(controlId);
  if (Number(rtpc.controlType) !== 0) {
    throw new Error(`unsupported ${label} RTPC control type ${rtpc.controlType}`);
  }
  if (Number(rtpc.accumulation) !== SFX_ADDITIVE_ACCUMULATION) {
    throw new Error(`unsupported ${label} RTPC accumulation ${rtpc.accumulation}`);
  }
  if (Number(rtpc.scaling) !== 2) {
    throw new Error(`unsupported ${label} RTPC scaling ${rtpc.scaling}`);
  }
  if (!rtpcName) {
    throw new Error(`unnamed ${label} game parameter ${controlId}`);
  }
  if (!Number.isFinite(defaultValue)) {
    throw new Error(`missing ${label} game parameter default ${controlId}`);
  }
  if (!rtpc.points?.length) {
    throw new Error(`empty ${label} RTPC curve ${curveId}`);
  }
  let previous = -Infinity;
  const points = rtpc.points.map((point, index) => {
    const x = Number(point.from);
    const value = Number(point.to);
    const interpolation = Number(point.interpolation);
    if (!Number.isFinite(x) || !Number.isFinite(value)) {
      throw new Error(`non-finite ${label} RTPC curve ${curveId}`);
    }
    if (value < -1 || value > 1) {
      throw new Error(`out-of-range ${label} RTPC curve ${curveId} point ${index}`);
    }
    if (!Number.isSafeInteger(interpolation) || interpolation < 0 || interpolation > 9) {
      throw new Error(`invalid ${label} RTPC interpolation ${curveId}`);
    }
    if (x < previous) {
      throw new Error(`unsorted ${label} RTPC curve ${curveId}`);
    }
    previous = x;
    return {
      x,
      value,
      interpolation
    };
  });
  return {
    curveId,
    property,
    rtpc: String(rtpcName),
    defaultValue,
    scaling: 2,
    points
  };
}
function NormalizeBusRtpcCatalog(value) {
  const buses = {};
  for (const busId of Object.keys(value.buses ?? {}).sort((left, right) => Number(left) - Number(right))) {
    buses[String(busId)] = value.buses[busId].map(curve => ({
      curveId: Number(curve.curveId),
      property: curve.property === undefined ? "bus-volume" : String(curve.property),
      rtpc: String(curve.rtpc),
      defaultValue: Number(curve.defaultValue),
      scaling: Number(curve.scaling),
      points: curve.points.map(point => ({
        x: Number(point.x),
        value: Number(point.value),
        interpolation: Number(point.interpolation)
      }))
    }));
  }
  return {
    schemaVersion: 2,
    buses
  };
}
function CreateBusStateCatalog(buses, names, musicBusIds) {
  const result = {};
  const usedGroupIds = new Set();
  let usesFilters = false;
  for (const [rawBusId, bus] of [...buses.entries()].sort(([left], [right]) => left - right)) {
    const definitions = new Map();
    for (const definition of bus.state?.properties ?? []) {
      const propertyId = Number(definition.propertyId);
      if (definitions.has(propertyId)) {
        throw new Error(`duplicate Audio Bus state property ${propertyId}`);
      }
      definitions.set(propertyId, definition);
    }
    const groups = (bus.state?.groups ?? []).map(group => CreateBusStateGroup(group, definitions, names, musicBusIds.has(String(Number(rawBusId) >>> 0)))).filter(Boolean).sort((left, right) => Number(left.groupId) - Number(right.groupId));
    if (groups.length) {
      result[String(Number(rawBusId) >>> 0)] = groups;
      for (const group of groups) {
        usedGroupIds.add(group.groupId);
        usesFilters ||= group.states.some(state => state.lowPass !== undefined || state.highPass !== undefined);
      }
    }
  }
  const stateTransitions = names.stateTransitions.filter(group => usedGroupIds.has(String(group.groupId)));
  if (stateTransitions.length !== usedGroupIds.size) {
    throw new Error("Audio Bus State group is missing STMG transition data");
  }
  if (usesFilters && names.stateFilterBehavior !== 0) {
    throw new Error(`unsupported Audio Bus State filter behavior ${names.stateFilterBehavior}`);
  }
  return {
    schemaVersion: 2,
    ...(usesFilters ? {
      filterBehavior: "additive"
    } : {}),
    stateTransitions,
    buses: result
  };
}
function CreateBusStateGroup(group, definitions, names, musicRouted) {
  const groupId = NormalizeWwiseUint32(group.groupId, "Audio Bus state group id");
  const syncType = Number(group.syncType);
  const namedGroup = names.groups.get(`state:${groupId}`);
  const states = [];
  const unsupportedValue = (group.states ?? []).flatMap(state => state.values ?? []).find(value => !BUS_STATE_FIELDS.has(Number(value.propertyId)));
  if (unsupportedValue) {
    throw new Error(`unsupported Audio Bus state property ${unsupportedValue.propertyId}` + ` in group ${groupId}`);
  }
  const authoredStates = (group.states ?? []).filter(state => (state.values ?? []).some(value => BUS_STATE_FIELDS.has(Number(value.propertyId))));
  if (!authoredStates.length) return null;
  if (!Number.isSafeInteger(syncType) || syncType < 0 || syncType > 9) {
    throw new Error(`invalid Audio Bus state sync type ${syncType}`);
  }
  if (!namedGroup?.name) {
    throw new Error(`unnamed Audio Bus state group ${groupId}`);
  }
  const affectsMusic = authoredStates.some(state => (state.values ?? []).some(value => Number(value.propertyId) !== BUS_PITCH_STATE_PROPERTY));
  if (syncType !== 0 && musicRouted && affectsMusic) {
    throw new Error(`unsupported music-synchronized Audio Bus state group ${groupId}`);
  }
  for (const state of authoredStates) {
    const values = (state.values ?? []).filter(value => BUS_STATE_FIELDS.has(Number(value.propertyId)));
    if (!values.length) continue;
    const stateId = NormalizeWwiseUint32(state.stateId, `Audio Bus state group ${groupId} state id`);
    const stateName = namedGroup.values.get(stateId);
    if (!stateName) {
      throw new Error(`unnamed Audio Bus state ${stateId} in group ${groupId}`);
    }
    const normalized = {
      stateId: String(stateId),
      state: stateName
    };
    const seenProperties = new Set();
    for (const value of values) {
      const propertyId = Number(value.propertyId);
      const field = BUS_STATE_FIELDS.get(propertyId);
      const definition = definitions.get(propertyId);
      const filter = propertyId === BUS_LOW_PASS_STATE_PROPERTY || propertyId === BUS_HIGH_PASS_STATE_PROPERTY;
      const expectedAccumulation = filter ? SFX_FILTER_ACCUMULATION : SFX_ADDITIVE_ACCUMULATION;
      const expectedInDb = propertyId === BUS_VOLUME_STATE_PROPERTY;
      if (seenProperties.has(propertyId)) {
        throw new Error(`duplicate Audio Bus ${field} state value in group ${groupId}`);
      }
      seenProperties.add(propertyId);
      if (!definition || Number(definition.accumulation) !== expectedAccumulation || definition.inDb !== expectedInDb) {
        throw new Error(`unsupported Audio Bus ${field} state definition in group ${groupId}`);
      }
      const number = Number(value.value);
      if (!Number.isFinite(number)) {
        throw new Error(`non-finite Audio Bus ${field} state ${stateId} in group ${groupId}`);
      }
      normalized[field] = number;
    }
    states.push(normalized);
  }
  if (!states.length) return null;
  states.sort((left, right) => Number(left.stateId) - Number(right.stateId));
  return {
    groupId: String(groupId),
    group: namedGroup.name,
    syncType,
    effectiveSyncType: 0,
    states
  };
}
function NormalizeBusStateCatalog(value) {
  const buses = {};
  for (const busId of Object.keys(value.buses ?? {}).sort((left, right) => Number(left) - Number(right))) {
    buses[String(busId)] = value.buses[busId].map(group => ({
      groupId: String(group.groupId),
      group: String(group.group),
      syncType: Number(group.syncType),
      effectiveSyncType: Number(group.effectiveSyncType),
      states: group.states.map(state => ({
        stateId: String(state.stateId),
        state: String(state.state),
        ...Object.fromEntries(["gainDb", "pitchCents", "lowPass", "highPass"].filter(field => state[field] !== undefined).map(field => [field, Number(state[field])]))
      }))
    }));
  }
  return {
    schemaVersion: Number(value.schemaVersion),
    ...(Number(value.schemaVersion) === 1 ? {
      property: String(value.property),
      accumulation: String(value.accumulation),
      unit: String(value.unit)
    } : {}),
    ...(value.filterBehavior === undefined ? {} : {
      filterBehavior: String(value.filterBehavior)
    }),
    stateTransitions: NormalizeStateTransitions(value.stateTransitions),
    buses
  };
}
function CreateBusDuckingCatalog(buses) {
  const sources = {};
  for (const [rawSourceBusId, bus] of [...buses.entries()].sort(([left], [right]) => left - right)) {
    if (!bus.ducks?.length) continue;
    const sourceBusId = NormalizeWwiseUint32(rawSourceBusId, "Audio Bus ducking source id");
    if (bus.type !== "audio-bus") {
      throw new Error(`unsupported Auxiliary Bus ducking source ${sourceBusId}`);
    }
    const recoveryMs = Number(bus.recoveryTime);
    const maxDuckVolumeDb = Number(bus.maxDuckVolume);
    if (!Number.isSafeInteger(recoveryMs) || recoveryMs < 0) {
      throw new Error(`invalid Audio Bus ducking recovery ${sourceBusId}`);
    }
    if (!Number.isFinite(maxDuckVolumeDb) || maxDuckVolumeDb < -200 || maxDuckVolumeDb > 0) {
      throw new Error(`invalid Audio Bus maximum duck volume ${sourceBusId}`);
    }
    const ancestors = new Set();
    let ancestor = Number(bus.overrideBusId) >>> 0;
    while (ancestor) {
      if (ancestors.has(ancestor)) {
        throw new Error(`Audio bus ancestry cycle at ${ancestor}`);
      }
      ancestors.add(ancestor);
      const parent = buses.get(ancestor);
      if (!parent) {
        throw new Error(`Audio bus ancestry is missing ${ancestor}`);
      }
      ancestor = Number(parent.overrideBusId) >>> 0;
    }
    const targetIds = new Set();
    const targets = bus.ducks.map((duck, index) => {
      const targetBusId = NormalizeWwiseUint32(duck.busId, `Audio Bus ducking source ${sourceBusId} target ${index}`);
      const targetBus = buses.get(Number(targetBusId));
      const volumeDb = Number(duck.volume);
      const fadeOutMs = Number(duck.fadeOutTime);
      const fadeInMs = Number(duck.fadeInTime);
      const curve = Number(duck.curve);
      const targetPropertyId = Number(duck.targetPropertyId);
      if (!targetBus || targetBus.type !== "audio-bus") {
        throw new Error(`Audio Bus ducking target ${targetBusId} is not an Audio Bus`);
      }
      if (targetBusId === sourceBusId || ancestors.has(Number(targetBusId))) {
        throw new Error(`Audio Bus ${sourceBusId} cannot duck itself or parent ${targetBusId}`);
      }
      if (targetIds.has(targetBusId)) {
        throw new Error(`Audio Bus ${sourceBusId} has duplicate duck target ${targetBusId}`);
      }
      targetIds.add(targetBusId);
      if (!Number.isFinite(volumeDb) || volumeDb < maxDuckVolumeDb || volumeDb > 0) {
        throw new Error(`invalid Audio Bus duck volume ${sourceBusId}:${targetBusId}`);
      }
      if (!Number.isSafeInteger(fadeOutMs) || fadeOutMs < 0 || !Number.isSafeInteger(fadeInMs) || fadeInMs < 0) {
        throw new Error(`invalid Audio Bus duck fade ${sourceBusId}:${targetBusId}`);
      }
      if (!Number.isSafeInteger(curve) || curve < 0 || curve > 9) {
        throw new Error(`invalid Audio Bus duck curve ${sourceBusId}:${targetBusId}`);
      }
      const targetProperty = targetPropertyId === DUCK_VOICE_VOLUME_PROPERTY ? "voice-volume" : targetPropertyId === DUCK_BUS_VOLUME_PROPERTY ? "bus-volume" : null;
      if (!targetProperty) {
        throw new Error(`unsupported Audio Bus duck target property ${targetPropertyId}`);
      }
      return {
        targetBusId,
        volumeDb,
        fadeOutMs,
        fadeInMs,
        curve,
        targetProperty
      };
    }).sort((left, right) => Number(left.targetBusId) - Number(right.targetBusId));
    sources[sourceBusId] = {
      recoveryMs,
      maxDuckVolumeDb,
      targets
    };
  }
  return {
    schemaVersion: 1,
    sources
  };
}
function CreateBusEffectCatalog(inspections, buses, routedBusIds) {
  if (!routedBusIds.size) {
    return {
      schemaVersion: 1,
      buses: {}
    };
  }
  const parsed = CjsBnkFormat.wwise.effectNodesFromBanks(inspections);
  if (parsed.diagnostics.failed.length || parsed.diagnostics.unsupportedVersions.length) {
    throw new Error("Audio Bus effect qualification failed");
  }
  const result = {};
  const activeEffectsByBus = new Map();
  const unsupportedBusIds = new Set();
  for (const rawBusId of [...routedBusIds].map(Number).sort((left, right) => left - right)) {
    const bus = buses.get(rawBusId);
    if (!bus || bus.fx?.bypassAll) continue;
    const activeEffects = [];
    for (const slot of [...(bus.fx?.slots ?? [])].sort((left, right) => left.index - right.index)) {
      if (slot.bypass) continue;
      if ((Number(slot.flags) & -4) !== 0) {
        throw new Error(`Audio Bus ${rawBusId} effect ${slot.fxId} has unsupported slot flags`);
      }
      const effect = parsed.effects.get(slot.fxId);
      if (!effect) {
        throw new Error(`Audio Bus ${rawBusId} effect ${slot.fxId} is missing`);
      }
      const expectsShareSet = effect.type === "effect-share-set";
      if (slot.shareSet !== expectsShareSet) {
        throw new Error(`Audio Bus ${rawBusId} effect ${slot.fxId} has a mismatched ShareSet flag`);
      }
      activeEffects.push({
        slot,
        effect
      });
      if (effect.pluginId !== PARAMETRIC_EQ_PLUGIN_ID) {
        unsupportedBusIds.add(rawBusId);
      }
    }
    if (activeEffects.length) {
      activeEffectsByBus.set(rawBusId, activeEffects);
    }
  }

  // A distributed linear adapter may only cross a route whose complete
  // active slot sequence is understood. Skipping an unsupported Compressor,
  // limiter, reverb, or other slot and applying a later EQ changes authored
  // order and, for nonlinear stages, cross-voice behavior. Conservatively
  // suppress every catalog entry on any routed ancestry that crosses such a
  // barrier. A future shared bus graph can qualify and realize those paths.
  const unsafeBusIds = new Set();
  for (const rawBusId of [...routedBusIds].map(Number)) {
    const path = [];
    const active = new Set();
    let current = rawBusId;
    let unsupported = false;
    while (current) {
      if (active.has(current)) {
        throw new Error(`Audio bus ancestry cycle at ${current}`);
      }
      active.add(current);
      path.push(current);
      unsupported ||= unsupportedBusIds.has(current);
      const bus = buses.get(current);
      if (!bus) {
        throw new Error(`Audio bus ancestry is missing ${current}`);
      }
      current = Number(bus.overrideBusId) >>> 0;
    }
    if (unsupported) {
      for (const busId of path) unsafeBusIds.add(busId);
    }
  }
  for (const [rawBusId, activeEffects] of activeEffectsByBus) {
    if (unsafeBusIds.has(rawBusId)) continue;
    const effects = activeEffects.map(({
      slot,
      effect
    }) => ParseStaticParametricEq(`Bus ${rawBusId}`, slot, effect));
    if (effects.length) result[String(rawBusId)] = effects;
  }
  return {
    schemaVersion: 1,
    buses: result
  };
}
function CreateBusGraphCatalog(inspections, musicInspections, buses) {
  const effectsResult = CjsBnkFormat.wwise.effectNodesFromBanks(inspections);
  const sfxResult = CjsBnkFormat.wwise.sfxNodesFromBanks(inspections);
  const musicResult = musicInspections.length ? CjsBnkFormat.wwise.musicNodesFromBanks(musicInspections) : {
    nodes: new Map(),
    diagnostics: {
      failed: [],
      unsupportedVersions: []
    }
  };
  if (effectsResult.diagnostics.failed.length || effectsResult.diagnostics.unsupportedVersions.length || sfxResult.diagnostics.failed.length || sfxResult.diagnostics.unsupportedVersions?.length || musicResult.diagnostics.failed.length || musicResult.diagnostics.unsupportedVersions?.length) {
    throw new Error("Audio Bus graph qualification failed");
  }
  const candidates = [];
  for (const [id, node] of sfxResult.nodes) {
    if (node.type !== "sound") continue;
    const routing = CreateSfxBusRouting(sfxResult, id, buses);
    if (!routing) continue;
    candidates.push({
      kind: "sfx",
      nodeId: String(id),
      route: {
        ...routing,
        ...CreateEffectiveNodeAuxRouting(id, current => sfxResult.nodeBases.get(current))
      }
    });
  }
  for (const [id, node] of musicResult.nodes) {
    if (node.type !== "music-track") continue;
    const routing = CreateMusicBusRouting(musicResult.nodes, id, buses);
    if (!routing) continue;
    candidates.push({
      kind: "music",
      nodeId: String(id),
      route: {
        ...routing,
        ...CreateEffectiveNodeAuxRouting(id, current => musicResult.nodes.get(current)?.nodeBase)
      }
    });
  }
  const routesBySignature = new Map();
  for (const candidate of candidates) {
    const signature = JSON.stringify(candidate.route);
    if (!routesBySignature.has(signature)) {
      routesBySignature.set(signature, candidate.route);
    }
    candidate.signature = signature;
  }
  const signatures = [...routesBySignature.keys()].sort();
  const routeIndices = new Map(signatures.map((signature, index) => [signature, index]));
  const routes = signatures.map(signature => routesBySignature.get(signature));
  const sfxRoutes = {};
  const musicRoutes = {};
  for (const candidate of candidates.sort((left, right) => Number(left.nodeId) - Number(right.nodeId))) {
    const target = candidate.kind === "sfx" ? sfxRoutes : musicRoutes;
    target[candidate.nodeId] = routeIndices.get(candidate.signature);
  }
  const reachable = new Set();
  const pending = routes.flatMap(route => [...route.busPathIds, ...(route.userAuxSends ?? []).map(send => send.targetBusId), route.reflectionsAuxSend?.targetBusId].filter(Boolean).map(Number));
  while (pending.length) {
    const busId = Number(pending.pop()) >>> 0;
    if (!busId || reachable.has(busId)) continue;
    const bus = buses.get(busId);
    if (!bus) {
      throw new Error(`Audio Bus graph references missing bus ${busId}`);
    }
    reachable.add(busId);
    const busAux = CreateAuthoredAuxRouting(bus, `Audio Bus ${busId}`);
    pending.push(Number(bus.overrideBusId) >>> 0, ...(busAux.userAuxSends ?? []).map(send => Number(send.targetBusId)), Number(busAux.reflectionsAuxSend?.targetBusId) >>> 0);
  }
  const graphBuses = {};
  const graphEffects = {};
  for (const busId of [...reachable].sort((left, right) => left - right)) {
    const bus = buses.get(busId);
    const aux = CreateAuthoredAuxRouting(bus, `Audio Bus ${busId}`);
    const slots = [...(bus.fx?.slots ?? [])].sort((left, right) => left.index - right.index).map(slot => {
      if ((Number(slot.flags) & -8) !== 0) {
        throw new Error(`Audio Bus ${busId} effect ${slot.fxId} has unsupported slot flags`);
      }
      const effect = effectsResult.effects.get(slot.fxId);
      if (!effect) {
        throw new Error(`Audio Bus ${busId} effect ${slot.fxId} is missing`);
      }
      const expectsShareSet = effect.type === "effect-share-set";
      if (slot.shareSet !== expectsShareSet) {
        throw new Error(`Audio Bus ${busId} effect ${slot.fxId} has a mismatched ShareSet flag`);
      }
      graphEffects[String(effect.id)] = CreatePortableEffect(effect);
      return {
        slotIndex: Number(slot.index),
        effectId: String(effect.id),
        bypass: Boolean(slot.bypass),
        shareSet: Boolean(slot.shareSet),
        rendered: Boolean(slot.rendered)
      };
    });
    const reasons = [];
    if (bus.type === "auxiliary-bus") reasons.push("auxiliary-bus");
    if (aux.userAuxSends?.length || aux.reflectionsAuxSend) {
      reasons.push("aux-sends");
    }
    if (aux.userAuxSends?.some(send => send.dynamic) || aux.reflectionsAuxSend?.dynamic) {
      reasons.push("dynamic-aux");
    }
    if (!bus.fx?.bypassAll && slots.some(slot => !slot.bypass)) {
      reasons.push("effects");
    }
    if (bus.positioning?.listenerRelative) reasons.push("positioning");
    if (bus.hdr?.enabled) reasons.push("hdr");
    if (bus.rtpcs?.length) {
      const parameterIds = bus.rtpcs.map(rtpc => Number(rtpc.parameterId));
      if (parameterIds.some(id => BUS_RTPC_PROPERTIES.has(id))) {
        reasons.push("rtpc");
      }
      if (parameterIds.includes(BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY)) {
        reasons.push("voice-limits");
      }
      if (parameterIds.some(id => !BUS_RTPC_PROPERTIES.has(id) && id !== BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY)) {
        reasons.push("unsupported-rtpc");
      }
    }
    if (bus.state?.properties?.length || bus.state?.groups?.length) {
      reasons.push("state");
    }
    if (bus.ducks?.length) reasons.push("ducking");
    graphBuses[String(busId)] = {
      type: bus.type,
      ...(Number(bus.overrideBusId) >>> 0 ? {
        parentBusId: String(Number(bus.overrideBusId) >>> 0)
      } : {}),
      channelConfig: {
        ...bus.channelConfig
      },
      properties: [...(bus.properties ?? [])].map(property => ({
        id: Number(property.id),
        rawValue: Number(property.rawValue) >>> 0
      })).sort((left, right) => left.id - right.id),
      positioning: {
        flags: Number(bus.positioning?.flags) || 0,
        overrideParent: Boolean(bus.positioning?.overrideParent),
        listenerRelative: Boolean(bus.positioning?.listenerRelative),
        pannerType: Number(bus.positioning?.pannerType) || 0,
        positionType: Number(bus.positioning?.positionType) || 0
      },
      hdr: {
        flags: Number(bus.hdr?.flags) || 0,
        enabled: Boolean(bus.hdr?.enabled),
        exponentialRelease: Boolean(bus.hdr?.exponentialRelease)
      },
      auxFlags: Number(bus.aux?.flags) || 0,
      bypassAllEffects: Boolean(bus.fx?.bypassAll),
      ...(bus.busVolume === null || bus.busVolume === undefined ? {} : {
        busVolumeDb: Number(bus.busVolume)
      }),
      ...(bus.makeUpGain === null || bus.makeUpGain === undefined ? {} : {
        makeUpGainDb: Number(bus.makeUpGain)
      }),
      ...(bus.outputBusVolume === null || bus.outputBusVolume === undefined ? {} : {
        outputBusVolumeDb: Number(bus.outputBusVolume)
      }),
      ...aux,
      effects: slots,
      requiresProcessing: reasons.sort()
    };
  }
  return {
    schemaVersion: 1,
    buses: graphBuses,
    effects: Object.fromEntries(Object.entries(graphEffects).sort(([left], [right]) => Number(left) - Number(right))),
    routes,
    sfxRoutes,
    musicRoutes
  };
}
function CreateEffectiveNodeAuxRouting(rawId, getNodeBase) {
  const active = new Set();
  let current = Number(rawId) >>> 0;
  let userAuxSends;
  let reflectionsAuxSend;
  let userResolved = false;
  let reflectionsResolved = false;
  while (current) {
    if (active.has(current)) {
      throw new Error(`Wwise NodeBase aux ancestry cycle at ${current}`);
    }
    active.add(current);
    const nodeBase = getNodeBase(current);
    if (!nodeBase) break;
    const parentId = Number(nodeBase.directParentId) >>> 0;
    const root = parentId === 0;

    // wwiser's AkAuxList applies a root object's authored list even when
    // the override bit is clear: there is no parent to inherit from. Only
    // a non-root child with override=0 defers to its parent.
    if (!userResolved && (nodeBase.aux?.overrideUserAux || root)) {
      userAuxSends = CreateAuxSends(nodeBase, `Wwise NodeBase ${current}`);
      userResolved = true;
    }
    if (!reflectionsResolved && (nodeBase.aux?.overrideReflectionsAux || root)) {
      reflectionsAuxSend = CreateReflectionsAuxSend(nodeBase, `Wwise NodeBase ${current}`);
      reflectionsResolved = true;
    }
    if (userResolved && reflectionsResolved) break;
    current = parentId;
  }
  return {
    ...(userAuxSends?.length ? {
      userAuxSends
    } : {}),
    ...(reflectionsAuxSend ? {
      reflectionsAuxSend
    } : {})
  };
}
function CreateAuthoredAuxRouting(value, label) {
  const root = Number(value.overrideBusId) >>> 0 === 0;
  const result = {
    ...(value.aux?.overrideUserAux || root ? {
      userAuxSends: CreateAuxSends(value, label)
    } : {}),
    ...(value.aux?.overrideReflectionsAux || root ? {
      reflectionsAuxSend: CreateReflectionsAuxSend(value, label)
    } : {})
  };
  return result;
}
function CreateAuxSends(value, label) {
  if (!value.aux?.hasAux) return [];
  const result = [];
  for (let slotIndex = 0; slotIndex < 4; slotIndex++) {
    const targetBusId = Number(value.aux.auxIds?.[slotIndex]) >>> 0;
    if (!targetBusId) continue;
    result.push({
      slotIndex,
      targetBusId: String(targetBusId),
      gainDb: ReadAuxProperty(value.properties, WWISE_USER_AUX_VOLUME_PROPERTY + slotIndex, 0, `${label} User Aux Send ${slotIndex} Volume`),
      lowPass: ReadAuxProperty(value.properties, WWISE_USER_AUX_LOW_PASS_PROPERTY + slotIndex, 0, `${label} User Aux Send ${slotIndex} LPF`, 0, 100),
      highPass: ReadAuxProperty(value.properties, WWISE_USER_AUX_HIGH_PASS_PROPERTY + slotIndex, 0, `${label} User Aux Send ${slotIndex} HPF`, 0, 100),
      dynamic: AuxSlotHasDynamicControls(value, slotIndex)
    });
  }
  return result;
}
function CreateReflectionsAuxSend(value, label) {
  const targetBusId = Number(value.aux?.reflectionsAuxBusId) >>> 0;
  if (!targetBusId) return undefined;
  return {
    targetBusId: String(targetBusId),
    gainDb: ReadAuxProperty(value.properties, WWISE_REFLECTIONS_VOLUME_PROPERTY, 0, `${label} Reflections Volume`),
    dynamic: ReflectionsHaveDynamicControls(value)
  };
}
function AuxSlotHasDynamicControls(value, slotIndex) {
  const propertyIds = new Set([0x08 + slotIndex, 0x10 + slotIndex, 0x14 + slotIndex]);
  const parameterIds = new Set([0x27 + slotIndex, 0x30 + slotIndex, 0x34 + slotIndex]);
  return (value.ranges ?? []).some(range => propertyIds.has(Number(range.id))) || (value.rtpcs ?? []).some(control => parameterIds.has(Number(control.parameterId))) || (value.state?.properties ?? []).some(property => propertyIds.has(Number(property.propertyId)));
}
function ReflectionsHaveDynamicControls(value) {
  return (value.ranges ?? []).some(range => Number(range.id) === 0x1a) || (value.rtpcs ?? []).some(control => Number(control.parameterId) === 0x2f) || (value.state?.properties ?? []).some(property => Number(property.propertyId) === 0x1a);
}
function ReadAuxProperty(properties, propertyId, fallback, label, minimum = -200, maximum = 200) {
  const matches = (properties ?? []).filter(property => Number(property.id) === propertyId);
  if (matches.length > 1) throw new Error(`${label} is duplicated`);
  if (!matches.length) return fallback;
  const value = Number(matches[0].floatValue);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}
function CreatePortableEffect(effect) {
  const parameterBlock = effect.parameterBlock ?? new Uint8Array();
  return {
    type: effect.type,
    pluginId: Number(effect.pluginId) >>> 0,
    pluginType: Number(effect.pluginType),
    companyId: Number(effect.companyId),
    pluginClassId: Number(effect.pluginClassId),
    parameterByteLength: parameterBlock.byteLength,
    parametersBase64: BytesToBase64(parameterBlock),
    media: [...(effect.media ?? [])].map(media => ({
      index: Number(media.index),
      sourceId: String(Number(media.sourceId) >>> 0)
    })).sort((left, right) => left.index - right.index),
    controls: {
      rtpcCount: effect.rtpcs?.length ?? 0,
      statePropertyCount: effect.state?.properties?.length ?? 0,
      stateGroupCount: effect.state?.groups?.length ?? 0,
      propertyValueCount: effect.propertyValues?.length ?? 0
    }
  };
}
function BytesToBase64(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let at = 0; at < bytes.byteLength; at += 3) {
    const first = bytes[at];
    const hasSecond = at + 1 < bytes.byteLength;
    const hasThird = at + 2 < bytes.byteLength;
    const second = hasSecond ? bytes[at + 1] : 0;
    const third = hasThird ? bytes[at + 2] : 0;
    const value = first << 16 | second << 8 | third;
    result += alphabet[value >>> 18 & 0x3f];
    result += alphabet[value >>> 12 & 0x3f];
    result += hasSecond ? alphabet[value >>> 6 & 0x3f] : "=";
    result += hasThird ? alphabet[value & 0x3f] : "=";
  }
  return result;
}
function ParseStaticParametricEq(ownerLabel, slot, effect) {
  if (effect.media?.length || effect.rtpcs?.length || effect.state?.properties?.length || effect.state?.groups?.length || effect.propertyValues?.length) {
    throw new Error(`Wwise Parametric EQ ${effect.id} on ${ownerLabel} is not static`);
  }
  return parseStaticParametricEqBytes(effect.parameterBlock, {
    effectId: effect.id,
    slotIndex: slot.index,
    label: `Wwise Parametric EQ ${effect.id} on ${ownerLabel}`
  });
}

/**
 * Reads the exact static v150 Wwise Silence source shape used by EVE. The
 * Sound's source ID references a CAkFxCustom object; its empty inline source
 * block is not permission to substitute the plug-in's default duration.
 */
function ParseStaticWwiseSilenceDuration(effects, source, rawId) {
  const soundId = Number(rawId) >>> 0;
  const effect = effects?.get(Number(source.sourceId) >>> 0);
  if (!effect || effect.type !== "effect-custom" || effect.pluginId !== WWISE_SILENCE_SOURCE_PLUGIN_ID || effect.pluginId !== source.pluginId || effect.media?.length || effect.rtpcs?.length || effect.state?.properties?.length || effect.state?.groups?.length || effect.propertyValues?.length) {
    throw new Error(`unsupported Wwise Silence source ${soundId}`);
  }
  const bytes = effect.parameterBlock;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 12) {
    throw new Error(`Wwise Silence source ${soundId} requires 12 static parameter bytes`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const durationSeconds = view.getFloat32(0, true);
  const randomizedMinus = view.getFloat32(4, true);
  const randomizedPlus = view.getFloat32(8, true);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || randomizedMinus !== 0 || randomizedPlus !== 0) {
    throw new Error(`Wwise Silence source ${soundId} is not a static positive duration`);
  }
  return durationSeconds * 1000;
}

/**
 * Projects only a Sound's complete direct static EQ override. Parent effects,
 * dynamic controls, mixed chains, and independent LFE routing keep the
 * existing documented dry-playback approximation.
 */
function CreateSfxSoundEffectProjection(parsed, effects, rawId) {
  const soundId = Number(rawId) >>> 0;
  const fx = parsed.nodeBases.get(soundId)?.fx;
  if (!fx || fx.overrideParentRaw !== 1 || fx.bypassAllRaw !== 0 && fx.bypassAllRaw !== 1 || fx.bypassAll) {
    return {};
  }
  const slots = [...(fx.slots ?? [])].sort((left, right) => left.index - right.index);
  const seen = new Set();
  const chain = [];
  try {
    for (const slot of slots) {
      const slotIndex = Number(slot.index);
      const flags = Number(slot.flags);
      if (!Number.isSafeInteger(slotIndex) || slotIndex < 0 || slotIndex > 3 || seen.has(slotIndex) || !Number.isSafeInteger(flags) || (flags & ~0x07) !== 0) {
        return {};
      }
      seen.add(slotIndex);
      if (slot.bypass || slot.rendered) continue;
      const effect = effects?.get(slot.fxId);
      if (!effect || effect.pluginId !== PARAMETRIC_EQ_PLUGIN_ID || slot.shareSet !== (effect.type === "effect-share-set")) {
        return {};
      }
      chain.push(ParseStaticParametricEq(`Sound ${soundId}`, slot, effect));
    }
  } catch {
    return {};
  }
  return chain.length ? {
    sourceEffects: chain
  } : {};
}
function NormalizeBusDuckingCatalog(value) {
  const sources = {};
  for (const sourceBusId of Object.keys(value.sources ?? {}).sort((left, right) => Number(left) - Number(right))) {
    const source = value.sources[sourceBusId];
    sources[String(sourceBusId)] = {
      recoveryMs: Number(source.recoveryMs),
      maxDuckVolumeDb: Number(source.maxDuckVolumeDb),
      targets: source.targets.map(target => ({
        targetBusId: String(target.targetBusId),
        volumeDb: Number(target.volumeDb),
        fadeOutMs: Number(target.fadeOutMs),
        fadeInMs: Number(target.fadeInMs),
        curve: Number(target.curve),
        targetProperty: String(target.targetProperty)
      }))
    };
  }
  return {
    schemaVersion: 1,
    sources
  };
}
function NormalizeBusEffectCatalog(value) {
  const buses = {};
  for (const busId of Object.keys(value.buses ?? {}).sort((left, right) => Number(left) - Number(right))) {
    buses[String(busId)] = value.buses[busId].map(effect => ({
      effectId: String(effect.effectId),
      slotIndex: Number(effect.slotIndex),
      type: String(effect.type),
      bands: effect.bands.map(band => ({
        index: Number(band.index),
        filterType: String(band.filterType),
        gainDb: Number(band.gainDb),
        frequencyHz: Number(band.frequencyHz),
        q: Number(band.q)
      })),
      outputGainDb: Number(effect.outputGainDb),
      processLfe: effect.processLfe === true
    }));
  }
  return {
    schemaVersion: 1,
    buses
  };
}
function CreateSfxBusRouting(parsed, rawID, buses) {
  const active = new Set();
  let current = Number(rawID) >>> 0;
  while (current && !active.has(current)) {
    active.add(current);
    const nodeBase = parsed.nodeBases?.get(current);
    if (!nodeBase) {
      return null;
    }
    const outputBusId = Number(nodeBase.overrideBusId) >>> 0;
    if (outputBusId) {
      return CreateBusRouting(outputBusId, buses, ReadOutputBusVolume(nodeBase, current));
    }
    current = Number(nodeBase.directParentId) >>> 0;
  }
  return null;
}
function CreateMusicBusRouting(nodes, rawID, buses) {
  const active = new Set();
  let current = Number(rawID) >>> 0;
  while (current && !active.has(current)) {
    active.add(current);
    const nodeBase = nodes.get(current)?.nodeBase;
    if (!nodeBase) {
      return null;
    }
    const outputBusId = Number(nodeBase.overrideBusId) >>> 0;
    if (outputBusId) {
      return CreateBusRouting(outputBusId, buses, ReadOutputBusVolume(nodeBase, current));
    }
    current = Number(nodeBase.directParentId) >>> 0;
  }
  return null;
}
function CreateMusicRouteBusIds(inspections, buses) {
  if (!inspections.length) return new Set();
  const parsed = CjsBnkFormat.wwise.musicNodesFromBanks(inspections);
  if (parsed.diagnostics.failed.length) {
    throw new Error("Music bus-route qualification failed");
  }
  const result = new Set();
  for (const [id, node] of parsed.nodes) {
    if (node.type !== "music-track") continue;
    const routing = CreateMusicBusRouting(parsed.nodes, id, buses);
    for (const busId of routing?.busPathIds ?? []) {
      result.add(String(busId));
    }
  }
  return result;
}
function CreateSfxRouteBusIds(inspections, buses) {
  if (!inspections.length) return new Set();
  const parsed = CjsBnkFormat.wwise.sfxNodesFromBanks(inspections);
  if (parsed.diagnostics.failed.length) {
    throw new Error("SFX bus-route qualification failed");
  }
  const result = new Set();
  for (const [id, node] of parsed.nodes) {
    if (node.type !== "sound") continue;
    const routing = CreateSfxBusRouting(parsed, id, buses);
    for (const busId of routing?.busPathIds ?? []) {
      result.add(String(busId));
    }
  }
  return result;
}
function ReadOutputBusVolume(nodeBase, nodeID) {
  const properties = (nodeBase.properties ?? []).filter(property => Number(property.id) === WWISE_OUTPUT_BUS_VOLUME_PROPERTY);
  if (properties.length > 1) {
    throw new Error(`Wwise NodeBase ${nodeID} has duplicate Output Bus Volume properties`);
  }
  if (!properties.length) {
    return undefined;
  }
  const value = Number(properties[0].floatValue);
  if (!Number.isFinite(value)) {
    throw new Error(`Wwise NodeBase ${nodeID} has invalid Output Bus Volume`);
  }
  return value;
}
function CreateBusRouting(rawOutputBusId, buses, authoredOutputBusVolumeDb = undefined) {
  const outputBusId = String(Number(rawOutputBusId) >>> 0);
  if (authoredOutputBusVolumeDb !== undefined && !Number.isFinite(Number(authoredOutputBusVolumeDb))) {
    throw new Error("Wwise Output Bus Volume must be finite");
  }
  const outputBusVolumeDb = Number(authoredOutputBusVolumeDb) || 0;
  if (!(buses instanceof Map)) {
    return {
      outputBusId,
      busPathIds: [outputBusId],
      ...(outputBusVolumeDb === 0 ? {} : {
        authoredOutputBusVolumeDb: outputBusVolumeDb
      })
    };
  }
  const busPathIds = [];
  const active = new Set();
  let current = Number(rawOutputBusId) >>> 0;
  let authoredBusVolumeDb = 0;
  let authoredBusMakeUpGainDb = 0;
  while (current) {
    if (active.has(current)) {
      throw new Error(`Audio bus ancestry cycle at ${current}`);
    }
    active.add(current);
    const bus = buses.get(current);
    if (!bus) {
      throw new Error(`Audio bus ancestry is missing ${current}`);
    }
    busPathIds.push(String(current));
    if (bus.busVolume !== null && bus.busVolume !== undefined) {
      const value = Number(bus.busVolume);
      if (!Number.isFinite(value)) {
        throw new Error(`Audio bus ${current} has invalid Bus Volume`);
      }
      authoredBusVolumeDb += value;
    }
    if (bus.makeUpGain !== null && bus.makeUpGain !== undefined) {
      const value = Number(bus.makeUpGain);
      if (!Number.isFinite(value)) {
        throw new Error(`Audio bus ${current} has invalid Make-Up Gain`);
      }
      authoredBusMakeUpGainDb += value;
    }
    current = Number(bus.overrideBusId) >>> 0;
  }
  return {
    outputBusId,
    busPathIds,
    ...(authoredBusVolumeDb === 0 ? {} : {
      authoredBusVolumeDb
    }),
    ...(authoredBusMakeUpGainDb === 0 ? {} : {
      authoredBusMakeUpGainDb
    }),
    ...(outputBusVolumeDb === 0 ? {} : {
      authoredOutputBusVolumeDb: outputBusVolumeDb
    })
  };
}
function CreateSfxStopRelationships(parsed, leavesByEvent, stopTargetsByEvent) {
  const events = {};
  const projected = [];
  const unresolved = [];
  const ancestry = new Map();
  const ancestors = leafID => {
    const leaf = Number(leafID) >>> 0;
    if (ancestry.has(leaf)) {
      return ancestry.get(leaf);
    }
    const result = new Set();
    const active = new Set();
    let current = leaf;
    while (current && !active.has(current)) {
      active.add(current);
      result.add(current);
      const parent = Number(parsed.nodeBases?.get(current)?.directParentId) >>> 0;
      current = parent;
    }
    ancestry.set(leaf, result);
    return result;
  };
  const stopEntries = [...stopTargetsByEvent.entries()].sort(([left], [right]) => compareText(left, right));
  for (const [stoppingName, targets] of stopEntries) {
    const matchedTargets = new Set();
    for (const [stoppedName, leaves] of [...leavesByEvent.entries()].sort(([left], [right]) => compareText(left, right))) {
      const stops = [...targets].some(target => {
        for (const leaf of leaves) {
          if (ancestors(leaf).has(target)) {
            matchedTargets.add(target);
            return true;
          }
        }
        return false;
      });
      if (!stops) {
        continue;
      }
      const record = events[stoppedName] ?? (events[stoppedName] = {
        eventsStoppedBy: []
      });
      record.eventsStoppedBy.push(stoppingName);
      projected.push({
        stopped: stoppedName,
        stopping: stoppingName
      });
    }
    for (const targetId of [...targets].sort((left, right) => left - right)) {
      if (!matchedTargets.has(targetId)) {
        unresolved.push({
          event: stoppingName,
          targetId
        });
      }
    }
  }
  return {
    events,
    diagnostics: {
      projected,
      unresolved
    }
  };
}
function MergeSfxEventMetadata(...projections) {
  const names = new Set();
  for (const projection of projections) {
    for (const name of Object.keys(projection ?? {})) {
      names.add(name);
    }
  }
  const result = {};
  for (const name of [...names].sort(compareText)) {
    result[name] = Object.assign({}, ...projections.map(projection => projection?.[name] ?? {}));
  }
  return result;
}
function CreateSfxEventMediaTable(sfx) {
  const events = sfx?.events;
  const nodes = sfx?.nodes;
  if (!events || typeof events !== "object" || Array.isArray(events) || !nodes || typeof nodes !== "object" || Array.isArray(nodes)) {
    throw new TypeError("Authored SFX event-media projection requires events and nodes");
  }
  const table = {};
  for (const eventName of Object.keys(events).sort()) {
    const pending = (events[eventName] ?? []).map(child => String(child?.nodeId ?? child));
    const visited = new Set();
    const media = new Set();
    while (pending.length) {
      const id = pending.pop();
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);
      const node = nodes[id];
      if (!node) {
        throw new TypeError(`Authored SFX event ${eventName} references missing node ${id}`);
      }
      if (node.type === "sound") {
        media.add(String(node.mediaId));
        continue;
      }
      for (const child of SfxNodeChildren(node)) {
        pending.push(String(child?.nodeId ?? child));
      }
    }
    if (media.size) {
      table[eventName] = [...media].sort((left, right) => Number(left) - Number(right));
    }
  }
  return table;
}
function SfxNodeChildren(node) {
  if (node.type === "switch") {
    return [...Object.values(node.cases ?? {}), ...(node.default === undefined || node.default === null ? [] : [node.default])];
  }
  return node.children ?? [];
}
function CreateSfxSpatialProjection(parsed, leavesByEvent, nodes) {
  const cache = new Map();
  const active = new Set();
  const events = {};
  const projected = [];
  const omitted = [];
  const resolve = rawID => {
    const id = Number(rawID) >>> 0;
    if (cache.has(id)) {
      return cache.get(id);
    }
    if (active.has(id)) {
      return {
        known: false,
        reason: `positioning parent cycle at ${id}`
      };
    }
    const nodeBase = parsed.nodeBases?.get(id);
    if (!nodeBase) {
      const result = {
        known: false,
        reason: `missing NodeBase ${id}`
      };
      cache.set(id, result);
      return result;
    }
    active.add(id);
    let result;
    try {
      if (nodeBase.positioning?.overrideParent) {
        const attenuationId = Number(nodeBase.attenuationId) >>> 0;
        const attenuationProjection = attenuationId ? GetSfxAttenuationProjection(parsed, attenuationId) : null;
        result = {
          known: true,
          // Carbon's generated is2D metadata follows the resolved
          // positioning owner's attenuation assignment, not merely
          // Wwise's listener-relative-routing bit. A v150
          // Common+Effects+Modules corpus comparison matched the
          // source audio metadata for every fully lowered event.
          is2D: attenuationId === 0,
          ...(attenuationProjection === null ? {} : attenuationProjection)
        };
      } else {
        const parentId = Number(nodeBase.directParentId) >>> 0;
        result = parentId ? resolve(parentId) : {
          known: false,
          reason: `NodeBase ${id} inherits from no serialized parent`
        };
      }
    } finally {
      active.delete(id);
    }
    cache.set(id, result);
    return result;
  };
  for (const [name, leafSet] of leavesByEvent) {
    const leafIds = [...leafSet].sort((left, right) => left - right);
    const resolved = leafIds.map(resolve);
    const unknown = resolved.filter(value => !value.known).map(value => value.reason);
    for (let index = 0; index < leafIds.length; index++) {
      const result = resolved[index];
      const node = nodes[String(leafIds[index])];
      if (result.known && node?.type === "sound") {
        node.spatial = !result.is2D;
        if (result.dryVolumeCurve) {
          node.dryVolumeCurve = result.dryVolumeCurve;
        }
      }
    }
    if (!leafIds.length || unknown.length) {
      omitted.push({
        name,
        leafIds,
        reasons: [...new Set(unknown.length ? unknown : ["event has no playable leaves"])]
      });
      continue;
    }
    const is2D = resolved.every(value => value.is2D) ? 1 : 0;
    const spatialLeaves = resolved.filter(value => !value.is2D);
    const radii = spatialLeaves.map(value => value.maxRadiusAttenuation);
    const hasCompleteRadius = spatialLeaves.length > 0 && radii.every(value => Number.isFinite(value));
    const maxRadiusAttenuation = hasCompleteRadius ? Math.max(...radii) : null;
    events[name] = {
      is2D,
      ...(maxRadiusAttenuation === null ? {} : {
        maxRadiusAttenuation
      })
    };
    projected.push({
      name,
      leafIds,
      is2D,
      ...(maxRadiusAttenuation === null ? {} : {
        maxRadiusAttenuation
      })
    });
  }
  return {
    events,
    diagnostics: {
      projected,
      omitted
    }
  };
}

/** Returns one complete authored dry-volume distance curve and its radius. */
function GetSfxAttenuationProjection(parsed, attenuationId) {
  const attenuation = parsed.attenuations?.get(attenuationId);
  const curveIndex = Number(attenuation?.curveToUse?.[0]);
  if (!Number.isSafeInteger(curveIndex) || curveIndex < 0) {
    return null;
  }
  const curve = attenuation.curves?.[curveIndex];
  const points = curve?.points;
  if (Number(curve?.scaling) !== 2 || !Array.isArray(points) || !points.length) {
    return null;
  }
  let maximum = -Infinity;
  let previous = -Infinity;
  const projectedPoints = [];
  for (const point of points) {
    const distance = Number(point.from);
    const value = Number(point.to);
    const interpolation = Number(point.interpolation ?? 4);
    if (!Number.isFinite(distance) || distance < 0 || distance < previous || !Number.isFinite(value) || !Number.isSafeInteger(interpolation) || interpolation < 0 || interpolation > 9) {
      return null;
    }
    previous = distance;
    maximum = Math.max(maximum, distance);
    projectedPoints.push({
      x: distance,
      value,
      interpolation
    });
  }
  return Number.isFinite(maximum) ? {
    maxRadiusAttenuation: maximum,
    dryVolumeCurve: {
      scaling: 2,
      points: projectedPoints
    }
  } : null;
}
function AddSet(target, source) {
  for (const value of source ?? []) {
    target.add(value);
  }
}

// Wwise's complete voice arbiter combines hierarchy, bus, project, priority,
// and virtual-voice policy. Project only the one EVE Sound shape whose local
// reject-newest result remains determinate after resolving those authored
// ancestors. Everything broader stays absent from the portable graph.
function CreateSfxSoundVoiceLimitProjection(parsed, rawID, buses) {
  const id = Number(rawID) >>> 0;
  const nodeBase = parsed.nodeBases?.get(id);
  const advanced = nodeBase?.advanced;
  if (!nodeBase || advanced?.flags !== 0x09 || advanced.maxInstances !== 1 || !(buses instanceof Map)) {
    return {};
  }
  const chain = [];
  const visited = new Set();
  let currentID = id;
  while (currentID) {
    if (visited.has(currentID)) {
      return {};
    }
    visited.add(currentID);
    const current = parsed.nodeBases?.get(currentID);
    if (!current) {
      return {};
    }
    chain.push(current);
    if (!Number(current.directParentId)) {
      break;
    }
    currentID = Number(current.directParentId) >>> 0;
  }
  const virtualOwner = chain.find(value => value.advanced?.overrideVirtualVoiceBehavior) ?? chain.at(-1);
  if (virtualOwner?.advanced?.belowThresholdBehavior !== 0) {
    return {};
  }
  const priorityPath = [];
  for (const current of chain) {
    priorityPath.push(current);
    if (current.priority?.overrideParent) {
      break;
    }
  }
  if (priorityPath.some(current => (current.ranges ?? []).some(range => Number(range.id) === WWISE_PRIORITY_PROPERTY) || (current.rtpcs ?? []).some(rtpc => Number(rtpc.parameterId) === WWISE_PRIORITY_PROPERTY) || (current.state?.groups ?? []).some(group => (group.states ?? []).some(state => (state.values ?? []).some(value => Number(value.propertyId) === WWISE_PRIORITY_PROPERTY))))) {
    return {};
  }
  const routing = CreateSfxBusRouting(parsed, id, buses);
  if (!routing?.busPathIds?.length || routing.busPathIds.some(rawBusID => {
    const bus = buses.get(Number(rawBusID) >>> 0);
    return !bus || Number(bus.policy?.maxInstances) > 0 || (bus.rtpcs ?? []).some(rtpc => Number(rtpc.parameterId) === BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY);
  })) {
    return {};
  }
  return {
    voiceLimit: {
      counterId: String(id),
      scope: "game-object",
      maxInstances: 1,
      behavior: "reject-newest"
    }
  };
}
function CreateSfxNodeBasePlaybackProjection(parsed, rawID, names) {
  const chain = [];
  const visited = new Set();
  let currentID = Number(rawID) >>> 0;
  while (currentID && !visited.has(currentID)) {
    visited.add(currentID);
    const nodeBase = parsed.nodeBases?.get(currentID);
    if (!nodeBase) {
      break;
    }
    chain.push(nodeBase);
    const parentID = Number(nodeBase.directParentId) >>> 0;
    if (!parentID || parsed.nodes.has(parentID)) {
      break;
    }
    currentID = parentID;
  }
  let gainDb = 0;
  let pitchCents = 0;
  let lowPass = 0;
  let highPass = 0;
  let initialDelayMs = 0;
  const gainDbRanges = [];
  const pitchCentsRanges = [];
  const lowPassRanges = [];
  const highPassRanges = [];
  const initialDelayRangesMs = [];
  const rtpcCurves = [];
  const stateProperties = [];
  for (const nodeBase of chain.reverse()) {
    for (const property of nodeBase.properties ?? []) {
      const value = Number(property.floatValue);
      if (!Number.isFinite(value)) {
        continue;
      }
      if (property.id === SFX_VOLUME_PROPERTY) {
        gainDb += value;
      } else if (property.id === SFX_PITCH_PROPERTY) {
        pitchCents += value;
      } else if (property.id === SFX_LOW_PASS_PROPERTY) {
        lowPass += value;
      } else if (property.id === SFX_HIGH_PASS_PROPERTY) {
        highPass += value;
      } else if (property.id === SFX_INITIAL_DELAY_PROPERTY) {
        initialDelayMs += value * 1000;
      }
    }
    for (const range of nodeBase.ranges ?? []) {
      const min = Number(range.minFloat);
      const max = Number(range.maxFloat);
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        continue;
      }
      if (range.id === SFX_VOLUME_PROPERTY) {
        gainDbRanges.push({
          min,
          max
        });
      } else if (range.id === SFX_PITCH_PROPERTY) {
        pitchCentsRanges.push({
          min,
          max
        });
      } else if (range.id === SFX_LOW_PASS_PROPERTY) {
        lowPassRanges.push({
          min,
          max
        });
      } else if (range.id === SFX_HIGH_PASS_PROPERTY) {
        highPassRanges.push({
          min,
          max
        });
      } else if (range.id === SFX_INITIAL_DELAY_PROPERTY) {
        initialDelayRangesMs.push({
          min: min * 1000,
          max: max * 1000
        });
      }
    }
    for (const rtpc of nodeBase.rtpcs ?? []) {
      const curve = CreateSfxRtpcCurve(rtpc, names);
      if (curve) {
        rtpcCurves.push(curve);
      }
    }
    for (const group of nodeBase.state?.groups ?? []) {
      const activeStates = group.states?.filter(state => state.values?.length) ?? [];
      if (!activeStates.length) {
        continue;
      }
      const namedGroup = names.groups.get(`state:${Number(group.groupId) >>> 0}`);
      const definitions = new Map((nodeBase.state?.properties ?? []).map(property => [Number(property.propertyId), property]));
      const cases = {};
      if (group.syncType !== SFX_IMMEDIATE_STATE_SYNC || !namedGroup?.name) {
        throw new Error(group.syncType !== SFX_IMMEDIATE_STATE_SYNC ? `non-Immediate state group ${group.groupId}` : `unnamed state group ${group.groupId}`);
      }
      const supported = activeStates.every(state => state.values.every(value => IsSupportedSfxStateValue(value, definitions)));
      if (!supported) {
        continue;
      }
      for (const state of activeStates) {
        const stateName = namedGroup.values.get(Number(state.stateId) >>> 0);
        let stateGainDb = 0;
        let statePitchCents = 0;
        let stateLowPass = 0;
        let stateHighPass = 0;
        if (!stateName) {
          throw new Error(`unnamed state value ${state.stateId}`);
        }
        for (const value of state.values) {
          const propertyID = Number(value.propertyId);
          if (propertyID === SFX_VOLUME_PROPERTY) {
            stateGainDb += Number(value.value);
          } else {
            if (propertyID === SFX_PITCH_PROPERTY) {
              statePitchCents += Number(value.value);
            } else if (propertyID === SFX_LOW_PASS_PROPERTY) {
              stateLowPass += Number(value.value);
            } else {
              stateHighPass += Number(value.value);
            }
          }
        }
        if (stateGainDb !== 0 || statePitchCents !== 0 || stateLowPass !== 0 || stateHighPass !== 0) {
          cases[stateName] = {
            ...(stateGainDb === 0 ? {} : {
              gainDb: stateGainDb
            }),
            ...(statePitchCents === 0 ? {} : {
              pitchCents: statePitchCents
            }),
            ...(stateLowPass === 0 ? {} : {
              lowPass: stateLowPass
            }),
            ...(stateHighPass === 0 ? {} : {
              highPass: stateHighPass
            })
          };
        }
      }
      if (Object.keys(cases).length) {
        stateProperties.push({
          group: namedGroup.name,
          cases
        });
      }
    }
  }
  return {
    ...(gainDb === 0 ? {} : {
      gainDb
    }),
    ...(gainDbRanges.length ? {
      gainDbRanges
    } : {}),
    ...(pitchCents === 0 ? {} : {
      pitchCents
    }),
    ...(pitchCentsRanges.length ? {
      pitchCentsRanges
    } : {}),
    ...(lowPass === 0 ? {} : {
      lowPass
    }),
    ...(lowPassRanges.length ? {
      lowPassRanges
    } : {}),
    ...(highPass === 0 ? {} : {
      highPass
    }),
    ...(highPassRanges.length ? {
      highPassRanges
    } : {}),
    ...(initialDelayMs === 0 ? {} : {
      initialDelayMs
    }),
    ...(initialDelayRangesMs.length ? {
      initialDelayRangesMs
    } : {}),
    ...(rtpcCurves.length ? {
      rtpcCurves
    } : {}),
    ...(stateProperties.length ? {
      stateProperties
    } : {})
  };
}
function IsSupportedSfxStateValue(value, definitions) {
  const propertyID = Number(value.propertyId);
  const definition = definitions.get(propertyID);
  const isFilter = propertyID === SFX_LOW_PASS_PROPERTY || propertyID === SFX_HIGH_PASS_PROPERTY;
  return Boolean(definition) && (propertyID === SFX_VOLUME_PROPERTY || propertyID === SFX_PITCH_PROPERTY || isFilter) && definition.accumulation === (isFilter ? SFX_FILTER_ACCUMULATION : SFX_ADDITIVE_ACCUMULATION);
}
function CreateSfxRtpcCurve(rtpc, names) {
  const propertyID = Number(rtpc.parameterId);
  const definitions = {
    [SFX_VOLUME_PROPERTY]: {
      property: "volume",
      accumulation: SFX_ADDITIVE_ACCUMULATION,
      scaling: 2
    },
    [SFX_PITCH_PROPERTY]: {
      property: "pitch",
      accumulation: SFX_ADDITIVE_ACCUMULATION,
      scaling: 0
    },
    [SFX_LOW_PASS_PROPERTY]: {
      property: "lowPass",
      accumulation: SFX_FILTER_ACCUMULATION,
      scaling: 0
    },
    [SFX_HIGH_PASS_PROPERTY]: {
      property: "highPass",
      accumulation: SFX_FILTER_ACCUMULATION,
      scaling: 0
    },
    [SFX_INITIAL_DELAY_PROPERTY]: {
      property: "initialDelay",
      accumulation: SFX_ADDITIVE_ACCUMULATION,
      scaling: 0
    }
  };
  const definition = definitions[propertyID];
  if (Number(rtpc.controlType) !== 0 || !definition) {
    return null;
  }
  const controlID = Number(rtpc.controlId) >>> 0;
  const parameter = names.parameters.get(controlID);
  const defaultValue = names.parameterDefaults.get(controlID);
  if (!rtpc.points?.length) {
    throw new Error(`empty ${definition.property} RTPC curve ${rtpc.curveId}`);
  }
  if (Number(rtpc.accumulation) !== definition.accumulation) {
    throw new Error(`unsupported RTPC accumulation ${rtpc.accumulation}`);
  }
  if (Number(rtpc.scaling) !== definition.scaling) {
    throw new Error(`unsupported ${definition.property} RTPC scaling ${rtpc.scaling}`);
  }
  if (!parameter) {
    throw new Error(`unnamed game parameter ${rtpc.controlId}`);
  }
  let previous = -Infinity;
  const points = rtpc.points.map(point => {
    const x = Number(point.from);
    const value = Number(point.to);
    const interpolation = Number(point.interpolation);
    if (!Number.isFinite(x) || !Number.isFinite(value)) {
      throw new Error(`non-finite RTPC curve ${rtpc.curveId}`);
    }
    if (!Number.isSafeInteger(interpolation) || interpolation < 0 || interpolation > 9) {
      throw new Error(`invalid RTPC interpolation ${rtpc.curveId}`);
    }
    if (x < previous) {
      throw new Error(`unsorted RTPC curve ${rtpc.curveId}`);
    }
    previous = x;
    return {
      x,
      value,
      interpolation
    };
  });
  return {
    rtpc: parameter,
    scope: "object",
    property: definition.property,
    scaling: definition.scaling,
    ...(defaultValue === undefined ? {} : {
      defaultValue
    }),
    points
  };
}
function CreateMusicRtpcCurves(nodeBase, names) {
  return (nodeBase?.rtpcs ?? []).filter(rtpc => Number(rtpc.parameterId) === SFX_VOLUME_PROPERTY).map(rtpc => {
    const curve = CreateSfxRtpcCurve(rtpc, names);
    if (!curve) {
      throw new Error(`unsupported Music Track volume RTPC ${rtpc.curveId}`);
    }
    return {
      ...curve,
      // Built-in music consumes the global Game Parameter lane;
      // it has no per-emitter game-object identity in this runtime.
      scope: "global"
    };
  });
}
function CreateSfxNameCatalog(soundbanksInfo, enrichment, inspections) {
  const groups = new Map();
  const parameters = new Map();
  const parameterDefaults = new Map();
  const stateTransitionSettings = new Map();
  let stateFilterBehavior;
  if (soundbanksInfo) {
    const parsed = CjsBnkFormat.wwise.parseSoundbanksInfo(soundbanksInfo);
    for (const bank of parsed.banks) {
      for (const [scope, entries, valuesField] of [["switch", bank.switchGroups, "switches"], ["state", bank.stateGroups, "states"]]) {
        for (const entry of entries) {
          const key = `${scope}:${Number(entry.id) >>> 0}`;
          const entryName = NormalizeOptionalCatalogName(entry.name);
          const group = groups.get(key) ?? {
            ...(entryName ? {
              name: entryName
            } : {}),
            values: new Map()
          };
          if (entryName && group.name && group.name !== entryName) {
            throw new TypeError(`Audio ${scope} group ${entry.id}` + ` name conflicts between ${group.name}` + ` and ${entryName}`);
          }
          if (entryName) {
            for (const [otherKey, otherGroup] of groups) {
              if (otherKey !== key && otherKey.startsWith(`${scope}:`) && otherGroup.name?.toLowerCase() === entryName.toLowerCase()) {
                throw new TypeError(`Audio ${scope} group ${entryName}` + ` conflicts between ${otherKey}` + ` and ${key}`);
              }
            }
            group.name = entryName;
          }
          for (const value of entry[valuesField]) {
            AddCatalogValueName(group.values, Number(value.id) >>> 0, value.name, `Audio ${scope} group ${entry.id}`);
          }
          groups.set(key, group);
        }
      }
      for (const parameter of bank.gameParameters) {
        parameters.set(Number(parameter.id) >>> 0, parameter.name);
      }
    }
  }
  for (const inspection of inspections) {
    const globalSettings = inspection?.globalSettings;
    if (globalSettings === null || globalSettings === undefined) {
      continue;
    }
    if (!globalSettings || typeof globalSettings !== "object" || !Array.isArray(globalSettings.rtpcParameters) || !Array.isArray(globalSettings.stateGroups)) {
      throw new TypeError("Audio STMG globalSettings must contain" + " stateGroups and rtpcParameters");
    }
    const stateGroups = globalSettings.stateGroups;
    const filterBehavior = globalSettings.filterBehavior === undefined ? undefined : Number(globalSettings.filterBehavior);
    if (filterBehavior !== undefined && (!Number.isSafeInteger(filterBehavior) || filterBehavior < 0 || filterBehavior > 1)) {
      throw new TypeError(`Audio STMG filterBehavior ${globalSettings.filterBehavior} is invalid`);
    }
    if (filterBehavior !== undefined && stateFilterBehavior !== undefined && stateFilterBehavior !== filterBehavior) {
      throw new TypeError("Audio STMG filterBehavior conflicts between banks");
    }
    if (filterBehavior !== undefined) {
      stateFilterBehavior = filterBehavior;
    }
    for (const rawGroup of stateGroups) {
      if (!rawGroup || typeof rawGroup !== "object" || Array.isArray(rawGroup) || !Array.isArray(rawGroup.transitions)) {
        throw new TypeError("Audio STMG State group must contain transitions");
      }
      const id = NormalizeWwiseUint32(rawGroup.id, "Audio STMG State group id");
      const defaultTransitionMs = NormalizeWwiseUint32(rawGroup.defaultTransitionTimeMs, `Audio STMG State group ${id} defaultTransitionTimeMs`);
      const routes = new Set();
      const transitions = rawGroup.transitions.map((raw, index) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          throw new TypeError(`Audio STMG State group ${id}` + ` transition ${index} must be an object`);
        }
        const fromId = NormalizeWwiseUint32(raw.fromId, `Audio STMG State group ${id} transition ${index} fromId`);
        const toId = NormalizeWwiseUint32(raw.toId, `Audio STMG State group ${id} transition ${index} toId`);
        const route = `${fromId}:${toId}`;
        if (routes.has(route)) {
          throw new TypeError(`Audio STMG State group ${id}` + ` has duplicate transition ${route}`);
        }
        routes.add(route);
        return {
          fromId,
          toId,
          transitionMs: NormalizeWwiseUint32(raw.transitionTimeMs, `Audio STMG State group ${id}` + ` transition ${index} transitionTimeMs`)
        };
      }).sort((left, right) => left.fromId - right.fromId || left.toId - right.toId);
      const normalized = {
        id,
        defaultTransitionMs,
        transitions
      };
      const existing = stateTransitionSettings.get(id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(normalized)) {
        throw new TypeError(`Audio STMG State group ${id} has conflicting settings`);
      }
      stateTransitionSettings.set(id, normalized);
    }
    for (const parameter of globalSettings.rtpcParameters) {
      if (!parameter || typeof parameter !== "object" || Array.isArray(parameter)) {
        throw new TypeError("Audio STMG RTPC parameter must be an object");
      }
      const id = NormalizeGameParameterID(parameter.id);
      const defaultValue = Number(parameter.defaultValue);
      if (!Number.isFinite(defaultValue)) {
        throw new TypeError(`Audio STMG game parameter ${id}` + " defaultValue must be finite");
      }
      const existing = parameterDefaults.get(id);
      if (existing !== undefined && existing !== defaultValue) {
        throw new TypeError(`Audio STMG game parameter ${id}` + ` defaultValue conflicts with ${existing}`);
      }
      parameterDefaults.set(id, defaultValue);
    }
  }
  if (enrichment?.gameParameters !== undefined) {
    for (const [rawID, value] of metadataEntries(enrichment.gameParameters, "Audio enrichment gameParameters")) {
      const id = NormalizeGameParameterID(rawID);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError(`Audio enrichment gameParameters.${rawID}` + " must be an object");
      }
      if (value.name !== undefined) {
        const name = String(value.name).trim();
        if (!name) {
          throw new TypeError(`Audio enrichment gameParameters.${rawID}` + " name must be non-empty");
        }
        const existing = parameters.get(id);
        if (existing && existing !== name) {
          throw new TypeError(`Audio enrichment gameParameters.${rawID}` + ` name conflicts with ${existing}`);
        }
        parameters.set(id, name);
      }
      if (value.defaultValue !== undefined) {
        const defaultValue = Number(value.defaultValue);
        if (!Number.isFinite(defaultValue)) {
          throw new TypeError(`Audio enrichment gameParameters.${rawID}` + " defaultValue must be finite");
        }
        const existing = parameterDefaults.get(id);
        if (existing !== undefined && existing !== defaultValue) {
          throw new TypeError(`Audio enrichment gameParameters.${rawID}` + ` defaultValue conflicts with ${existing}`);
        }
        parameterDefaults.set(id, defaultValue);
      }
    }
  }
  const stateTransitions = [...stateTransitionSettings.values()].sort((left, right) => left.id - right.id).map(settings => {
    const named = groups.get(`state:${settings.id}`);
    return {
      groupId: String(settings.id),
      ...(named?.name ? {
        group: named.name
      } : {}),
      defaultTransitionMs: settings.defaultTransitionMs,
      ...(named?.values.size ? {
        states: [...named.values].sort((left, right) => left[0] - right[0]).map(([stateId, state]) => ({
          stateId: String(stateId),
          state
        }))
      } : {}),
      transitions: settings.transitions.map(transition => ({
        fromId: String(transition.fromId),
        ...(named?.values.has(transition.fromId) ? {
          from: named.values.get(transition.fromId)
        } : {}),
        toId: String(transition.toId),
        ...(named?.values.has(transition.toId) ? {
          to: named.values.get(transition.toId)
        } : {}),
        transitionMs: transition.transitionMs
      }))
    };
  });
  return {
    groups,
    parameters,
    parameterDefaults,
    stateTransitions,
    stateFilterBehavior
  };
}
function NormalizeOptionalCatalogName(value) {
  const name = String(value ?? "").trim();
  return name || undefined;
}
function AddCatalogValueName(values, id, rawName, label) {
  const name = NormalizeOptionalCatalogName(rawName);
  if (!name) {
    return;
  }
  const existing = values.get(id);
  if (existing !== undefined && existing !== name) {
    throw new TypeError(`${label} value ${id} name conflicts between` + ` ${existing} and ${name}`);
  }
  for (const [otherId, otherName] of values) {
    if (otherId !== id && otherName.toLowerCase() === name.toLowerCase()) {
      throw new TypeError(`${label} value ${name} conflicts between` + ` ${otherId} and ${id}`);
    }
  }
  values.set(id, name);
}
function NormalizeWwiseUint32(value, label) {
  const text = String(value);
  const number = Number(text);
  if (!/^(?:0|[1-9]\d*)$/u.test(text) || !Number.isSafeInteger(number) || number < 0 || number > 0xffffffff) {
    throw new TypeError(`${label} must be uint32`);
  }
  return number >>> 0;
}
function NormalizeGameParameterID(value) {
  const text = String(value);
  const number = Number(text);
  if (!/^(?:0|[1-9]\d*)$/u.test(text) || !Number.isSafeInteger(number) || number < 0 || number > 0xffffffff) {
    throw new TypeError(`Audio game parameter ID ${text} must be uint32`);
  }
  return number >>> 0;
}
function IsMusicEventName(name) {
  return String(name).toLowerCase().startsWith("music_");
}
function PruneSfxNodes(events, nodes) {
  const reachable = new Set();
  const visit = child => {
    const id = String(child && typeof child === "object" ? child.nodeId : child);
    if (reachable.has(id) || !nodes[id]) {
      return;
    }
    reachable.add(id);
    const node = nodes[id];
    if (node.type === "switch") {
      for (const value of Object.values(node.cases)) visit(value);
      if (node.default) visit(node.default);
    } else {
      for (const value of node.children ?? []) visit(value);
    }
  };
  for (const roots of Object.values(events)) {
    for (const root of roots) visit(root);
  }
  const result = {};
  for (const id of [...reachable].sort((left, right) => Number(left) - Number(right))) {
    result[id] = nodes[id];
  }
  return result;
}
function normalizeBankLoader(options) {
  if (typeof options.loadBank === "function") {
    return options.loadBank;
  }
  const provider = options.bankProvider;
  if (provider && typeof provider.LoadBank === "function") {
    return (bank, context) => provider.LoadBank(bank, context);
  }
  if (provider && typeof provider.Read === "function") {
    return (bank, context) => provider.Read(bank, context);
  }
  const values = options.bankData;
  if (values instanceof Map) {
    return (bank, {
      sourceID
    }) => values.get(sourceID) ?? values.get(bank.resPath) ?? values.get(bank.storagePath) ?? null;
  }
  if (values && typeof values === "object" && !Array.isArray(values)) {
    return (bank, {
      sourceID
    }) => values[sourceID] ?? values[bank.resPath] ?? values[bank.storagePath] ?? null;
  }
  throw new TypeError("Complete audio-library construction requires loadBank, bankProvider, or bankData");
}
function normalizeLoadedBank(value, sourceID) {
  if (value === null || value === undefined) {
    throw new Error(`Audio bank provider returned no data for ${sourceID}`);
  }
  if (isBytes(value)) {
    return {
      bytes: toUint8Array(value),
      inspection: null
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Audio bank provider returned an invalid value for ${sourceID}`);
  }
  const bytes = value.bytes === null || value.bytes === undefined ? null : toUint8Array(value.bytes);
  const inspection = value.inspection ?? null;
  if (!bytes && !inspection) {
    throw new TypeError(`Audio bank provider returned no bytes or inspection for ${sourceID}`);
  }
  return {
    bytes,
    inspection
  };
}
function isBytes(value) {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}
function defaultInspectBank(bytes, {
  source
}) {
  if (!bytes) {
    throw new TypeError("Default audio bank inspection requires bytes");
  }
  return CjsBnkFormat.inspect(bytes, {
    source
  });
}
function compactBankInspection(value, source, bank) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Audio bank inspection is invalid: ${bank.resPath}`);
  }
  const bankId = Number(normalizeUnsignedID(value.bankId, `Audio bank ${bank.resPath} inspected bankId`));
  const languageId = Number(normalizeUnsignedID(value.languageId ?? 0, `Audio bank ${bank.resPath} inspected languageId`));
  const bankVersion = Number(normalizeUnsignedID(value.bankVersion ?? 0, `Audio bank ${bank.resPath} inspected bankVersion`));
  let globalSettings = null;
  if (value.globalSettings !== null && value.globalSettings !== undefined) {
    if (!value.globalSettings || typeof value.globalSettings !== "object" || Array.isArray(value.globalSettings)) {
      throw new TypeError(`Audio bank ${bank.resPath} contains invalid globalSettings`);
    }
    globalSettings = structuredClone(value.globalSettings);
  }
  const hirc = Array.from(value.hirc ?? [], entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError(`Audio bank ${bank.resPath} contains an invalid HIRC entry`);
    }
    return {
      ...entry,
      ...(entry.payload === null || entry.payload === undefined ? {} : {
        payload: toUint8Array(entry.payload).slice()
      })
    };
  });
  const media = Array.from(value.media ?? [], entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError(`Audio bank ${bank.resPath} contains an invalid media entry`);
    }
    const id = normalizeUnsignedID(entry.id, `Audio bank ${bank.resPath} media ID`);
    const available = entry.available === true;
    const absoluteOffset = Number(entry.absoluteOffset ?? 0);
    const length = Number(entry.length ?? 0);
    if (!Number.isSafeInteger(absoluteOffset) || absoluteOffset < 0) {
      throw new TypeError(`Audio bank ${bank.resPath} media offset is invalid`);
    }
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new TypeError(`Audio bank ${bank.resPath} media length is invalid`);
    }
    return {
      ...entry,
      id: Number(id),
      available,
      absoluteOffset,
      length
    };
  });
  return {
    source,
    resPath: bank.resPath,
    bankId,
    languageId,
    bankVersion,
    language: bank.language,
    globalSettings,
    hirc,
    media
  };
}
function requireMusicBanks(library, enabled) {
  if (!enabled) {
    return;
  }
  const names = new Set(Object.values(library.banks).map(bank => bankSourceName(bank.resPath)));
  const missing = MUSIC_BANK_NAMES.filter(name => !names.has(name));
  if (missing.length) {
    throw new Error(`Audio music construction requires indexed banks: ${missing.join(", ")}`);
  }
}
function normalizeEventMediaLanguage(value) {
  const language = String(value ?? "").trim().replaceAll("_", "-").toLowerCase();
  if (language && !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(language)) {
    throw new TypeError(`Invalid audio language tag: ${value}`);
  }
  return language;
}
function throwIfAborted(signal) {
  if (!signal?.aborted) {
    return;
  }
  if (signal.reason instanceof Error) {
    throw signal.reason;
  }
  const error = new Error("Audio-library construction was aborted");
  error.name = "AbortError";
  throw error;
}
function normalizeIndexEntries(value) {
  if (typeof value === "string") {
    return parseIndexText(value);
  }
  let input;
  if (value === null || value === undefined) {
    input = [];
  } else if (Array.isArray(value)) {
    input = value;
  } else if (Array.isArray(value.entries)) {
    input = value.entries;
  } else if (typeof value[Symbol.iterator] === "function") {
    input = [...value];
  } else {
    throw new TypeError("Audio index entries must be file-index text or an iterable");
  }
  const entries = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError("Audio index entries must contain objects");
    }
    const logicalPath = String(entry.logicalPath ?? "").trim().replaceAll("\\", "/");
    if (!logicalPath.toLowerCase().startsWith("res:/audio/")) {
      continue;
    }
    const storagePath = String(entry.storagePath ?? entry.location ?? "").trim().replaceAll("\\", "/");
    const byteLength = Number(entry.byteLength ?? entry.uncompressedSize ?? 0);
    if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
      throw new TypeError(`Audio index byteLength must be a non-negative integer: ${logicalPath}`);
    }
    entries.push({
      logicalPath,
      storagePath,
      checksum: String(entry.checksum ?? ""),
      byteLength
    });
  }
  return entries.sort(compareIndexEntries);
}
function parseIndexText(value) {
  const entries = [];
  for (const line of value.split(/\r?\n/u)) {
    if (!line) {
      continue;
    }
    const [logicalPath, storagePath, checksum, byteLength] = line.split(",");
    entries.push({
      logicalPath,
      storagePath,
      checksum,
      byteLength
    });
  }
  return normalizeIndexEntries(entries);
}
function compareIndexEntries(left, right) {
  return compareText(String(left.logicalPath).toLowerCase(), String(right.logicalPath).toLowerCase()) || compareText(left.storagePath, right.storagePath);
}
function createAudioMetadata({
  metadata,
  soundbanksInfo,
  bankProjection = null,
  enrichment
}) {
  let result = {
    Events: {},
    SoundBanks: {},
    WemFileIDs: {}
  };
  let hasBase = false;
  if (soundbanksInfo !== null && soundbanksInfo !== undefined) {
    result = normalizeAudioMetadata(audioMetadataFromSoundbanksInfo(soundbanksInfo), "SoundbanksInfo metadata");
    hasBase = true;
  }
  if (bankProjection !== null && bankProjection !== undefined) {
    result = mergeAudioMetadata(result, normalizeAudioMetadata(bankProjection, "bank-derived audio metadata", {
      partial: true
    }));
  }
  if (metadata !== null && metadata !== undefined) {
    result = mergeAudioMetadata(result, normalizeAudioMetadata(metadata, "audio metadata", {
      partial: hasBase
    }));
    hasBase = true;
  }
  if (!hasBase) {
    throw new TypeError("Audio-library construction requires metadata or soundbanksInfo");
  }
  if (enrichment !== null && enrichment !== undefined) {
    result = mergeAudioMetadata(result, normalizeAudioMetadata(enrichment, "audio metadata enrichment", {
      partial: true
    }));
  }
  return result;
}
function normalizeAudioMetadata(value, label, {
  partial = false
} = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return {
    Events: normalizeMetadataSection(value.Events, `${label}.Events`, partial),
    SoundBanks: normalizeMetadataSection(value.SoundBanks, `${label}.SoundBanks`, partial),
    WemFileIDs: normalizeMetadataSection(value.WemFileIDs, `${label}.WemFileIDs`, partial)
  };
}
function normalizeMetadataSection(value, label, optional = false) {
  let entries;
  if (value === undefined && optional) {
    entries = [];
  } else if (value instanceof Map) {
    entries = [...value.entries()];
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    entries = Object.entries(value);
  } else {
    throw new TypeError(`${label} must be an object or Map`);
  }
  const result = {};
  for (const [rawKey, rawRecord] of entries.sort(([left], [right]) => compareText(String(left), String(right)))) {
    const key = String(rawKey);
    if (!key) {
      throw new TypeError(`${label} contains an empty key`);
    }
    if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) {
      throw new TypeError(`${label}.${key} must be an object`);
    }
    result[key] = normalizeJSONValue(rawRecord, `${label}.${key}`);
  }
  return result;
}
function normalizeJSONValue(value, label) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${label} must contain finite numbers`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => normalizeJSONValue(entry, `${label}[${index}]`));
  }
  const entries = value instanceof Map ? [...value.entries()] : value && typeof value === "object" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) ? Object.entries(value) : null;
  if (!entries) {
    throw new TypeError(`${label} must contain JSON-compatible values`);
  }
  const result = {};
  for (const [key, entry] of entries) {
    result[String(key)] = normalizeJSONValue(entry, `${label}.${String(key)}`);
  }
  return result;
}
function mergeAudioMetadata(base, overlay) {
  const result = {
    Events: {
      ...base.Events
    },
    SoundBanks: {
      ...base.SoundBanks
    },
    WemFileIDs: {
      ...base.WemFileIDs
    }
  };
  for (const section of ["Events", "SoundBanks", "WemFileIDs"]) {
    for (const [key, record] of Object.entries(overlay[section])) {
      result[section][key] = {
        ...(result[section][key] ?? {}),
        ...record
      };
    }
    result[section] = sortedKeys(result[section]);
  }
  return result;
}
function createAuthoredBankCatalog(soundbanksInfo, metadata) {
  if (soundbanksInfo !== null && soundbanksInfo !== undefined) {
    return CjsBnkFormat.wwise.parseSoundbanksInfo(soundbanksInfo).banks;
  }
  return Object.entries(metadata.SoundBanks).map(([key, record]) => {
    const sourceName = bankSourceName(key);
    const path = String(record.path ?? key);
    const shortName = String(record.shortName ?? record.name ?? sourceName.replace(/\.bnk$/u, ""));
    const id = record.shortId ?? record.shortID ?? record.bankID ?? (/^\d+$/u.test(String(record.id ?? "")) ? record.id : undefined);
    if (id === undefined) {
      throw new TypeError(`Audio metadata bank ${key} has no numeric bank identity`);
    }
    return {
      id,
      shortName,
      path,
      language: authoredBankLanguage(record, path)
    };
  });
}
function authoredBankLanguage(record, path) {
  const explicit = record.authoredLanguage ?? record.language;
  if (explicit !== undefined && explicit !== null) {
    return normalizeAuthoredLanguage(explicit);
  }
  const parentName = record.parent?.name;
  if (parentName !== undefined && parentName !== null) {
    return normalizeAuthoredLanguage(parentName);
  }
  const segments = String(path).replaceAll("\\", "/").split("/").filter(Boolean);
  const bankIndex = segments.findIndex(value => value.toLowerCase() === "soundbanks");
  if (bankIndex >= 0 && bankIndex + 2 < segments.length) {
    return normalizeAuthoredLanguage(segments[bankIndex + 1]);
  }
  return "";
}
function normalizeAuthoredLanguage(value) {
  const language = String(value ?? "").trim();
  return normalizeLanguageToken(language) === "sfx" ? "" : language;
}
function createBankTable(indexEntries, authoredBanks, bankIdentities) {
  const identities = normalizeBankIdentities(bankIdentities);
  const banks = {};
  for (const entry of indexEntries) {
    const logicalPath = String(entry.logicalPath ?? "");
    const base = logicalPath.toLowerCase().split("/").pop();
    if (!base?.endsWith(".bnk")) {
      continue;
    }
    const authored = matchAuthoredBank(logicalPath, authoredBanks);
    if (!authored) {
      throw new TypeError(`Audio bank source has no SoundbanksInfo identity: ${logicalPath}`);
    }
    const override = identities.get(logicalPath.toLowerCase()) ?? null;
    const bankID = normalizeUnsignedID(override?.bankID ?? authored.id, `Audio bank ${logicalPath} bankID`);
    const authoredLanguageID = authored.language ? CjsBnkFormat.wwise.wwiseIdFromName(authored.language) : 0;
    const languageID = normalizeUnsignedID(override?.languageID ?? authoredLanguageID, `Audio bank ${logicalPath} languageID`);
    if (override?.bankID !== undefined && String(bankID) !== String(normalizeUnsignedID(authored.id, `SoundbanksInfo bank ${authored.shortName} ID`))) {
      throw new Error(`Audio bank identity mismatch for ${logicalPath}: ` + `${bankID} !== ${authored.id}`);
    }
    if (override?.languageID !== undefined && String(languageID) !== String(normalizeUnsignedID(authoredLanguageID, `SoundbanksInfo bank ${authored.shortName} language ID`))) {
      throw new Error(`Audio bank language identity mismatch for ${logicalPath}: ` + `${languageID} !== ${authoredLanguageID}`);
    }
    const sourceID = `${bankID}:${languageID}`;
    if (banks[sourceID]) {
      throw new TypeError(`Duplicate audio bank identity ${sourceID}: ` + `${banks[sourceID].resPath} and ${logicalPath}`);
    }
    banks[sourceID] = {
      sourceID,
      bankID,
      languageID,
      language: audioLanguageTag(authored.language),
      authoredLanguage: String(authored.language ?? ""),
      shortName: String(authored.shortName ?? ""),
      resPath: logicalPath,
      storagePath: entry.storagePath,
      byteLength: entry.byteLength,
      checksum: entry.checksum
    };
  }
  return sortedKeys(banks);
}
function matchAuthoredBank(logicalPath, authoredBanks) {
  const path = normalizeBankPath(logicalPath);
  const tail = path.replace(/^res:\/audio\//u, "");
  const base = tail.split("/").pop();
  const stem = base?.replace(/\.bnk$/u, "") ?? "";
  const scored = [];
  for (const bank of authoredBanks) {
    const authoredPath = normalizeBankPath(bank.path).replace(/^soundbanks\//u, "");
    const authoredBase = authoredPath.split("/").pop() || `${String(bank.shortName).toLowerCase()}.bnk`;
    let score = 0;
    if (authoredPath && tail.endsWith(authoredPath)) score += 100;
    if (base === authoredBase) score += 50;
    if (stem === String(bank.id)) score += 50;
    if (stem === String(bank.shortName).toLowerCase()) score += 50;
    const language = normalizeLanguageToken(bank.language);
    if (language && normalizeLanguageToken(tail).includes(language)) {
      score += 20;
    }
    if (score) {
      scored.push({
        bank,
        score
      });
    }
  }
  scored.sort((left, right) => right.score - left.score);
  if (!scored.length) {
    return null;
  }
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    throw new TypeError(`Ambiguous SoundbanksInfo identity for ${logicalPath}`);
  }
  return scored[0].bank;
}
function normalizeBankIdentities(value) {
  const identities = new Map();
  if (value === null || value === undefined) {
    return identities;
  }
  const entries = value instanceof Map ? value.entries() : Object.entries(value);
  for (const [sourcePath, identity] of entries) {
    if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
      throw new TypeError(`Invalid audio bank identity for ${sourcePath}`);
    }
    identities.set(String(sourcePath).toLowerCase(), identity);
  }
  return identities;
}
function normalizeUnsignedID(value, label) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0 || numeric > 0xffffffff) {
    throw new TypeError(`${label} must be an unsigned 32-bit integer`);
  }
  return String(numeric >>> 0);
}
function normalizeBankPath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").toLowerCase();
}
function SelectLanguageInspections(inspections, language) {
  const requestedLanguage = String(language ?? "").trim().replaceAll("_", "-").toLowerCase();
  const groups = new Map();
  for (const inspection of inspections) {
    const bankID = normalizeUnsignedID(inspection?.bankId, "Audio inspection bankId");
    const languageID = normalizeUnsignedID(inspection?.languageId ?? 0, `Audio inspection ${bankID} languageId`);
    const group = groups.get(bankID) ?? [];
    if (group.some(value => normalizeUnsignedID(value.languageId ?? 0, "Audio languageId") === languageID)) {
      throw new TypeError(`Duplicate audio inspection identity ${bankID}:${languageID}`);
    }
    group.push(inspection);
    groups.set(bankID, group);
  }
  const shared = [];
  const variants = [];
  for (const group of groups.values()) {
    group.sort(compareBankInspections);
    if (group.length === 1 && !String(group[0].language ?? "").trim()) {
      shared.push(group[0]);
    } else {
      variants.push(group);
    }
  }
  if (!variants.length) {
    return shared.sort(compareBankInspections);
  }
  const selected = [...shared];
  let matchedLanguage = !requestedLanguage;
  for (const group of variants) {
    const exact = group.find(value => String(value.language ?? "").toLowerCase() === requestedLanguage);
    const inspection = exact ?? group.find(value => !String(value.language ?? "").trim()) ?? (!requestedLanguage ? group[0] : null);
    if (exact) {
      matchedLanguage = true;
    }
    if (inspection) {
      selected.push(inspection);
    }
  }
  if (!matchedLanguage) {
    throw new Error(`Audio event-media language is unavailable: ${requestedLanguage}`);
  }
  return selected.sort(compareBankInspections);
}
function compareBankInspections(left, right) {
  return compareText(bankSourceName(left?.source), bankSourceName(right?.source)) || compareText(normalizeBankPath(left?.resPath), normalizeBankPath(right?.resPath)) || (Number(left?.bankId ?? 0) >>> 0) - (Number(right?.bankId ?? 0) >>> 0) || (Number(left?.languageId ?? 0) >>> 0) - (Number(right?.languageId ?? 0) >>> 0);
}
function addSourceRecord(table, key, record) {
  const current = table[key];
  if (current === undefined) {
    table[key] = record;
  } else if (Array.isArray(current)) {
    current.push(record);
  } else {
    table[key] = [current, record];
  }
}
function normalizeSourceTable(table) {
  const result = {};
  for (const key of Object.keys(table).sort()) {
    const input = Array.isArray(table[key]) ? table[key] : [table[key]];
    const unique = new Map();
    for (const record of input) {
      unique.set(JSON.stringify(record), record);
    }
    const records = [...unique.values()].sort(compareSourceRecords);
    result[key] = records.length === 1 ? records[0] : records;
  }
  return result;
}
function compareSourceRecords(left, right) {
  const leftKey = [left?.sourceID, left?.bank, left?.resPath ?? left?.logicalPath ?? left?.path, left?.language, left?.offset, left?.byteLength].map(value => String(value ?? "")).join("\0");
  const rightKey = [right?.sourceID, right?.bank, right?.resPath ?? right?.logicalPath ?? right?.path, right?.language, right?.offset, right?.byteLength].map(value => String(value ?? "")).join("\0");
  return compareText(leftKey, rightKey) || compareText(JSON.stringify(left), JSON.stringify(right));
}
function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function toUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError("Audio media classification requires bytes");
}
function normalizeLanguageToken(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, "");
}
function audioLanguageTag(value) {
  const input = String(value ?? "").trim().replaceAll("_", "-").toLowerCase();
  if (!input) {
    return "";
  }
  if (Object.hasOwn(AUDIO_LANGUAGE_TAGS, input)) {
    return AUDIO_LANGUAGE_TAGS[input];
  }
  if (/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(input)) {
    return input;
  }
  return "";
}
function bankSourceName(value) {
  const normalized = String(value ?? "").trim().replaceAll("\\", "/");
  return normalized.split("/").pop().toLowerCase();
}
function validateMusicNodeReferences(nodes, media, embeddedMedia) {
  for (const [id, node] of Object.entries(nodes)) {
    for (const childID of node.children ?? []) {
      if (!nodes[childID]) {
        throw new Error(`Music node ${id} references missing child ${childID}`);
      }
    }
    if (node.type !== "music-track") {
      continue;
    }
    for (const source of node.sources ?? []) {
      const sourceID = String(source.sourceId);
      if (!media[sourceID] && !embeddedMedia[sourceID]) {
        throw new Error(`Music track ${id} references missing source ${sourceID}`);
      }
    }
  }
}
function createMusicEventProjection(inspections, metadata, nodes) {
  const eventNamesByID = new Map();
  for (const [name, record] of metadataEntries(metadata?.Events, "Audio metadata Events")) {
    eventNamesByID.set(Number(record.eventID) >>> 0, name);
  }
  const eventTargets = {};
  const eventStops = {};
  const switchSetters = {};
  const musicGroups = MusicArgumentGroups(nodes);
  for (const inspection of inspections) {
    const actionsByID = new Map();
    const eventsByID = new Map();
    for (const entry of inspection.hirc ?? []) {
      if (entry.typeName === "event-action") {
        actionsByID.set(entry.id, entry);
      } else if (entry.typeName === "event") {
        eventsByID.set(entry.id, entry);
      }
    }
    for (const [eventID, event] of eventsByID) {
      const name = eventNamesByID.get(eventID >>> 0);
      if (!name) {
        continue;
      }
      for (const actionID of eventActionIDs(event)) {
        const action = actionsByID.get(actionID);
        if (!action) {
          continue;
        }
        const fields = actionFields(action);
        const family = fields.actionType >> 8 & 0xff;
        if (family === 0x04 && nodes[fields.targetID]) {
          addEventTarget(eventTargets, name, fields.targetID);
        } else if (family === 0x01 && nodes[fields.targetID]) {
          addEventTarget(eventStops, name, fields.targetID);
        } else if (family === 0x19 || family === 0x12) {
          const setter = ReadMusicSetterAction(fields, actionID, family);
          if (musicGroups.has(setter.groupId)) {
            const values = switchSetters[name] ?? (switchSetters[name] = []);
            values.push(setter);
          }
        }
      }
    }
  }
  return {
    eventTargets: normalizeTargetTable(eventTargets),
    eventStops: normalizeTargetTable(eventStops),
    switchSetters: normalizeSetterTable(switchSetters)
  };
}
function MusicArgumentGroups(nodes) {
  const result = new Set();
  for (const node of Object.values(nodes)) {
    for (const argument of node.argumentGroups ?? []) {
      result.add(Number(argument.groupId) >>> 0);
    }
    if (node.switchParams?.groupId !== undefined) {
      result.add(Number(node.switchParams.groupId) >>> 0);
    }
  }
  return result;
}
function ReadMusicSetterAction(fields, actionID, family) {
  const {
    groupID,
    valueID
  } = ReadSetterActionIDs(fields.action, fields.payload, `Music setter action ${actionID}`);
  return {
    kind: family === 0x19 ? "switch" : "state",
    groupId: groupID,
    targetId: valueID
  };
}
function ReadSetterActionIDs(action, rawPayload, label) {
  const hasTypedGroup = action?.groupId !== undefined;
  const hasTypedValue = action?.valueId !== undefined;
  if (hasTypedGroup !== hasTypedValue) {
    throw new Error(`${label} has incomplete typed fields`);
  }
  const payload = rawPayload instanceof Uint8Array ? rawPayload : null;
  let raw = null;
  if (payload?.byteLength >= 8) {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    raw = {
      groupID: view.getUint32(payload.byteLength - 8, true),
      valueID: view.getUint32(payload.byteLength - 4, true)
    };
  }
  if (hasTypedGroup) {
    const typed = {
      groupID: Number(action.groupId) >>> 0,
      valueID: Number(action.valueId) >>> 0
    };
    if (raw && (raw.groupID !== typed.groupID || raw.valueID !== typed.valueID)) {
      throw new Error(`${label} typed fields disagree with payload`);
    }
    return typed;
  }
  if (!raw) {
    throw new Error(`${label} has a truncated payload`);
  }
  return raw;
}
function eventActionIDs(entry) {
  const actionIDs = entry.actionIds ?? entry.actions;
  if (!Array.isArray(actionIDs)) {
    throw new Error(`Music event ${entry.id} has no typed action list`);
  }
  return actionIDs;
}
function actionFields(entry) {
  const payload = entry.payload instanceof Uint8Array ? entry.payload : null;
  const actionType = entry.actionType;
  const targetID = entry.targetId ?? entry.target;
  if (actionType === undefined || targetID === undefined) {
    throw new Error(`Music action ${entry.id} has no typed action fields`);
  }
  return {
    actionType: Number(actionType) >>> 0,
    targetID: Number(targetID) >>> 0,
    action: entry.action ?? null,
    payload
  };
}
function addEventTarget(table, name, targetID) {
  (table[name] ?? (table[name] = [])).push(targetID >>> 0);
}
function normalizeTargetTable(table) {
  const result = {};
  for (const name of Object.keys(table).sort()) {
    result[name] = [...new Set(table[name])].sort((left, right) => left - right);
  }
  return result;
}
function normalizeSetterTable(table) {
  const result = {};
  for (const name of Object.keys(table).sort()) {
    const unique = new Map();
    for (const setter of table[name]) {
      unique.set(`${setter.kind}:${setter.groupId}:${setter.targetId}`, setter);
    }
    result[name] = [...unique.values()].sort((left, right) => left.kind.localeCompare(right.kind, "en") || left.groupId - right.groupId || left.targetId - right.targetId);
  }
  return result;
}
function validateMusicGraph(music, media, embeddedMedia) {
  if (!music || typeof music !== "object" || Array.isArray(music)) {
    throw new TypeError("Audio library music must be an object");
  }
  if (music.schemaVersion !== 1) {
    throw new TypeError(`Unsupported audio music schema version: ${music.schemaVersion}`);
  }
  if (!music.nodes || typeof music.nodes !== "object" || Array.isArray(music.nodes)) {
    throw new TypeError("Audio library music nodes must be an object");
  }
  if (!Array.isArray(music.banks)) {
    throw new TypeError("Audio library music banks must be an array");
  }
  const bankNames = music.banks.map(bankSourceName);
  if (bankNames.some(name => !name) || new Set(bankNames).size !== bankNames.length) {
    throw new TypeError("Audio library music banks must be unique source names");
  }
  for (const [id, node] of Object.entries(music.nodes)) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      throw new TypeError(`Audio library music node ${id} must be an object`);
    }
    if (!bankNames.includes(bankSourceName(node.bank))) {
      throw new TypeError(`Audio library music node ${id} references unknown bank: ${node.bank}`);
    }
    ValidateMusicBusRouting(node, id);
  }
  validateMusicNodeReferences(music.nodes, media, embeddedMedia);
  for (const field of ["eventTargets", "eventStops"]) {
    if (!music[field] || typeof music[field] !== "object" || Array.isArray(music[field])) {
      throw new TypeError(`Audio library music ${field} must be an object`);
    }
    for (const [name, targets] of Object.entries(music[field])) {
      if (!Array.isArray(targets)) {
        throw new TypeError(`Audio library music ${field}.${name} must be an array`);
      }
      const ids = targets.map(value => Number(value) >>> 0);
      if (new Set(ids).size !== ids.length) {
        throw new TypeError(`Audio library music ${field}.${name} has duplicate targets`);
      }
      for (const id of ids) {
        if (!music.nodes[id]) {
          throw new TypeError(`Audio library music ${field}.${name} ` + `references missing node ${id}`);
        }
      }
    }
  }
  if (!music.switchSetters || typeof music.switchSetters !== "object" || Array.isArray(music.switchSetters)) {
    throw new TypeError("Audio library music switchSetters must be an object");
  }
  for (const [name, setters] of Object.entries(music.switchSetters)) {
    if (!Array.isArray(setters)) {
      throw new TypeError(`Audio library music switchSetters.${name} must be an array`);
    }
    const keys = setters.map(setter => {
      if (!setter || !["switch", "state"].includes(setter.kind)) {
        throw new TypeError(`Audio library music switchSetters.${name} has an invalid setter`);
      }
      return `${setter.kind}:${setter.groupId}:${setter.targetId}`;
    });
    if (new Set(keys).size !== keys.length) {
      throw new TypeError(`Audio library music switchSetters.${name} has duplicate setters`);
    }
  }
}
function normalizeMusicGraph(music) {
  return {
    schemaVersion: 1,
    generator: String(music.generator ?? "@carbonenginejs/runtime-audio/library-builder"),
    banks: [...new Set((music.banks ?? []).map(bankSourceName))].sort(),
    nodes: sortedKeys(music.nodes),
    eventTargets: normalizeTargetTable(music.eventTargets),
    eventStops: normalizeTargetTable(music.eventStops),
    switchSetters: normalizeSetterTable(music.switchSetters)
  };
}
function ValidateMusicBusRouting(node, id) {
  const hasOutput = node.outputBusId !== undefined;
  const hasPath = node.busPathIds !== undefined;
  const hasAuthored = node.authoredBusVolumeDb !== undefined;
  const hasMakeUp = node.authoredBusMakeUpGainDb !== undefined;
  const hasOutputVolume = node.authoredOutputBusVolumeDb !== undefined;
  if (node.type !== "music-track" && (hasOutput || hasPath || hasAuthored || hasMakeUp || hasOutputVolume)) {
    throw new TypeError(`Audio library music node ${id} bus routing is track-only`);
  }
  if (!hasOutput) {
    if (hasPath || hasAuthored || hasMakeUp || hasOutputVolume) {
      throw new TypeError(`Audio library music node ${id} bus routing requires outputBusId`);
    }
    return;
  }
  const outputBusId = Number(node.outputBusId);
  if (!Number.isSafeInteger(outputBusId) || outputBusId <= 0) {
    throw new TypeError(`Audio library music node ${id} outputBusId must be a positive id`);
  }
  if (!Array.isArray(node.busPathIds) || !node.busPathIds.length) {
    throw new TypeError(`Audio library music node ${id} busPathIds must be non-empty`);
  }
  const path = node.busPathIds.map(Number);
  if (path.some(value => !Number.isSafeInteger(value) || value <= 0) || String(path[0]) !== String(outputBusId) || new Set(path).size !== path.length) {
    throw new TypeError(`Audio library music node ${id} has invalid busPathIds`);
  }
  if (hasAuthored && !Number.isFinite(Number(node.authoredBusVolumeDb))) {
    throw new TypeError(`Audio library music node ${id} authoredBusVolumeDb must be finite`);
  }
  if (hasMakeUp && !Number.isFinite(Number(node.authoredBusMakeUpGainDb))) {
    throw new TypeError(`Audio library music node ${id} authoredBusMakeUpGainDb must be finite`);
  }
  if (hasOutputVolume && !Number.isFinite(Number(node.authoredOutputBusVolumeDb))) {
    throw new TypeError(`Audio library music node ${id} authoredOutputBusVolumeDb must be finite`);
  }
}
function normalizeSourceIdentity({
  target,
  game,
  provider,
  build
}) {
  const values = [target, game, provider, build];
  if (values.every(value => value === null || value === undefined)) {
    return null;
  }
  if (values.some(value => value === null || value === undefined)) {
    throw new TypeError("Audio source identity requires target, game, provider, and build");
  }
  const normalized = {
    target: normalizeIdentityPart(target, "target"),
    game: normalizeIdentityPart(game, "game"),
    provider: normalizeIdentityPart(provider, "provider"),
    build: normalizeIdentityPart(build, "build")
  };
  return normalized;
}
function normalizeIdentityPart(value, label) {
  const result = String(value ?? "").trim();
  if (!result) {
    throw new TypeError(`Audio source ${label} must be a non-empty string`);
  }
  return result;
}

// res:/audio/<language>/<id>.wem carries a language folder; Media/ and
// Essential_Media/ do not, matching the authored AudPathResolver routing.
function languageSegment(lowerPath) {
  const segments = lowerPath.split("/");
  if (segments.length === 4 && segments[2] !== "media" && segments[2] !== "essential_media") {
    return audioLanguageTag(segments[2]);
  }
  return "";
}
function sortedKeys(value) {
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = value[key];
  }
  return sorted;
}
function metadataEntries(value, label) {
  if (value instanceof Map) {
    return value.entries();
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value);
  }
  throw new TypeError(`${label} must be an object or Map`);
}

export { CjsAudioLibraryBuilder };
//# sourceMappingURL=CjsAudioLibraryBuilder.js.map
