import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { EveSOFDataBoosterShape as _EveSOFDataBoosterSha } from './EveSOFDataBoosterShape.js';

let _initClass, _init_scale, _init_extra_scale, _init_glowColor, _init_extra_glowColor, _init_warpGlowColor, _init_extra_warpGlowColor, _init_glowScale, _init_extra_glowScale, _init_haloColor, _init_extra_haloColor, _init_warpHalpColor, _init_extra_warpHalpColor, _init_haloScaleX, _init_extra_haloScaleX, _init_haloScaleY, _init_extra_haloScaleY, _init_symHaloScale, _init_extra_symHaloScale, _init_trailColor, _init_extra_trailColor, _init_trailSize, _init_extra_trailSize, _init_shape, _init_extra_shape, _init_shape2, _init_extra_shape2, _init_warpShape, _init_extra_warpShape, _init_warpShape2, _init_extra_warpShape2, _init_shapeAtlasResPath, _init_extra_shapeAtlasResPath, _init_gradient0ResPath, _init_extra_gradient0ResPath, _init_gradient1ResPath, _init_extra_gradient1ResPath, _init_shapeAtlasHeight, _init_extra_shapeAtlasHeight, _init_shapeAtlasCount, _init_extra_shapeAtlasCount, _init_lightOffset, _init_extra_lightOffset, _init_lightRadius, _init_extra_lightRadius, _init_lightWarpRadius, _init_extra_lightWarpRadius, _init_lightFlickerAmplitude, _init_extra_lightFlickerAmplitude, _init_lightFlickerFrequency, _init_extra_lightFlickerFrequency, _init_lightColor, _init_extra_lightColor, _init_lightWarpColor, _init_extra_lightWarpColor;

