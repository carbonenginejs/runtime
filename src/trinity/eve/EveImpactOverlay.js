// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveImpactOverlay.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveImpactOverlay.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveImpactOverlay_Blue.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { Tr2ScalarFader } from "../curves/curve/Tr2ScalarFader.js";
import { ImpactConfiguration } from "../generated/include/enums.js";
import { Tr2Lod } from "./EveLODHelper.js";
import { EveDamageOverlay } from "./overlays/EveDamageOverlay.js";


const IMPACT_SHIELD_SIZE_MAX = 2000;
const IMPACT_SHIELD_SIZE_MIN = 70;
const IMPACT_SHIELD_FADEOUT = 1.5;


/**
 * The damage presentation for one ship: shield, armour and hull impact
 * resources, the faders driving hardening and repair effects, and the
 * data-texture bookkeeping that feeds them.
 */
@type.define({ className: "EveImpactOverlay", family: "eve/overlays/impact" })
export class EveImpactOverlay extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.read
  @type.uint32
  seed = 0;

  @io.readwrite
  @type.boolean
  display = true;

  @io.read
  @type.objectRef("EveDamageOverlay")
  damageOverlay = new EveDamageOverlay();

  @io.read
  @type.int32
  @type.enum("ImpactConfiguration")
  configuration = 0;

  @io.read
  @type.int32
  impactDataNextIdx = 1;

  @io.read
  @type.uint64
  armorImpactGoalCount = 0;

  @io.read
  @type.float32
  armorImpactParentSize = 0;

  @io.readwrite
  @type.float32
  shieldImpactColorFade = 0;

  @io.read
  @type.float32
  shieldImpactParentSize = 0;

  @io.readwrite
  @type.boolean
  shieldIsEllipsoid = true;

  @io.readwrite
  @type.boolean
  debugForceSpawnDebris = false;

  @io.read
  @type.float32
  renderPriority = 0;

  @io.persist
  @type.objectRef("Tr2MeshBase")
  mesh = null;

  @io.read
  @type.int32
  dataTextureBlockID = -1;

  @io.read
  @type.uint32
  maxShieldImpacts = 8;

  @io.readwrite
  @type.float32
  overallShieldImpact = -1;

  @io.readwrite
  @type.objectRef("Tr2ScalarFader")
  shieldHardening = new Tr2ScalarFader();

  @io.readwrite
  @type.objectRef("Tr2ScalarFader")
  shieldBoosting = new Tr2ScalarFader();

  @io.persist
  @type.objectRef("Tr2Effect")
  armorDamageShader = null;

  @io.persist
  @type.objectRef("Tr2GpuUniqueEmitter")
  armorImpactEmitter = null;

  @io.readwrite
  @type.objectRef("Tr2ScalarFader")
  armorRepairing = new Tr2ScalarFader();

  @io.readwrite
  @type.objectRef("Tr2ScalarFader")
  armorHardening = new Tr2ScalarFader();

  @io.readwrite
  @type.objectRef("Tr2ScalarFader")
  hullRepairing = new Tr2ScalarFader();

  @io.persist
  @type.objectRef("TriPerlinCurve")
  hullDamageFlickerCurve = null;

  @io.readwrite
  @type.float32
  hullDamageFactor = 0;

  @io.persist
  @type.objectRef("Tr2GpuUniqueEmitter")
  hullImpactEmitter = null;

  // Derived at lifecycle time from the owner's "damage" locator set; not an
  // authored value, so it never enters the values interchange.
  #damageLocatorCount = 0;

  #armorImpactLifeTime = 10;

  #dataTextureOffset = -1;

  #lastDamageState = vec3.fromValues(1, 1, 1);

  #shieldImpacts = new Map();

  /** Post-hydration hook; the overlay needs no additional setup. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#SyncLegacyDamageFieldsToOverlay();
    return true;
  }

  /**
   * Assigns the overlay's authored resources in one call - the hull flicker
   * curve, the armour and hull impact emitters, the armour damage shader and the
   * shield impact mesh - together with the shield shape flag.
   */
  @carbon.method
  @impl.adapted
  Set(hullDamageFlickerCurve, armorDamageEmitter, hullImpactEmitter, armorDamageShader, shieldImpactMesh, shieldIsEllipsoid)
  {
    this.shieldIsEllipsoid = !!shieldIsEllipsoid;
    this.hullDamageFlickerCurve = hullDamageFlickerCurve ?? null;
    this.armorImpactEmitter = armorDamageEmitter ?? null;
    this.hullImpactEmitter = hullImpactEmitter ?? null;
    this.armorDamageShader = armorDamageShader ?? null;
    this.mesh = shieldImpactMesh ?? null;
    this.#SyncLegacyDamageFieldsToOverlay();
    return true;
  }

  /**
   * Sets the per-ship random seed that varies impact placement between otherwise
   * identical hulls.
   */
  @carbon.method
  @impl.adapted
  SetSeed(seed)
  {
    this.seed = Number(seed) >>> 0;
    this.damageOverlay.SetSeed(this.seed);
    return true;
  }

  /**
   * Records how many damage locators the owning object exposes; derived from the
   * owner at lifecycle time, so it is deliberately kept out of the values
   * interchange.
   */
  @carbon.method
  @impl.adapted
  SetDamageLocatorCount(count)
  {
    this.#damageLocatorCount = Number(count) >>> 0;
    this.damageOverlay.SetDamageLocatorCount(this.#damageLocatorCount);
    return true;
  }

  /**
   * Number of damage locators the owning object exposes, as last recorded by
   * SetDamageLocatorCount.
   */
  @carbon.method
  @impl.adapted
  GetDamageLocatorCount()
  {
    return this.#damageLocatorCount;
  }

  /** Seconds an armour impact stays alive before it is retired. */
  @carbon.method
  @impl.implemented
  GetArmorImpactLifeTime()
  {
    return this.damageOverlay.GetArmorImpactLifeTime();
  }

  /**
   * Copies the last recorded shield, armour and hull damage state.
   * @param {Array} out - caller-owned vec3; a fresh vector is allocated when omitted
   * @returns {Array} out
   */
  @carbon.method
  @impl.adapted
  GetLastDamageState(out = vec3.create())
  {
    return this.damageOverlay.GetLastDamageState(out);
  }

  /**
   * Row offset of this overlay's block in the shared impact data texture, or -1
   * while it has no block.
   */
  @carbon.method
  @impl.adapted
  GetDataTextureOffset()
  {
    return this.damageOverlay.GetDataTextureOffset();
  }

  /** Which ImpactConfiguration this overlay was authored for. */
  @carbon.method
  @impl.adapted
  GetImpactConfiguration()
  {
    return this.damageOverlay.GetImpactConfiguration();
  }

  /**
   * Whether the shield is presented as a generated ellipsoid rather than the
   * authored shield impact mesh.
   */
  @carbon.method
  @impl.adapted
  HasShieldEllipsoid()
  {
    return this.shieldIsEllipsoid;
  }

  /**
   * Starts a fade on the named shield, armour or hull effect; the fade runs over a quarter of the requested duration.
   * @param {String} name - one of shieldboost, shieldhardening, armorhardening, armorrepair, hullrepair
   * @returns {Boolean} false when the name matches no fader
   */
  @carbon.method
  @impl.adapted
  ToggleEffect(name, on, duration)
  {
    if (name === "shieldboost" || name === "shieldhardening")
    {
      const fader = EveImpactOverlay.#effectFader(this, name);
      fader.StartFade(!!on, Number(duration) / 4);
      return true;
    }
    return this.damageOverlay.ToggleEffect(name, on, duration);
  }

  @carbon.method
  @impl.implemented
  /** Returns the owned armour and hull damage overlay. */
  GetDamageOverlay()
  {
    return this.damageOverlay;
  }

  /** Returns the next shared impact index. */
  GetImpactDataNextIdx()
  {
    return this.damageOverlay.GetImpactDataNextIdx();
  }

  /** Returns the deterministic damage seed. */
  GetSeed()
  {
    return this.damageOverlay.GetSeed();
  }

  /** Returns the target number of live armour impacts. */
  GetArmorImpactGoalCount()
  {
    return this.damageOverlay.GetArmorImpactGoalCount();
  }

  /** Returns the parent size used to scale armour impacts. */
  GetArmorImpactParentSize()
  {
    return this.damageOverlay.GetArmorImpactParentSize();
  }

  /** Returns whether debris is forced for every armour impact. */
  GetDebugForceSpawnDebris()
  {
    return this.damageOverlay.GetDebugForceSpawnDebris();
  }

  /** Sets whether every armour impact requests debris. */
  SetDebugForceSpawnDebris(value)
  {
    this.debugForceSpawnDebris = !!value;
    this.damageOverlay.SetDebugForceSpawnDebris(value);
  }

  /** Returns the damage overlay render priority. */
  GetRenderPriority()
  {
    return this.damageOverlay.GetRenderPriority();
  }

  /** Returns the shared data-texture block identifier. */
  GetDataTextureBlockID()
  {
    return this.damageOverlay.GetDataTextureBlockID();
  }

  /** Returns the authored hull-damage multiplier. */
  GetHullDamageFactor()
  {
    return this.damageOverlay.GetHullDamageFactor();
  }

  /** Sets the authored hull-damage multiplier. */
  SetHullDamageFactor(value)
  {
    this.hullDamageFactor = Number(value);
    this.damageOverlay.SetHullDamageFactor(value);
  }

  /** Returns the armour-damage material. */
  GetArmorDamageShaderEffect()
  {
    return this.damageOverlay.GetArmorDamageShaderEffect();
  }

  /** Sets the armour-damage material. */
  SetArmorDamageShaderEffect(value)
  {
    this.armorDamageShader = value ?? null;
    this.damageOverlay.SetArmorDamageShaderEffect(value);
  }

  /** Returns the hull-damage flicker curve. */
  GetHullDamageFlickerCurve()
  {
    return this.damageOverlay.GetHullDamageFlickerCurve();
  }

  /** Sets the hull-damage flicker curve. */
  SetHullDamageFlickerCurve(value)
  {
    this.hullDamageFlickerCurve = value ?? null;
    this.damageOverlay.SetHullDamageFlickerCurve(value);
  }

  /** Returns the armour-repair fader. */
  GetArmorRepairing()
  {
    return this.damageOverlay.GetArmorRepairing();
  }

  /** Replaces the armour-repair fader. */
  SetArmorRepairing(value)
  {
    this.armorRepairing = value;
    this.damageOverlay.SetArmorRepairing(value);
  }

  /** Returns the armour-hardening fader. */
  GetArmorHardening()
  {
    return this.damageOverlay.GetArmorHardening();
  }

  /** Replaces the armour-hardening fader. */
  SetArmorHardening(value)
  {
    this.armorHardening = value;
    this.damageOverlay.SetArmorHardening(value);
  }

  /** Returns the hull-repair fader. */
  GetHullRepairing()
  {
    return this.damageOverlay.GetHullRepairing();
  }

  /** Replaces the hull-repair fader. */
  SetHullRepairing(value)
  {
    this.hullRepairing = value;
    this.damageOverlay.SetHullRepairing(value);
  }

  /** Applies shield, armour and hull state to the damage presentation. */
  @carbon.method
  @impl.implemented
  SetDamageState(shield, armor, hull, createArmorImpacts = false)
  {
    this.shieldImpactColorFade = Math.max(0, Math.min(1, (1 - shield) ** 2));
    this.damageOverlay.SetDamageState(shield, armor, hull, createArmorImpacts);
    this.configuration = this.damageOverlay.GetImpactConfiguration();
    vec3.set(this.#lastDamageState, shield, armor, hull);
  }

  /** Removes every live shield and armour impact. */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.#shieldImpacts.clear();
    this.damageOverlay.Clear();
  }

  /** Creates a shield impact or forwards an armour/hull impact. */
  @carbon.method
  @impl.adapted
  CreateImpact(damageLocatorIndex, direction, lifeTime, size, intensity = 1, lod = Tr2Lod.TR2_LOD_HIGH, parent = null)
  {
    if (!EveDamageOverlay.impactEffectEnabled) return -1;

    const configuration = this.GetImpactConfiguration();
    if (configuration === ImpactConfiguration.IMPACT_SHIELD && lod !== Tr2Lod.TR2_LOD_LOW)
    {
      const normalizedDirection = vec3.normalize(vec3.create(), direction);
      let closestAtLocatorIndex = -1;
      let closestAtAnyIndex = -1;
      let closestAtLocatorAngle = -Infinity;
      let closestAtAnyAngle = -Infinity;

      for (const [ index, impact ] of this.#shieldImpacts)
      {
        const angle = vec3.dot(normalizedDirection, impact.direction);
        if (angle > closestAtAnyAngle)
        {
          closestAtAnyAngle = angle;
          closestAtAnyIndex = index;
        }
        if (impact.damageLocatorIndex === damageLocatorIndex && angle > closestAtLocatorAngle)
        {
          closestAtLocatorAngle = angle;
          closestAtLocatorIndex = index;
        }
      }

      if (closestAtLocatorAngle > 0.95)
      {
        const impact = this.#shieldImpacts.get(closestAtLocatorIndex);
        vec3.copy(impact.direction, normalizedDirection);
        impact.timeLeft = IMPACT_SHIELD_FADEOUT * Number(lifeTime);
        impact.size = Math.max(Number(size), impact.size);
        return closestAtLocatorIndex;
      }

      if (this.#shieldImpacts.size >= this.maxShieldImpacts)
      {
        if (closestAtAnyIndex !== -1)
        {
          const impact = this.#shieldImpacts.get(closestAtAnyIndex);
          vec3.copy(impact.direction, normalizedDirection);
          impact.timeLeft = IMPACT_SHIELD_FADEOUT * Number(lifeTime);
          impact.size = Math.max(Number(size), impact.size);
        }
        return closestAtAnyIndex;
      }

      const parentWorldTransform = mat4.copy(mat4.create(), parent.GetLocalToWorldTransform());
      const parentInverseWorldTransform = mat4.invert(mat4.create(), parentWorldTransform);
      if (!parentInverseWorldTransform)
      {
        throw new Error("EveImpactOverlay.CreateImpact requires an invertible parent transform.");
      }
      const ellipsoidCenter = vec3.create();
      const ellipsoidRadii = vec3.fromValues(1, 1, 1);
      parent.GetShapeEllipsoid(ellipsoidCenter, ellipsoidRadii);
      const locatorPositionWorld = vec3.create();
      parent.GetDamageLocatorPosition(damageLocatorIndex, true, locatorPositionWorld);
      const interceptPosition = getShieldImpactPosition(
        vec3.create(), this.shieldIsEllipsoid, parentInverseWorldTransform,
        locatorPositionWorld, normalizedDirection, ellipsoidCenter, ellipsoidRadii);
      vec3.transformMat4(interceptPosition, interceptPosition, parentWorldTransform);

      const index = this.damageOverlay.AllocateImpactIndex();
      const impactLifeTime = IMPACT_SHIELD_FADEOUT * Number(lifeTime);
      this.#shieldImpacts.set(index, {
        damageLocatorIndex: Number(damageLocatorIndex) | 0,
        interceptPosition,
        direction: normalizedDirection,
        lifeTime: impactLifeTime,
        timeLeft: impactLifeTime,
        size: Number(size),
        intensity: Number(intensity)
      });
      return index;
    }

    if (configuration === ImpactConfiguration.IMPACT_ARMOR ||
      configuration === ImpactConfiguration.IMPACT_HULL)
    {
      return this.damageOverlay.CreateImpact(
        damageLocatorIndex, size, lod !== Tr2Lod.TR2_LOD_LOW);
    }

    return -1;
  }

  /** Resolves a live impact's current position and direction. */
  @carbon.method
  @impl.implemented
  UpdateImpact(out, direction, impactIndex)
  {
    if (impactIndex === -1) return false;
    const impact = this.#shieldImpacts.get(Number(impactIndex) | 0);
    if (!impact) return this.damageOverlay.HasImpact(impactIndex);
    vec3.copy(out, impact.interceptPosition);
    vec3.copy(impact.direction, direction);
    return true;
  }

  /** Reports whether any shield impact or shield fader is active. */
  HasShieldActivity()
  {
    return EveDamageOverlay.impactEffectEnabled &&
      (this.#shieldImpacts.size !== 0 || this.overallShieldImpact > 0 ||
        !this.shieldHardening.IsKickInZero() || !this.shieldBoosting.IsKickInZero());
  }

  /** Reports whether armour damage or its faders are active. */
  HasArmorActivity()
  {
    return this.damageOverlay.HasArmorActivity();
  }

  /** Reports whether hull damage or its fader is active. */
  HasHullActivity()
  {
    return this.damageOverlay.HasHullActivity();
  }

  /** Reports whether any shield, armour or hull effect is active. */
  HasGeneralActivity()
  {
    return this.HasShieldActivity() || this.damageOverlay.HasGeneralActivity();
  }

  /** Returns the current hull-flicker activation strength. */
  @carbon.method
  @impl.implemented
  GetActivationStrength(updateContext)
  {
    return this.damageOverlay.GetActivationStrength(updateContext);
  }

  /** Advances shield faders and publishes the shared damage block. */
  @carbon.method
  @impl.adapted
  UpdateSyncronous(updateContext, _parent = null)
  {
    const hasGeneralActivity = this.HasGeneralActivity();
    this.damageOverlay.UpdateBlockData(
      hasGeneralActivity ? updateContext.GetDataTextureManager() : null,
      hasGeneralActivity);
  }

  /** Ages shield impacts and rebuilds the shared damage rows. */
  @carbon.method
  @impl.adapted
  UpdateAsyncronous(updateContext, parent)
  {
    const delta = updateContext.GetDeltaT();
    for (const [ index, impact ] of this.#shieldImpacts)
    {
      impact.timeLeft -= delta;
      if (impact.timeLeft <= 0) this.#shieldImpacts.delete(index);
    }

    this.shieldBoosting.Update(updateContext);
    this.shieldHardening.Update(updateContext);

    const boundingSphere = vec4.create();
    parent.GetBoundingSphere(boundingSphere);

    this.damageOverlay.UpdateAsyncronous(updateContext, {
      boundingSphere,
      estimatedPixelDiameter: parent.estimatedPixelDiameter,
      isInFrustum: parent.IsInFrustum(),
      // Bind position, not the animated pose (Carbon EveImpactOverlay.cpp:189,
      // commit 3d988b1d): decals seeded here must not swim with animation.
      getDamageLocatorPositionOS: (index, out) => parent.GetDamageLocatorBindPosition(index, out)
    }, this.#shieldImpacts.size, this.HasShieldActivity());

    const header = this.damageOverlay.HeaderRow();
    vec4.set(header[0],
      this.#shieldImpacts.size,
      this.overallShieldImpact,
      this.shieldImpactColorFade,
      this.shieldImpactParentSize);
    vec4.set(header[1],
      this.shieldHardening.GetFaderValue(),
      this.shieldBoosting.GetFaderValue(),
      this.shieldHardening.GetKickInValue(),
      this.shieldBoosting.GetKickInValue());

    if (!this.HasGeneralActivity()) return;

    const parentWorldTransform = mat4.copy(mat4.create(), parent.GetLocalToWorldTransform());
    const parentInverseWorldTransform = mat4.invert(mat4.create(), parentWorldTransform);
    if (!parentInverseWorldTransform)
    {
      throw new Error("EveImpactOverlay.UpdateAsyncronous requires an invertible parent transform.");
    }

    this.shieldImpactParentSize = Math.max(
      IMPACT_SHIELD_SIZE_MIN,
      Math.min(IMPACT_SHIELD_SIZE_MAX, boundingSphere[3]));

    if (!this.#shieldImpacts.size) return;

    const ellipsoidCenter = vec3.create();
    const ellipsoidRadii = vec3.fromValues(1, 1, 1);
    parent.GetShapeEllipsoid(ellipsoidCenter, ellipsoidRadii);
    const locatorPositionWorld = vec3.create();
    const position = vec3.create();
    let row = 0;
    for (const impact of this.#shieldImpacts.values())
    {
      parent.GetDamageLocatorPosition(
        impact.damageLocatorIndex, true, locatorPositionWorld);
      getShieldImpactPosition(
        position, this.shieldIsEllipsoid, parentInverseWorldTransform,
        locatorPositionWorld, impact.direction, ellipsoidCenter, ellipsoidRadii);
      const texel = this.damageOverlay.TexelRow(row++);
      vec4.set(texel[0], position[0], position[1], position[2], impact.timeLeft);
      vec4.set(texel[1], impact.size, impact.intensity, 0, impact.lifeTime);
      vec3.transformMat4(impact.interceptPosition, position, parentWorldTransform);
    }
  }

  /** Emits the active shield-impact mesh batches. */
  @carbon.method
  @impl.adapted
  GetBatches(accumulator, batchType, perObjectData, screenSize)
  {
    if (!this.display || !this.mesh ||
      this.damageOverlay.GetDataTextureBlockID() === -1 ||
      this.damageOverlay.GetDataTextureOffset() === -1 ||
      !this.HasShieldActivity()) return false;
    return this.mesh.GetBatches(
      accumulator, this.mesh.GetAreas(batchType), perObjectData, screenSize, false);
  }

  /** Returns the active armour-damage material for a batch type. */
  @carbon.method
  @impl.implemented
  GetArmorDamageShader(batchType)
  {
    return this.damageOverlay.GetArmorDamageShader(batchType);
  }

  /** Copies legacy authored damage fields into the owned damage overlay. */
  #SyncLegacyDamageFieldsToOverlay()
  {
    this.damageOverlay ??= new EveDamageOverlay();
    this.damageOverlay.SetSeed(this.seed);
    this.damageOverlay.SetDamageLocatorCount(this.#damageLocatorCount);
    this.damageOverlay.SetDebugForceSpawnDebris(this.debugForceSpawnDebris);
    this.damageOverlay.SetHullDamageFactor(this.hullDamageFactor);
    this.damageOverlay.SetArmorDamageShaderEffect(this.armorDamageShader);
    this.damageOverlay.SetHullDamageFlickerCurve(this.hullDamageFlickerCurve);
    this.damageOverlay.SetArmorRepairing(this.armorRepairing);
    this.damageOverlay.SetArmorHardening(this.armorHardening);
    this.damageOverlay.SetHullRepairing(this.hullRepairing);
  }

  /**
   * Maps an effect name to the fader that drives it, or null when the name is
   * unknown.
   */
  static #effectFader(overlay, name)
  {
    switch (name)
    {
      case "shieldboost": return overlay.shieldBoosting;
      case "shieldhardening": return overlay.shieldHardening;
      case "armorhardening": return overlay.armorHardening;
      case "armorrepair": return overlay.armorRepairing;
      case "hullrepair": return overlay.hullRepairing;
      default: return null;
    }
  }

  static ImpactConfiguration = ImpactConfiguration;

}


function getShieldImpactPosition(
  out,
  shieldIsEllipsoid,
  parentInverseWorldTransform,
  damageLocatorPositionWorld,
  impactDirection,
  ellipsoidCenter,
  ellipsoidRadii)
{
  vec3.transformMat4(out, damageLocatorPositionWorld, parentInverseWorldTransform);
  if (!shieldIsEllipsoid) return out;

  const directionObject = transformNormal(
    vec3.create(), impactDirection, parentInverseWorldTransform);
  return intersectEllipsoidRay(
    out, ellipsoidCenter, ellipsoidRadii, out, directionObject);
}


function transformNormal(out, direction, matrix)
{
  const x = direction[0];
  const y = direction[1];
  const z = direction[2];
  out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
  out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
  out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
  return out;
}


function intersectEllipsoidRay(out, center, radii, origin, direction)
{
  const vx = direction[0] / radii[0];
  const vy = direction[1] / radii[1];
  const vz = direction[2] / radii[2];
  const sx = (origin[0] - center[0]) / radii[0];
  const sy = (origin[1] - center[1]) / radii[1];
  const sz = (origin[2] - center[2]) / radii[2];
  const vv = vx * vx + vy * vy + vz * vz;
  if (!(vv > 0)) return vec3.set(out, 0, 0, 0);
  const vs = vx * sx + vy * sy + vz * sz;
  const ss = sx * sx + sy * sy + sz * sz;
  let discriminant = (vs / vv) ** 2 - ss / vv + 1 / vv;
  if (discriminant < 0) return vec3.set(out, 0, 0, 0);
  discriminant = Math.sqrt(discriminant);
  let t = -discriminant - vs / vv;
  if (t < 0) t = discriminant - vs / vv;
  return vec3.scaleAndAdd(out, origin, direction, t);
}
