import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveMobile as _EveMobile } from './EveMobile.js';
import { TriFloat as _TriFloat } from '../../trinityCore/TriFloat.js';

let _initProto, _initClass, _init_boosters, _init_extra_boosters, _init_displayKillCounterValue, _init_extra_displayKillCounterValue, _init_maxSpeed, _init_extra_maxSpeed, _init_speed, _init_extra_speed;

/** A ship space object: booster drive, speed state, and ship shader data. */
let _EveShip;
class EveShip2 extends _EveMobile {
  static {
    ({
      e: [_init_boosters, _init_extra_boosters, _init_displayKillCounterValue, _init_extra_displayKillCounterValue, _init_maxSpeed, _init_extra_maxSpeed, _init_speed, _init_extra_speed, _initProto],
      c: [_EveShip, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveShip2",
      family: "eve/spaceObject"
    })], [[[io, io.persistOnly, void 0, type.model("EveBoosterSet2")], 16, "boosters"], [[io, io.readwrite, type, type.uint32], 16, "displayKillCounterValue"], [[io, io.readwrite, type, type.float32], 16, "maxSpeed"], [[io, io.read, void 0, type.objectRef("TriFloat")], 16, "speed"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateBoosters"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoosters"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBoosters"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "DisplayBoosters"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKillCounterValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxSpeed"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Blue FindEntry member binding becomes a duck-typed value holder; runtime-audio owns the emitter side.")], 18, "UpdateShipSpeedForAudio"], [[carbon, carbon.method, impl, impl.implemented], 18, "RebuildCachedData"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildBoosterSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Persistent VS/PS buffers are engine-owned; shipData is exposed for createEveSpaceObjectMainPerObjectValues.")], 18, "GetPerObjectData"]], 0, void 0, _EveMobile));
  }
  /** m_boosters (EveBoosterSet2Ptr) [PERSISTONLY] */
  boosters = (_initProto(this), _init_boosters(this, null));

  /** m_displayKillCounterValue (uint32_t) [READWRITE] */
  displayKillCounterValue = (_init_extra_boosters(this), _init_displayKillCounterValue(this, 0));

  /** m_maxSpeed (float) [READWRITE] - the maximum speed of the ship. */
  maxSpeed = (_init_extra_displayKillCounterValue(this), _init_maxSpeed(this, 0));

  /** m_speed (TriFloatPtr) [READ] */
  speed = (_init_extra_maxSpeed(this), _init_speed(this, null));

  /** audioSpeedParameter (MAP_PROPERTY) - duck-typed audio value holder. */
  audioSpeedParameter = (_init_extra_speed(this), null);

  /** m_acceleration - second derivative of the position curve, fed to boosters. */
  #acceleration = vec3.create();

  /** m_spaceObjectShipData - vs/ps ship constants; x carries booster glow. */
  #spaceObjectShipData = vec4.create();

  /**
   * Carbon EveShip2::UpdateSyncronous - base sync, then speed from the world
   * velocity, audio speed parameter, and booster acceleration from the
   * position curve's second derivative (EveShip2.cpp:16-45).
   */
  UpdateSyncronous(updateContext) {
    if (!this.update) {
      return;
    }
    super.UpdateSyncronous(updateContext);
    const time = updateContext?.GetTime?.() ?? 0;
    if (this.translationCurve) {
      if (!this.speed) {
        this.speed = new _TriFloat();
      }
      this.speed.value = vec3.length(this.worldVelocity);
    }
    this.UpdateShipSpeedForAudio();
    if (this.boosters) {
      if (this.translationCurve?.GetValueDoubleDotAt) {
        this.translationCurve.GetValueDoubleDotAt(time, this.#acceleration);
      } else {
        vec3.set(this.#acceleration, 0, 0, 0);
      }
    }
  }

  /** Carbon EveShip2::UpdateAsyncronous - base async, then boosters. */
  UpdateAsyncronous(updateContext) {
    if (!this.update) {
      return;
    }
    super.UpdateAsyncronous(updateContext);
    this.UpdateBoosters(updateContext);
  }

  /** Carbon EveShip2::UpdateBoosters (EveShip2.cpp:55-64). */
  UpdateBoosters(updateContext) {
    if (!this.boosters) {
      return;
    }
    const time = updateContext?.GetTime?.() ?? 0;
    const deltaT = updateContext?.GetDeltaT?.() ?? 0;
    this.boosters.Update(deltaT, time, this.worldTransform, this.speed?.value ?? 0, this.#acceleration, this.worldRotation);
    this.boosters.UpdateTrails(deltaT, time);
  }

  /** Carbon EveShip2::UpdateVisibility - base, then booster visibility. */
  UpdateVisibility(updateContext, parentTransform) {
    super.UpdateVisibility(updateContext, parentTransform);
    if (!this.display) {
      return;
    }
    if (this.DisplayBoosters()) {
      this.boosters.UpdateVisibility?.(updateContext);
    }
  }

  /** Carbon EveShip2::GetRenderables - base, then booster renderables. */
  GetRenderables(out) {
    if (!this.display) {
      return out;
    }
    super.GetRenderables(out);
    if (this.DisplayBoosters()) {
      this.boosters.GetRenderables?.(out);
    }
    return out;
  }

  /** Returns the attached booster set, or null when the ship has none. */
  GetBoosters() {
    return this.boosters;
  }

  /**
   * Carbon EveShip2::SetBoosters - swaps the set and re-registers it with
   * the component registry when one is attached (duck-typed).
   */
  SetBoosters(boosters) {
    const registry = this.GetComponentRegistry?.();
    if (registry) {
      this.boosters?.UnRegister?.(registry);
    }
    this.boosters = boosters ?? null;
    if (registry) {
      this.boosters?.Register?.(registry);
    }
  }

  /** Carbon EveShip2::RegisterComponents (cpp:145-153): base registration,
   * then forwards the booster set (no display gate of its own). */
  RegisterComponents() {
    super.RegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.boosters) {
      this.boosters.Register?.(registry);
    }
  }

  /** Carbon EveShip2::UnRegisterComponents (cpp:155-163): base, then forwards
   * the booster set. */
  UnRegisterComponents() {
    super.UnRegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.boosters) {
      this.boosters.UnRegister?.(registry);
    }
  }

  /** Carbon EveShip2::DisplayBoosters - boosters render with the children. */
  DisplayBoosters() {
    return !!this.boosters && this.DisplayChildren();
  }

  /**
   * Returns the kill count displayed on the hull, which the space-object effect
   * attributes expose to effect bindings.
   */
  GetKillCounterValue() {
    return this.displayKillCounterValue;
  }

  /**
   * Returns the ship's maximum speed, the divisor that normalizes current speed
   * into the bound audio speed parameter.
   */
  GetMaxSpeed() {
    return this.maxSpeed;
  }

  /**
   * Carbon EveShip2::UpdateShipSpeedForAudio - normalizes speed/maxSpeed
   * into the bound audio parameter (EveShip2.cpp:360-380).
   */
  UpdateShipSpeedForAudio() {
    if (this.maxSpeed === 0 || !this.boosters) {
      return;
    }
    const parameter = this.audioSpeedParameter;
    if (parameter && typeof parameter === "object" && "value" in parameter) {
      parameter.value = (this.speed?.value ?? 0) / this.maxSpeed;
    }
  }

  /**
   * Carbon EveShip2::RebuildCachedData - after geometry load, re-attach
   * turrets to the freshly loaded locators (EveShip2.cpp:169-174).
   */
  RebuildCachedData(asyncRes) {
    super.RebuildCachedData(asyncRes);
    this.RebuildTurretPositions?.();
  }

  /** Carbon method RebuildBoosterSet (MAP_METHOD_AND_WRAP). */
  RebuildBoosterSet() {
    if (!this.boosters) return false;
    this.boosters.Clear?.();
    for (const locator of this.locators) {
      const name = locator?.GetName?.() ?? locator?.name ?? "";
      if (!name.startsWith("locator_booster")) continue;
      const transform = locator.GetTransform?.() ?? locator.transform;
      if (transform) this.boosters.Add?.(transform, [0, 1, 1, 1], true, 0, 0);
    }
    this.boosters.UpdateValues?.({
      property: "items"
    });
    return true;
  }

  /**
   * Runs the base space-object initialization; the ship adds no setup of its
   * own.
   */
  Initialize() {
    return super.Initialize?.() ?? true;
  }

  /**
   * Carbon EveShip2::GetPerObjectData - stamps the booster glow intensity
   * into shipData.x before delegating to the base record
   * (EveShip2.cpp:275-289). The ship-data vec4 is exposed for the
   * per-object values builder.
   */
  GetPerObjectData(accumulator = null) {
    this.#spaceObjectShipData[0] = this.boosters?.GetBoosterIntensity?.() ?? 0;
    return super.GetPerObjectData(accumulator);
  }

  /** The vs/ps ship constants (x = booster glow intensity). */
  GetSpaceObjectShipData() {
    return this.#spaceObjectShipData;
  }
  static {
    _initClass();
  }
}

export { _EveShip as EveShip2 };
//# sourceMappingURL=EveShip2.js.map