/** EveSOFDataBooster (eve) - generated from schema shapeHash b4868013.... */
let _EveSOFDataBooster;
class EveSOFDataBooster extends CjsModel {
  static {
    ({
      e: [_init_scale, _init_extra_scale, _init_glowColor, _init_extra_glowColor, _init_warpGlowColor, _init_extra_warpGlowColor, _init_glowScale, _init_extra_glowScale, _init_haloColor, _init_extra_haloColor, _init_warpHalpColor, _init_extra_warpHalpColor, _init_haloScaleX, _init_extra_haloScaleX, _init_haloScaleY, _init_extra_haloScaleY, _init_symHaloScale, _init_extra_symHaloScale, _init_trailColor, _init_extra_trailColor, _init_trailSize, _init_extra_trailSize, _init_shape, _init_extra_shape, _init_shape2, _init_extra_shape2, _init_warpShape, _init_extra_warpShape, _init_warpShape2, _init_extra_warpShape2, _init_shapeAtlasResPath, _init_extra_shapeAtlasResPath, _init_gradient0ResPath, _init_extra_gradient0ResPath, _init_gradient1ResPath, _init_extra_gradient1ResPath, _init_shapeAtlasHeight, _init_extra_shapeAtlasHeight, _init_shapeAtlasCount, _init_extra_shapeAtlasCount, _init_lightOffset, _init_extra_lightOffset, _init_lightRadius, _init_extra_lightRadius, _init_lightWarpRadius, _init_extra_lightWarpRadius, _init_lightFlickerAmplitude, _init_extra_lightFlickerAmplitude, _init_lightFlickerFrequency, _init_extra_lightFlickerFrequency, _init_lightColor, _init_extra_lightColor, _init_lightWarpColor, _init_extra_lightWarpColor],
      c: [_EveSOFDataBooster, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataBooster",
      family: "eve"
    })], [[[io, io.persist, type, type.vec4], 16, "scale"], [[io, io.persist, type, type.color], 16, "glowColor"], [[io, io.persist, type, type.color], 16, "warpGlowColor"], [[io, io.persist, type, type.float32], 16, "glowScale"], [[io, io.persist, type, type.color], 16, "haloColor"], [[io, io.persist, type, type.color], 16, "warpHalpColor"], [[io, io.persist, type, type.float32], 16, "haloScaleX"], [[io, io.persist, type, type.float32], 16, "haloScaleY"], [[io, io.persist, type, type.float32], 16, "symHaloScale"], [[io, io.persist, type, type.color], 16, "trailColor"], [[io, io.persist, type, type.vec4], 16, "trailSize"], [[io, io.persist, void 0, type.objectRef("EveSOFDataBoosterShape")], 16, "shape0"], [[io, io.persist, void 0, type.objectRef("EveSOFDataBoosterShape")], 16, "shape1"], [[io, io.persist, void 0, type.objectRef("EveSOFDataBoosterShape")], 16, "warpShape0"], [[io, io.persist, void 0, type.objectRef("EveSOFDataBoosterShape")], 16, "warpShape1"], [[io, io.persist, type, type.string], 16, "shapeAtlasResPath"], [[io, io.persist, type, type.string], 16, "gradient0ResPath"], [[io, io.persist, type, type.string], 16, "gradient1ResPath"], [[io, io.persist, type, type.uint32], 16, "shapeAtlasHeight"], [[io, io.persist, type, type.uint32], 16, "shapeAtlasCount"], [[io, io.persist, type, type.float32], 16, "lightOffset"], [[io, io.persist, type, type.float32], 16, "lightRadius"], [[io, io.persist, type, type.float32], 16, "lightWarpRadius"], [[io, io.persist, type, type.float32], 16, "lightFlickerAmplitude"], [[io, io.persist, type, type.float32], 16, "lightFlickerFrequency"], [[io, io.persist, type, type.color], 16, "lightColor"], [[io, io.persist, type, type.color], 16, "lightWarpColor"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lightWarpColor(this);
  }
  /** m_scale (Vector4) [READWRITE, PERSIST] */
  scale = _init_scale(this, vec4.fromValues(1, 1, 1, 1));

  /** m_glowColor (Color) [READWRITE, PERSIST] */
  glowColor = (_init_extra_scale(this), _init_glowColor(this, vec4.create()));

  /** m_warpGlowColor (Color) [READWRITE, PERSIST] */
  warpGlowColor = (_init_extra_glowColor(this), _init_warpGlowColor(this, vec4.create()));

  /** m_glowScale (float) [READWRITE, PERSIST] */
  glowScale = (_init_extra_warpGlowColor(this), _init_glowScale(this, 1));

  /** m_haloColor (Color) [READWRITE, PERSIST] */
  haloColor = (_init_extra_glowScale(this), _init_haloColor(this, vec4.create()));

  /** m_warpHaloColor (Color) [READWRITE, PERSIST] */
  warpHalpColor = (_init_extra_haloColor(this), _init_warpHalpColor(this, vec4.create()));

  /** m_haloScaleX (float) [READWRITE, PERSIST] */
  haloScaleX = (_init_extra_warpHalpColor(this), _init_haloScaleX(this, 1));

  /** m_haloScaleY (float) [READWRITE, PERSIST] */
  haloScaleY = (_init_extra_haloScaleX(this), _init_haloScaleY(this, 1));

  /** m_symHaloScale (float) [READWRITE, PERSIST] */
  symHaloScale = (_init_extra_haloScaleY(this), _init_symHaloScale(this, 1));

  /** m_trailColor (Color) [READWRITE, PERSIST] */
  trailColor = (_init_extra_symHaloScale(this), _init_trailColor(this, vec4.create()));

  /** m_trailSize (Vector4) [READWRITE, PERSIST] */
  trailSize = (_init_extra_trailColor(this), _init_trailSize(this, vec4.create()));

  /** m_shape0 (EveSOFDataBoosterShapePtr) [READWRITE, PERSIST] */
  shape0 = (_init_extra_trailSize(this), _init_shape(this, new _EveSOFDataBoosterSha()));

  /** m_shape1 (EveSOFDataBoosterShapePtr) [READWRITE, PERSIST] */
  shape1 = (_init_extra_shape(this), _init_shape2(this, new _EveSOFDataBoosterSha()));

  /** m_warpShape0 (EveSOFDataBoosterShapePtr) [READWRITE, PERSIST] */
  warpShape0 = (_init_extra_shape2(this), _init_warpShape(this, new _EveSOFDataBoosterSha()));

  /** m_warpShape1 (EveSOFDataBoosterShapePtr) [READWRITE, PERSIST] */
  warpShape1 = (_init_extra_warpShape(this), _init_warpShape2(this, new _EveSOFDataBoosterSha()));

  /** m_shapeAtlasResPath (std::string) [READWRITE, PERSIST] */
  shapeAtlasResPath = (_init_extra_warpShape2(this), _init_shapeAtlasResPath(this, ""));

  /** m_gradient0ResPath (std::string) [READWRITE, PERSIST] */
  gradient0ResPath = (_init_extra_shapeAtlasResPath(this), _init_gradient0ResPath(this, ""));

  /** m_gradient1ResPath (std::string) [READWRITE, PERSIST] */
  gradient1ResPath = (_init_extra_gradient0ResPath(this), _init_gradient1ResPath(this, ""));

  /** m_shapeAtlasHeight (uint32_t) [READWRITE, PERSIST] */
  shapeAtlasHeight = (_init_extra_gradient1ResPath(this), _init_shapeAtlasHeight(this, 0));

  /** m_shapeAtlasCount (uint32_t) [READWRITE, PERSIST] */
  shapeAtlasCount = (_init_extra_shapeAtlasHeight(this), _init_shapeAtlasCount(this, 0));

  /** m_lightOffset (float) [READWRITE, PERSIST] */
  lightOffset = (_init_extra_shapeAtlasCount(this), _init_lightOffset(this, 0));

  /** m_lightRadius (float) [READWRITE, PERSIST] */
  lightRadius = (_init_extra_lightOffset(this), _init_lightRadius(this, 0));

  /** m_lightWarpRadius (float) [READWRITE, PERSIST] */
  lightWarpRadius = (_init_extra_lightRadius(this), _init_lightWarpRadius(this, 0));

  /** m_lightFlickerAmplitude (float) [READWRITE, PERSIST] */
  lightFlickerAmplitude = (_init_extra_lightWarpRadius(this), _init_lightFlickerAmplitude(this, 0));

  /** m_lightFlickerFrequency (float) [READWRITE, PERSIST] */
  lightFlickerFrequency = (_init_extra_lightFlickerAmplitude(this), _init_lightFlickerFrequency(this, 0));

  /** m_lightColor (Color) [READWRITE, PERSIST] */
  lightColor = (_init_extra_lightFlickerFrequency(this), _init_lightColor(this, vec4.create()));

  /** m_lightWarpColor (Color) [READWRITE, PERSIST] */
  lightWarpColor = (_init_extra_lightColor(this), _init_lightWarpColor(this, vec4.create()));
  get warpHaloColor() {
    return this.warpHalpColor;
  }
  set warpHaloColor(value) {
    vec4.copy(this.warpHalpColor, value);
  }
  static combine(base, overrides, out = null) {
    out ??= new this();
    if (!base && !overrides) return out;
    base ??= out;
    for (const name of ["scale", "glowColor", "warpGlowColor", "haloColor", "warpHalpColor", "trailColor", "trailSize", "lightColor", "lightWarpColor"]) {
      vec4.copy(out[name], selectValue(base, overrides, name));
    }
    for (const name of ["glowScale", "haloScaleX", "haloScaleY", "symHaloScale", "shapeAtlasResPath", "gradient0ResPath", "gradient1ResPath", "shapeAtlasHeight", "shapeAtlasCount", "lightOffset", "lightRadius", "lightWarpRadius", "lightFlickerAmplitude", "lightFlickerFrequency"]) {
      out[name] = selectValue(base, overrides, name);
    }
    out.shape0 = _EveSOFDataBoosterSha.combine(base.shape0, overrides?.shape0, out.shape0);
    out.shape1 = _EveSOFDataBoosterSha.combine(base.shape1, overrides?.shape1, out.shape1);
    out.warpShape0 = _EveSOFDataBoosterSha.combine(base.warpShape0, overrides?.warpShape0, out.warpShape0);
    out.warpShape1 = _EveSOFDataBoosterSha.combine(base.warpShape1, overrides?.warpShape1, out.warpShape1);
    return out;
  }
  static {
    _initClass();
  }
}
function selectValue(base, overrides, name) {
  const value = overrides?.[name];
  return value !== null && value !== undefined && value !== "" ? value : base[name];
}

export { _EveSOFDataBooster as EveSOFDataBooster };
//# sourceMappingURL=EveSOFDataBooster.js.map
