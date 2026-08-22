import { CjsFormat } from '../../format/CjsFormat.js';
import { curves } from './core/curves.js';
import { GR2_MAGICS, bytesToHex } from './core/reader.js';
import { tangents } from './core/tangents.js';
import { isGsfRaw, projectGsf, inspectGsfRaw } from './core/gsf.js';
import { DEFAULT_VALUES, normalizeValues, validateClassKey, validateClass, readWithValues, readRawInput, inspectRawGr2Result, toJsonValue, OUTPUT_JSON, OUTPUT_GR2, OUTPUT_GR2_JSON, OUTPUT_CMF, OUTPUT_RAW, CLASS_KEYS } from './core/helpers.js';

/**
 * CarbonEngineJS-facing GR2 (Granny 3D) and GSF (Granny State) reader.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary. It
 * reads `.gr2` geometry/skeleton/animation graphs and `.gsf` state profiles,
 * emitting GR2 JSON, hydrated caller-supplied classes, or CMF-shaped output,
 * without pretending those classes are the engine runtime itself.
 */
class CjsGr2Format extends CjsFormat {
  #emit = DEFAULT_VALUES.emit;
  #decompressCurves = DEFAULT_VALUES.decompressCurves;
  #unpackTangents = DEFAULT_VALUES.unpackTangents;
  #rebuildMissingNormals = DEFAULT_VALUES.rebuildMissingNormals;
  #rebuildMissingTangents = DEFAULT_VALUES.rebuildMissingTangents;
  #rebuildMissingBiNormals = DEFAULT_VALUES.rebuildMissingBiNormals;
  #classes = {};

  /**
   * Create a reusable format profile.
   *
   * @param {object} [options] Default format/build values.
   */
  constructor(options = {}) {
    super();
    this.SetValues(options);
  }

  /**
   * Set format values for this reusable profile.
   *
   * @param {object} [options] Values to merge into the profile.
   * @returns {CjsGr2Format} This format profile.
   */
  SetValues(options = {}) {
    const values = normalizeValues(this.GetValues(), options);
    this.#emit = values.emit;
    this.#decompressCurves = values.decompressCurves;
    this.#unpackTangents = values.unpackTangents;
    this.#rebuildMissingNormals = values.rebuildMissingNormals;
    this.#rebuildMissingTangents = values.rebuildMissingTangents;
    this.#rebuildMissingBiNormals = values.rebuildMissingBiNormals;
    this.#classes = values.classes;
    return this;
  }

  /**
   * Get this profile's current values, optionally with per-call overrides.
   *
   * @param {object} [options] Optional values to merge into a copy.
   * @returns {object} A copy of the effective values.
   */
  GetValues(options = {}) {
    return normalizeValues({
      emit: this.#emit,
      decompressCurves: this.#decompressCurves,
      unpackTangents: this.#unpackTangents,
      rebuildMissingNormals: this.#rebuildMissingNormals,
      rebuildMissingTangents: this.#rebuildMissingTangents,
      rebuildMissingBiNormals: this.#rebuildMissingBiNormals,
      classes: this.#classes
    }, options);
  }

  /**
   * Set multiple GR2 JSON node constructors for this profile.
   *
   * @param {object} [classes] Map of node class keys to constructors.
   * @returns {CjsGr2Format} This format profile.
   */
  SetClasses(classes = {}) {
    return this.SetValues({
      classes
    });
  }

