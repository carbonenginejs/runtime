// Source: trinity/trinity/Eve/SpaceObject/EveMobile.h
// Source: trinity/trinity/Eve/SpaceObject/EveMobile.cpp
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { IEveSpaceObject2ParentData } from "./IEveSpaceObject2ParentData.js";
import { vec3 } from "#math/vec3";
import { carbon, impl, edit, type } from "#schema";
import { EveTurretSet } from "../attachment/turrets/EveTurretSet.js";
import { EveSpaceObject2 } from "./EveSpaceObject2.js";


/**
 * A space object that carries turret sets, keeping each set bound to the hull
 * locators or animated bones it fires from and tracking how many of its turrets
 * are active.
 */
@type.define({ className: "EveMobile", family: "eve/spaceObject" })
export class EveMobile extends EveSpaceObject2
{
  @edit.notify
  @edit.read
  @edit.persist
  @type.list("EveTurretSet")
  turretSets = [];

  @edit.read
  @type.uint32
  ActiveTurretCount = 0;

  /** Native stack ParentData retained on the JS owner for reuse. */
  _turretParentData = new IEveSpaceObject2ParentData();

  _turretSetsLocatorInfo = [];
  _turretLocatorCountingInfo = new Map();

  /**
   * Runs the base initialization, then seeds the turret locator counters from
   * the current locators and binds every turret set to them.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  PrepareShaderData(updateContext)
  {
    super.PrepareShaderData(updateContext);
    this.spaceObjectShipData[1] *= this.activationStrength;
  }

  /** Rebinds the turret sets to their locators after the turret set list changes. */
  @carbon.method
  @impl.adapted
  @impl.reason("List notifications are represented by a direct browser callback; registry ownership is not ported yet.")
  OnListModified()
  {
    this.RebuildTurretPositions();
  }

  /** Carbon EveMobile::RegisterComponents (cpp:109-120): base registration,
   * then forwards the turret sets. Gate m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      for (const turretSet of this.turretSets)
      {
        turretSet?.Register(registry);
      }
    }
  }

  /** Carbon EveMobile::UnRegisterComponents (cpp:126-138): base, then forwards
   * the turret sets without re-checking display. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    super.UnRegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const turretSet of this.turretSets)
      {
        turretSet?.UnRegister(registry);
      }
    }
  }

  /**
   * Returns the locator index a turret slot was bound to, or 0 when the set or
   * slot has no binding.
   */
  @carbon.method
  @impl.implemented
  GetTurretLocatorIndex(turretSetIndex, slotIndex)
  {
    return this._turretSetsLocatorInfo[turretSetIndex]?.locators?.[slotIndex]?.index ?? 0;
  }

