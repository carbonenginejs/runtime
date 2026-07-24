import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_coneDirection, _init_extra_coneDirection, _init_coneAlphaInner, _init_extra_coneAlphaInner, _init_coneAlphaOuter, _init_extra_coneAlphaOuter, _init_specularIntensity, _init_extra_specularIntensity, _init_curveSets, _init_extra_curveSets, _init_primaryLighting, _init_extra_primaryLighting, _init_falloff, _init_extra_falloff, _init_kelvinColor, _init_extra_kelvinColor, _init_radius, _init_extra_radius, _init_position, _init_extra_position, _init_color, _init_extra_color, _init_name, _init_extra_name, _init_useKelvinColor, _init_extra_useKelvinColor;

/** Tr2InteriorLightSource (interior) - generated from schema shapeHash 8dfd8045.... */
let _Tr2InteriorLightSour;
class Tr2InteriorLightSource extends CjsModel {
  static {
    ({
      e: [_init_coneDirection, _init_extra_coneDirection, _init_coneAlphaInner, _init_extra_coneAlphaInner, _init_coneAlphaOuter, _init_extra_coneAlphaOuter, _init_specularIntensity, _init_extra_specularIntensity, _init_curveSets, _init_extra_curveSets, _init_primaryLighting, _init_extra_primaryLighting, _init_falloff, _init_extra_falloff, _init_kelvinColor, _init_extra_kelvinColor, _init_radius, _init_extra_radius, _init_position, _init_extra_position, _init_color, _init_extra_color, _init_name, _init_extra_name, _init_useKelvinColor, _init_extra_useKelvinColor, _initProto],
      c: [_Tr2InteriorLightSour, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2InteriorLightSource",
      family: "interior"
    })], [[[io, io.notify, io, io.persist, type, type.vec3], 16, "coneDirection"], [[io, io.notify, io, io.persist, type, type.float32], 16, "coneAlphaInner"], [[io, io.notify, io, io.persist, type, type.float32], 16, "coneAlphaOuter"], [[io, io.persist, type, type.float32], 16, "specularIntensity"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "primaryLighting"], [[io, io.persist, type, type.float32], 16, "falloff"], [[io, io.persist, void 0, type.model("Tr2KelvinColor")], 16, "kelvinColor"], [[io, io.notify, io, io.persist, type, type.float32], 16, "radius"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "useKelvinColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsSpotLight"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_useKelvinColor(this);
  }
  /** m_coneDirection (Vector3) [READWRITE, PERSIST, NOTIFY] */
  coneDirection = (_initProto(this), _init_coneDirection(this, vec3.fromValues(0, -1, 0)));

  /** m_coneAlphaInner (float) [READWRITE, PERSIST, NOTIFY] */
  coneAlphaInner = (_init_extra_coneDirection(this), _init_coneAlphaInner(this, 180));

  /** m_coneAlphaOuter (float) [READWRITE, PERSIST, NOTIFY] */
  coneAlphaOuter = (_init_extra_coneAlphaInner(this), _init_coneAlphaOuter(this, 180));

  /** m_specularIntensity (float) [READWRITE, PERSIST] */
  specularIntensity = (_init_extra_coneAlphaOuter(this), _init_specularIntensity(this, 1));

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  curveSets = (_init_extra_specularIntensity(this), _init_curveSets(this, []));

  /** m_primaryLighting (bool) [READWRITE, PERSIST, NOTIFY] */
  primaryLighting = (_init_extra_curveSets(this), _init_primaryLighting(this, true));

  /** m_falloff (float) [READWRITE, PERSIST] */
  falloff = (_init_extra_primaryLighting(this), _init_falloff(this, 1));

  /** m_kelvinColor (Tr2KelvinColorPtr) [READWRITE, PERSIST] */
  kelvinColor = (_init_extra_falloff(this), _init_kelvinColor(this, null));

  /** m_radius (float) [READWRITE, PERSIST, NOTIFY] */
  radius = (_init_extra_kelvinColor(this), _init_radius(this, 1));

  /** m_position (Vector3) [READWRITE, PERSIST, NOTIFY] */
  position = (_init_extra_radius(this), _init_position(this, vec3.create()));

  /** m_color (Color) [READWRITE, PERSIST] */
  color = (_init_extra_position(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_color(this), _init_name(this, ""));

  /** m_useKelvinColor (bool) [READWRITE, PERSIST] */
  useKelvinColor = (_init_extra_name(this), _init_useKelvinColor(this, false));

  /** Carbon method IsSpotLight (MAP_METHOD_AND_WRAP). */
  IsSpotLight() {
    return this.coneAlphaOuter < 89;
  }
  static {
    _initClass();
  }
}

export { _Tr2InteriorLightSour as Tr2InteriorLightSource };
//# sourceMappingURL=Tr2InteriorLightSource.js.map
