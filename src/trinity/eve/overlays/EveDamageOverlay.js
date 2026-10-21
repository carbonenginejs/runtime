import { exposure as be } from "#be";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveDamageOverlay.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveDamageOverlay.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveDamageOverlay_Blue.cpp
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { random } from "#math/random";
import { meta, type, blue } from "#schema";
import { TriBatchType } from "#consts/graphics";
import { Tr2ScalarFader } from "../../curves/curve/Tr2ScalarFader.js";
import { ImpactConfiguration } from "../../generated/include/enums.js";
import { EveDamageOverlayOwnerInfo } from "./EveDamageOverlayOwnerInfo.js";
import "../EveImpactOverlay.js";


const IMPACT_HOLE_TO_ARMOR_DAMAGE_RATIO = 12;
const IMPACT_HOLE_TO_HULL_DAMAGE_RATIO = 4;
export const IMPACT_ARMOR_SIZE_FACTOR = 0.0129;
export const IMPACT_ARMOR_SIZE_MAX = 10;


/**
 * Self-contained armour and hull damage state shared by a ship impact overlay
 * and by independently rendered child meshes.
 */
@be.define("EveDamageOverlay")
@blue.inherit(IInitialize)

export class EveDamageOverlay
{
  @be.mapAttribute(be.READ)
  @type.int32
  impactDataNextIdx = 1;

  @be.mapAttribute(be.READ)
  @type.uint64
  armorImpactGoalCount = 0;

  @be.mapAttribute(be.READ)
  @type.float32
  armorImpactParentSize = 0;

  @be.mapAttribute(be.READ)
  @type.float32
  renderPriority = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  display = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("Tr2Effect")
  armorDamageShader = null;

  @be.mapAttribute(be.READWRITE)
  @type.uint32
  seed = 0;

  @be.mapAttribute(be.READWRITE)
  @type.float32
  armorImpactLifeTime = 10;

  @be.mapAttribute(be.READWRITE)
  @type.boolean
  debugForceSpawnDebris = false;

  @be.mapAttribute(be.READWRITE)
  @type.rootRef("Tr2ScalarFader")
  armorRepairing = new Tr2ScalarFader();

  @be.mapAttribute(be.READWRITE)
  @type.rootRef("Tr2ScalarFader")
  armorHardening = new Tr2ScalarFader();

  @be.mapAttribute(be.READWRITE)
  @type.rootRef("Tr2ScalarFader")
  hullRepairing = new Tr2ScalarFader();

  @be.mapAttribute(be.READWRITE)
  @type.float32
  hullDamageFactor = 0;

  @be.mapAttribute(be.READ)
  @type.int32
  @type.enum("trinity.ITriTargetable.ImpactConfiguration")
  configuration = ImpactConfiguration.IMPACT_INVALID;

  @be.mapAttribute(be.READWRITE)
  @type.uint32
  damageLocatorCount = 0;

  @be.mapAttribute(be.READ)
  @type.int32
  dataTextureBlockID = -1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("TriPerlinCurve")
  hullDamageFlickerCurve = null;

  _dataTextureOffset = -1;

  // Disabled indices are the compact complement of Carbon's enabled-index
  // vector. This preserves uint32 count semantics without allocating several
  // gigabytes when a caller passes a wrapped unsigned value.
  _disabledDamageLocators = [];

  _lastDamageState = vec3.fromValues(1, 1, 1);

  _impactIndexSource = null;

  _armorImpacts = new Map();

  _header = Array.from({ length: 4 }, () => vec4.create());

  _texelRows = [];

  _wasVisible = false;

  /** Global equivalent of Carbon's impact-effect setting. */
  static impactEffectEnabled = true;

  static _locatorPosition = vec3.create();

  /** Initializes the damage-overlay state. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

  /** Sets the deterministic seed used to choose damage locators. */
  @blue.method
  @meta.implemented
  SetSeed(seed)
  {
    this.seed = Number(seed) >>> 0;
  }

  /** Sets the number of damage locators owned by the target. */
  @blue.method
  @meta.implemented
  SetDamageLocatorCount(count)
  {
    this.damageLocatorCount = Number(count) >>> 0;
    this._disabledDamageLocators.length = 0;
  }

  /**
   * Replaces the per-locator enabled mask (cpp:74-87). Carbon keeps the enabled indices; this keeps their
   * complement, the indices the filter switches off. Locators past the filter's end stay enabled.
   * @param {Array<boolean>} enabled Per-locator flags.
   */
  @blue.method
  @meta.adapted
  SetEnabledDamageLocators(enabled)
  {
    this._disabledDamageLocators.length = 0;
    const count = Math.min(this.damageLocatorCount, enabled.length);
    for (let index = 0; index < count; index++)
    {
      if (!enabled[index]) this._disabledDamageLocators.push(index);
    }
  }

