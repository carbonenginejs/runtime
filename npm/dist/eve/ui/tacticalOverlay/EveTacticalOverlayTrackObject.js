import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_translationCurve, _init_extra_translationCurve, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_isAggressive, _init_extra_isAggressive, _init_showVelocity, _init_extra_showVelocity;
let _EveTacticalOverlayTr;
class EveTacticalOverlayTrackObject extends CjsModel {
  static {
    ({
      e: [_init_translationCurve, _init_extra_translationCurve, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_isAggressive, _init_extra_isAggressive, _init_showVelocity, _init_extra_showVelocity, _initProto],
      c: [_EveTacticalOverlayTr, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveTacticalOverlayTrackObject",
      family: "eve/ui"
    })], [[[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "translationCurve"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "radius"], [[io, io.persist, type, type.boolean], 16, "isAggressive"], [[io, io.persist, type, type.boolean], 16, "showVelocity"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon vector functions use output pointers; runtime curves use the established time-first, out-last calling convention.")], 18, "UpdatePosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns Vector3 by value; JavaScript follows the runtime vector out-parameter convention.")], 18, "GetVelocity"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns Vector3 by value; JavaScript follows the runtime vector out-parameter convention.")], 18, "GetPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRadius"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsAggressive"], [[carbon, carbon.method, impl, impl.implemented], 18, "ShowVelocity"]], 0, void 0, CjsModel));
  }
  translationCurve = (_initProto(this), _init_translationCurve(this, null));
  position = (_init_extra_translationCurve(this), _init_position(this, vec3.create()));
  radius = (_init_extra_position(this), _init_radius(this, 0));
  isAggressive = (_init_extra_radius(this), _init_isAggressive(this, false));
  showVelocity = (_init_extra_isAggressive(this), _init_showVelocity(this, true));
  #velocity = (_init_extra_showVelocity(this), vec3.create());
  UpdatePosition(updateContext) {
    if (!this.translationCurve) return;
    const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? updateContext?.time ?? 0) || 0;
    const velocity = this.translationCurve.GetValueDotAt?.(time, this.#velocity);
    if (velocity && velocity !== this.#velocity) vec3.copy(this.#velocity, velocity);
    const position = this.translationCurve.GetValueAt?.(time, this.position);
    if (position && position !== this.position) vec3.copy(this.position, position);
  }
  GetVelocity(out = vec3.create()) {
    return vec3.copy(out, this.#velocity);
  }
  GetPosition(out = vec3.create()) {
    return vec3.copy(out, this.position);
  }
  GetRadius() {
    return this.radius;
  }
  IsAggressive() {
    return this.isAggressive;
  }
  ShowVelocity() {
    return this.showVelocity;
  }
  static {
    _initClass();
  }
}

export { _EveTacticalOverlayTr as EveTacticalOverlayTrackObject };
//# sourceMappingURL=EveTacticalOverlayTrackObject.js.map
