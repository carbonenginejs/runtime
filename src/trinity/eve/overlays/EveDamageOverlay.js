// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveDamageOverlay.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveDamageOverlay.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveDamageOverlay_Blue.cpp
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { TriBatchType } from "#consts/graphics";
import { Tr2ScalarFader } from "../../curves/curve/Tr2ScalarFader.js";
import { ImpactConfiguration } from "../../generated/include/enums.js";


const IMPACT_HOLE_TO_ARMOR_DAMAGE_RATIO = 12;
const IMPACT_HOLE_TO_HULL_DAMAGE_RATIO = 4;
const IMPACT_ARMOR_SIZE_FACTOR = 0.0129;
const IMPACT_ARMOR_SIZE_MAX = 10;


/**
 * Self-contained armour and hull damage state shared by a ship impact overlay
 * and by independently rendered child meshes.
 */
@type.define({ className: "EveDamageOverlay", family: "eve/overlays/impact" })
export class EveDamageOverlay extends CjsModel
{
  @io.read
  @type.int32
  impactDataNextIdx = 1;

  @io.read
  @type.uint64
  armorImpactGoalCount = 0;

  @io.read
  @type.float32
  armorImpactParentSize = 0;

  @io.read
  @type.float32
  renderPriority = 0;

  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.model("Tr2Effect")
  armorDamageShader = null;

  @io.readwrite
  @type.uint32
  seed = 0;

  @io.readwrite
  @type.float32
  armorImpactLifeTime = 10;

  @io.readwrite
  @type.boolean
  debugForceSpawnDebris = false;

  @io.readwrite
  @type.objectRef("Tr2ScalarFader")
  armorRepairing = new Tr2ScalarFader();

  @io.readwrite
  @type.objectRef("Tr2ScalarFader")
  armorHardening = new Tr2ScalarFader();

  @io.readwrite
  @type.objectRef("Tr2ScalarFader")
  hullRepairing = new Tr2ScalarFader();

  @io.readwrite
  @type.float32
  hullDamageFactor = 0;

  @io.read
  @type.int32
  @type.enum("ImpactConfiguration")
  configuration = ImpactConfiguration.IMPACT_INVALID;

  @io.readwrite
  @type.uint32
  damageLocatorCount = 0;

  @io.read
  @type.int32
  dataTextureBlockID = -1;

  @io.persist
  @type.model("TriPerlinCurve")
  hullDamageFlickerCurve = null;

  #dataTextureOffset = -1;

  // Disabled indices are the compact complement of Carbon's enabled-index
  // vector. This preserves uint32 count semantics without allocating several
  // gigabytes when a caller passes a wrapped unsigned value.
  #disabledDamageLocators = [];

  #lastDamageState = vec3.fromValues(1, 1, 1);

  #impactIndexSource = null;

  #armorImpacts = new Map();

  #header = Array.from({ length: 4 }, () => vec4.create());

  #texelRows = [];

  #wasVisible = false;

  /** Global equivalent of Carbon's impact-effect setting. */
  static impactEffectEnabled = true;

  /** Initializes the damage-overlay state. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return true;
  }

  /** Sets the deterministic seed used to choose damage locators. */
  @carbon.method
  @impl.implemented
  SetSeed(seed)
  {
    this.seed = Number(seed) >>> 0;
  }

  /** Sets the number of damage locators owned by the target. */
  @carbon.method
  @impl.implemented
  SetDamageLocatorCount(count)
  {
    this.damageLocatorCount = Number(count) >>> 0;
    this.#disabledDamageLocators.length = 0;
  }

  /** Replaces the per-locator enabled mask. */
  @carbon.method
  @impl.adapted
  SetEnabledDamageLocators(enabled)
  {
    const filter = Array.from(enabled ?? []);
    this.#disabledDamageLocators.length = 0;
    const count = Math.min(this.damageLocatorCount, filter.length);
    for (let index = 0; index < count; index++)
    {
      if (!filter[index]) this.#disabledDamageLocators.push(index);
    }
  }

