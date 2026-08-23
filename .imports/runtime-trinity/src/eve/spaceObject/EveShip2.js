// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/SpaceObject/EveShip2.h
// Source: trinity/trinity/Eve/SpaceObject/EveShip2.cpp
// Hand-maintained after promotion from generated schema intake.
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveMobile } from "./EveMobile.js";
import { TriFloat } from "../../core/variable/TriFloat.js";

/** A ship space object: booster drive, speed state, and ship shader data. */
@type.define({ className: "EveShip2", family: "eve/spaceObject" })
export class EveShip2 extends EveMobile
{

  /** m_boosters (EveBoosterSet2Ptr) [PERSISTONLY] */
  @io.persistOnly
  @type.model("EveBoosterSet2")
  boosters = null;

  /** m_displayKillCounterValue (uint32_t) [READWRITE] */
  @io.readwrite
  @type.uint32
  displayKillCounterValue = 0;

  /** m_maxSpeed (float) [READWRITE] - the maximum speed of the ship. */
  @io.readwrite
  @type.float32
  maxSpeed = 0;

  /** m_speed (TriFloatPtr) [READ] */
  @io.read
  @type.objectRef("TriFloat")
  speed = null;

  /** audioSpeedParameter (MAP_PROPERTY) - duck-typed audio value holder. */
  audioSpeedParameter = null;

  /** m_acceleration - second derivative of the position curve, fed to boosters. */
  #acceleration = vec3.create();


  /**
   * Carbon EveShip2::UpdateSyncronous - base sync, then speed from the world
   * velocity, audio speed parameter, and booster acceleration from the
   * position curve's second derivative (EveShip2.cpp:16-45).
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext)
  {
    if (!this.update)
    {
      return;
    }
    super.UpdateSyncronous(updateContext);
    const time = updateContext?.GetTime?.() ?? 0;
    if (this.translationCurve)
    {
      if (!this.speed)
      {
        this.speed = new TriFloat();
      }
      this.speed.value = vec3.length(this.worldVelocity);
    }
    this.UpdateShipSpeedForAudio();
    if (this.boosters)
    {
      if (this.translationCurve?.GetValueDoubleDotAt)
      {
        this.translationCurve.GetValueDoubleDotAt(time, this.#acceleration);
      }
      else
      {
        vec3.set(this.#acceleration, 0, 0, 0);
      }
    }
  }

  /** Carbon EveShip2::UpdateAsyncronous - base async, then boosters. */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(updateContext)
  {
    if (!this.update)
    {
      return;
    }
    super.UpdateAsyncronous(updateContext);
    this.UpdateBoosters(updateContext);
  }

  /** Carbon EveShip2::UpdateBoosters (EveShip2.cpp:55-64). */
  @carbon.method
  @impl.implemented
  UpdateBoosters(updateContext)
  {
    if (!this.boosters)
    {
      return;
    }
    const time = updateContext?.GetTime?.() ?? 0;
    const deltaT = updateContext?.GetDeltaT?.() ?? 0;
    this.boosters.Update(
      deltaT,
      time,
      this.worldTransform,
      this.speed?.value ?? 0,
      this.#acceleration,
      this.worldRotation
    );
    this.boosters.UpdateTrails(deltaT, time);
  }

  /** Carbon EveShip2::UpdateVisibility - base, then booster visibility. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform)
  {
    super.UpdateVisibility(updateContext, parentTransform);
    if (!this.display)
    {
      return;
    }
    if (this.DisplayBoosters())
    {
      this.boosters.UpdateVisibility?.(updateContext);
    }
  }

  /** Carbon EveShip2::GetRenderables - base, then booster renderables. */
  @carbon.method
  @impl.implemented
  GetRenderables(out)
  {
    if (!this.display)
    {
      return out;
    }
    super.GetRenderables(out);
    if (this.DisplayBoosters())
    {
      this.boosters.GetRenderables?.(out);
    }
    return out;
  }

  /** Returns the attached booster set, or null when the ship has none. */
  @carbon.method
  @impl.implemented
  GetBoosters()
  {
    return this.boosters;
  }

