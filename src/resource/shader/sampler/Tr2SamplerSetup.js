// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { isPlainObject } from "@carbonenginejs/runtime-utils/is";
import { cloneCarbonValue } from "@carbonenginejs/runtime-utils/types";

/** Reflected sampler name and complete device-free sampler descriptor. */
@type.define({ className: "Tr2SamplerSetup", family: "shader" })
export class Tr2SamplerSetup extends CjsModel
{

  /** name (const char*) */
  @type.string
  name = "";

  /** Whether the source sampler carried a name rather than authored null. */
  @impl.adapted
  @impl.reason("The schema string field cannot distinguish an authored null sampler name from an empty name; portable reflection must retain that distinction for static sampler records.")
  @type.boolean
  hasName = false;

  /** sampler (Tr2SamplerStateAL) */
  @type.rawStruct("Tr2SamplerStateAL")
  sampler = null;

  /** Whether the sampler occupies a dynamic register rather than static signature state. */
  @impl.adapted
  @impl.reason("The portable effect contract distinguishes dynamic and static sampler declarations before an engine creates sampler state.")
  @type.boolean
  isDynamic = false;

  /**
   * Construct a canonical sampler record from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2SamplerSetup} Hydrated sampler.
   */
  static from(values = {}, options = {})
  {
    let normalized = values;
    if (values && Object.hasOwn(values, "name")
      && !Object.hasOwn(values, "hasName"))
    {
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
  @impl.custom
  @impl.reason("Carbon reads compiled effect bytes directly; CarbonEngineJS hydrates the browser-safe portable-reflection contract after format parsing.")
  static fromPortable(value)
  {
    if (!isPlainObject(value))
    {
      throw new TypeError("Portable effect sampler must be an object");
    }
    const sampler = new this();
    sampler.hasName = value.name !== null;
    sampler.name = sampler.hasName ? String(value.name ?? "") : "";
    sampler.sampler = cloneCarbonValue(value.descriptor);
    sampler.isDynamic = !!value.isDynamic;
    return sampler;
  }

}
