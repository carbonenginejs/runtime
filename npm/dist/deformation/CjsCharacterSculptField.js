import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_name, _init_extra_name, _init_attributes, _init_extra_attributes, _init_markerPosition, _init_extra_markerPosition, _init_vertices, _init_extra_vertices, _init_triangles, _init_extra_triangles;
let _CjsCharacterSculptFi;
class CjsCharacterSculptField extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_name, _init_extra_name, _init_attributes, _init_extra_attributes, _init_markerPosition, _init_extra_markerPosition, _init_vertices, _init_extra_vertices, _init_triangles, _init_extra_triangles],
      c: [_CjsCharacterSculptFi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterSculptField",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "name"], [[void 0, type.list("string"), io, io.persist], 16, "attributes"], [[type, type.vec3, io, io.persist], 16, "markerPosition"], [[void 0, type.list("CjsCharacterSculptVertex"), io, io.persist], 16, "vertices"], [[void 0, type.list("CjsCharacterSculptTriangle"), io, io.persist], 16, "triangles"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_triangles(this);
  }
  id = _init_id(this, "");
  name = (_init_extra_id(this), _init_name(this, ""));
  attributes = (_init_extra_name(this), _init_attributes(this, []));
  markerPosition = (_init_extra_attributes(this), _init_markerPosition(this, vec3.create()));
  vertices = (_init_extra_markerPosition(this), _init_vertices(this, []));
  triangles = (_init_extra_vertices(this), _init_triangles(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterSculptFi as CjsCharacterSculptField };
//# sourceMappingURL=CjsCharacterSculptField.js.map
