import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_alignment, _init_extra_alignment, _init_anchor, _init_extra_anchor, _init_cohesion, _init_extra_cohesion, _init_deceleration, _init_extra_deceleration, _init_formation, _init_extra_formation, _init_separation, _init_extra_separation, _init_wander, _init_extra_wander;

/** SwarmVehicleDebug (eve/spaceObject/swarm) - generated from schema shapeHash f53e5a64.... */
let _SwarmVehicleDebug;
class SwarmVehicleDebug extends CjsModel {
  static {
    ({
      e: [_init_alignment, _init_extra_alignment, _init_anchor, _init_extra_anchor, _init_cohesion, _init_extra_cohesion, _init_deceleration, _init_extra_deceleration, _init_formation, _init_extra_formation, _init_separation, _init_extra_separation, _init_wander, _init_extra_wander],
      c: [_SwarmVehicleDebug, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SwarmVehicleDebug",
      family: "eve/spaceObject/swarm"
    })], [[[type, type.vec3], 16, "alignment"], [[type, type.vec3], 16, "anchor"], [[type, type.vec3], 16, "cohesion"], [[type, type.vec3], 16, "deceleration"], [[type, type.vec3], 16, "formation"], [[type, type.vec3], 16, "separation"], [[type, type.vec3], 16, "wander"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_wander(this);
  }
  /** alignment (Vector3) */
  alignment = _init_alignment(this, vec3.create());

  /** anchor (Vector3) */
  anchor = (_init_extra_alignment(this), _init_anchor(this, vec3.create()));

  /** cohesion (Vector3) */
  cohesion = (_init_extra_anchor(this), _init_cohesion(this, vec3.create()));

  /** deceleration (Vector3) */
  deceleration = (_init_extra_cohesion(this), _init_deceleration(this, vec3.create()));

  /** formation (Vector3) */
  formation = (_init_extra_deceleration(this), _init_formation(this, vec3.create()));

  /** separation (Vector3) */
  separation = (_init_extra_formation(this), _init_separation(this, vec3.create()));

  /** wander (Vector3) */
  wander = (_init_extra_separation(this), _init_wander(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _SwarmVehicleDebug as SwarmVehicleDebug };
//# sourceMappingURL=SwarmVehicleDebug.js.map