  /** Sets whether every armour impact requests debris. */
  @blue.method
  SetDebugForceSpawnDebris(value)
  {
    this.debugForceSpawnDebris = !!value;
  }

  /** Sets the authored hull-damage multiplier. */
  @blue.method
  SetHullDamageFactor(value)
  {
    this.hullDamageFactor = Number(value);
  }

  /** Sets the material used by the armour-damage pass. */
  @blue.method
  SetArmorDamageShaderEffect(value)
  {
    this.armorDamageShader = value;
  }

  /** Sets the curve used to flicker hull damage. */
  @blue.method
  SetHullDamageFlickerCurve(value)
  {
    this.hullDamageFlickerCurve = value;
  }

  /** Replaces the armour-repair fader. */
  @blue.method
  SetArmorRepairing(value)
  {
    this.armorRepairing = value;
  }

  /** Replaces the armour-hardening fader. */
  @blue.method
  SetArmorHardening(value)
  {
    this.armorHardening = value;
  }

  /** Replaces the hull-repair fader. */
  @blue.method
  SetHullRepairing(value)
  {
    this.hullRepairing = value;
  }

  /** Shares impact indices with another damage overlay. */
  @blue.method
  SetImpactIndexSource(value)
  {
    this._impactIndexSource = value;
  }

  /** Returns the deterministic damage seed. */
  @blue.method
  GetSeed()
  {
    return this.seed;
  }

  /** Returns the next locally allocated impact index. */
  @blue.method
  GetImpactDataNextIdx()
  {
    return this.impactDataNextIdx;
  }

  /** Returns the target number of live armour impacts. */
  @blue.method
  GetArmorImpactGoalCount()
  {
    return this.armorImpactGoalCount;
  }

  /** Returns the parent size used to scale armour impacts. */
  @blue.method
  GetArmorImpactParentSize()
  {
    return this.armorImpactParentSize;
  }

  /** Returns whether debris is forced for every impact. */
  @blue.method
  GetDebugForceSpawnDebris()
  {
    return this.debugForceSpawnDebris;
  }

  /** Returns the authored hull-damage multiplier. */
  @blue.method
  GetHullDamageFactor()
  {
    return this.hullDamageFactor;
  }

  /** Returns the armour-damage material. */
  @blue.method
  GetArmorDamageShaderEffect()
  {
    return this.armorDamageShader;
  }

  /** Returns the hull-damage flicker curve. */
  @blue.method
  GetHullDamageFlickerCurve()
  {
    return this.hullDamageFlickerCurve;
  }

  /** Returns the armour-repair fader. */
  @blue.method
  GetArmorRepairing()
  {
    return this.armorRepairing;
  }

  /** Returns the armour-hardening fader. */
  @blue.method
  GetArmorHardening()
  {
    return this.armorHardening;
  }

  /** Returns the hull-repair fader. */
  @blue.method
  GetHullRepairing()
  {
    return this.hullRepairing;
  }

  /** Returns the damage overlay render priority. */
  @blue.method
  GetRenderPriority()
  {
    return this.renderPriority;
  }

  /** Returns this overlay's first row in the shared data texture. */
  @blue.method
  GetDataTextureOffset()
  {
    return this._dataTextureOffset;
  }

  /** Returns this overlay's shared data-texture block identifier. */
  @blue.method
  GetDataTextureBlockID()
  {
    return this.dataTextureBlockID;
  }

  /** Returns the active armour or hull impact configuration. */
  @blue.method
  GetImpactConfiguration()
  {
    return this.configuration;
  }

  /** Returns the lifetime of one armour impact. */
  @be.mapMethodAndWrap()
  GetArmorImpactLifeTime()
  {
    return this.armorImpactLifeTime;
  }

  /** Copies the last shield, armour and hull values into a caller-owned vector (Carbon returns it by value, cpp:209). */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetLastDamageState(out)
  {
    return vec3.copy(out, this._lastDamageState);
  }

  /** Returns the mutable header row used by EveImpactOverlay's shield half. */
  @blue.method
  HeaderRow()
  {
    return this._header;
  }

  /** Returns one mutable impact texel row. */
  @blue.method
  TexelRow(index)
  {
    return this._texelRows[index];
  }

  /** Returns the live armour-impact table. */
  @blue.method
  ArmorImpacts()
  {
    return this._armorImpacts;
  }

  /** Allocates the next impact identifier from the shared or local source. */
  @blue.method
  @meta.implemented
  AllocateImpactIndex()
  {
    return this._impactIndexSource
      ? this._impactIndexSource.AllocateImpactIndex()
      : this.impactDataNextIdx++;
  }

