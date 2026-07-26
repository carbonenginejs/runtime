import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveLODHelper } from '../EveLODHelper.js';
import { EveSpaceObject2 as _EveSpaceObject } from './EveSpaceObject2.js';
import { EveMissileWarhead as _EveMissileWarhead } from './EveMissileWarhead.js';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';

let _initProto, _initClass, _init_warheads, _init_extra_warheads, _init_updateWarheads, _init_extra_updateWarheads, _init_target, _init_extra_target, _init_targetRadius, _init_extra_targetRadius, _init_explosionCallback, _init_extra_explosionCallback;

/**
 * A missile in flight: the curve-driven ball path plus the warheads that ride
 * it, own the targeting state and supply all of its renderables and bounds.
 */
let _EveMissile;
new class extends _identity {
  static [class EveMissile extends _EveSpaceObject {
    static {
      ({
        e: [_init_warheads, _init_extra_warheads, _init_updateWarheads, _init_extra_updateWarheads, _init_target, _init_extra_target, _init_targetRadius, _init_extra_targetRadius, _init_explosionCallback, _init_extra_explosionCallback, _initProto],
        c: [_EveMissile, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveMissile",
        family: "eve/spaceObject"
      })], [[[io, io.persist, void 0, type.list("EveMissileWarhead")], 16, "warheads"], [[io, io.readwrite, type, type.boolean], 16, "updateWarheads"], [[io, io.readwrite, void 0, type.objectRef("ITriTargetable")], 16, "target"], [[io, io.readwrite, type, type.float32], 16, "targetRadius"], [[io, io.readwrite, void 0, type.rawStruct("BlueScriptCallback")], 16, "explosionCallback"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Targetable output parameters and curve samples use the org-standard out-last convention; CPU flight behavior remains source-faithful.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "RebuildMissileBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The missile owns no renderable; its warheads publish their own backend-neutral records.")], 18, "GetPerObjectData"]], 0, void 0, _EveSpaceObject));
    }
    warheads = (_initProto(this), _init_warheads(this, []));
    updateWarheads = (_init_extra_warheads(this), _init_updateWarheads(this, true));
    target = (_init_extra_updateWarheads(this), _init_target(this, null));
    targetRadius = (_init_extra_target(this), _init_targetRadius(this, 0));
    explosionCallback = (_init_extra_targetRadius(this), _init_explosionCallback(this, null));
    #inheritedStartVelocity = (_init_extra_explosionCallback(this), vec3.create());
    #inheritedVelocity = vec3.create();
    #time = 0;
    #estimatedTotalAliveTime = 1;
    #lastValidSpeed = 0;

    /**
     * Runs the base initialization and silences all warhead particle emitting
     * until launch.
     */
    Initialize() {
      super.Initialize();
      for (const warhead of this.warheads) warhead?.EnableParticleEmitting?.(false);
      return true;
    }

    /**
     * Arms the missile for a new flight: latches the launching ship's velocity and
     * the estimated flying time, resets the flight clock, and silences warhead
     * emitting.
     */
    Start(shipVelocity, estimatedFlyingTime) {
      vec3.copy(this.#inheritedVelocity, shipVelocity ?? _EveMissile.#zero);
      this.#estimatedTotalAliveTime = Number(estimatedFlyingTime) || 0;
      for (const warhead of this.warheads) warhead?.EnableParticleEmitting?.(false);
      this.#time = 0;
      vec3.copy(this.#inheritedStartVelocity, this.#inheritedVelocity);
      this.#lastValidSpeed = 0;
    }

    /**
     * Samples the flight path and its derivative to keep the estimated
     * time-to-target current, then for each live warhead advances the state
     * machine, hands it the target locator offset in missile space, integrates its
     * flight and fires the explosion callback on detonation, and finally rebuilds
     * the missile bounding sphere from the warheads.
     */
    UpdateSyncronous(context) {
      super.UpdateSyncronous(context);
      const time = Number(context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0);
      const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
      mat4.identity(_EveMissile.#inverseBallRotation);
      if (this.rotationCurve) {
        sampleCurve(this.rotationCurve, time, _EveMissile.#ballRotation, _EveMissile.#identityRotation);
        quat.invert(_EveMissile.#ballRotation, _EveMissile.#ballRotation);
        mat4.fromQuat(_EveMissile.#inverseBallRotation, _EveMissile.#ballRotation);
      }
      this.#time += deltaTime;
      vec3.set(_EveMissile.#missilePosition, 0, 0, 0);
      vec3.set(_EveMissile.#missileVelocity, 0, 0, 0);
      if (this.translationCurve && this.target) {
        sampleCurve(this.translationCurve, time, _EveMissile.#missilePosition, _EveMissile.#zero);
        sampleDerivative(this.translationCurve, time, _EveMissile.#missileVelocity);
        this.target.GetDamageLocatorPosition?.(-1, true, _EveMissile.#targetPosition);
        const speed = vec3.length(_EveMissile.#missileVelocity);
        if (speed > 0) {
          this.#estimatedTotalAliveTime = this.#time + (vec3.distance(_EveMissile.#missilePosition, _EveMissile.#targetPosition) - this.targetRadius) / speed;
          this.#lastValidSpeed = speed;
        } else if (this.#lastValidSpeed > 0) {
          vec3.subtract(_EveMissile.#missileVelocity, _EveMissile.#missilePosition, _EveMissile.#targetPosition);
          const length = vec3.length(_EveMissile.#missileVelocity);
          if (length) vec3.scale(_EveMissile.#missileVelocity, _EveMissile.#missileVelocity, this.#lastValidSpeed / length);
        }
      }
      vec3.copy(_EveMissile.#worldPosition, this.GetWorldPosition());
      const originShift = context?.GetOriginShift?.() ?? context?.originShift ?? _EveMissile.#zero;
      for (const warhead of this.warheads) {
        if (!warhead) continue;
        const event = warhead.UpdateState(deltaTime, this.#estimatedTotalAliveTime, this.target);
        if (warhead.GetState() !== _EveMissileWarhead.State.STATE_DEAD) {
          vec3.copy(_EveMissile.#locatorPosition, _EveMissile.#worldPosition);
          if (this.target) this.target.GetDamageLocatorPosition?.(warhead.GetTargetLocator(), true, _EveMissile.#locatorPosition);
          vec3.subtract(_EveMissile.#locatorOffset, _EveMissile.#locatorPosition, _EveMissile.#worldPosition);
          vec3.transformMat4(_EveMissile.#locatorOffset, _EveMissile.#locatorOffset, _EveMissile.#inverseBallRotation);
          mat4.fromTranslation(_EveMissile.#locatorTransform, _EveMissile.#locatorOffset);
          warhead.UpdateEndTransform(_EveMissile.#locatorTransform, event === _EveMissileWarhead.StateChangeEvent.EVT_SWITCH_TARGET);
          if (this.updateWarheads) {
            warhead.UpdateWarhead(deltaTime, this.#estimatedTotalAliveTime, _EveMissile.#missileVelocity, this.#inheritedVelocity, _EveMissile.#inverseBallRotation, this.worldTransform, originShift);
          }
          warhead.Update(context);
        }
        const impactEvent = warhead.CheckImpact(deltaTime, this.#estimatedTotalAliveTime, this.target);
        if (impactEvent === _EveMissileWarhead.StateChangeEvent.EVT_EXPLODE) callExplosionCallback(this.explosionCallback, warhead.GetWarheadID());
      }
      this.RebuildMissileBoundingSphere();
      return true;
    }

    /**
     * Runs each warhead's visibility pass against the missile world transform
     * composed with that warhead's offset, and merges the warheads' LOD levels
     * into the missile's.
     */
    UpdateVisibility(context, _parentTransform = _EveMissile.#identity) {
      for (const warhead of this.warheads) {
        if (!warhead) continue;
        mat4.multiply(_EveMissile.#warheadTransform, this.worldTransform, warhead.GetCurrentOffsetTransform());
        warhead.UpdateVisibility(context, _EveMissile.#warheadTransform);
        this.lodLevel = EveLODHelper.MergeLOD(this.lodLevel, warhead.GetLODLevel?.() ?? Tr2Lod.TR2_LOD_UNSPECIFIED);
      }
      return true;
    }

    /** Collects only the warheads' renderables - the missile itself owns no mesh. */
    GetRenderables(out = []) {
      for (const warhead of this.warheads) warhead?.GetRenderables?.(out);
      return out;
    }

    /**
     * Writes the missile's world-space bounding sphere, built from the
     * warhead-derived local sphere and the missile world transform.
     */
    GetBoundingSphere(out = vec4.create()) {
      vec4.set(_EveMissile.#localSphere, this.boundingSphereCenter[0], this.boundingSphereCenter[1], this.boundingSphereCenter[2], this.boundingSphereRadius);
      sph3.transformMat4(out, _EveMissile.#localSphere, this.worldTransform);
      return true;
    }

    /**
     * Recomputes the missile's local bounding sphere as the union of its warheads'
     * local spheres.
     */
    RebuildMissileBoundingSphere() {
      vec4.set(_EveMissile.#mergedSphere, 0, 0, 0, 0);
      for (const warhead of this.warheads) {
        if (!warhead?.GetLocalBoundingSphere?.(_EveMissile.#warheadSphere)) continue;
        sph3.union(_EveMissile.#mergedSphere, _EveMissile.#mergedSphere, _EveMissile.#warheadSphere);
      }
      vec3.set(this.boundingSphereCenter, _EveMissile.#mergedSphere[0], _EveMissile.#mergedSphere[1], _EveMissile.#mergedSphere[2]);
      this.boundingSphereRadius = _EveMissile.#mergedSphere[3];
      return true;
    }

    /**
     * Returns null: the missile owns no renderable, so each warhead publishes its
     * own per-object record.
     */
    GetPerObjectData() {
      return null;
    }
  }];
  #zero = vec3.create();
  #identity = mat4.create();
  #identityRotation = quat.create();
  #ballRotation = quat.create();
  #inverseBallRotation = mat4.create();
  #missilePosition = vec3.create();
  #missileVelocity = vec3.create();
  #targetPosition = vec3.create();
  #worldPosition = vec3.create();
  #locatorPosition = vec3.create();
  #locatorOffset = vec3.create();
  #locatorTransform = mat4.create();
  #warheadTransform = mat4.create();
  #localSphere = vec4.create();
  #warheadSphere = vec4.create();
  #mergedSphere = vec4.create();
  constructor() {
    super(_EveMissile), _initClass();
  }
}();
function sampleCurve(curve, time, out, fallback) {
  const value = curve?.GetValueAt?.(time, out) ?? curve?.Update?.(time, out);
  if (value?.length >= out.length && value !== out) out.set(value);else if (value === undefined && !curve?.GetValueAt && !curve?.Update) out.set(fallback);
  return out;
}
function sampleDerivative(curve, time, out) {
  const value = curve?.GetValueDotAt?.(time, out);
  if (value?.length >= 3 && value !== out) vec3.copy(out, value);else if (!curve?.GetValueDotAt) vec3.set(out, 0, 0, 0);
  return out;
}
function callExplosionCallback(callback, id) {
  if (typeof callback === "function") callback(id);else callback?.CallVoid?.(id);
}

export { _EveMissile as EveMissile };
//# sourceMappingURL=EveMissile.js.map
