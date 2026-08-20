import { wwiseIdFromName, joinSoundbanksInfo, buildSoundbanksCatalog, parseSoundbanksInfo, isSoundbanksInfo } from './core/soundbanksInfo.js';
import { DEFAULT_VALUES, normalizeValues, readWithValues, inspectWithValues, isSupportedWithValues, toJsonValue, toBytes, extractMedia, isBNK, OUTPUT_MEDIA, OUTPUT_BNK_JSON, OUTPUT_JSON, OUTPUT_RAW, HIRC_TYPE_NAMES, HIRC_V150_TYPE_NAMES } from './core/helpers.js';
import { eventMediaFromBanks } from './core/graph.js';
import { parseEventAction } from './core/eventAction.js';
import { parseGlobalSettings } from './core/globalSettings.js';
import { parseBusNode, busNodesFromBanks } from './core/busNodes.js';
import { parseEffectNode, effectNodesFromBanks } from './core/effectNodes.js';
import { parseMusicSwitch, parseMusicPlaylist, parseMusicTrack, parseMusicSegment, musicNodesFromBanks } from './core/musicNodes.js';
import { parseSfxLayer, parseSfxSwitch, parseSfxRandomSequence, parseSfxAttenuation, parseSfxActorMixer, sfxNodesFromBanks } from './core/sfxNodes.js';

const FORMAT_NAME = "CjsBnkFormat";

/**
 * Reader for Audiokinetic Wwise soundbank (.bnk) containers.
 *
 * Inspection decodes the bank header, embedded media index, exact v150 global
 * settings, object hierarchy listing (with version-stable typed fields), and
 * referenced bank names without copying payloads. Read can emit the raw bank,
 * debug JSON, or the embedded media items undecoded. The read path stays a
 * pure container reader; the Wwise-domain toolkit (SoundbanksInfo catalog
 * helpers, id hash, event -> media graph resolution) is grouped under the
 * `wwise` static.
 */
class CjsBnkFormat {
  #values = DEFAULT_VALUES;

  /**
   * Browser-worker module declaration consumed by CjsResManWorkerLoader.
   */
  static worker = Object.freeze({
    module: import.meta.url,
    exportName: "CjsBnkFormat"
  });

  /**
   * Create a reusable bnk format profile.
   *
   * @param {object} [options] Default read/inspect options.
   */
  constructor(options = {}) {
    this.SetValues(options);
  }

  /**
   * Merge options into this profile.
   *
   * @param {object} [options] Values to merge.
   * @returns {CjsBnkFormat} This format profile.
   */
  SetValues(options = {}) {
    this.#values = normalizeValues(this.#values, options, FORMAT_NAME);
    return this;
  }

  /**
   * Get normalized profile values with optional per-call overrides.
   *
   * @param {object} [options] Per-call values.
   * @returns {object} Normalized read values.
   */
  GetValues(options = {}) {
    return normalizeValues(this.#values, options, FORMAT_NAME);
  }

  /**
   * Read soundbank bytes with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} GPU-free raw/debug/media payload for the selected emit target.
   */
  Read(input, options = {}) {
    return readWithValues(input, this.GetValues(options));
  }

  /**
   * Read soundbank bytes asynchronously with this profile.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {object} [options] Per-call values.
   * @returns {Promise<object>} GPU-free raw/debug/media payload for the selected emit target.
   */
  async ReadAsync(input, options = {}) {
    return this.Read(input, options);
  }

  /**
   * Inspect soundbank bytes without copying media payloads.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} Soundbank metadata.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options));
  }

  /**
   * Report whether soundbank input and requested output variants are supported.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {object} [options] Per-call values.
   * @returns {object} Support/probe report.
   */
  IsSupported(input, options = {}) {
    return isSupportedWithValues(input, this.GetValues(options));
  }

  /**
   * Convert format output into JSON-compatible debug data.
   *
   * @param {any} value Format output.
   * @returns {any} JSON-compatible value.
   */
  ToJSON(value) {
    return toJsonValue(value);
  }

  /**
   * One-shot soundbank read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {object} [options] Read options.
   * @returns {object} GPU-free raw/debug/media payload for the selected emit target.
   */
  static read(input, options = {}) {
    return readWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
  }

  /**
   * One-shot asynchronous soundbank read.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {object} [options] Read options.
   * @returns {Promise<object>} GPU-free raw/debug/media payload for the selected emit target.
   */
  static async readAsync(input, options = {}) {
    return CjsBnkFormat.read(input, options);
  }

  /**
   * One-shot soundbank inspection.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {object} [options] Inspect options.
   * @returns {object} Soundbank metadata.
   */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
  }

  /**
   * One-shot soundbank support probe.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {object} [options] Probe options.
   * @returns {object} Support/probe report.
   */
  static isSupported(input, options = {}) {
    return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
  }

