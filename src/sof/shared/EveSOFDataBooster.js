// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataBoosterShape } from "./EveSOFDataBoosterShape.js";

/** Combines normal and warp booster colors, scales, shapes, textures, and light settings. */
@meta.define({ className: "EveSOFDataBooster", family: "eve" })
export class EveSOFDataBooster
{

  /**
   * Four-component scale control forwarded to the booster effect; component meanings follow that shader.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  scale = vec4.fromValues(1, 1, 1, 1);

  /**
   * Normal-flight glow color forwarded to the booster sprites.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  glowColor = vec4.create();

  /**
   * Warp-flight glow color forwarded to the booster sprites.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  warpGlowColor = vec4.create();

  /**
   * Size multiplier for the booster glow sprite.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  glowScale = 1;

  /**
   * Normal-flight halo color for the booster sprites.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  haloColor = vec4.create();

  /**
   * Warp-flight halo color; native exposure preserves this typo while its member is m_warpHaloColor.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  warpHalpColor = vec4.create();

  /**
   * Horizontal size multiplier for the booster halo.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  haloScaleX = 1;

  /**
   * Vertical size multiplier for the booster halo.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  haloScaleY = 1;

  /**
   * Size multiplier for the symmetric booster halo.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  symHaloScale = 1;

  /**
   * Color of the trail behind the booster.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  trailColor = vec4.create();

  /**
   * Four-component trail-size control forwarded to the trail effect without unit conversion.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  trailSize = vec4.create();

  /**
   * First normal-flight plume shape; constructed independently by default, while authored references may be null.
   * @type {EveSOFDataBoosterShape|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataBoosterShape")
  shape0 = new EveSOFDataBoosterShape();

  /**
   * Second normal-flight plume shape; constructed independently by default, while authored references may be null.
   * @type {EveSOFDataBoosterShape|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataBoosterShape")
  shape1 = new EveSOFDataBoosterShape();

  /**
   * First warp-flight plume shape; constructed independently by default, while authored references may be null.
   * @type {EveSOFDataBoosterShape|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataBoosterShape")
  warpShape0 = new EveSOFDataBoosterShape();

  /**
   * Second warp-flight plume shape; constructed independently by default, while authored references may be null.
   * @type {EveSOFDataBoosterShape|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataBoosterShape")
  warpShape1 = new EveSOFDataBoosterShape();

  /**
   * Resource path of the booster shape-atlas texture; a string rather than a held resource.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  shapeAtlasResPath = "";

  /**
   * Resource path of the first booster gradient texture.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  gradient0ResPath = "";

  /**
   * Resource path of the second booster gradient texture.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  gradient1ResPath = "";

  /**
   * Unsigned atlas-height parameter packed into ShapeAtlasSize; no unit conversion is performed here.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  shapeAtlasHeight = 0;

  /**
   * Unsigned number of shape-atlas entries packed into ShapeAtlasSize.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  shapeAtlasCount = 0;

  /**
   * Offset used to place the booster light relative to its locator; no distance-unit conversion occurs here.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightOffset = 0;

  /**
   * Normal-flight booster-light radius in the consumer scene-distance convention.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightRadius = 0;

  /**
   * Warp-flight booster-light radius in the consumer scene-distance convention.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightWarpRadius = 0;

  /**
   * Amplitude of booster-light flickering forwarded to the light setup.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightFlickerAmplitude = 0;

  /**
   * Frequency control for booster-light flickering; no hertz conversion is established by this record.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightFlickerFrequency = 0;

  /**
   * Normal-flight booster-light color.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  lightColor = vec4.create();

  /**
   * Warp-flight booster-light color.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  lightWarpColor = vec4.create();

  /**
   * Exposes the typo-preserved Carbon storage vector backing the public warp
   * halo color alias.
   * @returns {Float32Array} The existing warpHalpColor storage.
   */
  @meta.ours
  get warpHaloColor()
  {
    return this.warpHalpColor;
  }

  /** Copies a vector into the existing typo-preserved warp-halo storage.
   * @param {ArrayLike<number>} value Four color components.
   */
  @meta.ours
  set warpHaloColor(value)
  {
    vec4.copy(this.warpHalpColor, value);
  }

  /**
   * Merges scalar, vector, resource-path, light, and four shape values from base
   * and optional booster overrides into a reusable instance. This is a JS-only
   * helper; zero overrides are accepted while null/undefined/empty strings fall back.
   * @param {EveSOFDataBooster|null} base Optional base record.
   * @param {EveSOFDataBooster|null} overrides Optional override record.
   * @param {EveSOFDataBooster|null} [out=null] Reused result or newly constructed booster.
   * @returns {EveSOFDataBooster} The output record.
   */
  @meta.ours
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
meta.blue.interfaceTable({ interfaces: [EveSOFDataBooster], chainTo: null })(EveSOFDataBooster);
