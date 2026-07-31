import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterControlLayer as _CjsCharacterControlL } from '../controls/CjsCharacterControlLayer.js';
import { CjsCharacterCapabilityRequirement as _CjsCharacterCapabili } from '../parts/CjsCharacterCapabilityRequirement.js';
import { CjsCharacterGStateParameterSink } from '../controls/CjsCharacterGStateParameterSink.js';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';
import './CjsCharacterViseme.js';

let _initClass, _init_id, _init_extra_id, _init_sex, _init_extra_sex, _init_stateGraphPath, _init_extra_stateGraphPath, _init_parameterNode, _init_extra_parameterNode, _init_neutralVisemeID, _init_extra_neutralVisemeID, _init_maskName, _init_extra_maskName, _init_maskBoneNames, _init_extra_maskBoneNames, _init_visemes, _init_extra_visemes;
let _CjsCharacterVisemeSe;
new class extends _identity {
  static [class CjsCharacterVisemeSet extends _CjsCharacterNode {
    static {
      ({
        e: [_init_id, _init_extra_id, _init_sex, _init_extra_sex, _init_stateGraphPath, _init_extra_stateGraphPath, _init_parameterNode, _init_extra_parameterNode, _init_neutralVisemeID, _init_extra_neutralVisemeID, _init_maskName, _init_extra_maskName, _init_maskBoneNames, _init_extra_maskBoneNames, _init_visemes, _init_extra_visemes],
        c: [_CjsCharacterVisemeSe, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsCharacterVisemeSet",
        family: "character"
      })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "sex"], [[type, type.path, io, io.persist], 16, "stateGraphPath"], [[type, type.string, io, io.persist], 16, "parameterNode"], [[type, type.string, io, io.persist], 16, "neutralVisemeID"], [[type, type.string, io, io.persist], 16, "maskName"], [[void 0, type.list("string"), io, io.persist], 16, "maskBoneNames"], [[void 0, type.list("CjsCharacterViseme"), io, io.persist], 16, "visemes"]], 0, void 0, _CjsCharacterNode));
    }
    constructor(...args) {
      super(...args);
      _init_extra_visemes(this);
    }
    id = _init_id(this, "");
    sex = (_init_extra_id(this), _init_sex(this, null));
    stateGraphPath = (_init_extra_sex(this), _init_stateGraphPath(this, null));
    parameterNode = (_init_extra_stateGraphPath(this), _init_parameterNode(this, "Visemes"));
    neutralVisemeID = (_init_extra_parameterNode(this), _init_neutralVisemeID(this, null));
    maskName = (_init_extra_neutralVisemeID(this), _init_maskName(this, null));
    maskBoneNames = (_init_extra_maskName(this), _init_maskBoneNames(this, []));
    visemes = (_init_extra_maskBoneNames(this), _init_visemes(this, []));

    /** Validates and hydrates a detached viseme set without changing exact names. */
    static prepare(value) {
      const result = _CjsCharacterVisemeSe.from(value instanceof _CjsCharacterVisemeSe ? value.GetValues() : value || {});
      return _CjsCharacterVisemeSe.validate(result);
    }

    /** Validates and normalizes one hydrated viseme set in place. */
    static validate(result) {
      if (!(result instanceof _CjsCharacterVisemeSe)) {
        throw new TypeError("Character viseme validation requires a CjsCharacterVisemeSet");
      }
      const id = _CjsCharacterVisemeSe.normalizeID(result.id, "set");
      const parameterNode = CjsCharacterGStateParameterSink.normalizeName(result.parameterNode, "node");
      const ids = new Set();
      const parameters = new Set();
      for (const viseme of result.visemes) {
        const visemeID = _CjsCharacterVisemeSe.normalizeID(viseme.id, "viseme");
        const parameterName = CjsCharacterGStateParameterSink.normalizeName(viseme.parameterName || visemeID, "parameter");
        const minimum = Number(viseme.minimum);
        const maximum = Number(viseme.maximum);
        const defaultValue = Number(viseme.defaultValue);
        if (ids.has(visemeID)) {
          throw new Error(`Viseme set "${id}" contains duplicate id "${visemeID}"`);
        }
        if (parameters.has(parameterName)) {
          throw new Error(`Viseme set "${id}" contains duplicate parameter "${parameterName}"`);
        }
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum) {
          throw new TypeError(`Viseme "${visemeID}" has an invalid range`);
        }
        if (!Number.isFinite(defaultValue) || defaultValue < minimum || defaultValue > maximum) {
          throw new TypeError(`Viseme "${visemeID}" has a default outside its range`);
        }
        viseme.id = visemeID;
        viseme.parameterName = parameterName;
        viseme.minimum = minimum;
        viseme.maximum = maximum;
        viseme.defaultValue = defaultValue;
        ids.add(visemeID);
        parameters.add(parameterName);
      }
      const boneNames = new Set();
      result.maskBoneNames = result.maskBoneNames.map(value => {
        const name = CjsCharacterGStateParameterSink.normalizeName(value, "bone");
        if (boneNames.has(name)) {
          throw new Error(`Viseme set "${id}" contains duplicate mask bone "${name}"`);
        }
        boneNames.add(name);
        return name;
      });
      if (result.neutralVisemeID !== null && result.neutralVisemeID !== undefined) {
        result.neutralVisemeID = _CjsCharacterVisemeSe.normalizeID(result.neutralVisemeID, "neutral viseme");
        if (!ids.has(result.neutralVisemeID)) {
          throw new Error(`Viseme set "${id}" neutral id "${result.neutralVisemeID}" was not found`);
        }
      }
      result.id = id;
      result.parameterNode = parameterNode;
      return result;
    }

    /** Preserves exact, case-sensitive authored IDs while removing outer whitespace. */
    static normalizeID(value, label = "viseme") {
      if (typeof value !== "string" || !value.trim()) {
        throw new TypeError(`Character ${label} id must be a non-empty string`);
      }
      return value.trim();
    }

    /** Extracts a filename-level viseme suffix for discovery, without remapping it. */
    static getIDFromAnimationPath(value) {
      const path = String(value ?? "").replace(/\\/gu, "/");
      const match = /(?:^|\/)\w+_viseme_([^/]+?)\.gr2$/iu.exec(path);
      return match ? match[1] : null;
    }

    /** Finds one exact authored viseme ID. */
    static getViseme(value, visemeID) {
      const set = _CjsCharacterVisemeSe.#getPrepared(value);
      const id = _CjsCharacterVisemeSe.normalizeID(visemeID);
      return _CjsCharacterVisemeSe.#findViseme(set, id);
    }

    /** Returns the neutral parameter key for one exact authored viseme. */
    static getControlName(value, visemeID) {
      const set = _CjsCharacterVisemeSe.#getPrepared(value);
      return _CjsCharacterVisemeSe.#getControlName(set, visemeID);
    }

    /** Validates exact viseme weights without normalizing overlapping controls. */
    static validateWeights(value, weights) {
      const set = _CjsCharacterVisemeSe.#getPrepared(value);
      return _CjsCharacterVisemeSe.#validateWeights(set, weights);
    }

    /**
     * Converts a weight map to finite in-range values for exact authored viseme
     * IDs.
     */

    /** Creates one neutral character-control layer from simultaneous viseme weights. */
    static createControlLayer(value, weights, {
      id = "visemes",
      priority = 20,
      enabled = true,
      influence = 1,
      blendMode = "replace"
    } = {}) {
      const set = _CjsCharacterVisemeSe.#getPrepared(value);
      const parameters = new Map();
      for (const [visemeID, weight] of _CjsCharacterVisemeSe.#validateWeights(set, weights)) {
        parameters.set(_CjsCharacterVisemeSe.#getControlName(set, visemeID), weight);
      }
      return _CjsCharacterControlL.from({
        id,
        priority,
        enabled,
        influence,
        blendMode,
        parameters
      });
    }

    /** Creates a layer for the authored neutral/cancellation control only. */
    static createNeutralLayer(value, amount, options = {}) {
      const set = _CjsCharacterVisemeSe.#getPrepared(value);
      if (!set.neutralVisemeID) {
        throw new Error(`Viseme set "${set.id}" does not define a neutral control`);
      }
      return _CjsCharacterVisemeSe.createControlLayer(set, {
        [set.neutralVisemeID]: amount
      }, options);
    }

    /** Builds the exact facial-bone requirement declared by this set's authored mask. */
    static createCapabilityRequirement(value, {
      id = null,
      morphNames = []
    } = {}) {
      const set = _CjsCharacterVisemeSe.#getPrepared(value);
      if (set.maskBoneNames.length === 0 && (!Array.isArray(morphNames) || morphNames.length === 0)) {
        throw new Error(`Viseme set "${set.id}" does not provide facial capability names`);
      }
      return _CjsCharacterCapabili.prepare({
        id: id ?? `${set.id}-facial-rig`,
        boneNames: set.maskBoneNames,
        morphNames
      });
    }

    /** Returns a validated viseme set, hydrating detached input when necessary. */

    /** Returns the exact authored record from a prepared set or null. */

    /** Builds the exact node/parameter key for one viseme in a prepared set. */
  }];
  #validateWeights(set, weights) {
    const entries = weights instanceof Map ? [...weights.entries()] : weights && typeof weights === "object" && !Array.isArray(weights) ? Object.entries(weights) : null;
    if (!entries) {
      throw new TypeError("Character viseme weights must be a map or object");
    }
    const result = new Map();
    for (const [visemeID, value] of entries) {
      const id = _CjsCharacterVisemeSe.normalizeID(visemeID);
      const viseme = _CjsCharacterVisemeSe.#findViseme(set, id);
      const weight = Number(value);
      if (!viseme) {
        throw new Error(`Viseme set "${set.id}" does not contain "${id}"`);
      }
      if (result.has(id)) {
        throw new Error(`Character viseme weights contain duplicate id "${id}"`);
      }
      if (!Number.isFinite(weight) || weight < viseme.minimum || weight > viseme.maximum) {
        throw new RangeError(`Viseme "${id}" weight must be between ${viseme.minimum} and ${viseme.maximum}`);
      }
      result.set(id, weight);
    }
    return result;
  }
  #getPrepared(value) {
    return value instanceof _CjsCharacterVisemeSe ? _CjsCharacterVisemeSe.validate(value) : _CjsCharacterVisemeSe.prepare(value);
  }
  #findViseme(set, visemeID) {
    return set.visemes.find(viseme => viseme.id === visemeID) || null;
  }
  #getControlName(set, visemeID) {
    const id = _CjsCharacterVisemeSe.normalizeID(visemeID);
    const viseme = _CjsCharacterVisemeSe.#findViseme(set, id);
    if (!viseme) {
      throw new Error(`Viseme set "${set.id}" does not contain "${id}"`);
    }
    return CjsCharacterGStateParameterSink.formatParameterName(set.parameterNode, viseme.parameterName);
  }
  constructor() {
    super(_CjsCharacterVisemeSe), _initClass();
  }
}();

export { _CjsCharacterVisemeSe as CjsCharacterVisemeSet };
//# sourceMappingURL=CjsCharacterVisemeSet.js.map
