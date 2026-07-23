import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { vec3 } from '@carbonenginejs/core-math/vec3';
import { vec4 } from '@carbonenginejs/core-math/vec4';

let _initClass, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_color, _init_extra_color, _init_pointLightFalloff, _init_extra_pointLightFalloff, _init_shadow0Influence, _init_extra_shadow0Influence, _init_shadow1Influence, _init_extra_shadow1Influence, _init_coneCosAlphaOuter, _init_extra_coneCosAlphaOuter, _init_coneCosAlphaInner, _init_extra_coneCosAlphaInner, _init_spotDirection, _init_extra_spotDirection, _init_unused, _init_extra_unused, _init_boxTransformRow, _init_extra_boxTransformRow, _init_boxTransformRow2, _init_extra_boxTransformRow2;

/** Tr2InteriorPerObjectLightData (interior) - generated from schema shapeHash 2cecaf9d.... */
let _Tr2InteriorPerObject;
class Tr2InteriorPerObjectLightData extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_color, _init_extra_color, _init_pointLightFalloff, _init_extra_pointLightFalloff, _init_shadow0Influence, _init_extra_shadow0Influence, _init_shadow1Influence, _init_extra_shadow1Influence, _init_coneCosAlphaOuter, _init_extra_coneCosAlphaOuter, _init_coneCosAlphaInner, _init_extra_coneCosAlphaInner, _init_spotDirection, _init_extra_spotDirection, _init_unused, _init_extra_unused, _init_boxTransformRow, _init_extra_boxTransformRow, _init_boxTransformRow2, _init_extra_boxTransformRow2],
      c: [_Tr2InteriorPerObject, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2InteriorPerObjectLightData",
      family: "interior"
    })], [[[type, type.vec3], 16, "position"], [[type, type.float32], 16, "radius"], [[type, type.vec3], 16, "color"], [[type, type.float32], 16, "pointLightFalloff"], [[type, type.float32], 16, "shadow0Influence"], [[type, type.float32], 16, "shadow1Influence"], [[type, type.float32], 16, "coneCosAlphaOuter"], [[type, type.float32], 16, "coneCosAlphaInner"], [[type, type.vec3], 16, "spotDirection"], [[type, type.float32], 16, "unused2"], [[type, type.vec4], 16, "boxTransformRow3"], [[type, type.vec4], 16, "boxTransformRow4"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_boxTransformRow2(this);
  }
  /** position (Vector3) */
  position = _init_position(this, vec3.create());

  /** radius (float) */
  radius = (_init_extra_position(this), _init_radius(this, 0));

  /** color (Vector3) */
  color = (_init_extra_radius(this), _init_color(this, vec3.create()));

  /** pointLightFalloff (float) */
  pointLightFalloff = (_init_extra_color(this), _init_pointLightFalloff(this, 0));

  /** shadow0Influence (float) */
  shadow0Influence = (_init_extra_pointLightFalloff(this), _init_shadow0Influence(this, 0));

  /** shadow1Influence (float) */
  shadow1Influence = (_init_extra_shadow0Influence(this), _init_shadow1Influence(this, 0));

  /** coneCosAlphaOuter (float) */
  coneCosAlphaOuter = (_init_extra_shadow1Influence(this), _init_coneCosAlphaOuter(this, 0));

  /** coneCosAlphaInner (float) */
  coneCosAlphaInner = (_init_extra_coneCosAlphaOuter(this), _init_coneCosAlphaInner(this, 0));

  /** spotDirection (Vector3) */
  spotDirection = (_init_extra_coneCosAlphaInner(this), _init_spotDirection(this, vec3.create()));

  /** unused2 (float) */
  unused2 = (_init_extra_spotDirection(this), _init_unused(this, 0));

  /** boxTransformRow3 (Vector4) */
  boxTransformRow3 = (_init_extra_unused(this), _init_boxTransformRow(this, vec4.create()));

  /** boxTransformRow4 (Vector4) */
  boxTransformRow4 = (_init_extra_boxTransformRow(this), _init_boxTransformRow2(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _Tr2InteriorPerObject as Tr2InteriorPerObjectLightData };
//# sourceMappingURL=Tr2InteriorPerObjectLightData.js.map
