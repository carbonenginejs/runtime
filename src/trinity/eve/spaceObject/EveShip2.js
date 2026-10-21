import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/EveShip2.h
// Source: trinity/trinity/Eve/SpaceObject/EveShip2.cpp
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
// Hand-maintained after promotion from generated schema intake.
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta, type, blue } from "#schema";
import { EveMobile } from "./EveMobile.js";
import { EveEntity } from "../EveEntity.js";
import { TriFloat } from "../../core/variable/TriFloat.js";

/** A ship space object: booster drive, speed state, and ship shader data. */
@be.define("EveShip2")
@blue.inherit(IListNotify, IInitialize)
@be.mapInterface(IEveSpaceObject2)
@be.mapInterface(ITr2Renderable)
@be.mapInterface(IListNotify)
@be.exposureChainTo(EveMobile)
export class EveShip2 extends EveMobile
{

  /** Hidden persisted m_boosters storage (EveShip2_Blue.cpp:21), separate from its live property. */
  @blue.attribute("boosters")
  @blue.persistOnly
  @type.rootRef("EveBoosterSet2")
  _boosters = null;

  /** Live booster property; persistence reads and writes the backing member directly. */
  @blue.property()
  @type.rootRef("EveBoosterSet2")
  @meta.implemented
  get boosters()
  {
    return this.GetBoosters();
  }

  /** Replaces the booster set through Carbon's component-registration setter. */
  @meta.implemented
  set boosters(boosters)
  {
    this.SetBoosters(boosters);
  }

  /** m_displayKillCounterValue (uint32_t) [READWRITE] */
  @blue.readwrite
  @type.uint32
  displayKillCounterValue = 0;

  /** m_maxSpeed (float) [READWRITE] - the maximum speed of the ship. */
  @blue.readwrite
  @type.float32
  maxSpeed = 0;

  /** m_speed (TriFloatPtr) [READ] */
  @blue.read
  @type.rootRef("TriFloat")
  speed = null;

  /** m_audioSpeedParameter (IRootPtr, private, h:76) - the audio value holder. */
  _audioSpeedParameter = null;

  /**
   * Carbon MAP_PROPERTY "audioSpeedParameter" over the private
   * GetAudioParameter/SetAudioParameter (EveShip2_Blue.cpp:19): the audio
   * parameter fed the ship's speed every update.
   */
  @blue.property()
  @type.rootRef("IRoot")
  @meta.implemented
  get audioSpeedParameter()
  {
    return this._GetAudioParameter();
  }

  /** Rebinds the speed feed to the replacement audio parameter. */
  @meta.implemented
  set audioSpeedParameter(value)
  {
    this._SetAudioParameter(value);
  }

  /** m_acceleration - second derivative of the position curve, fed to boosters. */
  _acceleration = vec3.create();