  /**
   * Extract embedded media payloads as views over the soundbank bytes.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
   * @param {number} [mediaId] Optional single media id filter.
   * @returns {Array<object>} Extracted media items with undecoded bytes.
   */
  static extractMedia(input, mediaId) {
    const bytes = toBytes(input);
    const metadata = inspectWithValues(bytes, DEFAULT_VALUES);
    return extractMedia(bytes, metadata, mediaId);
  }

  /**
   * Convert format output into JSON-compatible debug data.
   *
   * @param {any} value Format output.
   * @returns {any} JSON-compatible value.
   */
  static toJSON(value) {
    return toJsonValue(value);
  }

  /**
   * Test whether bytes look like a Wwise soundbank.
   *
   * @param {Uint8Array|ArrayBuffer|DataView} input Candidate soundbank bytes.
   * @returns {boolean} True when the BKHD header chunk is present.
   */
  static isBNK(input) {
    try {
      return isBNK(toBytes(input));
    } catch {
      return false;
    }
  }

  /**
   * Wwise-domain toolkit, grouped apart from the container-reading statics -
   * the single home for the SoundbanksInfo catalog helpers
   * (`isSoundbanksInfo`, `parseSoundbanksInfo`, `buildSoundbanksCatalog`,
   * `joinSoundbanksInfo`), the id hash (`wwiseIdFromName`, FNV-1 of the
   * lowercased name), and event-graph resolution.
   *
   * `eventMediaFromBanks(inspections, options)` is graph interpretation over
   * `inspect()` results, not a read path: banks may split events from their
   * target objects (EVE keeps all events in one bank and their sounds in
   * others), so always pass every related bank to one call. Returns
   * `{ eventMedia: Map<eventObjectId, Set<wemId>>, diagnostics }`. See
   * core/graph.js for the walk policy.
   *
   * The interactive-music decoders (`musicNodesFromBanks` and the per-type
   * `parseMusicSegment/Track/Playlist/Switch`) turn the music-hierarchy
   * entries (HIRC 10-13) into typed nodes - children, meter, cue markers,
   * clips, playlist trees, decision trees, and transition rules. See
   * core/musicNodes.js for the anchored, exact-end-validated parse.
   *
   * The v150 authored-SFX decoders (`sfxNodesFromBanks` and the per-type
   * Global Settings, Event Action, Random/Sequence, Switch, Layer,
   * Actor-Mixer, and Attenuation parsers)
   * preserve raw Wwise semantics for runtime-audio's optional builder.
   * NodeBase facts, hierarchy-only Actor-Mixers, and attenuation objects
   * remain distinct from playable container behavior.
   *
   * `busNodesFromBanks` and `parseBusNode` expose qualified complete v150
   * Audio Bus and Auxiliary Bus bodies: ancestry, root output device,
   * properties, aux topology, policy, ducking, effect/metadata references,
   * RTPCs, and state values.
   *
   * `effectNodesFromBanks` and `parseEffectNode` expose complete generic
   * v150 Fx ShareSet and Fx Custom bodies while leaving plug-in parameter
   * blocks opaque for separately qualified DSP adapters.
   */
  static wwise = Object.freeze({
    isSoundbanksInfo,
    parseSoundbanksInfo,
    buildSoundbanksCatalog,
    joinSoundbanksInfo,
    wwiseIdFromName,
    eventMediaFromBanks,
    parseGlobalSettings,
    parseEventAction,
    musicNodesFromBanks,
    parseMusicSegment,
    parseMusicTrack,
    parseMusicPlaylist,
    parseMusicSwitch,
    busNodesFromBanks,
    parseBusNode,
    effectNodesFromBanks,
    parseEffectNode,
    sfxNodesFromBanks,
    parseSfxActorMixer,
    parseSfxAttenuation,
    parseSfxRandomSequence,
    parseSfxSwitch,
    parseSfxLayer
  });

  /**
   * Emit targets for this format (canonical frozen enum).
   */
  static Output = Object.freeze({
    RAW: OUTPUT_RAW,
    JSON: OUTPUT_JSON,
    BNK_JSON: OUTPUT_BNK_JSON,
    MEDIA: OUTPUT_MEDIA
  });
  static HIRC_TYPE_NAMES = HIRC_TYPE_NAMES;
  static HIRC_V150_TYPE_NAMES = HIRC_V150_TYPE_NAMES;
  static type = Object.freeze(["audio"]);
  static mediaTypes = Object.freeze(["audio"]);
  static extensions = Object.freeze([".bnk"]);
  static inputTypes = Object.freeze(["bnk"]);
  static outputTypes = Object.freeze([OUTPUT_RAW, OUTPUT_MEDIA]);
  static debugOutputTypes = Object.freeze([OUTPUT_BNK_JSON, OUTPUT_RAW]);
}

export { CjsBnkFormat };
//# sourceMappingURL=CjsBnkFormat.js.map