  /**
   * Binds each turret set to the locators or animated bones whose names extend
   * its locator name, allocating sets that do not name a turret locator from the
   * shared locator_turret_ pool, and pushes each matched transform into the set
   * as a local turret transform up to the per-set turret limit.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Authored EveLocator2 transforms and optional animation-updater bone transforms replace Carbon's locator-type pointer surface.")
  RebuildTurretPositions()
  {
    this._turretSetsLocatorInfo.length = 0;
    this._resetTurretLocatorCounter(false);
    const records = this._locatorRecords();
    for (const turretSet of this.turretSets)
    {
      if (!turretSet) continue;
      let name = String(turretSet.locatorName ?? "");
      let turretInName = name.includes("_turret_");
      let locatorNumber = 0;
      if (!turretInName)
      {
        let counting = this._getTurretLocatorCountingInfo(name);
        if (!counting)
        {
          name = "locator_turret_";
          counting = this._getTurretLocatorCountingInfo(name);
          turretInName = true;
        }
        if (!counting)
        {
          this._turretSetsLocatorInfo.push({ type: "none", locators: [] });
          continue;
        }
        locatorNumber = counting.current;
        if (locatorNumber > counting.total)
        {
          if (!turretInName)
          {
            name = "locator_turret_";
            counting = this._getTurretLocatorCountingInfo(name);
            turretInName = true;
          }
          if (!counting || counting.current > counting.total)
          {
            this._turretSetsLocatorInfo.push({ type: "none", locators: [] });
            continue;
          }
          locatorNumber = counting.current;
        }
      }
      if (turretInName) locatorNumber = Number(turretSet.slotNumber) | 0;
      const baseName = `${name}${locatorNumber}`;
      const matched = records
        .filter(record => record.name.startsWith(baseName))
        .sort((a, b) => a.name.localeCompare(b.name));
      const locatorInfo = { type: matched.some(record => record.type === "bone") ? "bone" : "locator", locators: [] };
      for (let index = 0; index < matched.length && index < EveTurretSet.MAX_TURRETS_PER_SET; index++)
      {
        const record = matched[index];
        const transform = this._getLocatorRecordTransform(record, EveMobile._locatorTransform);
        if (!transform) continue;
        turretSet.SetLocalTransform?.(index, transform);
        locatorInfo.locators.push(record);
      }
      this._turretSetsLocatorInfo.push(locatorInfo);
      const counter = this._turretLocatorCountingInfo.get(name);
      if (counter) counter.currentCount++;
    }
    return true;
  }

  /**
   * Counts the unbroken run of locator_turret_<n>a/b locator pairs starting at
   * 1, returning 0 when the set of 'a' locators does not match the set of 'b'
   * locators.
   */
  @carbon.method
  @impl.implemented
  GetTurretLocatorCount()
  {
    let foundA = 0;
    let foundB = 0;
    for (const record of this._locatorRecords())
    {
      const match = /^locator_turret_(\d+)([ab])$/.exec(record.name);
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
  @carbon.method
  @impl.implemented
  GetActiveTurretCount()
  {
    return this.ActiveTurretCount;
  }

  /**
   * Runs the base synchronous update, refreshes bone-driven turret locator
   * transforms, updates every turret set against the hull transform, and
   * recounts the active turrets.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Animated locator transforms use an optional animation-updater bone contract; all turret state updates remain in Trinity.")
  UpdateSyncronous(context)
  {
    super.UpdateSyncronous(context);
    let activeCount = 0;
    for (let setIndex = 0; setIndex < this.turretSets.length; setIndex++)
    {
      const turretSet = this.turretSets[setIndex];
      if (!turretSet) continue;
      if (turretSet.state > EveTurretSet.State.STATE_TARGETING) activeCount++;
      const locatorInfo = this._turretSetsLocatorInfo[setIndex];
      if (locatorInfo?.type === "bone")
      {
        for (let turretIndex = 0; turretIndex < locatorInfo.locators.length; turretIndex++)
        {
          const transform = this._getLocatorRecordTransform(locatorInfo.locators[turretIndex], EveMobile._locatorTransform);
          if (transform) turretSet.SetLocalTransform?.(turretIndex, transform);
        }
        turretSet.UpdateTurretTransforms?.(this.GetTurretTransform(turretSet.swarmID));
      }
      turretSet.UpdateSyncronous(context, this.GetTurretTransform(turretSet.swarmID));
    }
    this.ActiveTurretCount = activeCount;
    return true;
  }

  /** Runs the base asynchronous update and then the turret sets. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
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
    for (const turretSet of this.turretSets) turretSet?.UpdateAsyncronous(context, parent);
    return true;
  }

  /**
   * Runs the base visibility pass and, while display is on, forwards visibility
   * to the turret sets.
   */
  @carbon.method
  @impl.implemented
  UpdateVisibility(context, _parentTransform = EveMobile._identity)
  {
    const visible = super.UpdateVisibility(context, _parentTransform);
    if (!this.display) return false;
    for (const turretSet of this.turretSets) turretSet?.UpdateVisibility(context);
    return visible;
  }

  /**
   * Appends the base renderables followed by every turret set's renderables;
   * nothing is appended while display is off.
   */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    super.GetRenderables(out);
    for (const turretSet of this.turretSets) turretSet?.GetRenderables(out, this._psData.Get("shLightingCoefficients"));
    return out;
  }

  /**
   * Returns the hull's local bounding box grown to contain every turret set's
   * box; with out parameters it fills them and returns true, without them it
   * returns a { min, max } object.
   */
  @carbon.method
  @impl.implemented
  GetLocalBoundingBox(outMin, outMax)
  {
    const returnObject = !outMin || !outMax;
    outMin ??= vec3.create();
    outMax ??= vec3.create();
    const result = super.GetLocalBoundingBox(outMin, outMax);
    if (result === false) return false;
    for (const turretSet of this.turretSets)
    {
      if (turretSet?.GetLocalBoundingBox?.(EveMobile._boundsMin, EveMobile._boundsMax))
      {
        vec3.min(outMin, outMin, EveMobile._boundsMin);
        vec3.max(outMax, outMax, EveMobile._boundsMax);
      }
    }
    return returnObject ? { min: outMin, max: outMax } : true;
  }

  /** Sets a controller variable on the hull and forwards it to every turret set. */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    super.SetControllerVariable(name, value);
    for (const turretSet of this.turretSets) turretSet?.SetControllerVariable(name, value);
  }

