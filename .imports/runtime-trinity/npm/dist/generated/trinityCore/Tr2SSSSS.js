import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_subSurfaceFrontScatterColor, _init_extra_subSurfaceFrontScatterColor, _init_subSurfaceScatteringWidth, _init_extra_subSurfaceScatteringWidth, _init_hasSSSSSInScene, _init_extra_hasSSSSSInScene, _init_enabled, _init_extra_enabled;

/** Tr2SSSSS (trinityCore) - generated from schema shapeHash 420c136f.... */
let _Tr2SSSSS;
class Tr2SSSSS extends CjsModel {
  static {
    ({
      e: [_init_subSurfaceFrontScatterColor, _init_extra_subSurfaceFrontScatterColor, _init_subSurfaceScatteringWidth, _init_extra_subSurfaceScatteringWidth, _init_hasSSSSSInScene, _init_extra_hasSSSSSInScene, _init_enabled, _init_extra_enabled],
      c: [_Tr2SSSSS, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SSSSS",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.color], 16, "subSurfaceFrontScatterColor"], [[io, io.readwrite, type, type.float32], 16, "subSurfaceScatteringWidth"], [[io, io.read, type, type.boolean], 16, "hasSSSSSInScene"], [[io, io.readwrite, type, type.boolean], 16, "enabled"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_enabled(this);
  }
  /** m_subSurfaceFrontScatterColor (Color) [READWRITE, PERSIST] */
  subSurfaceFrontScatterColor = _init_subSurfaceFrontScatterColor(this, vec4.fromValues(1, 1, 1, 1));

  /** m_subSurfaceScatteringWidth (float) [READWRITE] */
  subSurfaceScatteringWidth = (_init_extra_subSurfaceFrontScatterColor(this), _init_subSurfaceScatteringWidth(this, 0.1277));

  /** m_hasSSSSSInScene (bool) [READ] */
  hasSSSSSInScene = (_init_extra_subSurfaceScatteringWidth(this), _init_hasSSSSSInScene(this, true));

  /** m_enabled (bool) [READWRITE] */
  enabled = (_init_extra_hasSSSSSInScene(this), _init_enabled(this, true));
  static {
    _initClass();
  }
}

export { _Tr2SSSSS as Tr2SSSSS };
//# sourceMappingURL=Tr2SSSSS.js.map
