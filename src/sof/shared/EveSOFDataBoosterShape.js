// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, edit, type } from "#schema";
import { vec4 } from "#math/vec4";

/** Combines the noise, frequency, speed, and color parameters that define a booster shape. */
@type.define({ className: "EveSOFDataBoosterShape", family: "eve" })
export class EveSOFDataBoosterShape
{

  /**
   * Numeric noise-function selector retained in authored and projected shape data (native float).
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.float32
  noiseFunction = 0;

  /**
   * Animation-speed control for the shape noise; shader-domain units are not converted here.
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.float32
  noiseSpeed = 0;

  /**
   * Four-component noise amplitude at the start of the plume; native member and exposure retain the Ampliture spelling.
   * @type {Float32Array}
   */
  @edit.readwrite
  @edit.persist
  @type.vec4
  noiseAmplitureStart = vec4.create();

  /**
   * Four-component noise amplitude at the end of the plume; native member and exposure retain the Ampliture spelling.
   * @type {Float32Array}
   */
  @edit.readwrite
  @edit.persist
  @type.vec4
  noiseAmplitureEnd = vec4.create();

  /**
   * Four-component frequency control for the plume noise; forwarded unchanged to the shape parameters.
   * @type {Float32Array}
   */
  @edit.readwrite
  @edit.persist
  @type.vec4
  noiseFrequency = vec4.create();

  /**
   * Color weight for this booster plume shape.
   * @type {Float32Array}
   */
  @edit.readwrite
  @edit.persist
  @type.color
  color = vec4.create();

  /**
   * Exposes the typo-preserved Carbon storage vector for the leading noise
   * amplitude.
   * @returns {Float32Array} The existing noiseAmplitureStart storage.
   */
  @impl.custom
  get noiseAmplitudeStart()
  {
    return this.noiseAmplitureStart;
  }

  /**
   * Copies a supplied leading amplitude vector into the typo-preserved Carbon
   * storage.
   * @param {ArrayLike<number>} value Four leading amplitude components.
   */
  @impl.custom
  set noiseAmplitudeStart(value)
  {
    vec4.copy(this.noiseAmplitureStart, value);
  }

  /**
   * Exposes the typo-preserved Carbon storage vector for the trailing noise
   * amplitude.
   * @returns {Float32Array} The existing noiseAmplitureEnd storage.
   */
  @impl.custom
  get noiseAmplitudeEnd()
  {
    return this.noiseAmplitureEnd;
  }

  /**
   * Copies a supplied trailing amplitude vector into the typo-preserved Carbon
   * storage.
   * @param {ArrayLike<number>} value Four trailing amplitude components.
   */
  @impl.custom
  set noiseAmplitudeEnd(value)
  {
    vec4.copy(this.noiseAmplitureEnd, value);
  }

  /**
   * Merges optional shape overrides with base noise, frequency, speed, and color
   * values into a reusable instance. This JavaScript-only composition helper
   * accepts zero overrides but falls back for null, undefined or empty strings.
   * @param {EveSOFDataBoosterShape|null} base Optional base shape.
   * @param {EveSOFDataBoosterShape|null} overrides Optional shape overrides.
   * @param {EveSOFDataBoosterShape|null} [out=null] Reused result or newly constructed shape.
   * @returns {EveSOFDataBoosterShape} The output shape.
   */
  @impl.custom
  static combine(base, overrides, out = null)
  {
    out ??= new this();
    if (!base && !overrides) return out;
    base ??= out;
    vec4.copy(out.color, selectValue(base, overrides, "color"));
    vec4.copy(out.noiseAmplitureEnd, selectValue(base, overrides, "noiseAmplitureEnd"));
    vec4.copy(out.noiseAmplitureStart, selectValue(base, overrides, "noiseAmplitureStart"));
    vec4.copy(out.noiseFrequency, selectValue(base, overrides, "noiseFrequency"));
    out.noiseFunction = selectValue(base, overrides, "noiseFunction");
    out.noiseSpeed = selectValue(base, overrides, "noiseSpeed");
    return out;
  }

}

/** Selects a non-null, defined, nonempty-string override; JS composition helper.
 * @param {object} base Fallback record.
 * @param {object|null} overrides Optional override record.
 * @param {string} name Field to select.
 * @returns {*} Override or base field, without cloning.
 */
function selectValue(base, overrides, name)
{
  const value = overrides?.[name];
  return value !== null && value !== undefined && value !== "" ? value : base[name];
}

// Native IRoot-only data: self query, no initialization or update contract.
carbon.interfaceTable({ interfaces: [EveSOFDataBoosterShape], chainTo: null })(EveSOFDataBoosterShape);