  /**
   * Carbon EveShip2::SetBoosters - swaps the set and re-registers it with
   * the component registry when one is attached (duck-typed).
   */
  @carbon.method
  @impl.adapted
  SetBoosters(boosters)
  {
    const registry = this.GetComponentRegistry?.();
    if (registry)
    {
      this.boosters?.UnRegister?.(registry);
    }
    this.boosters = boosters ?? null;
    if (registry)
    {
      this.boosters?.Register?.(registry);
    }
  }

  /** Carbon EveShip2::RegisterComponents (cpp:145-153): base registration,
   * then forwards the booster set (no display gate of its own). */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.boosters)
    {
      this.boosters.Register?.(registry);
    }
  }

  /** Carbon EveShip2::UnRegisterComponents (cpp:155-163): base, then forwards
   * the booster set. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    super.UnRegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.boosters)
    {
      this.boosters.UnRegister?.(registry);
    }
  }

  /** Carbon EveShip2::DisplayBoosters - boosters render with the children. */
  @carbon.method
  @impl.implemented
  DisplayBoosters()
  {
    return !!this.boosters && this.DisplayChildren();
  }

  /**
   * Returns the kill count displayed on the hull, which the space-object effect
   * attributes expose to effect bindings.
   */
  @carbon.method
  @impl.implemented
  GetKillCounterValue()
  {
    return this.displayKillCounterValue;
  }

  /**
   * Returns the ship's maximum speed, the divisor that normalizes current speed
   * into the bound audio speed parameter.
   */
  @carbon.method
  @impl.implemented
  GetMaxSpeed()
  {
    return this.maxSpeed;
  }

  /**
   * Carbon EveShip2::UpdateShipSpeedForAudio - normalizes speed/maxSpeed
   * into the bound audio parameter (EveShip2.cpp:360-380).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Blue FindEntry member binding becomes a duck-typed value holder; runtime-audio owns the emitter side.")
  UpdateShipSpeedForAudio()
  {
    if (this.maxSpeed === 0 || !this.boosters)
    {
      return;
    }
    const parameter = this.audioSpeedParameter;
    if (parameter && typeof parameter === "object" && "value" in parameter)
    {
      parameter.value = (this.speed?.value ?? 0) / this.maxSpeed;
    }
  }

  /**
   * Carbon EveShip2::RebuildCachedData - after geometry load, re-attach
   * turrets to the freshly loaded locators (EveShip2.cpp:169-174).
   */
  @carbon.method
  @impl.implemented
  RebuildCachedData(asyncRes)
  {
    super.RebuildCachedData(asyncRes);
    this.RebuildTurretPositions?.();
  }

  /** Carbon method RebuildBoosterSet (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  RebuildBoosterSet()
  {
    if (!this.boosters) return false;
    this.boosters.Clear?.();
    for (const locator of this.locators)
    {
      const name = locator?.GetName?.() ?? locator?.name ?? "";
      if (!name.startsWith("locator_booster")) continue;
      const transform = locator.GetTransform?.() ?? locator.transform;
      if (transform) this.boosters.Add?.(transform, [0, 1, 1, 1], true, 0, 0);
    }
    this.boosters.UpdateValues?.({ property: "items" });
    return true;
  }

  /**
   * Runs the base space-object initialization; the ship adds no setup of its
   * own.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return super.Initialize?.() ?? true;
  }

  /**
   * Carbon EveShip2::GetPerObjectData - stamps the booster glow intensity
   * into shipData.x before delegating to the base record
   * (EveShip2.cpp:275-289). The ship-data vec4 is exposed for the
   * per-object values builder.
   */
  @carbon.method
  @impl.implemented
  GetPerObjectData(accumulator = null)
  {
    this.spaceObjectShipData[0] = this.boosters?.GetBoosterIntensity?.() ?? 0;

    const data = super.GetPerObjectData(accumulator);
    // The base fill ran during update, so the glow lane has to be restamped
    // into both records here - Carbon writes m_spaceObjectShipData and the
    // records read from it in the same call (EveShip2.cpp:275-289).
    data.vs.Set("shipData", this.spaceObjectShipData);
    data.ps.Set("shipData", this.spaceObjectShipData);

    return data;
  }

  /** The vs/ps ship constants (x = booster glow intensity). */
  GetSpaceObjectShipData()
  {
    return this.spaceObjectShipData;
  }

}