  /** Advances armour impacts, faders, priorities and data-texture rows. */
  @blue.method
  @meta.adapted
  UpdateAsyncronous(updateContext, ownerInfo, minTexelRows, hasExternalActivity)
  {
    if (this.armorImpactGoalCount < this._armorImpacts.size)
    {
      let ordinal = 0;
      for (const [ index, impact ] of this._armorImpacts)
      {
        if (ordinal++ < this.armorImpactGoalCount) continue;
        impact.size -= updateContext.GetDeltaT() / this.armorImpactLifeTime;
        if (impact.size <= 0) this._armorImpacts.delete(index);
      }
    }

    this.armorHardening.Update(updateContext);
    this.armorRepairing.Update(updateContext);
    this.hullRepairing.Update(updateContext);

    const rowCount = Math.max(Number(minTexelRows) >>> 0, this._armorImpacts.size);
    while (this._texelRows.length < rowCount)
    {
      this._texelRows.push(Array.from({ length: 4 }, () => vec4.create()));
    }
    this._texelRows.length = rowCount;

    vec4.set(this._header[2],
      this._armorImpacts.size,
      this.armorImpactParentSize,
      this.hullRepairing.GetFaderValue(),
      this.hullRepairing.GetKickInValue());
    vec4.set(this._header[3],
      this.armorRepairing.GetFaderValue(),
      this.armorHardening.GetFaderValue(),
      this.armorRepairing.GetKickInValue(),
      this.armorHardening.GetKickInValue());

    if (!hasExternalActivity && !this.HasGeneralActivity()) return;

    this.renderPriority = this._wasVisible || ownerInfo.isInFrustum ? ownerInfo.estimatedPixelDiameter : 0;
    this._wasVisible = ownerInfo.isInFrustum;
    this.armorImpactParentSize = Math.min(ownerInfo.boundingSphere[3], IMPACT_ARMOR_SIZE_MAX / IMPACT_ARMOR_SIZE_FACTOR);

    // Carbon EveDamageOverlay.cpp:301: an owner that cannot resolve its
    // locators (an instanced part whose mesh is not loaded) supplies none.
    if (!ownerInfo.getDamageLocatorPositionOS) return;
    let row = 0;
    for (const impact of this._armorImpacts.values())
    {
      const texel = this._texelRows[row++];
      const position = vec3.zero(EveDamageOverlay._locatorPosition);
      ownerInfo.getDamageLocatorPositionOS(impact.damageLocatorIndex, position);
      vec4.set(texel[2], position[0], position[1], position[2], 0);
      vec4.set(texel[3], impact.size * IMPACT_ARMOR_SIZE_FACTOR * this.armorImpactParentSize, 0, 0, 0);
    }
  }

