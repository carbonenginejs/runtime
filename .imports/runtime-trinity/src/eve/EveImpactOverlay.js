// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveImpactOverlay.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveImpactOverlay.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveImpactOverlay_Blue.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2ScalarFader } from "../curves/curve/Tr2ScalarFader.js";
import { ImpactConfiguration } from "../generated/include/enums.js";


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

  /** Post-hydration hook; the overlay needs no additional setup. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
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
    return this.#armorImpactLifeTime;
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
    return vec3.copy(out, this.#lastDamageState);
  }

  /**
   * Row offset of this overlay's block in the shared impact data texture, or -1
   * while it has no block.
   */
  @carbon.method
  @impl.adapted
  GetDataTextureOffset()
  {
    return this.#dataTextureOffset;
  }

  /** Which ImpactConfiguration this overlay was authored for. */
  @carbon.method
  @impl.adapted
  GetImpactConfiguration()
  {
    return this.configuration;
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
    const fader = EveImpactOverlay.#effectFader(this, name);
    if (!fader) return false;
    fader.StartFade(!!on, Number(duration) / 4);
    return true;
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