  /**
   * Carbon EveShip2::UpdateSyncronous - base sync, then speed from the world
   * velocity, audio speed parameter, and booster acceleration from the
   * position curve's second derivative (EveShip2.cpp:16-45).
   */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext)
  {
    if (!this.update)
    {
      return;
    }
    super.UpdateSyncronous(updateContext);
    const time = updateContext.GetTime();
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
      if (this.translationCurve)
      {
        this.translationCurve.GetValueDoubleDotAt__Ticks(time, this._acceleration);
      }
      else
      {
        vec3.set(this._acceleration, 0, 0, 0);
      }
    }
  }

  /** Carbon EveShip2::UpdateAsyncronous - base async, then boosters. */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  UpdateBoosters(updateContext)
  {
    if (!this.boosters)
    {
      return;
    }
    const time = updateContext.GetTime();
    const deltaT = updateContext.GetDeltaT();
    this.boosters.Update(
      deltaT,
      time,
      this.worldTransform,
      this.speed?.value ?? 0,
      this._acceleration,
      this.worldRotation
    );
    this.boosters.UpdateTrails(deltaT, time);
  }

  /** Carbon EveShip2::UpdateVisibility - base, then booster visibility. */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform)
  {
    super.UpdateVisibility(updateContext, parentTransform);
    if (!this.display)
    {
      return;
    }
    if (this.DisplayBoosters())
    {
      this.boosters.UpdateVisibility(updateContext);
    }
  }

  /** Carbon EveShip2::GetRenderables - base, then booster renderables. */
  @meta.implemented
  @blue.method
  GetRenderables__Impostors(out, _impostors)
  {
    if (!this.display)
    {
      return out;
    }
    super.GetRenderables__Impostors(out, null);
    if (this.DisplayBoosters())
    {
      this.boosters.GetRenderables(out);
    }
    return out;
  }

  /** Carbon EveShip2::RegisterWithQuadRenderer (EveShip2.cpp:165-172): EveMobile's, then the booster glows. */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    super.RegisterWithQuadRenderer(quadRenderer);
    if (this.boosters)
    {
      this.boosters.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /** Carbon EveShip2::AddQuadsToQuadRenderer (EveShip2.cpp:174-185): EveMobile's, then the booster glows. */
  @blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.display)
    {
      return;
    }
    super.AddQuadsToQuadRenderer(frustum, quadRenderer);
    if (this.DisplayBoosters())
    {
      this.boosters.AddToQuadRenderer(quadRenderer, this.worldTransform);
    }
  }

  /** Returns the attached booster set, or null when the ship has none. */
  @blue.method
  @meta.implemented
  GetBoosters()
  {
    return this._boosters;
  }

  /**
   * Replaces the backing pointer between the old entity's UnRegister and the
   * new entity's Register calls (EveShip2.cpp:131-143). Register(null) removes
   * an incoming booster from a foreign registry when this ship is detached.
   * JavaScript uses the shared cast for the native EveEntity casts and treats
   * an omitted pointer as null; replacing a reference does not destroy it.
   */
  @blue.method
  @meta.adapted
  SetBoosters(boosters)
  {
    const registry = this.GetComponentRegistry();
    const previous = CjsSchema.cast(this._boosters, EveEntity);
    if (previous)
    {
      previous.UnRegister(registry);
    }
    this._boosters = boosters ?? null;
    const next = CjsSchema.cast(this._boosters, EveEntity);
    if (next)
    {
      next.Register(registry);
    }
  }

  /** Carbon EveShip2::RegisterComponents (cpp:145-153): base registration,
   * then forwards the booster set (no display gate of its own). */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.boosters)
    {
      this.boosters.Register(registry);
    }
  }

  /** Carbon EveShip2::UnRegisterComponents (cpp:155-163): base, then forwards
   * the booster set. */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    super.UnRegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.boosters)
    {
      this.boosters.UnRegister(registry);
    }
  }

  /** Carbon EveShip2::DisplayBoosters - boosters render with the children. */
  @blue.method
  @meta.implemented
  DisplayBoosters()
  {
    return !!this.boosters && this.DisplayChildren();
  }

  /**
   * Carbon EveShip2::GetParentData (cpp:336-342): the base record, plus the
   * kill count the hull's kill-counter decals display.
   *
   * @param {IEveSpaceObject2ParentData} [out] Caller-owned record, refreshed in place.
   * @returns {IEveSpaceObject2ParentData} out
   */
  @blue.method
  @meta.implemented
  GetParentData(out)
  {
    const data = super.GetParentData(out);
    data.killCount = this.displayKillCounterValue;
    return data;
  }

  /**
   * Returns the kill count displayed on the hull, which the space-object effect
   * attributes expose to effect bindings.
   */
  @blue.method
  @meta.implemented
  GetKillCounterValue()
  {
    return this.displayKillCounterValue;
  }

  /**
   * Carbon GetBoosterIntensity (EveShip2.cpp:387-395): the booster set's
   * intensity, or 0 without boosters.
   *
   * @returns {number}
   */
  @meta.implemented
  @blue.method
  GetBoosterIntensity()
  {
    if (this.boosters) return this.boosters.GetBoosterIntensity();
    return 0;
  }

  /**
   * Returns the ship's maximum speed, the divisor that normalizes current speed
   * into the bound audio speed parameter.
   */
  @blue.method
  @meta.implemented
  GetMaxSpeed()
  {
    return this.maxSpeed;
  }

  /**
   * Carbon EveShip2::UpdateShipSpeedForAudio - normalizes speed/maxSpeed
   * into the bound audio parameter (EveShip2.cpp:360-380).
   *
   * Adapted: Blue FindEntry member binding becomes a duck-typed value holder; the runtime
   * audio layer owns the emitter side.
   */
  @blue.method
  @meta.adapted
  UpdateShipSpeedForAudio()
  {
    if (this.maxSpeed === 0 || !this.boosters)
    {
      return;
    }
    const parameter = this._audioSpeedParameter;
    if (parameter && typeof parameter === "object" && "value" in parameter)
    {
      parameter.value = (this.speed?.value ?? 0) / this.maxSpeed;
    }
  }

  /**
   * Carbon EveShip2::SetAudioParameter (private, EveShip2.cpp:291-325):
   * stores the audio parameter that UpdateShipSpeedForAudio feeds.
   *
   * Adapted: Carbon also resolves the parameter's float "value" member and
   * its NOTIFY flag through Blue reflection (m_audioParameterInfo,
   * cpp:296-324); UpdateShipSpeedForAudio's value-holder check stands in
   * for that cached member pointer.
   *
   * @param {object|null} aud The audio parameter, or null to unbind.
   */
  @meta.adapted
  _SetAudioParameter(aud)
  {
    this._audioSpeedParameter = aud ?? null;
  }

  /**
   * Carbon EveShip2::GetAudioParameter (private, EveShip2.cpp:348-351).
   *
   * @returns {object|null} The bound audio parameter.
   */
  @meta.implemented
  _GetAudioParameter()
  {
    return this._audioSpeedParameter;
  }

  /**
   * Carbon EveShip2::RebuildCachedData - after geometry load, re-attach
   * turrets to the freshly loaded locators (EveShip2.cpp:169-174).
   */
  @blue.method
  @meta.implemented
  RebuildCachedData(asyncRes)
  {
    super.RebuildCachedData(asyncRes);
    this.RebuildTurretPositions();
  }

  /**
   * Carbon RebuildBoosterSet (EveShip2.cpp:234-258): one booster per
   * "locator_booster" locator, then the set prepares its resources.
   */
  @blue.method
  @meta.implemented
  RebuildBoosterSet()
  {
    if (!this.boosters) return;
    this.boosters.Clear();
    for (const locator of this.locators)
    {
      if (locator.GetName().startsWith("locator_booster"))
      {
        this.boosters.Add(locator.GetTransform(), EveShip2._boosterFunctionality, true, 0, 0);
      }
    }
    this.boosters.PrepareResources();
  }

  /** RebuildBoosterSet's Vector4 functionality( 0, 1, 1, 1 ). */
  static _boosterFunctionality = vec4.fromValues(0, 1, 1, 1);

  /**
   * Runs the base space-object initialization; the ship adds no setup of its
   * own.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    super.Initialize();
    return true;
  }

  /**
   * Carbon EveShip2::GetPerObjectData - stamps the booster glow intensity
   * into shipData.x before delegating to the base record
   * (EveShip2.cpp:275-289). The ship-data vec4 is exposed for the
   * per-object values builder.
   */
  @blue.method
  @meta.implemented
  GetPerObjectData(accumulator = null)
  {
    this.spaceObjectShipData[0] = this.boosters ? this.boosters.GetBoosterIntensity() : 0;

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

// EveShip2_Blue.cpp: native exposure.
