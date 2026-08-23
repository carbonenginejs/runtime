// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";
import { EveSOFDataBoosterShape } from "./EveSOFDataBoosterShape.js";

/** EveSOFDataBooster (eve) - generated from schema shapeHash b4868013.... */
@type.define({ className: "EveSOFDataBooster", family: "eve" })
export class EveSOFDataBooster extends CjsModel
{

  /** m_scale (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  scale = vec4.fromValues(1, 1, 1, 1);

  /** m_glowColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  glowColor = vec4.create();

  /** m_warpGlowColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  warpGlowColor = vec4.create();

  /** m_glowScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  glowScale = 1;

  /** m_haloColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  haloColor = vec4.create();

  /** m_warpHaloColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  warpHalpColor = vec4.create();

  /** m_haloScaleX (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  haloScaleX = 1;

  /** m_haloScaleY (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  haloScaleY = 1;

  /** m_symHaloScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  symHaloScale = 1;

  /** m_trailColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  trailColor = vec4.create();

  /** m_trailSize (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  trailSize = vec4.create();

  /** m_shape0 (EveSOFDataBoosterShapePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataBoosterShape")
  shape0 = new EveSOFDataBoosterShape();

  /** m_shape1 (EveSOFDataBoosterShapePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataBoosterShape")
  shape1 = new EveSOFDataBoosterShape();

  /** m_warpShape0 (EveSOFDataBoosterShapePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataBoosterShape")
  warpShape0 = new EveSOFDataBoosterShape();

  /** m_warpShape1 (EveSOFDataBoosterShapePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataBoosterShape")
  warpShape1 = new EveSOFDataBoosterShape();

  /** m_shapeAtlasResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shapeAtlasResPath = "";

  /** m_gradient0ResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  gradient0ResPath = "";

  /** m_gradient1ResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  gradient1ResPath = "";

  /** m_shapeAtlasHeight (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  shapeAtlasHeight = 0;

  /** m_shapeAtlasCount (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  shapeAtlasCount = 0;

  /** m_lightOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightOffset = 0;

  /** m_lightRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightRadius = 0;

  /** m_lightWarpRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightWarpRadius = 0;

  /** m_lightFlickerAmplitude (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightFlickerAmplitude = 0;

  /** m_lightFlickerFrequency (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightFlickerFrequency = 0;

  /** m_lightColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  lightColor = vec4.create();

  /** m_lightWarpColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  lightWarpColor = vec4.create();

  /**
   * Exposes the typo-preserved Carbon storage vector backing the public warp
   * halo color alias.
   */
  get warpHaloColor()
  {
    return this.warpHalpColor;
  }

  /** Copies a supplied vector into the typo-preserved Carbon warp-halo storage. */
  set warpHaloColor(value)
  {
    vec4.copy(this.warpHalpColor, value);
  }

  /**
   * Merges scalar, vector, resource-path, light, and four shape values from base
   * and optional booster overrides into a reusable instance.
   */
  static combine(base, overrides, out = null)
  {
    out ??= new this();
    if (!base && !overrides) return out;
    base ??= out;
    for (const name of [
      "scale",
      "glowColor",
      "warpGlowColor",
      "haloColor",
      "warpHalpColor",
      "trailColor",
      "trailSize",
      "lightColor",
      "lightWarpColor"
    ])
    {
      vec4.copy(out[name], selectValue(base, overrides, name));
    }
    for (const name of [
      "glowScale",
      "haloScaleX",
      "haloScaleY",
      "symHaloScale",
      "shapeAtlasResPath",
      "gradient0ResPath",
      "gradient1ResPath",
      "shapeAtlasHeight",
      "shapeAtlasCount",
      "lightOffset",
      "lightRadius",
      "lightWarpRadius",
      "lightFlickerAmplitude",
      "lightFlickerFrequency"
    ])
    {
      out[name] = selectValue(base, overrides, name);
    }
    out.shape0 = EveSOFDataBoosterShape.combine(base.shape0, overrides?.shape0, out.shape0);
    out.shape1 = EveSOFDataBoosterShape.combine(base.shape1, overrides?.shape1, out.shape1);
    out.warpShape0 = EveSOFDataBoosterShape.combine(base.warpShape0, overrides?.warpShape0, out.warpShape0);
    out.warpShape1 = EveSOFDataBoosterShape.combine(base.warpShape1, overrides?.warpShape1, out.warpShape1);
    return out;
  }

}

function selectValue(base, overrides, name)
{
  const value = overrides?.[name];
  return value !== null && value !== undefined && value !== "" ? value : base[name];
}
