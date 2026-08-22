import { CjsFormat } from '../../format/CjsFormat.js';
import { DEFAULT_VALUES, normalizeValues, validateClassKey, validateClass, readWithValues, inspectWithValues, toJsonValue, toText, OUTPUT_CMF, OUTPUT_GR2, OUTPUT_SHARED, OUTPUT_OBJ_JSON, OUTPUT_JSON, CLASS_KEYS } from './core/helpers.js';

const FORMAT_NAME = "CjsObjFormat";

/**
 * CarbonEngineJS-facing Wavefront OBJ format surface.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * OBJ is the current import source; the public read contract is the shared
 * CarbonEngineJS JSON mesh schema.
 */
class CjsObjFormat extends CjsFormat {
  #emit = DEFAULT_VALUES.emit;
  #source = DEFAULT_VALUES.source;
  #packTangents = DEFAULT_VALUES.packTangents;
  #uvHandedness = DEFAULT_VALUES.uvHandedness;
  #rebuildMissingNormals = DEFAULT_VALUES.rebuildMissingNormals;
  #rebuildMissingTangents = DEFAULT_VALUES.rebuildMissingTangents;
  #rebuildMissingBiNormals = DEFAULT_VALUES.rebuildMissingBiNormals;
  #classes = DEFAULT_VALUES.classes;

  /**
   * Create a reusable format profile.
   *
   * @param {object} [options] Default format values.
   */
  constructor(options = {}) {
    super();
    this.SetValues(options);
  }

  /**
   * Set format values for this reusable profile.
   *
   * @param {object} [options] Values to merge into the profile.
   * @returns {CjsObjFormat} This format profile.
   */
  SetValues(options = {}) {
    const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);
    this.#emit = values.emit;
    this.#source = values.source;
    this.#packTangents = values.packTangents;
    this.#uvHandedness = values.uvHandedness;
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
      source: this.#source,
      packTangents: this.#packTangents,
      uvHandedness: this.#uvHandedness,
      rebuildMissingNormals: this.#rebuildMissingNormals,
      rebuildMissingTangents: this.#rebuildMissingTangents,
      rebuildMissingBiNormals: this.#rebuildMissingBiNormals,
      classes: this.#classes
    }, options, FORMAT_NAME);
  }

  /**
   * Set multiple node-class constructors for this profile.
   *
   * @param {object} [classes] Map of node class keys to constructors.
   * @returns {CjsObjFormat} This format profile.
   */
  SetClasses(classes = {}) {
    return this.SetValues({
      classes
    });
  }

  /**
   * Set one node-class constructor for this profile.
   *
   * @param {string} type Node class key.
   * @param {Function|null|undefined} Class Constructor to use, or nullish to delete.
   * @returns {CjsObjFormat} This format profile.
   */
  SetClass(type, Class) {
    if (Class === null || Class === undefined) {
      validateClassKey(type, FORMAT_NAME);
      const classes = {
        ...this.#classes
      };
      delete classes[type];
      this.#classes = classes;
      return this;
    }
    validateClass(type, Class, FORMAT_NAME);
    return this.SetValues({
      classes: {
        [type]: Class
      }
    });
  }

  /**
   * Get a configured node-class constructor.
   *
   * @param {string} type Node class key.
   * @returns {Function|undefined} The registered constructor, if any.
   */
  GetClass(type) {
    validateClassKey(type, FORMAT_NAME);
    return this.#classes[type];
  }

  /**
   * Whether this format profile has a constructor registered for a node class key.
   *
   * @param {string} type Node class key.
   * @returns {boolean} True when a constructor is registered.
   */
  HasClass(type) {
    return !!this.GetClass(type);
  }

  /**
   * Read OBJ text with this profile's values.
   *
   * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
   * @param {object} [options] Per-call value overrides.
   * @returns {object} The shared CarbonEngineJS JSON mesh schema.
   */
  Read(input, options = {}) {
    return readWithValues(this, input, this.GetValues(options), FORMAT_NAME);
  }

  /**
   * Inspect OBJ text without hydrating classes.
   *
   * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
   * @param {object} [options] Per-call value overrides.
   * @returns {object} Plain summary data.
   */
  Inspect(input, options = {}) {
    return inspectWithValues(input, this.GetValues(options));
  }

  /**
   * Convert format output to JSON-compatible data.
   *
   * @param {any} value Format output to convert.
   * @returns {any} Plain JSON-compatible data.
   */
  ToJSON(value) {
    return toJsonValue(value);
  }

  /**
   * Static one-shot read. Static methods use camelCase by convention.
   *
   * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
   * @param {object} [options] Format values.
   * @returns {object} The shared CarbonEngineJS JSON mesh schema.
   */
  static read(input, options = {}) {
    return readWithValues(CjsObjFormat, input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME), FORMAT_NAME);
  }

  /**
   * Static one-shot inspection.
   *
   * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
   * @param {object} [options] Format values.
   * @returns {object} Plain summary data.
   */
  static inspect(input, options = {}) {
    return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
  }

  /**
   * Static JSON-compatible conversion.
   *
   * @param {any} value Format output to convert.
   * @returns {any} Plain JSON-compatible data.
   */
  static toJSON(value) {
    return toJsonValue(value);
  }

  /**
   * Cheap text sniff for OBJ-like mesh data.
   *
   * @param {string|Uint8Array|ArrayBuffer|DataView} input Candidate OBJ text.
   * @returns {boolean} True when at least one vertex and face statement exist.
   */
  static isObj(input) {
    try {
      const text = toText(input);
      return /^v\s+/m.test(text) && /^f\s+/m.test(text);
    } catch {
      return false;
    }
  }

  /**
   * Emit targets for this format (canonical frozen enum).
   */
  static Output = Object.freeze({
    JSON: OUTPUT_JSON,
    OBJ_JSON: OUTPUT_OBJ_JSON,
    SHARED: OUTPUT_SHARED,
    GR2: OUTPUT_GR2,
    CMF: OUTPUT_CMF
  });
  static CLASS_KEYS = CLASS_KEYS;
  static id = "obj";
  static mediaTypes = Object.freeze(["geometry"]);
  static outputs = CjsFormat.defineOutputs({
    shared: {
      decoded: true
    },
    gr2: {
      decoded: true
    },
    cmf: {
      decoded: true
    },
    json: {
      role: "debug",
      decoded: true
    },
    objJson: {
      role: "debug",
      default: true,
      decoded: true
    }
  });
  static extensions = Object.freeze([".obj"]);
}

export { CjsObjFormat, CjsObjFormat as default };
//# sourceMappingURL=CjsObjFormat.js.map
