import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_opacity, _init_extra_opacity, _init_falloff, _init_extra_falloff, _init_selfIllumination, _init_extra_selfIllumination;

/** EveCloudVolumeBall (eve/child) - generated from schema shapeHash 70440408.... */
let _EveCloudVolumeBall;
class EveCloudVolumeBall extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_opacity, _init_extra_opacity, _init_falloff, _init_extra_falloff, _init_selfIllumination, _init_extra_selfIllumination],
      c: [_EveCloudVolumeBall, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveCloudVolumeBall",
      family: "eve/child"
    })], [[[io, io.notify, io, io.persist, type, type.vec3], 16, "position"], [[io, io.notify, io, io.persist, type, type.float32], 16, "radius"], [[io, io.notify, io, io.persist, type, type.float32], 16, "opacity"], [[io, io.notify, io, io.persist, type, type.float32], 16, "falloff"], [[io, io.notify, io, io.persist, type, type.color], 16, "selfIllumination"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_selfIllumination(this);
  }
  /** m_ballData.m_position (Vector3) [READWRITE, PERSIST, NOTIFY] */
  position = _init_position(this, vec3.create());

  /** m_ballData.m_radius (float) [READWRITE, PERSIST, NOTIFY] */
  radius = (_init_extra_position(this), _init_radius(this, 0));

  /** m_ballData.m_opacity (float) [READWRITE, PERSIST, NOTIFY] */
  opacity = (_init_extra_radius(this), _init_opacity(this, 0));

  /** m_ballData.m_falloff (float) [READWRITE, PERSIST, NOTIFY] */
  falloff = (_init_extra_opacity(this), _init_falloff(this, 0));

  /** m_ballData.m_selfIllumination (Color) [READWRITE, PERSIST, NOTIFY] */
  selfIllumination = (_init_extra_falloff(this), _init_selfIllumination(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _EveCloudVolumeBall as EveCloudVolumeBall };
//# sourceMappingURL=EveCloudVolumeBall.js.map
