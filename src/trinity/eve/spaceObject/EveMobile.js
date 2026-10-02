import { carbon } from "#schema";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/EveMobile.h
// Source: trinity/trinity/Eve/SpaceObject/EveMobile.cpp
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { IEveSpaceObject2ParentData } from "./IEveSpaceObject2ParentData.js";
import { vec3 } from "#math/vec3";
import { meta, types } from "#schema";
import { mappedInterfaces } from "../../../global/compose/interface.js";
import { IListNotify } from "#blue/IListNotify";
import { BLUELISTEVENT } from "#consts/blue";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { EveEntity } from "../EveEntity.js";
import { EveTurretSet } from "../attachment/turrets/EveTurretSet.js";
import { EveSpaceObject2 } from "./EveSpaceObject2.js";


/**
 * A space object that carries turret sets, keeping each set bound to the hull
 * locators or animated bones it fires from and tracking how many of its turrets
 * are active.
 */
@types.define({ className: "EveMobile", family: "eve/spaceObject" })
@meta.carbon.mapInterface(IEveSpaceObject2, ITr2Renderable, IListNotify)
@carbon.inherit(IListNotify, IInitialize)
export class EveMobile extends EveSpaceObject2
{
  @meta.edit.notify
  @meta.edit.read
  @meta.edit.persist
  @types.list("EveTurretSet")
  turretSets = [];

  @meta.edit.read
  @types.uint32
  ActiveTurretCount = 0;

  /** Native stack ParentData retained on the JS owner for reuse. */
  _turretParentData = new IEveSpaceObject2ParentData();

  _turretSetsLocatorInfo = [];
  _turretLocatorCountingInfo = new Map();

  /**
   * Runs the base initialization, then seeds the turret locator counters from
   * the current locators and binds every turret set to them.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Initialize()
  {
    super.Initialize();
    this._resetTurretLocatorCounter(true);
    this.RebuildTurretPositions();
    return true;
  }

  /**
   * Carbon EveMobile.cpp:206-211 prepares the base damage activation, then
   * multiplies shipData.y by the authored activationStrength. Recomputing the
   * base first prevents repeated frames from compounding the multiplication.
   */
  @meta.carbon.method
  @meta.impl.implemented
  PrepareShaderData(updateContext)
  {
    super.PrepareShaderData(updateContext);
    this.spaceObjectShipData[1] *= this.activationStrength;
  }

  /**
   * Forwards base list notification, then rebuilds and transfers mapped turret
   * registration on live insertion/removal; unload unregisters mapped entities.
   * Carbon EveMobile.cpp:56-100 keeps insertion independent of display.
   */
  @meta.carbon.method
  @meta.impl.implemented
  OnListModified(event, key = 0, key2 = 0, value = null, list = null)
  {
    super.OnListModified(event, key, key2, value, list);
    if (event & BLUELISTEVENT.BELIST_LOADING) return;
    const action = event & BLUELISTEVENT.BELIST_EVENTMASK;
    if (action === BLUELISTEVENT.BELIST_INSERTED || action === BLUELISTEVENT.BELIST_REMOVED)
    {
      if (list !== this.turretSets || !value || !mappedInterfaces(value.constructor).has(EveTurretSet)) return;
      this.RebuildTurretPositions();
      if (action === BLUELISTEVENT.BELIST_INSERTED)
      {
        if (this.IsInRegistry()) value.Register(this.GetComponentRegistry());
      }
      else value.UnRegister(this.GetComponentRegistry());
    }
    else if (action === BLUELISTEVENT.BELIST_UNLOADSTART && this.IsInRegistry())
    {
      for (const entity of list)
      {
        if (entity && mappedInterfaces(entity.constructor).has(EveEntity)) entity.UnRegister(this.GetComponentRegistry());
      }
    }
  }

