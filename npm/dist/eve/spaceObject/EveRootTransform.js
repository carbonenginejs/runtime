import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveTransform as _EveTransform } from './EveTransform.js';

let _initProto, _initClass, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_rotationCurve, _init_extra_rotationCurve, _init_modelTranslationCurve, _init_extra_modelTranslationCurve, _init_modelRotationCurve, _init_extra_modelRotationCurve, _init_translationCurve, _init_extra_translationCurve;

/**
 * A detached transform root whose own ball and model curves drive its matrix and
 * which stands in as a single targetable point for missiles and impacts.
 */
let _EveRootTransform;
new class extends _identity {
  static [class EveRootTransform extends _EveTransform {
    static {
      ({
        e: [_init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_rotationCurve, _init_extra_rotationCurve, _init_modelTranslationCurve, _init_extra_modelTranslationCurve, _init_modelRotationCurve, _init_extra_modelRotationCurve, _init_translationCurve, _init_extra_translationCurve, _initProto],
        c: [_EveRootTransform, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveRootTransform",
        family: "eve/spaceObject"
      })], [[[io, io.persist, type, type.float32], 16, "boundingSphereRadius"], [[io, io.persist, void 0, type.model("ITriQuaternionFunction")], 16, "rotationCurve"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "modelTranslationCurve"], [[io, io.persist, void 0, type.model("ITriQuaternionFunction")], 16, "modelRotationCurve"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "translationCurve"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Curve outputs use CarbonEngineJS's time-first, output-second convention.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateViewDependentData"], [[carbon, carbon.method, impl, impl.noop], 18, "GetDamageLocatorCount"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")], 18, "GetDamageLocatorPosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")], 18, "GetDamageLocatorDirection"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses an out-last signature for output parameters.")], 18, "GetImpactPosition"], [[carbon, carbon.method, impl, impl.noop], 18, "HasImpactConfigurationShield"], [[carbon, carbon.method, impl, impl.noop], 18, "GetClosestDamageLocatorIndex"], [[carbon, carbon.method, impl, impl.noop], 18, "GetGoodDamageLocatorIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRadius"], [[carbon, carbon.method, impl, impl.noop], 18, "CreateImpact"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateImpact"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMissPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphereRadius"]], 0, void 0, _EveTransform));
    }
    /** m_boundingSphereRadius (float) [READWRITE, PERSIST] */
    boundingSphereRadius = (_initProto(this), _init_boundingSphereRadius(this, -1));

    /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
    rotationCurve = (_init_extra_boundingSphereRadius(this), _init_rotationCurve(this, null));

    /** m_modelTranslation (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
    modelTranslationCurve = (_init_extra_rotationCurve(this), _init_modelTranslationCurve(this, null));

    /** m_modelRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
    modelRotationCurve = (_init_extra_modelTranslationCurve(this), _init_modelRotationCurve(this, null));

    /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
    translationCurve = (_init_extra_modelRotationCurve(this), _init_translationCurve(this, null));
    #lastUpdateMatrix = (_init_extra_translationCurve(this), mat4.create());

    /** Evaluates the detached ball/model curves, then advances inherited content. */
    UpdateSyncronous(updateContext = null) {
      const time = _EveRootTransform.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
      _EveRootTransform.#UpdateCurve(this.translationCurve, time, _EveRootTransform.#translation, _EveRootTransform.#zero);
      _EveRootTransform.#UpdateCurve(this.rotationCurve, time, _EveRootTransform.#rotation, _EveRootTransform.#identityRotation);
      if (this.modelRotationCurve) {
        _EveRootTransform.#UpdateCurve(this.modelRotationCurve, time, _EveRootTransform.#modelRotation, _EveRootTransform.#identityRotation);
        // Carbon (row-vector): rotation = modelRotation * rotation - model first.
        quat.multiply(_EveRootTransform.#rotation, _EveRootTransform.#rotation, _EveRootTransform.#modelRotation);
      }
      mat4.fromRotationTranslation(this.#lastUpdateMatrix, _EveRootTransform.#rotation, _EveRootTransform.#translation);
      if (this.modelTranslationCurve) {
        _EveRootTransform.#UpdateCurve(this.modelTranslationCurve, time, _EveRootTransform.#modelTranslation, _EveRootTransform.#zero);
        vec3.transformMat4(_EveRootTransform.#modelTranslation, _EveRootTransform.#modelTranslation, this.#lastUpdateMatrix);
        this.#lastUpdateMatrix[12] = _EveRootTransform.#modelTranslation[0];
        this.#lastUpdateMatrix[13] = _EveRootTransform.#modelTranslation[1];
        this.#lastUpdateMatrix[14] = _EveRootTransform.#modelTranslation[2];
      }
      super.UpdateSyncronous(updateContext);
      super.UpdateAsyncronous(updateContext);
      return true;
    }

    /** Carbon advances inherited async content from UpdateSyncronous for this root. */
    UpdateAsyncronous(_updateContext) {}

    /** Advances this detached root in Carbon's synchronous/asynchronous order. */
    Update(updateContext) {
      this.UpdateSyncronous(updateContext);
      this.UpdateAsyncronous(updateContext);
    }

    /** Applies the detached root matrix as the inherited transform parent. */
    UpdateViewDependentData(context) {
      return super.UpdateViewDependentData(context, this.#lastUpdateMatrix);
    }

    /** Root transforms have no damage locators. */
    GetDamageLocatorCount() {
      return 0;
    }

    /** Returns the current root translation as the sole target point. */
    GetDamageLocatorPosition(_index, _inWorldSpace, out = vec3.create()) {
      vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
      return true;
    }

    /** Returns Carbon's constant +Y target direction. */
    GetDamageLocatorDirection(_index, _inWorldSpace, out = vec3.create()) {
      vec3.set(out, 0, 1, 0);
      return true;
    }

    /** Tests whether a projectile has reached the root target point. */
    GetImpactPosition(locator, _posPrev, posNow, epsilon, out = vec3.create()) {
      this.GetDamageLocatorPosition(locator, true, out);
      return vec3.squaredDistance(posNow, out) < Number(epsilon);
    }

    /** Root transforms never use shield impact geometry. */
    HasImpactConfigurationShield() {
      return false;
    }

    /** Root transforms use their only target point. */
    GetClosestDamageLocatorIndex(_position) {
      return 0;
    }

    /** Root transforms use their only target point. */
    GetGoodDamageLocatorIndex(_position) {
      return 0;
    }

    /** Returns the authored target radius. */
    GetRadius() {
      return this.boundingSphereRadius;
    }

    /** Root transforms do not create attached impact overlays. */
    CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size) {
      return -1;
    }

    /** Root transforms do not update attached impact overlays. */
    UpdateImpact(_out, _direction, _impactIndex) {
      return false;
    }

    /** Computes a miss point just outside the root's spherical silhouette. */
    GetMissPosition(hit, source, out = vec3.create()) {
      this.GetDamageLocatorPosition(-1, true, out);
      if (!hit || !source) return out;
      vec3.subtract(_EveRootTransform.#missOffset, hit, out);
      vec3.subtract(_EveRootTransform.#missDirection, hit, source);
      const directionLength = vec3.length(_EveRootTransform.#missDirection);
      if (directionLength) vec3.scale(_EveRootTransform.#missDirection, _EveRootTransform.#missDirection, 1 / directionLength);
      vec3.scaleAndAdd(_EveRootTransform.#missOffset, _EveRootTransform.#missOffset, _EveRootTransform.#missDirection, -vec3.dot(_EveRootTransform.#missDirection, _EveRootTransform.#missOffset));
      const offsetLength = vec3.length(_EveRootTransform.#missOffset);
      if (offsetLength) vec3.scale(_EveRootTransform.#missOffset, _EveRootTransform.#missOffset, 1 / offsetLength);
      return vec3.scaleAndAdd(out, out, _EveRootTransform.#missOffset, this.boundingSphereRadius * 1.125);
    }

    /** Returns the authored bounding-sphere radius. */
    GetBoundingSphereRadius() {
      return this.boundingSphereRadius;
    }

    /**
     * Reads a numeric value from the update context, preferring a getter method
     * and falling back to the named properties, and yields 0 when nothing supplies
     * it.
     */

    /**
     * Samples a curve into out through whichever of Update or GetValueAt it
     * exposes, writing the fallback when there is no curve and copying back curves
     * that return a new array instead of filling out.
     */
  }];
  #GetContextValue(context, methodName, ...propertyNames) {
    const method = context?.[methodName];
    if (typeof method === "function") return Number(method.call(context)) || 0;
    for (const propertyName of propertyNames) {
      if (context?.[propertyName] !== undefined && context?.[propertyName] !== null) {
        return Number(context[propertyName]) || 0;
      }
    }
    return 0;
  }
  #UpdateCurve(curve, time, out, fallback) {
    if (!curve) {
      for (let index = 0; index < out.length; index++) out[index] = fallback[index];
      return out;
    }
    let result;
    if (typeof curve.Update === "function") result = curve.Update(time, out);else if (typeof curve.GetValueAt === "function") result = curve.GetValueAt(time, out);
    if ((Array.isArray(result) || ArrayBuffer.isView(result)) && result !== out) {
      for (let index = 0; index < out.length; index++) out[index] = result[index];
    }
    return out;
  }
  #zero = vec3.create();
  #translation = vec3.create();
  #modelTranslation = vec3.create();
  #missOffset = vec3.create();
  #missDirection = vec3.create();
  #identityRotation = quat.create();
  #rotation = quat.create();
  #modelRotation = quat.create();
  constructor() {
    super(_EveRootTransform), _initClass();
  }
}();

export { _EveRootTransform as EveRootTransform };
//# sourceMappingURL=EveRootTransform.js.map
