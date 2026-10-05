// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveImpactOverlay.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveImpactOverlay.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveImpactOverlay_Blue.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { Tr2ScalarFader } from "../curves/curve/Tr2ScalarFader.js";
import { ImpactConfiguration } from "../generated/include/enums.js";
import { Tr2Lod } from "./EveLODHelper.js";
import {
  EveDamageOverlay,
  IMPACT_ARMOR_SIZE_FACTOR,
  IMPACT_ARMOR_SIZE_MAX
} from "./overlays/EveDamageOverlay.js";
import { ITr2GenericEmitterUpdateArguments } from "../particle/ITr2GenericEmitter/index.js";
import { blue } from "#blue";
import { CcpTime } from "../../global/blue/CcpTime.js";
import { EveDamageOverlayOwnerInfo } from "./overlays/EveDamageOverlayOwnerInfo.js";


const IMPACT_SHIELD_SIZE_MAX = 2000;
const IMPACT_SHIELD_SIZE_MIN = 70;
const IMPACT_SHIELD_FADEOUT = 1.5;
const IMPACT_ARMOR_PARTICLE_LOD_FACTOR = 400;


/**
 * The damage presentation for one ship: shield, armour and hull impact
 * resources, the faders driving hardening and repair effects, and the
 * data-texture bookkeeping that feeds them.
 */
