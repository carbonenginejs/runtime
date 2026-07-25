import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { EveChildMesh as _EveChildMesh } from './EveChildMesh.js';
import { EveChildSpherePinPerObjectData as _EveChildSpherePinPer } from '../perObjectData/EveChildSpherePinPerObjectData.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_curveSets, _init_extra_curveSets, _init_centerNormal, _init_extra_centerNormal, _init_pinMaxRadius, _init_extra_pinMaxRadius, _init_pinRadius, _init_extra_pinRadius, _init_pinRotation, _init_extra_pinRotation, _init_pinAlphaThreshold, _init_extra_pinAlphaThreshold;
let _EveChildSpherePin;
class EveChildSpherePin extends _EveChildMesh {
  static {
    ({
      e: [_init_curveSets, _init_extra_curveSets, _init_centerNormal, _init_extra_centerNormal, _init_pinMaxRadius, _init_extra_pinMaxRadius, _init_pinRadius, _init_extra_pinRadius, _init_pinRotation, _init_extra_pinRotation, _init_pinAlphaThreshold, _init_extra_pinAlphaThreshold, _initProto],
      c: [_EveChildSpherePin, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildSpherePin",
      family: "eve/child"
    })], [[[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "centerNormal"], [[io, io.notify, io, io.persist, type, type.float32], 16, "pinMaxRadius"], [[io, io.notify, io, io.persist, type, type.float32], 16, "pinRadius"], [[io, io.notify, io, io.persist, type, type.float32], 16, "pinRotation"], [[io, io.notify, io, io.persist, type, type.float32], 16, "pinAlphaThreshold"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon allocates a native Tr2PerObjectData subclass; runtime-trinity allocates or constructs the equivalent portable schema record.")], 18, "GetPerObjectData"]], 0, void 0, _EveChildMesh));
  }
  constructor(...args) {
    super(...args);
    _init_extra_pinAlphaThreshold(this);
  }
  #pinColor = (_initProto(this), vec4.fromValues(1, 1, 1, 1));

  /** Carbon maps both Blue names to the same m_pinColor storage. */
  get pinColor() {
    return this.#pinColor;
  }
  set pinColor(value) {
    if (value?.length >= 4) {
      vec4.copy(this.#pinColor, value);
    }
  }

  /** Blue alias for pinColor. */
  get color() {
    return this.#pinColor;
  }
  set color(value) {
    this.pinColor = value;
  }

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  curveSets = _init_curveSets(this, []);

  /** m_centerNormal (Vector3) [READWRITE, NOTIFY, PERSIST] */
  centerNormal = (_init_extra_curveSets(this), _init_centerNormal(this, vec3.create()));

  /** m_pinMaxRadius (float) [READWRITE, NOTIFY, PERSIST] */
  pinMaxRadius = (_init_extra_centerNormal(this), _init_pinMaxRadius(this, 0.2));

  /** m_pinRadius (float) [READWRITE, NOTIFY, PERSIST] */
  pinRadius = (_init_extra_pinMaxRadius(this), _init_pinRadius(this, 0));

  /** m_pinRotation (float) [READWRITE, NOTIFY, PERSIST] */
  pinRotation = (_init_extra_pinRadius(this), _init_pinRotation(this, 0));

  /** m_pinAlphaThreshold (float) [READWRITE, NOTIFY, PERSIST] */
  pinAlphaThreshold = (_init_extra_pinRotation(this), _init_pinAlphaThreshold(this, 0));

  /** Carbon updates the mesh first, then advances every attached curve set. */
  UpdateAsyncronous(updateContext, params) {
    super.UpdateAsyncronous(updateContext, params);
    const time = updateContext?.GetTime?.() ?? updateContext?.currentTime ?? 0;
    for (const curveSet of this.curveSets) {
      curveSet?.Update?.(time, time);
    }
  }

  /**
   * Builds Carbon's sphere-pin constant record. Matrices in GPU records are
   * stored transposed; all other values are copied in logical order.
   */
  GetPerObjectData(accumulator = null) {
    const data = typeof accumulator?.Allocate === "function" ? accumulator.Allocate(_EveChildSpherePinPer) : new _EveChildSpherePinPer();
    if (!data) {
      return null;
    }
    mat4.transpose(data.worldMatrix, this.worldTransform);
    vec4.set(data.pinPosition, this.centerNormal[0], this.centerNormal[1], this.centerNormal[2], this.pinRadius);
    vec4.set(data.pinRotation, this.pinRotation, 0, 0, 0);
    vec4.copy(data.pinColor, this.#pinColor);
    vec4.set(data.pinThreshold, this.pinAlphaThreshold, 0, 0, 0);
    vec4.set(data.pinRadiusPrecalc, Math.sin(this.pinRadius), Math.cos(this.pinRadius), Math.sin(this.pinRotation), Math.cos(this.pinRotation));
    vec4.set(data.pinUV, 1, 1, 0, 0);
    return data;
  }
  static {
    _initClass();
  }
}
CjsSchema.decorateField(_EveChildSpherePin, "pinColor", io.notify, io.persist, type.color);
CjsSchema.decorateField(_EveChildSpherePin, "color", io.notify, io.persist, type.color);

export { _EveChildSpherePin as EveChildSpherePin };
//# sourceMappingURL=EveChildSpherePin.js.map
