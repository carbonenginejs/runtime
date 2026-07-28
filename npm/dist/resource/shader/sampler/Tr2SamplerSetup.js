import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject } from '@carbonenginejs/runtime-utils/is';
import { cloneCarbonValue } from '@carbonenginejs/runtime-utils/types';

let _initStatic, _initClass, _init_name, _init_extra_name, _init_hasName, _init_extra_hasName, _init_sampler, _init_extra_sampler, _init_isDynamic, _init_extra_isDynamic;

/** Reflected sampler name and complete device-free sampler descriptor. */
let _Tr2SamplerSetup;
class Tr2SamplerSetup extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_hasName, _init_extra_hasName, _init_sampler, _init_extra_sampler, _init_isDynamic, _init_extra_isDynamic, _initStatic],
      c: [_Tr2SamplerSetup, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SamplerSetup",
      family: "shader"
    })], [[[type, type.string], 16, "name"], [[impl, impl.adapted, void 0, impl.reason("The schema string field cannot distinguish an authored null sampler name from an empty name; portable reflection must retain that distinction for static sampler records."), type, type.boolean], 16, "hasName"], [type.rawStruct("Tr2SamplerStateAL"), 0, "sampler"], [[impl, impl.adapted, void 0, impl.reason("The portable effect contract distinguishes dynamic and static sampler declarations before an engine creates sampler state."), type, type.boolean], 16, "isDynamic"], [[impl, impl.custom, void 0, impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")], 26, "fromPortable"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  constructor(...args) {
    super(...args);
    _init_extra_isDynamic(this);
  }
  /** name (const char*) */
  name = _init_name(this, "");

  /** Whether the source sampler carried a name rather than authored null. */
  hasName = (_init_extra_name(this), _init_hasName(this, false));

  /** sampler (Tr2SamplerStateAL) */
  sampler = (_init_extra_hasName(this), _init_sampler(this, null));

  /** Whether the sampler occupies a dynamic register rather than static signature state. */
  isDynamic = (_init_extra_sampler(this), _init_isDynamic(this, false));

  /**
   * Construct a canonical sampler record from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2SamplerSetup} Hydrated sampler.
   */
  static from(values = {}, options = {}) {
    let normalized = values;
    if (values && Object.hasOwn(values, "name") && !Object.hasOwn(values, "hasName")) {
      normalized = {
        ...values,
        hasName: values.name !== null,
        name: values.name === null ? "" : values.name
      };
    }
    return super.from(normalized, options);
  }

  /**
   * Build one sampler from its portable JSON reflection record.
   *
   * @param {object} value Portable sampler record.
   * @returns {Tr2SamplerSetup} Reflected sampler.
   */
  static fromPortable(value) {
    if (!isPlainObject(value)) {
      throw new TypeError("Portable effect sampler must be an object");
    }
    const sampler = new this();
    sampler.hasName = value.name !== null;
    sampler.name = sampler.hasName ? String(value.name ?? "") : "";
    sampler.sampler = cloneCarbonValue(value.descriptor);
    sampler.isDynamic = !!value.isDynamic;
    return sampler;
  }
  static {
    _initClass();
  }
}

export { _Tr2SamplerSetup as Tr2SamplerSetup };
//# sourceMappingURL=Tr2SamplerSetup.js.map
