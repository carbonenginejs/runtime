import { applyDecs2311 as _applyDecs2311, identity as _identity } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { EveSpaceObjectChild as _EveSpaceObjectChild } from './EveSpaceObjectChild.js';

let _initClass, _init_partId, _init_extra_partId, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scale, _init_extra_scale, _init_boundingSphere, _init_extra_boundingSphere, _initClass2, _init_faction, _init_extra_faction, _init_race, _init_extra_race, _init_parts, _init_extra_parts;

/**
 * One modular-object part's logical transform and local-space bounds.
 *
 * Carbon declares this as EveChildPartData::PartData. The JavaScript class is
 * exported under a legal identifier while retaining that nested schema name.
 */
let _EveChildPartDataPart;
class EveChildPartDataPartData extends CjsModel {
  static {
    ({
      e: [_init_partId, _init_extra_partId, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_scale, _init_extra_scale, _init_boundingSphere, _init_extra_boundingSphere],
      c: [_EveChildPartDataPart, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildPartData.PartData",
      family: "eve/child"
    })], [[[io, io.persist, type, type.uint32], 16, "partId"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scale"], [[io, io.persist, type, type.vec4], 16, "boundingSphere"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_boundingSphere(this);
  }
  partId = _init_partId(this, 0);
  position = (_init_extra_partId(this), _init_position(this, vec3.create()));
  rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));
  scale = (_init_extra_rotation(this), _init_scale(this, vec3.fromValues(1, 1, 1)));

  /** Packed CcpMath::Sphere: xyz center and w radius. */
  boundingSphere = (_init_extra_scale(this), _init_boundingSphere(this, vec4.create()));
  static {
    _initClass();
  }
}
let _EveChildPartData;
new class extends _identity {
  static [class EveChildPartData extends _EveSpaceObjectChild {
    static {
      ({
        e: [_init_faction, _init_extra_faction, _init_race, _init_extra_race, _init_parts, _init_extra_parts],
        c: [_EveChildPartData, _initClass2]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildPartData",
        family: "eve/child"
      })], [[[io, io.persist, type, type.string], 16, "faction"], [[io, io.persist, type, type.string], 16, "race"], [[io, io.persist, void 0, type.list("EveChildPartData.PartData")], 16, "parts"]], 0, void 0, _EveSpaceObjectChild));
    }
    constructor(...args) {
      super(...args);
      _init_extra_parts(this);
    }
    faction = _init_faction(this, "");
    race = (_init_extra_faction(this), _init_race(this, ""));
    parts = (_init_extra_race(this), _init_parts(this, []));

    /** Returns the first monotonically available positive Carbon part tag. */
    GetUnusedPartID() {
      let nextId = 1;
      for (const part of this.parts) {
        const candidate = (Number(part.partId) >>> 0) + 1 >>> 0;
        nextId = Math.max(nextId, candidate);
      }
      return nextId >>> 0;
    }
  }];
  PartData = _EveChildPartDataPart;
  constructor() {
    super(_EveChildPartData), _initClass2();
  }
}();

export { _EveChildPartData as EveChildPartData, _EveChildPartDataPart as EveChildPartDataPartData };
//# sourceMappingURL=EveChildPartData.js.map
