import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsObjectDTO as _CjsObjectDTO } from './CjsObjectDTO.js';

let _initClass, _init_meshes, _init_extra_meshes, _init_skeletons, _init_extra_skeletons, _init_animations, _init_extra_animations, _init_bounds, _init_extra_bounds, _init_materials, _init_extra_materials;

/**
 * Geometry-oriented DTO used by CMF/GR2/GEO-like readers.
 *
 * Runtime-resource can normalize geometry format output into a private payload
 * and optionally mirror common arrays into helper fields.
 */
let _CjsGeometryDTO;
new class extends _identity {
  static [class CjsGeometryDTO extends _CjsObjectDTO {
    static {
      ({
        e: [_init_meshes, _init_extra_meshes, _init_skeletons, _init_extra_skeletons, _init_animations, _init_extra_animations, _init_bounds, _init_extra_bounds, _init_materials, _init_extra_materials],
        c: [_CjsGeometryDTO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsGeometryDTO",
        family: "resource"
      })], [[[io, io.persist, void 0, type.list("unknown")], 16, "meshes"], [[io, io.persist, void 0, type.list("unknown")], 16, "skeletons"], [[io, io.persist, void 0, type.list("unknown")], 16, "animations"], [[io, io.persist, type, type.unknown], 16, "bounds"], [[io, io.persist, void 0, type.list("unknown")], 16, "materials"]], 0, void 0, _CjsObjectDTO));
    }
    meshes = _init_meshes(this, []);
    skeletons = (_init_extra_meshes(this), _init_skeletons(this, []));
    animations = (_init_extra_skeletons(this), _init_animations(this, []));
    bounds = (_init_extra_animations(this), _init_bounds(this, null));
    materials = (_init_extra_bounds(this), _init_materials(this, []));
    constructor(values = null) {
      super(), _init_extra_materials(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }
  }];
  payload = "geometry";
  constructor() {
    super(_CjsGeometryDTO), _initClass();
  }
}();

export { _CjsGeometryDTO as CjsGeometryDTO };
//# sourceMappingURL=CjsGeometryDTO.js.map