  /** Raises a controller event on the hull and forwards it to every turret set. */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    super.HandleControllerEvent(name);
    for (const turretSet of this.turretSets) turretSet?.HandleControllerEvent(name);
  }

  /** Starts the hull's controllers and every turret set's controllers. */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    super.StartControllers();
    for (const turretSet of this.turretSets) turretSet?.StartControllers();
  }

  /**
   * Children, turret sets and boosters are shown only while activation strength
   * is above 0.5.
   */
  @carbon.method
  @impl.implemented
  DisplayChildren()
  {
    return this.activationStrength > 0.5;
  }

  /** Registers hull content and every turret's quad content (EveMobile.cpp:681-688). */
  @carbon.method
  @impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    super.RegisterWithQuadRenderer(quadRenderer);
    for (const turretSet of this.turretSets) turretSet.RegisterWithQuadRenderer(quadRenderer);
  }

  /** Collects hull and turret quad content (EveMobile.cpp:690-697). */
  @carbon.method
  @impl.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    super.AddQuadsToQuadRenderer(frustum, quadRenderer);
    for (const turretSet of this.turretSets) turretSet.AddQuadsToQuadRenderer(frustum, quadRenderer);
  }

  /**
   * Returns the parent transform turret sets are placed against - the live hull
   * world transform, regardless of swarm index.
   */
  @carbon.method
  @impl.implemented
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
    for (const record of this._locatorRecords())
    {
      const separator = record.name.lastIndexOf("_");
      if (separator < 0) continue;
      const prefix = record.name.slice(0, separator + 1);
      let info = this._turretLocatorCountingInfo.get(prefix);
      if (!info)
      {
        info = { currentCount: 0, totalCount: 0 };
        this._turretLocatorCountingInfo.set(prefix, info);
      }
      else info.currentCount = 0;
      if (updateTotal)
      {
        const number = Number.parseInt(record.name.slice(separator + 1, separator + 2), 10) || 0;
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

  /**
   * Builds the name-keyed list of authored locators and animation-updater bones
   * that turret binding searches; a bone whose name is already taken by a
   * locator is skipped.
   */
  _locatorRecords()
  {
    const records = [];
    for (let index = 0; index < this.locators.length; index++)
    {
      const locator = this.locators[index];
      const name = String(locator?.GetName?.() ?? locator?.name ?? "");
      if (name) records.push({ name, type: "locator", index, value: locator });
    }
    const updater = this.animationUpdater;
    const names = updater?.GetBoneNames?.() ?? updater?.boneNames ?? updater?.GetSkeleton?.()?.bones ?? updater?.skeleton?.bones ?? [];
    for (let index = 0; index < names.length; index++)
    {
      const value = names[index];
      const name = String(value?.name ?? value ?? "");
      if (name && !records.some(record => record.name === name)) records.push({ name, type: "bone", index, value });
    }
    return records;
  }

  /**
   * Copies a locator record's transform into the caller-owned out matrix - the
   * animated bone world transform for bone records, the authored transform for
   * locator records - and returns null when neither is available.
   */
  _getLocatorRecordTransform(record, out)
  {
    if (record.type === "bone")
    {
      const value = this.animationUpdater?.GetBoneWorldTransform?.(record.name, out)
        ?? this.animationUpdater?.GetBoneTransform?.(record.index, out);
      if (value === false || value === null || value === undefined) return null;
      if (value?.length === 16 && value !== out) mat4.copy(out, value);
      return out;
    }
    const value = record.value?.GetTransform?.() ?? record.value?.transform;
    return value?.length === 16 ? mat4.copy(out, value) : null;
  }

  static _identity = mat4.create();
  static _locatorTransform = mat4.create();
  static _boundsMin = vec3.create();
  static _boundsMax = vec3.create();
}