  /** Sets whether every armour impact requests debris. */
  SetDebugForceSpawnDebris(value)
  {
    this.debugForceSpawnDebris = !!value;
  }

  /** Sets the authored hull-damage multiplier. */
  SetHullDamageFactor(value)
  {
    this.hullDamageFactor = Number(value);
  }

  /** Sets the material used by the armour-damage pass. */
  SetArmorDamageShaderEffect(value)
  {
    this.armorDamageShader = value ?? null;
  }

  /** Sets the curve used to flicker hull damage. */
  SetHullDamageFlickerCurve(value)
  {
    this.hullDamageFlickerCurve = value ?? null;
  }

  /** Replaces the armour-repair fader. */
  SetArmorRepairing(value)
  {
    this.armorRepairing = value;
  }

  /** Replaces the armour-hardening fader. */
  SetArmorHardening(value)
  {
    this.armorHardening = value;
  }

  /** Replaces the hull-repair fader. */
  SetHullRepairing(value)
  {
    this.hullRepairing = value;
  }

  /** Shares impact indices with another damage overlay. */
  SetImpactIndexSource(value)
  {
    this.#impactIndexSource = value ?? null;
  }

  /** Returns the deterministic damage seed. */
  GetSeed()
  {
    return this.seed;
  }

  /** Returns the next locally allocated impact index. */
  GetImpactDataNextIdx()
  {
    return this.impactDataNextIdx;
  }

  /** Returns the target number of live armour impacts. */
  GetArmorImpactGoalCount()
  {
    return this.armorImpactGoalCount;
  }

  /** Returns the parent size used to scale armour impacts. */
  GetArmorImpactParentSize()
  {
    return this.armorImpactParentSize;
  }

  /** Returns whether debris is forced for every impact. */
  GetDebugForceSpawnDebris()
  {
    return this.debugForceSpawnDebris;
  }

  /** Returns the authored hull-damage multiplier. */
  GetHullDamageFactor()
  {
    return this.hullDamageFactor;
  }

  /** Returns the armour-damage material. */
  GetArmorDamageShaderEffect()
  {
    return this.armorDamageShader;
  }

  /** Returns the hull-damage flicker curve. */
  GetHullDamageFlickerCurve()
  {
    return this.hullDamageFlickerCurve;
  }

  /** Returns the armour-repair fader. */
  GetArmorRepairing()
  {
    return this.armorRepairing;
  }

  /** Returns the armour-hardening fader. */
  GetArmorHardening()
  {
    return this.armorHardening;
  }

  /** Returns the hull-repair fader. */
  GetHullRepairing()
  {
    return this.hullRepairing;
  }

  /** Returns the damage overlay render priority. */
  GetRenderPriority()
  {
    return this.renderPriority;
  }

  /** Returns this overlay's first row in the shared data texture. */
  GetDataTextureOffset()
  {
    return this.#dataTextureOffset;
  }

  /** Returns this overlay's shared data-texture block identifier. */
  GetDataTextureBlockID()
  {
    return this.dataTextureBlockID;
  }

  /** Returns the active armour or hull impact configuration. */
  GetImpactConfiguration()
  {
    return this.configuration;
  }

  /** Returns the lifetime of one armour impact. */
  GetArmorImpactLifeTime()
  {
    return this.armorImpactLifeTime;
  }