@meta.define({ className: "EveImpactOverlay", family: "eve/overlays/impact" })
export class EveImpactOverlay
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  @meta.blue.read
  @meta.type.objectRef("EveDamageOverlay")
  damageOverlay = new EveDamageOverlay();

  // EveImpactOverlay_Blue.cpp:33-48: armour/hull state lives on the damage overlay; these names are live properties over it.

  /** MAP_PROPERTY_READONLY "seed" over GetSeed. */
  @meta.blue.read
  @meta.type.uint32
  @meta.implemented
  get seed()
  {
    return this.GetSeed();
  }

  /** MAP_PROPERTY_READONLY "configuration" over GetImpactConfiguration. */
  @meta.blue.read
  @meta.type.int32
  @meta.type.enum("trinity.ITriTargetable.ImpactConfiguration")
  @meta.implemented
  get configuration()
  {
    return this.GetImpactConfiguration();
  }

  /** MAP_PROPERTY_READONLY "impactDataNextIdx" over GetImpactDataNextIdx. */
  @meta.blue.read
  @meta.type.int32
  @meta.implemented
  get impactDataNextIdx()
  {
    return this.GetImpactDataNextIdx();
  }

  /** MAP_PROPERTY_READONLY "armorImpactGoalCount" over GetArmorImpactGoalCount. */
  @meta.blue.read
  @meta.type.uint64
  @meta.implemented
  get armorImpactGoalCount()
  {
    return this.GetArmorImpactGoalCount();
  }

  /** MAP_PROPERTY_READONLY "armorImpactParentSize" over GetArmorImpactParentSize. */
  @meta.blue.read
  @meta.type.float32
  @meta.implemented
  get armorImpactParentSize()
  {
    return this.GetArmorImpactParentSize();
  }

  /** MAP_PROPERTY "debugForceSpawnDebris" over Get/SetDebugForceSpawnDebris. */
  @meta.blue.readwrite
  @meta.type.boolean
  @meta.implemented
  get debugForceSpawnDebris()
  {
    return this.GetDebugForceSpawnDebris();
  }

  /** Assigns the debris override through the native setter. */
  set debugForceSpawnDebris(value)
  {
    this.SetDebugForceSpawnDebris(value);
  }

  /** MAP_PROPERTY_READONLY "renderPriority" over GetRenderPriority. */
  @meta.blue.read
  @meta.type.float32
  @meta.implemented
  get renderPriority()
  {
    return this.GetRenderPriority();
  }

  /** MAP_PROPERTY_READONLY "dataTextureBlockID" over GetDataTextureBlockID. */
  @meta.blue.read
  @meta.type.int32
  @meta.implemented
  get dataTextureBlockID()
  {
    return this.GetDataTextureBlockID();
  }

  /** MAP_PROPERTY_PERSISTED "armorDamageShader" over Get/SetArmorDamageShaderEffect. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2Effect")
  @meta.implemented
  get armorDamageShader()
  {
    return this.GetArmorDamageShaderEffect();
  }

  /** Assigns the armour damage effect through the native setter. */
  set armorDamageShader(value)
  {
    this.SetArmorDamageShaderEffect(value);
  }

  /** MAP_PROPERTY "armorRepairing" over Get/SetArmorRepairing. */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2ScalarFader")
  @meta.implemented
  get armorRepairing()
  {
    return this.GetArmorRepairing();
  }

  /** Assigns the armour repair fader through the native setter. */
  set armorRepairing(value)
  {
    this.SetArmorRepairing(value);
  }

  /** MAP_PROPERTY "armorHardening" over Get/SetArmorHardening. */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2ScalarFader")
  @meta.implemented
  get armorHardening()
  {
    return this.GetArmorHardening();
  }

  /** Assigns the armour hardening fader through the native setter. */
  set armorHardening(value)
  {
    this.SetArmorHardening(value);
  }

  /** MAP_PROPERTY "hullRepairing" over Get/SetHullRepairing. */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2ScalarFader")
  @meta.implemented
  get hullRepairing()
  {
    return this.GetHullRepairing();
  }

  /** Assigns the hull repair fader through the native setter. */
  set hullRepairing(value)
  {
    this.SetHullRepairing(value);
  }

  /** MAP_PROPERTY_PERSISTED "hullDamageFlickerCurve" over Get/SetHullDamageFlickerCurve. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("TriPerlinCurve")
  @meta.implemented
  get hullDamageFlickerCurve()
  {
    return this.GetHullDamageFlickerCurve();
  }

  /** Assigns the hull damage flicker curve through the native setter. */
  set hullDamageFlickerCurve(value)
  {
    this.SetHullDamageFlickerCurve(value);
  }

  /** MAP_PROPERTY "hullDamageFactor" over Get/SetHullDamageFactor. */
  @meta.blue.readwrite
  @meta.type.float32
  @meta.implemented
  get hullDamageFactor()
  {
    return this.GetHullDamageFactor();
  }

  /** Assigns the hull damage factor through the native setter. */
  set hullDamageFactor(value)
  {
    this.SetHullDamageFactor(value);
  }

  @meta.blue.readwrite
  @meta.type.float32
  shieldImpactColorFade = 0;

  @meta.blue.read
  @meta.type.float32
  shieldImpactParentSize = 0;

  @meta.blue.readwrite
  @meta.type.boolean
  shieldIsEllipsoid = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2MeshBase")
  mesh = null;

  @meta.blue.read
  @meta.type.uint32
  maxShieldImpacts = 8;

  @meta.blue.readwrite
  @meta.type.float32
  overallShieldImpact = -1;

  @meta.blue.readwrite
  @meta.type.objectRef("Tr2ScalarFader")
  shieldHardening = new Tr2ScalarFader();

  @meta.blue.readwrite
  @meta.type.objectRef("Tr2ScalarFader")
  shieldBoosting = new Tr2ScalarFader();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2GpuUniqueEmitter")
  armorImpactEmitter = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2GpuUniqueEmitter")
  hullImpactEmitter = null;

  _armorImpactLifeTime = 10;

  _dataTextureOffset = -1;

  _shieldImpacts = new Map();

  /** The owner record handed to the damage overlay each update; _ownerParent is the space object it describes. */
  _ownerInfo = new EveDamageOverlayOwnerInfo();

  _ownerParent = null;

  /** Bind position, not the animated pose (Carbon EveImpactOverlay.cpp:189): seeded decals must not swim with animation. */
  _getOwnerDamageLocatorPositionOS = (index, out) => this._ownerParent.GetDamageLocatorBindPosition(index, out);

  /** Carbon Initialize (cpp:87-90): nothing to set up. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Carbon Set (cpp:51-59): assigns the shield shape flag, impact emitters and shield mesh, and hands the hull
   * flicker curve and armour damage shader to the damage overlay.
   */
  @meta.blue.method
  @meta.implemented
  Set(hullDamageFlickerCurve, armorDamageEmitter, hullImpactEmitter, armorDamageShader, shieldImpactMesh, shieldIsEllipsoid)
  {
    this.shieldIsEllipsoid = shieldIsEllipsoid;
    this.armorImpactEmitter = armorDamageEmitter;
    this.hullImpactEmitter = hullImpactEmitter;
    this.mesh = shieldImpactMesh;
    this.damageOverlay.SetHullDamageFlickerCurve(hullDamageFlickerCurve);
    this.damageOverlay.SetArmorDamageShaderEffect(armorDamageShader);
  }

  /**
   * Sets the per-ship random seed that varies impact placement between otherwise
   * identical hulls.
   */
  @meta.blue.method
  @meta.implemented
  SetSeed(seed)
  {
    this.damageOverlay.SetSeed(seed);
  }

  /**
   * Records how many damage locators the owning object exposes; derived from the
   * owner at lifecycle time, so it is deliberately kept out of the values
   * interchange.
   */
  @meta.blue.method
  @meta.implemented
  SetDamageLocatorCount(count)
  {
    this.damageOverlay.SetDamageLocatorCount(count);
  }

  /** Seconds an armour impact stays alive before it is retired. */
  @meta.blue.method
  @meta.implemented
  GetArmorImpactLifeTime()
  {
    return this.damageOverlay.GetArmorImpactLifeTime();
  }

  /**
   * Copies the last recorded shield, armour and hull damage state.
   * @param {Array} out - caller-owned vec3
   * @returns {Array} out
   */
  @meta.blue.method
  @meta.adapted
  GetLastDamageState(out)
  {
    return this.damageOverlay.GetLastDamageState(out);
  }

  /**
   * Row offset of this overlay's block in the shared impact data texture, or -1
   * while it has no block.
   */
  @meta.blue.method
  @meta.adapted
  GetDataTextureOffset()
  {
    return this.damageOverlay.GetDataTextureOffset();
  }

  /** Which ImpactConfiguration this overlay was authored for. */
  @meta.blue.method
  @meta.adapted
  GetImpactConfiguration()
  {
    return this.damageOverlay.GetImpactConfiguration();
  }

  /**
   * Whether the shield is presented as a generated ellipsoid rather than the
   * authored shield impact mesh.
   */
  @meta.blue.method
  @meta.adapted
  HasShieldEllipsoid()
  {
    return this.shieldIsEllipsoid;
  }

  /**
   * Carbon ToggleEffect (cpp:513-527): the two shield faders fade over a quarter of the duration; every other
   * name goes to the damage overlay.
   * @param {string} name Effect name.
   * @param {boolean} on Fade in or out.
   * @param {number} duration Seconds.
   */
  @meta.blue.method
  @meta.implemented
  ToggleEffect(name, on, duration)
  {
    if (name === "shieldboost")
    {
      this.shieldBoosting.StartFade(on, duration / 4);
    }
    else if (name === "shieldhardening")
    {
      this.shieldHardening.StartFade(on, duration / 4);
    }
    else
    {
      this.damageOverlay.ToggleEffect(name, on, duration);
    }
  }

  /** Returns the owned armour and hull damage overlay. */
  @meta.blue.method
  @meta.implemented
  GetDamageOverlay()
  {
    return this.damageOverlay;
  }

  /** Returns the next shared impact index. */
  @meta.blue.method
  @meta.implemented
  GetImpactDataNextIdx()
  {
    return this.damageOverlay.GetImpactDataNextIdx();
  }

  /** Returns the deterministic damage seed. */
  @meta.blue.method
  @meta.implemented
  GetSeed()
  {
    return this.damageOverlay.GetSeed();
  }

  /** Returns the target number of live armour impacts. */
  @meta.blue.method
  @meta.implemented
  GetArmorImpactGoalCount()
  {
    return this.damageOverlay.GetArmorImpactGoalCount();
  }

  /** Returns the parent size used to scale armour impacts. */
  @meta.blue.method
  @meta.implemented
  GetArmorImpactParentSize()
  {
    return this.damageOverlay.GetArmorImpactParentSize();
  }

  /** Returns whether debris is forced for every armour impact. */
  @meta.blue.method
  @meta.implemented
  GetDebugForceSpawnDebris()
  {
    return this.damageOverlay.GetDebugForceSpawnDebris();
  }

  /** Sets whether every armour impact requests debris. */
  @meta.blue.method
  @meta.implemented
  SetDebugForceSpawnDebris(value)
  {
    this.damageOverlay.SetDebugForceSpawnDebris(value);
  }

  /** Returns the damage overlay render priority. */
  @meta.blue.method
  @meta.implemented
  GetRenderPriority()
  {
    return this.damageOverlay.GetRenderPriority();
  }

  /** Returns the shared data-texture block identifier. */
  @meta.blue.method
  @meta.implemented
  GetDataTextureBlockID()
  {
    return this.damageOverlay.GetDataTextureBlockID();
  }

  /** Returns the hull-damage multiplier. */
  @meta.blue.method
  @meta.implemented
  GetHullDamageFactor()
  {
    return this.damageOverlay.GetHullDamageFactor();
  }

  /** Sets the hull-damage multiplier. */
  @meta.blue.method
  @meta.implemented
  SetHullDamageFactor(value)
  {
    this.damageOverlay.SetHullDamageFactor(value);
  }

  /** Returns the armour-damage material. */
  @meta.blue.method
  @meta.implemented
  GetArmorDamageShaderEffect()
  {
    return this.damageOverlay.GetArmorDamageShaderEffect();
  }

  /** Sets the armour-damage material. */
  @meta.blue.method
  @meta.implemented
  SetArmorDamageShaderEffect(value)
  {
    this.damageOverlay.SetArmorDamageShaderEffect(value);
  }

  /** Returns the hull-damage flicker curve. */
  @meta.blue.method
  @meta.implemented
  GetHullDamageFlickerCurve()
  {
    return this.damageOverlay.GetHullDamageFlickerCurve();
  }

  /** Sets the hull-damage flicker curve. */
  @meta.blue.method
  @meta.implemented
  SetHullDamageFlickerCurve(value)
  {
    this.damageOverlay.SetHullDamageFlickerCurve(value);
  }

  /** Returns the armour-repair fader. */
  @meta.blue.method
  @meta.implemented
  GetArmorRepairing()
  {
    return this.damageOverlay.GetArmorRepairing();
  }

  /** Replaces the armour-repair fader. */
  @meta.blue.method
  @meta.implemented
  SetArmorRepairing(value)
  {
    this.damageOverlay.SetArmorRepairing(value);
  }

  /** Returns the armour-hardening fader. */
  @meta.blue.method
  @meta.implemented
  GetArmorHardening()
  {
    return this.damageOverlay.GetArmorHardening();
  }

  /** Replaces the armour-hardening fader. */
  @meta.blue.method
  @meta.implemented
  SetArmorHardening(value)
  {
    this.damageOverlay.SetArmorHardening(value);
  }

  /** Returns the hull-repair fader. */
  @meta.blue.method
  @meta.implemented
  GetHullRepairing()
  {
    return this.damageOverlay.GetHullRepairing();
  }

  /** Replaces the hull-repair fader. */
  @meta.blue.method
  @meta.implemented
  SetHullRepairing(value)
  {
    this.damageOverlay.SetHullRepairing(value);
  }

  /**
   * Carbon SetDamageState (cpp:534-540): the shield colour fade is (1 - shield)^2 clamped to [0, 1]; the damage
   * overlay derives the configuration.
   */
  @meta.blue.method
  @meta.implemented
  SetDamageState(shield, armor, hull, doCreateArmorImpacts)
  {
    this.shieldImpactColorFade = Math.max(0, Math.min(1, (1 - shield) ** 2));
    this.damageOverlay.SetDamageState(shield, armor, hull, doCreateArmorImpacts);
  }

  /** Removes every live shield and armour impact. */
  @meta.blue.method
  @meta.implemented
  Clear()
  {
    this._shieldImpacts.clear();
    this.damageOverlay.Clear();
  }

  /** Creates a shield impact or forwards an armour/hull impact. */
  @meta.blue.method
  @meta.adapted
  CreateImpact(damageLocatorIndex, direction, lifeTime, size, intensity = 1, lod = Tr2Lod.TR2_LOD_HIGH, parent = null)
  {
    if (!EveDamageOverlay.impactEffectEnabled) return -1;

    const configuration = this.GetImpactConfiguration();
    if (configuration === ImpactConfiguration.IMPACT_SHIELD && lod !== Tr2Lod.TR2_LOD_LOW)
    {
      return this._CreateShieldImpact(damageLocatorIndex, direction, lifeTime, size, intensity, parent);
    }

    if (configuration === ImpactConfiguration.IMPACT_ARMOR ||
      configuration === ImpactConfiguration.IMPACT_HULL)
    {
      return this.damageOverlay.CreateImpact(
        damageLocatorIndex, size, lod !== Tr2Lod.TR2_LOD_LOW);
    }

    return -1;
  }

  /**
   * Carbon CreateShieldImpact (EveImpactOverlay.cpp:596-673, private):
   * reuse a close-enough existing impact at the same locator (dot > 0.95),
   * else - at the cap - reuse the closest impact anywhere, else intersect
   * the shield ellipsoid and allocate a new record. Extracted from
   * CreateImpact so the surface matches Carbon's; behaviour unchanged.
   */
  _CreateShieldImpact(damageLocatorIndex, direction, lifeTime, size, intensity, parent)
  {
    {
      const normalizedDirection = vec3.normalize(vec3.create(), direction);
      let closestAtLocatorIndex = -1;
      let closestAtAnyIndex = -1;
      let closestAtLocatorAngle = -Infinity;
      let closestAtAnyAngle = -Infinity;

      for (const [ index, impact ] of this._shieldImpacts)
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
        const impact = this._shieldImpacts.get(closestAtLocatorIndex);
        vec3.copy(impact.direction, normalizedDirection);
        impact.timeLeft = IMPACT_SHIELD_FADEOUT * Number(lifeTime);
        impact.size = Math.max(Number(size), impact.size);
        return closestAtLocatorIndex;
      }

      if (this._shieldImpacts.size >= this.maxShieldImpacts)
      {
        if (closestAtAnyIndex !== -1)
        {
          const impact = this._shieldImpacts.get(closestAtAnyIndex);
          vec3.copy(impact.direction, normalizedDirection);
          impact.timeLeft = IMPACT_SHIELD_FADEOUT * Number(lifeTime);
          impact.size = Math.max(Number(size), impact.size);
        }
        return closestAtAnyIndex;
      }

      const parentWorldTransform = parent.GetLocalToWorldTransform(mat4.create());
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
      const interceptPosition = this._GetShieldImpactPosition(
        parentInverseWorldTransform, locatorPositionWorld,
        normalizedDirection, ellipsoidCenter, ellipsoidRadii);
      vec3.transformMat4(interceptPosition, interceptPosition, parentWorldTransform);

      const index = this.damageOverlay.AllocateImpactIndex();
      const impactLifeTime = IMPACT_SHIELD_FADEOUT * Number(lifeTime);
      this._shieldImpacts.set(index, {
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
  }

  /**
   * Carbon GetShieldImpactPosition (EveImpactOverlay.cpp:247-266, private):
   * ellipsoid shields intersect the impact ray with the shield ellipsoid in
   * object space; non-ellipsoid shields answer the locator position in
   * object space. Reads shieldIsEllipsoid off the instance exactly as
   * Carbon does; the module-level helper carries the math.
   */
  _GetShieldImpactPosition(parentInverseWorldTransform, damageLocatorPositionWorld, impactDirection, ellipsoidCenter, ellipsoidRadii, out = vec3.create())
  {
    return getShieldImpactPosition(
      out, this.shieldIsEllipsoid, parentInverseWorldTransform,
      damageLocatorPositionWorld, impactDirection, ellipsoidCenter, ellipsoidRadii);
  }

  /** Resolves a live impact's current position and direction. */
  @meta.blue.method
  @meta.implemented
  UpdateImpact(out, direction, impactIndex)
  {
    if (impactIndex === -1) return false;
    const impact = this._shieldImpacts.get(Number(impactIndex) | 0);
    if (!impact) return this.damageOverlay.HasImpact(impactIndex);
    vec3.copy(out, impact.interceptPosition);
    vec3.copy(impact.direction, direction);
    return true;
  }

  /** Reports whether any shield impact or shield fader is active. */
  HasShieldActivity()
  {
    return EveDamageOverlay.impactEffectEnabled &&
      (this._shieldImpacts.size !== 0 || this.overallShieldImpact > 0 ||
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
  @meta.blue.method
  @meta.implemented
  GetActivationStrength(updateContext)
  {
    return this.damageOverlay.GetActivationStrength(updateContext);
  }

  /** Advances shield faders and publishes the shared damage block. */
  @meta.blue.method
  @meta.adapted
  UpdateSyncronous(updateContext, parent)
  {
    // Carbon EveImpactOverlay.cpp:96-110: debris spawns BEFORE the activity
    // early-out, so part overlays spawn even while the ship's is idle.
    this.SpawnImpactDebris(updateContext, parent);

    const hasGeneralActivity = this.HasGeneralActivity();
    this.damageOverlay.UpdateBlockData(
      hasGeneralActivity ? updateContext.GetDataTextureManager() : null,
      hasGeneralActivity);
  }

  /**
   * Spawns debris particles once for every armour impact that requested them,
   * on the ship's overlay and then on each part's, offsetting part locators by
   * their range in the merged damage set (Carbon EveImpactOverlay.cpp:116-180).
   * The hull-emitter test reads the SHIP's impact configuration even for a
   * part overlay; ported as written.
   */
  @meta.blue.method
  @meta.implemented
  SpawnImpactDebris(updateContext, parent)
  {
    if (!EveDamageOverlay.impactEffectEnabled) return;
    const gpuParticleSystem = updateContext.GetGpuParticleSystem();
    if (!gpuParticleSystem || !this.armorImpactEmitter) return;

    const spawnFromOverlay = (overlay, mergedIndexOffset) =>
    {
      const armorImpactParentSize = overlay.GetArmorImpactParentSize();
      if (armorImpactParentSize <= 0) return;
      for (const impact of overlay.ArmorImpacts().values())
      {
        if (!impact.requestSpawnDebris) continue;
        const locatorIndex = mergedIndexOffset + impact.damageLocatorIndex;
        const impactPosWS = vec3.create();
        parent.GetDamageLocatorPosition(locatorIndex, true, impactPosWS);
        this.armorImpactEmitter.SetPosition(impactPosWS);
        const impactDirWS = vec3.fromValues(0, 1, 0);
        parent.GetDamageLocatorDirection(locatorIndex, true, impactDirWS);
        this.armorImpactEmitter.SetDirection(impactDirWS);
        const parentVelocityWS = vec3.create();
        parent.GetWorldVelocity(parentVelocityWS);
        const scale = impact.size * armorImpactParentSize / (IMPACT_ARMOR_SIZE_MAX / IMPACT_ARMOR_SIZE_FACTOR);
        const rateModifier = Math.min(Math.max(
          overlay.GetRenderPriority() / IMPACT_ARMOR_PARTICLE_LOD_FACTOR, 0), 1);
        const args = new ITr2GenericEmitterUpdateArguments();
        args.time = CcpTime.timeAsDouble(updateContext.GetTime());
        args.system = gpuParticleSystem;
        vec3.copy(args.originShift, updateContext.GetOriginShift());
        this.armorImpactEmitter.SpawnOnce(args, parentVelocityWS, scale, rateModifier);
        impact.requestSpawnDebris = false;

        if (this.hullImpactEmitter &&
          this.damageOverlay.GetImpactConfiguration() === ImpactConfiguration.IMPACT_HULL)
        {
          this.hullImpactEmitter.SetPosition(impactPosWS);
          this.hullImpactEmitter.SetDirection(impactDirWS);
          this.hullImpactEmitter.SpawnOnce(args, parentVelocityWS, scale, rateModifier);
        }
      }
    };

    spawnFromOverlay(this.damageOverlay, 0);
    for (const [ overlay, start ] of parent.CollectPartDamageOverlays([]))
    {
      spawnFromOverlay(overlay, start);
    }
  }

  /** Ages shield impacts and rebuilds the shared damage rows. */
  @meta.blue.method
  @meta.adapted
  UpdateAsyncronous(updateContext, parent)
  {
    const delta = updateContext.GetDeltaT();
    for (const [ index, impact ] of this._shieldImpacts)
    {
      impact.timeLeft -= delta;
      if (impact.timeLeft <= 0) this._shieldImpacts.delete(index);
    }

    this.shieldBoosting.Update(updateContext);
    this.shieldHardening.Update(updateContext);

    const info = this._ownerInfo;
    parent.GetBoundingSphere(info.boundingSphere);
    info.estimatedPixelDiameter = parent.estimatedPixelDiameter;
    info.isInFrustum = parent.IsInFrustum();
    this._ownerParent = parent;
    info.getDamageLocatorPositionOS = this._getOwnerDamageLocatorPositionOS;
    this.damageOverlay.UpdateAsyncronous(updateContext, info, this._shieldImpacts.size, this.HasShieldActivity());

    const header = this.damageOverlay.HeaderRow();
    vec4.set(header[0],
      this._shieldImpacts.size,
      this.overallShieldImpact,
      this.shieldImpactColorFade,
      this.shieldImpactParentSize);
    vec4.set(header[1],
      this.shieldHardening.GetFaderValue(),
      this.shieldBoosting.GetFaderValue(),
      this.shieldHardening.GetKickInValue(),
      this.shieldBoosting.GetKickInValue());

    if (!this.HasGeneralActivity()) return;

    const parentWorldTransform = parent.GetLocalToWorldTransform(mat4.create());
    const parentInverseWorldTransform = mat4.invert(mat4.create(), parentWorldTransform);
    if (!parentInverseWorldTransform)
    {
      throw new Error("EveImpactOverlay.UpdateAsyncronous requires an invertible parent transform.");
    }

    this.shieldImpactParentSize = Math.max(
      IMPACT_SHIELD_SIZE_MIN,
      Math.min(IMPACT_SHIELD_SIZE_MAX, info.boundingSphere[3]));

    if (!this._shieldImpacts.size) return;

    const ellipsoidCenter = vec3.create();
    const ellipsoidRadii = vec3.fromValues(1, 1, 1);
    parent.GetShapeEllipsoid(ellipsoidCenter, ellipsoidRadii);
    const locatorPositionWorld = vec3.create();
    const position = vec3.create();
    let row = 0;
    for (const impact of this._shieldImpacts.values())
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
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.implemented
  GetArmorDamageShader(batchType)
  {
    return this.damageOverlay.GetArmorDamageShader(batchType);
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
