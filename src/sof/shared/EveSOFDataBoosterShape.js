// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";

/** EveSOFDataBoosterShape (eve) - generated from schema shapeHash 17bbd0bf.... */
@type.define({ className: "EveSOFDataBoosterShape", family: "eve" })
export class EveSOFDataBoosterShape extends CjsModel
{

  /** m_noiseFunction (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseFunction = 0;

  /** m_noiseSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseSpeed = 0;

  /** m_noiseAmplitureStart (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  noiseAmplitureStart = vec4.create();

  /** m_noiseAmplitureEnd (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  noiseAmplitureEnd = vec4.create();

  /** m_noiseFrequency (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  noiseFrequency = vec4.create();

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.create();

  /**
   * Exposes the typo-preserved Carbon storage vector for the leading noise
   * amplitude.
   */
  get noiseAmplitudeStart()
  {
    return this.noiseAmplitureStart;
  }

  /**
   * Copies a supplied leading amplitude vector into the typo-preserved Carbon
   * storage.
   */
  set noiseAmplitudeStart(value)
  {
    vec4.copy(this.noiseAmplitureStart, value);
  }

  /**
   * Exposes the typo-preserved Carbon storage vector for the trailing noise
   * amplitude.
   */
  get noiseAmplitudeEnd()
  {
    return this.noiseAmplitureEnd;
  }

  /**
   * Copies a supplied trailing amplitude vector into the typo-preserved Carbon
   * storage.
   */
  set noiseAmplitudeEnd(value)
  {
    vec4.copy(this.noiseAmplitureEnd, value);
  }

  /**
   * Merges optional shape overrides with base noise, frequency, speed, and color
   * values into a reusable instance.
   */
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

function selectValue(base, overrides, name)
{
  const value = overrides?.[name];
  return value !== null && value !== undefined && value !== "" ? value : base[name];
}