  /**
   * Set a GR2 JSON node constructor for this profile.
   *
   * @param {string} type Node class key.
   * @param {Function|null|undefined} Class Constructor to use, or nullish to delete.
   * @returns {CjsGr2Format} This format profile.
   */
  SetClass(type, Class) {
    validateClassKey(type);
    if (Class === null || Class === undefined) {
      delete this.#classes[type];
      return this;
    }
    validateClass(type, Class);
    this.#classes = {
      ...this.#classes,
      [type]: Class
    };
    return this;
  }

  /**
   * Get a configured GR2 JSON node constructor.
   *
   * @param {string} type Node class key.
   * @returns {Function|undefined}
   */
  GetClass(type) {
    validateClassKey(type);
    return this.#classes[type];
  }

  /**
   * Whether this reader has a constructor for a GR2 JSON node key.
   *
   * @param {string} type Node class key.
   * @returns {boolean}
   */
  HasClass(type) {
    return !!this.GetClass(type);
  }

  /**
   * Parse a .gr2 buffer and return JSON by default, classes when configured,
   * or raw reflection data when `emit` is "raw".
   *
   * @param {Uint8Array|Buffer|object} input Raw .gr2 bytes or an existing raw read result.
   * @param {object} [options] Per-call values.
   * @returns {object}
   */
  Read(input, options = {}) {
    return readWithValues(this, input, this.GetValues(options));
  }

  /**
   * Parse a .gr2 buffer into the reflected Granny object graph.
   *
   * @param {Uint8Array|Buffer|object} input Raw .gr2 bytes or an existing raw read result.
   * @returns {object}
   */
  ReadRaw(input) {
    return readRawInput(input);
  }

  /**
   * Return a stable, lightweight summary for a GR2 buffer or raw result.
   *
   * @param {Uint8Array|Buffer|object} input Raw .gr2 bytes or an existing raw read result.
   * @returns {object}
   */
  Inspect(input) {
    return inspectRawGr2Result(this.ReadRaw(input));
  }

  /** Whether input is a Granny State document carried by the GR2 container. */
  IsGSF(input) {
    return isGsfRaw(this.ReadRaw(input));
  }

  /** Read the GState semantic projection, or raw reflected data with `emit: "raw"`. */
  ReadGSF(input, options = {}) {
    const raw = this.ReadRaw(input);
    return options.emit === "raw" ? raw : projectGsf(raw);
  }

  /** Inspect a GSF document and its referenced GR2 animations. */
  InspectGSF(input) {
    return inspectGsfRaw(this.ReadRaw(input));
  }

  /**
   * Convert format output to plain JSON-compatible data.
   *
   * @param {object} value Format output to convert.
   * @returns {any} Plain JSON-compatible data.
   */
  ToJSON(value) {
    return toJsonValue(value);
  }

  /**
   * Static one-shot read. Static methods use camelCase by convention.
   *
   * @param {Uint8Array|Buffer|object} input Raw .gr2 bytes or an existing raw read result.
   * @param {object} [options] Reader and post-processing values.
   * @returns {object}
   */
  static read(input, options = {}) {
    return readWithValues(CjsGr2Format, input, normalizeValues(DEFAULT_VALUES, options));
  }

  /**
   * Static one-shot raw read.
   *
   * @param {Uint8Array|Buffer|object} input Raw .gr2 bytes or an existing raw read result.
   * @returns {object}
   */
  static readRaw(input) {
    return readRawInput(input);
  }

  /**
   * Static one-shot inspection.
   *
   * @param {Uint8Array|Buffer|object} input Raw .gr2 bytes or an existing raw read result.
   * @returns {object}
   */
  static inspect(input) {
    return inspectRawGr2Result(readRawInput(input));
  }

  /** Whether input is a Granny State document carried by the GR2 container. */
  static isGsf(input) {
    try {
      return isGsfRaw(readRawInput(input));
    } catch {
      return false;
    }
  }

  /** Read the GState semantic projection, or raw reflected data with `emit: "raw"`. */
  static readGsf(input, options = {}) {
    const raw = readRawInput(input);
    return options.emit === "raw" ? raw : projectGsf(raw);
  }

  /** Async one-shot GSF read for standard format API compatibility. */
  static readGsfAsync(input, options = {}) {
    return Promise.resolve(this.readGsf(input, options));
  }

  /** Inspect a GSF document and its referenced GR2 animations. */
  static inspectGsf(input) {
    return inspectGsfRaw(readRawInput(input));
  }

  /**
   * Static JSON-compatible conversion.
   *
   * @param {object} value Format output to convert.
   * @returns {any} Plain JSON-compatible data.
   */
  static toJSON(value) {
    return toJsonValue(value);
  }
  static OUTPUT_JSON = OUTPUT_JSON;
  static OUTPUT_GR2 = OUTPUT_GR2;
  static OUTPUT_GR2_JSON = OUTPUT_GR2_JSON;
  static OUTPUT_CMF = OUTPUT_CMF;
  static OUTPUT_RAW = OUTPUT_RAW;
  static CLASS_KEYS = CLASS_KEYS;
  static id = "gr2";
  static mediaTypes = Object.freeze(["geometry"]);
  static outputs = CjsFormat.defineOutputs({
    gr2: {
      decoded: true
    },
    cmf: {
      decoded: true
    },
    json: {
      role: "debug",
      default: true,
      decoded: true
    },
    gr2Json: {
      role: "debug",
      decoded: true
    },
    raw: {
      role: "debug",
      decoded: true
    }
  });
  static extensions = Object.freeze([".gr2", ".gsf"]);
  static curves = curves;
  static tangents = tangents;
  static gsf = Object.freeze({
    isRaw: isGsfRaw,
    project: projectGsf,
    inspectRaw: inspectGsfRaw
  });

  /**
   * Cheap magic probe for GR2/GSF byte streams.
   *
   * @param {Uint8Array} bytes Candidate source bytes.
   * @returns {boolean} True when the 16-byte Granny magic is recognized.
   */
  static probeSupport(bytes) {
    if (!bytes || bytes.length < 16) return false;
    return bytesToHex(bytes.subarray(0, 16)) in GR2_MAGICS;
  }

  /**
   * Async read entrypoint for the resource-manager contract.
   *
   * @param {Uint8Array} bytes Source bytes.
   * @param {object} [options] Read options (emit, classes, conversions).
   * @returns {Promise<object>} The emitted GR2/GSF result.
   */
  static async readAsync(bytes, options = {}) {
    return CjsGr2Format.read(bytes, options);
  }
}

export { CjsGr2Format, CjsGr2Format as default };
//# sourceMappingURL=CjsGr2Format.js.map