  /** Carbon EveMobile::RegisterComponents (cpp:109-120): base registration,
   * then forwards the turret sets. Gate m_display. */
  @meta.carbon.method
  @meta.impl.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      for (const turretSet of this.turretSets)
      {
        turretSet.Register(registry);
      }
    }
  }

  /** Carbon EveMobile::UnRegisterComponents (cpp:126-138): base, then forwards
   * the turret sets without re-checking display. */
  @meta.carbon.method
  @meta.impl.implemented
  UnRegisterComponents()
  {
    super.UnRegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const turretSet of this.turretSets)
      {
        turretSet.UnRegister(registry);
      }
    }
  }

  /**
   * Returns the locator index a turret slot was bound to, or 0 when the set or
   * slot has no binding.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetTurretLocatorIndex(turretSetIndex, slotIndex)
  {
    const info = this._turretSetsLocatorInfo[turretSetIndex];
    return info ? info.locatorIndices[slotIndex] ?? 0 : 0;
  }

  /**
   * Counts authored locator prefixes, then resolves exact suffixes through the
   * base locator contract with animated joints preferred (EveMobile.cpp:480-595).
   * Adapted: an index holder and caller-owned matrix replace native out pointers;
   * the existing JS return reports completion.
   */
  @meta.carbon.method
  @meta.impl.adapted
  RebuildTurretPositions()
  {
    this._turretSetsLocatorInfo.length = 0;
    this._resetTurretLocatorCounter(false);
    const resolved = { index: 0 };
    for (const turretSet of this.turretSets)
    {
      let name = turretSet.GetLocatorName();
      let turretInName = name.includes("_turret_");
      let locatorNumber = 0;
      if (!turretInName)
      {
        let counting = this._getTurretLocatorCountingInfo(name);
        if (!counting)
        {
          name = "locator_turret_";
          counting = this._getTurretLocatorCountingInfo(name);
          if (!counting) continue;
          turretInName = true;
        }
        locatorNumber = counting.current;
        if (locatorNumber > counting.total)
        {
          if (!turretInName)
          {
            name = "locator_turret_";
            counting = this._getTurretLocatorCountingInfo(name);
            if (!counting) continue;
            locatorNumber = counting.current;
          }
          else continue;
        }
      }
      if (this.clipSphereFactor !== 0 || this.clipSphereFactor2 !== 0)
      {
        turretSet.SetShaderOption("SPACE_OBJECT_CLIPPING", "SOC_ENABLED");
      }
      if (turretInName) locatorNumber = turretSet.GetSlotNumber();
      const locatorBase = name + String.fromCharCode(48 + locatorNumber);
      const locatorCount = this.CountLocatorsByPrefix(locatorBase);
      const info = { type: EveSpaceObject2.LocatorType.ELT_COUNT, locatorIndices: [] };
      for (let index = 0; index < locatorCount; index++)
      {
        const locatorName = locatorBase + String.fromCharCode(97 + index);
        info.type = this.DetermineLocatorType(locatorName, resolved);
        if (info.type !== EveSpaceObject2.LocatorType.ELT_COUNT)
        {
          const transform = this.GetLocatorTransform(info.type, resolved.index, EveMobile._locatorTransform);
          if (transform) turretSet.SetLocalTransform(index, transform);
          info.locatorIndices.push(resolved.index);
        }
      }
      this._turretSetsLocatorInfo.push(info);
      let counter = this._turretLocatorCountingInfo.get(name);
      if (!counter)
      {
        counter = { currentCount: 0, totalCount: 0 };
        this._turretLocatorCountingInfo.set(name, counter);
      }
      counter.currentCount++;
    }
    return true;
  }

  /**
   * Counts consecutive named slots in authored locators and animation bones.
   * Carbon EveMobile.cpp:326-443 accepts a-only layouts and checks matching a/b
   * bitsets when b exists; trailing name text after a/b is accepted.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetTurretLocatorCount()
  {
    let foundA = 0;
    let foundB = 0;
    const names = this.locators.map(locator => locator.GetName());
    if (this.animationUpdater) names.push(...this.animationUpdater.GetAnimationBoneList());
    for (const name of names)
    {
      const match = /^locator_turret_(\d+)([ab])/.exec(name);
      if (!match) continue;
      const index = Number(match[1]);
      if (!(index > 0 && index <= 32)) continue;
      if (match[2] === "a") foundA |= 1 << (index - 1);
      else foundB |= 1 << (index - 1);
    }
    if (foundA !== foundB && foundB) return 0;
    let count = 0;
    while (foundA & 1)
    {
      count++;
      foundA >>>= 1;
    }
    return count;
  }

  /**
   * Returns how many turret sets were past the targeting state at the last
   * synchronous update.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetActiveTurretCount()
  {
    return this.ActiveTurretCount;
  }

  /**
   * Advances the hull first, then publishes each animated joint placement
   * before updating its turret set (EveMobile.cpp:154-199).
   * Adapted: base typed locator lookup copies into a reusable output matrix
   * and the existing JS update returns completion.
   */
  @meta.carbon.method
  @meta.impl.adapted
  UpdateSyncronous(context)
  {
    super.UpdateSyncronous(context);
    let activeCount = 0;
    for (let setIndex = 0; setIndex < this.turretSets.length; setIndex++)
    {
      const turretSet = this.turretSets[setIndex];
      if (turretSet.GetState() > EveTurretSet.State.STATE_TARGETING) activeCount++;
      const info = this._turretSetsLocatorInfo[setIndex];
      if (info && info.type === EveSpaceObject2.LocatorType.ELT_JOINT)
      {
        for (let index = 0; index < info.locatorIndices.length; index++)
        {
          const transform = this.GetLocatorTransform(info.type, info.locatorIndices[index], EveMobile._locatorTransform);
          if (transform)
          {
            turretSet.SetLocalTransform(index, transform);
            turretSet.UpdateTurretTransforms(this.GetTurretTransform(turretSet.GetSwarmID()));
          }
        }
      }
      turretSet.UpdateSyncronous(context, this.GetTurretTransform(turretSet.GetSwarmID()));
    }
    this.ActiveTurretCount = activeCount;
    return true;
  }

  /** Runs the base asynchronous update and then the turret sets. */
  @meta.carbon.method
  @meta.impl.implemented
  UpdateAsyncronous(context)
  {
    super.UpdateAsyncronous(context);
    return this.UpdateTurretsAsyncronous(context);
  }

  /**
   * Passes Carbon's hull transform, ship data and clipping fields to every
   * turret set (EveMobile.cpp:213-231). JS retains the native stack record for
   * reuse; GetTurretTransform(0) supplies the same placement to all sets.
   */
  @meta.carbon.method
  @meta.impl.adapted
  UpdateTurretsAsyncronous(context)
  {
    const parent = this._turretParentData;
    mat4.copy(parent.transform, this.GetTurretTransform(0));
    vec4.copy(parent.shipData, this.spaceObjectShipData);
    vec3.copy(parent.clipSphereCenter, this._psData.Get("clipSphereCenter"));
    parent.clipRadiusSq = this._psData.Get("clipRadiusSq")[0];
    parent.clipRadius2Sq = this._psData.Get("clipRadius2Sq")[0];
    parent.clipFactor = this._psData.Get("clipSphereFactor")[0];
    parent.clipFactor2 = this._psData.Get("clipSphereFactor2")[0];
    for (const turretSet of this.turretSets) turretSet.UpdateAsyncronous(context, parent);
    return true;
  }

  /**
   * Runs the base visibility pass and, while display is on, forwards visibility
   * to the turret sets.
   */
  @meta.carbon.method
  @meta.impl.implemented
  UpdateVisibility(context, _parentTransform = EveMobile._identity)
  {
    const visible = super.UpdateVisibility(context, _parentTransform);
    if (!this.display) return false;
    for (const turretSet of this.turretSets) turretSet.UpdateVisibility(context);
    return visible;
  }

  /**
   * Appends the base renderables followed by every turret set's renderables;
   * nothing is appended while display is off. Adapted: the existing base
   * accepts one output array; native impostor output remains unported.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    super.GetRenderables(out);
    for (const turretSet of this.turretSets) turretSet.GetRenderables(out, this._psData.Get("shLightingCoefficients"));
    return out;
  }

  /**
   * Returns the hull's local bounding box grown to contain every turret set's
   * box. Adapted: with out parameters it fills them and returns true; without it
   * returns a { min, max } object.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetLocalBoundingBox(outMin, outMax)
  {
    const returnObject = !outMin || !outMax;
    outMin ??= vec3.create();
    outMax ??= vec3.create();
    const result = super.GetLocalBoundingBox(outMin, outMax);
    if (result === false) return false;
    for (const turretSet of this.turretSets)
    {
      if (turretSet.GetLocalBoundingBox(EveMobile._boundsMin, EveMobile._boundsMax))
      {
        vec3.min(outMin, outMin, EveMobile._boundsMin);
        vec3.max(outMax, outMax, EveMobile._boundsMax);
      }
    }
    return returnObject ? { min: outMin, max: outMax } : true;
  }

  /** Sets a controller variable on the hull and forwards it to every turret set. */
  @meta.carbon.method
  @meta.impl.implemented
  SetControllerVariable(name, value)
  {
    super.SetControllerVariable(name, value);
    for (const turretSet of this.turretSets) turretSet.SetControllerVariable(name, value);
  }

  /** Raises a controller event on the hull and forwards it to every turret set. */
  @meta.carbon.method
  @meta.impl.implemented
  HandleControllerEvent(name)
  {
    super.HandleControllerEvent(name);
    for (const turretSet of this.turretSets) turretSet.HandleControllerEvent(name);
  }

  /** Starts the hull's controllers and every turret set's controllers. */
  @meta.carbon.method
  @meta.impl.implemented
  StartControllers()
  {
    super.StartControllers();
    for (const turretSet of this.turretSets) turretSet.StartControllers();
  }

  /**
   * Children, turret sets and boosters are shown only while activation strength
   * is above 0.5.
   */
  @meta.carbon.method
  @meta.impl.implemented
  DisplayChildren()
  {
    return this.activationStrength > 0.5;
  }

  /** Forwards shader options to the hull and every turret (EveMobile.cpp:238-245). */
  @meta.carbon.method
  @meta.impl.implemented
  SetShaderOption(name, value)
  {
    super.SetShaderOption(name, value);
    for (const turretSet of this.turretSets) turretSet.SetShaderOption(name, value);
  }

  /** Registers hull content and every turret's quad content (EveMobile.cpp:681-688). */
  @meta.carbon.method
  @meta.impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    super.RegisterWithQuadRenderer(quadRenderer);
    for (const turretSet of this.turretSets) turretSet.RegisterWithQuadRenderer(quadRenderer);
  }

  /** Collects hull and turret quad content (EveMobile.cpp:690-697). */
  @meta.carbon.method
  @meta.impl.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    super.AddQuadsToQuadRenderer(frustum, quadRenderer);
    for (const turretSet of this.turretSets) turretSet.AddQuadsToQuadRenderer(frustum, quadRenderer);
  }

  /**
   * Returns the parent transform turret sets are placed against - the live hull
   * world transform, regardless of swarm index.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetTurretTransform(_turretSetIndex = 0)
  {
    return this.worldTransform;
  }

  /**
   * Rebuilds the per-name-prefix counters that allocate turret sets to numbered
   * locators, resetting each prefix's running count and, when asked, recomputing
   * its total from the digit that follows the prefix.
   */
  _resetTurretLocatorCounter(updateTotal)
  {
    for (const locator of this.locators)
    {
      const name = locator.GetName();
      const separator = name.lastIndexOf("_");
      if (separator < 0) continue;
      const prefix = name.slice(0, separator + 1);
      let info = this._turretLocatorCountingInfo.get(prefix);
      if (!info)
      {
        info = { currentCount: 0, totalCount: 0 };
        this._turretLocatorCountingInfo.set(prefix, info);
      }
      else info.currentCount = 0;
      if (updateTotal)
      {
        const number = Number.parseInt(name.slice(separator + 1, separator + 2), 10) || 0;
        info.totalCount = Math.max(info.totalCount, number);
      }
    }
  }

  /**
   * Returns the next locator number to allocate for a name prefix together with
   * that prefix's total, or null when the prefix is unknown.
   */
  _getTurretLocatorCountingInfo(name)
  {
    const info = this._turretLocatorCountingInfo.get(name);
    return info ? { current: info.currentCount + 1, total: info.totalCount } : null;
  }

  static _identity = mat4.create();
  static _locatorTransform = mat4.create();
  static _boundsMin = vec3.create();
  static _boundsMax = vec3.create();
}

// Native exposure maps the concrete class explicitly.
meta.carbon.mapInterface(EveMobile)(EveMobile, { kind: "class" });

// EveMobile_Blue.cpp: native exposure.
carbon.interfaceTable({ interfaces: [EveMobile, IEveSpaceObject2, ITr2Renderable, IListNotify], chainTo: EveSpaceObject2 })(EveMobile, { kind: "class" });