  /** Publishes the current damage block during the synchronous update. */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext)
  {
    this.UpdateBlockData(updateContext.GetDataTextureManager(), this.HasGeneralActivity());
  }

  /** Requests or releases this overlay's shared data-texture block. */
  @blue.method
  @meta.adapted
  UpdateBlockData(dataTextureManager, hasActivity)
  {
    if (!hasActivity)
    {
      this.dataTextureBlockID = -1;
      return;
    }

    this._dataTextureOffset = dataTextureManager.GetTextureOffset(this.dataTextureBlockID);
    this.dataTextureBlockID = dataTextureManager.RequestBlockData(
      this._header, this._texelRows.length, this._texelRows, this.renderPriority);
  }

  /** Reports whether armour impacts or armour faders are active. */
  @blue.method
  HasArmorActivity()
  {
    return EveDamageOverlay.impactEffectEnabled &&
      (this._armorImpacts.size !== 0 || !this.armorHardening.IsZero() || !this.armorRepairing.IsZero());
  }

  /** Reports whether hull damage presentation is active. */
  @blue.method
  HasHullActivity()
  {
    return EveDamageOverlay.impactEffectEnabled && !this.hullRepairing.IsZero();
  }

  /** Reports whether any armour or hull presentation is active. */
  @blue.method
  HasGeneralActivity()
  {
    return this.HasHullActivity() || this.HasArmorActivity();
  }

  /** Calculates the current hull-flicker activation strength. */
  @blue.method
  @meta.implemented
  GetActivationStrength(updateContext)
  {
    if (EveDamageOverlay.impactEffectEnabled && this.hullDamageFactor > 0 && this.hullDamageFlickerCurve)
    {
      const value = Math.max(0.3, Math.min(1, this.hullDamageFlickerCurve.Update__Ticks(updateContext.GetTime())));
      return value / Math.exp(this.hullDamageFactor);
    }
    return 1;
  }

  /** Starts or stops a named armour or hull fader. */
  @be.mapMethodAndWrap()
  @meta.implemented
  ToggleEffect(name, on, duration)
  {
    let fader = null;
    if (name === "armorhardening") fader = this.armorHardening;
    else if (name === "armorrepair") fader = this.armorRepairing;
    else if (name === "hullrepair") fader = this.hullRepairing;
    if (!fader) return false;
    fader.StartFade(!!on, Number(duration) / 4);
    return true;
  }

  /** Applies shield, armour and hull state and optionally creates armour impacts. */
  @be.mapMethodAndWrap()
  @meta.implemented
  SetDamageState(shield, armor, hull, createArmorImpacts = false)
  {
    if (shield > 0.05) this.configuration = ImpactConfiguration.IMPACT_SHIELD;
    else if (armor > 0.05) this.configuration = ImpactConfiguration.IMPACT_ARMOR;
    else if (hull > 0) this.configuration = ImpactConfiguration.IMPACT_HULL;

    this.armorImpactGoalCount = Math.trunc(
      IMPACT_HOLE_TO_ARMOR_DAMAGE_RATIO * clamp01(1 - armor) +
      IMPACT_HOLE_TO_HULL_DAMAGE_RATIO * clamp01(1 - hull));
    this.hullDamageFactor = linearize(0.9, 0.1, hull);

    if (this.hullDamageFlickerCurve)
    {
      const modifier = linearize(1, 0, hull);
      this.hullDamageFlickerCurve.scale = modifier;
      this.hullDamageFlickerCurve.offset = 1 - modifier;
    }

    const enabledLocatorCount = this.damageLocatorCount - this._disabledDamageLocators.length;
    if (createArmorImpacts && enabledLocatorCount)
    {
      // Carbon cpp:481-491: std::mt19937 seeded with m_seed plus the impact
      // count, a uniform locator among the enabled ones and a uniform size
      // in [0.2, 0.8).
      const generator = random.mt19937((this.seed + this._armorImpacts.size) >>> 0);
      const firstImpact = this._armorImpacts.size;
      for (let impactIndex = firstImpact; impactIndex < this.armorImpactGoalCount; impactIndex++)
      {
        // Both draws are arguments of one CreateImpact call, whose evaluation
        // order C++ leaves unspecified. MSVC 14.50 (/O2, x64) draws the size
        // first: the same call compiled there matches this sequence exactly.
        const size = random.uniformRealFloat(generator, 0.2, 0.8);
        let locator = random.uniformInt(generator, 0, enabledLocatorCount - 1);
        for (const disabled of this._disabledDamageLocators)
        {
          if (disabled > locator) break;
          locator++;
        }
        this.CreateImpact(locator, size, this.debugForceSpawnDebris);
      }
    }

    vec3.set(this._lastDamageState, shield, armor, hull);
  }

  /** Removes every live armour impact. */
  @be.mapMethodAndWrap()
  @meta.implemented
  Clear()
  {
    this._armorImpacts.clear();
  }

  /** Creates or enlarges an armour impact at a damage locator. */
  @be.mapMethodAndWrap()
  @meta.implemented
  CreateImpact(damageLocatorIndex, size, spawnEffects = false)
  {
    for (const [ index, impact ] of this._armorImpacts)
    {
      if (impact.damageLocatorIndex !== damageLocatorIndex) continue;
      impact.size = Math.max(Number(size), impact.size);
      impact.requestSpawnDebris = !!spawnEffects;
      return index;
    }

    const impactIndex = this.AllocateImpactIndex();
    this._armorImpacts.set(impactIndex, {
      damageLocatorIndex: Number(damageLocatorIndex) | 0,
      size: Number(size),
      requestSpawnDebris: !!spawnEffects
    });
    return impactIndex;
  }

  /** Reports whether an armour impact identifier is live. */
  @blue.method
  @meta.implemented
  HasImpact(impactIndex)
  {
    return this._armorImpacts.has(Number(impactIndex) | 0);
  }

  /** Returns the active armour-damage material for the decal pass. */
  @blue.method
  @meta.implemented
  GetArmorDamageShader(batchType)
  {
    if (!this.display || batchType !== TriBatchType.TRIBATCHTYPE_DECAL ||
      this.dataTextureBlockID === -1 || this._dataTextureOffset === -1 ||
      !this.HasArmorActivity())
    {
      return null;
    }
    return this.armorDamageShader;
  }

  static ImpactConfiguration = ImpactConfiguration;

  /** Carbon EveDamageOverlay::OwnerInfo (public, EveDamageOverlay.h:63-69). */
  static OwnerInfo = EveDamageOverlayOwnerInfo;
}


function clamp01(value)
{
  return Math.max(0, Math.min(1, Number(value)));
}


function linearize(min, max, value)
{
  return clamp01((Number(value) - min) / (max - min));
}