  /** Copies the last shield, armour and hull values into an output vector. */
  @carbon.method
  @impl.adapted
  GetLastDamageState(out = vec3.create())
  {
    return vec3.copy(out, this.#lastDamageState);
  }

  /** Returns the mutable header row used by EveImpactOverlay's shield half. */
  HeaderRow()
  {
    return this.#header;
  }

  /** Returns one mutable impact texel row. */
  TexelRow(index)
  {
    return this.#texelRows[index];
  }

  /** Returns the live armour-impact table. */
  ArmorImpacts()
  {
    return this.#armorImpacts;
  }

  /** Allocates the next impact identifier from the shared or local source. */
  @carbon.method
  @impl.implemented
  AllocateImpactIndex()
  {
    return this.#impactIndexSource
      ? this.#impactIndexSource.AllocateImpactIndex()
      : this.impactDataNextIdx++;
  }

  /** Advances armour impacts, faders, priorities and data-texture rows. */
  @carbon.method
  @impl.adapted
  UpdateAsyncronous(updateContext, ownerInfo = {}, minTexelRows = 0, hasExternalActivity = false)
  {
    if (this.armorImpactGoalCount < this.#armorImpacts.size)
    {
      let ordinal = 0;
      for (const [ index, impact ] of this.#armorImpacts)
      {
        if (ordinal++ < this.armorImpactGoalCount) continue;
        impact.size -= updateContext.GetDeltaT() / this.armorImpactLifeTime;
        if (impact.size <= 0) this.#armorImpacts.delete(index);
      }
    }

    this.armorHardening.Update(updateContext);
    this.armorRepairing.Update(updateContext);
    this.hullRepairing.Update(updateContext);

    const rowCount = Math.max(Number(minTexelRows) >>> 0, this.#armorImpacts.size);
    while (this.#texelRows.length < rowCount)
    {
      this.#texelRows.push(Array.from({ length: 4 }, () => vec4.create()));
    }
    this.#texelRows.length = rowCount;

    vec4.set(this.#header[2],
      this.#armorImpacts.size,
      this.armorImpactParentSize,
      this.hullRepairing.GetFaderValue(),
      this.hullRepairing.GetKickInValue());
    vec4.set(this.#header[3],
      this.armorRepairing.GetFaderValue(),
      this.armorHardening.GetFaderValue(),
      this.armorRepairing.GetKickInValue(),
      this.armorHardening.GetKickInValue());

    if (!hasExternalActivity && !this.HasGeneralActivity()) return;

    const pixelDiameter = Math.max(0, Number(ownerInfo.estimatedPixelDiameter) || 0);
    const isInFrustum = !!ownerInfo.isInFrustum;
    this.renderPriority = this.#wasVisible || isInFrustum ? pixelDiameter : 0;
    this.#wasVisible = isInFrustum;

    const sphere = ownerInfo.boundingSphere;
    const radius = Number(sphere?.radius ?? sphere?.[3] ?? -1);
    this.armorImpactParentSize = Math.min(radius, IMPACT_ARMOR_SIZE_MAX / IMPACT_ARMOR_SIZE_FACTOR);

    let row = 0;
    for (const impact of this.#armorImpacts.values())
    {
      const texel = this.#texelRows[row++];
      const position = vec3.create();
      ownerInfo.getDamageLocatorPositionOS(impact.damageLocatorIndex, position);
      vec4.set(texel[2], position[0], position[1], position[2], 0);
      vec4.set(texel[3], impact.size * IMPACT_ARMOR_SIZE_FACTOR * this.armorImpactParentSize, 0, 0, 0);
    }
  }

  /** Publishes the current damage block during the synchronous update. */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext)
  {
    this.UpdateBlockData(updateContext.GetDataTextureManager(), this.HasGeneralActivity());
  }

  /** Requests or releases this overlay's shared data-texture block. */
  @carbon.method
  @impl.adapted
  UpdateBlockData(dataTextureManager, hasActivity)
  {
    if (!hasActivity)
    {
      this.dataTextureBlockID = -1;
      return;
    }

    this.#dataTextureOffset = dataTextureManager.GetTextureOffset(this.dataTextureBlockID);
    this.dataTextureBlockID = dataTextureManager.RequestBlockData(
      this.#header, this.#texelRows.length, this.#texelRows, this.renderPriority);
  }

  /** Reports whether armour impacts or armour faders are active. */
  HasArmorActivity()
  {
    return EveDamageOverlay.impactEffectEnabled &&
      (this.#armorImpacts.size !== 0 || !this.armorHardening.IsZero() || !this.armorRepairing.IsZero());
  }

  /** Reports whether hull damage presentation is active. */
  HasHullActivity()
  {
    return EveDamageOverlay.impactEffectEnabled && !this.hullRepairing.IsZero();
  }

  /** Reports whether any armour or hull presentation is active. */
  HasGeneralActivity()
  {
    return this.HasHullActivity() || this.HasArmorActivity();
  }

  /** Calculates the current hull-flicker activation strength. */
  @carbon.method
  @impl.implemented
  GetActivationStrength(updateContext)
  {
    if (EveDamageOverlay.impactEffectEnabled && this.hullDamageFactor > 0 && this.hullDamageFlickerCurve)
    {
      const value = Math.max(0.3, Math.min(1, this.hullDamageFlickerCurve.Update(updateContext.GetTime())));
      return value / Math.exp(this.hullDamageFactor);
    }
    return 1;
  }

  /** Starts or stops a named armour or hull fader. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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

    const enabledLocatorCount = this.damageLocatorCount - this.#disabledDamageLocators.length;
    if (createArmorImpacts && enabledLocatorCount)
    {
      const random = seededRandom((this.seed + this.#armorImpacts.size) >>> 0);
      const firstImpact = this.#armorImpacts.size;
      for (let impactIndex = firstImpact; impactIndex < this.armorImpactGoalCount; impactIndex++)
      {
        let locator = Math.floor(random() * enabledLocatorCount);
        for (const disabled of this.#disabledDamageLocators)
        {
          if (disabled > locator) break;
          locator++;
        }
        this.CreateImpact(locator, 0.2 + random() * 0.6, this.debugForceSpawnDebris);
      }
    }

    vec3.set(this.#lastDamageState, shield, armor, hull);
  }

  /** Removes every live armour impact. */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.#armorImpacts.clear();
  }

  /** Creates or enlarges an armour impact at a damage locator. */
  @carbon.method
  @impl.implemented
  CreateImpact(damageLocatorIndex, size, spawnEffects = false)
  {
    for (const [ index, impact ] of this.#armorImpacts)
    {
      if (impact.damageLocatorIndex !== damageLocatorIndex) continue;
      impact.size = Math.max(Number(size), impact.size);
      impact.requestSpawnDebris = !!spawnEffects;
      return index;
    }

    const impactIndex = this.AllocateImpactIndex();
    this.#armorImpacts.set(impactIndex, {
      damageLocatorIndex: Number(damageLocatorIndex) | 0,
      size: Number(size),
      requestSpawnDebris: !!spawnEffects
    });
    return impactIndex;
  }

  /** Reports whether an armour impact identifier is live. */
  @carbon.method
  @impl.implemented
  HasImpact(impactIndex)
  {
    return this.#armorImpacts.has(Number(impactIndex) | 0);
  }

  /** Returns the active armour-damage material for the decal pass. */
  @carbon.method
  @impl.implemented
  GetArmorDamageShader(batchType)
  {
    if (!this.display || batchType !== TriBatchType.TRIBATCHTYPE_DECAL ||
      this.dataTextureBlockID === -1 || this.#dataTextureOffset === -1 ||
      !this.HasArmorActivity())
    {
      return null;
    }
    return this.armorDamageShader;
  }

  static ImpactConfiguration = ImpactConfiguration;
}


function clamp01(value)
{
  return Math.max(0, Math.min(1, Number(value)));
}


function linearize(min, max, value)
{
  return clamp01((Number(value) - min) / (max - min));
}


function seededRandom(seed)
{
  let state = seed || 0x6d2b79f5;
  return () =>
  {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
