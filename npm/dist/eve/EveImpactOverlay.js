import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { Tr2ScalarFader as _Tr2ScalarFader } from '../curves/Tr2ScalarFader.js';
import { ImpactConfiguration } from '../generated/include/enums.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_seed, _init_extra_seed, _init_display, _init_extra_display, _init_configuration, _init_extra_configuration, _init_impactDataNextIdx, _init_extra_impactDataNextIdx, _init_armorImpactGoalCount, _init_extra_armorImpactGoalCount, _init_armorImpactParentSize, _init_extra_armorImpactParentSize, _init_shieldImpactColorFade, _init_extra_shieldImpactColorFade, _init_shieldImpactParentSize, _init_extra_shieldImpactParentSize, _init_shieldIsEllipsoid, _init_extra_shieldIsEllipsoid, _init_debugForceSpawnDebris, _init_extra_debugForceSpawnDebris, _init_renderPriority, _init_extra_renderPriority, _init_mesh, _init_extra_mesh, _init_dataTextureBlockID, _init_extra_dataTextureBlockID, _init_maxShieldImpacts, _init_extra_maxShieldImpacts, _init_overallShieldImpact, _init_extra_overallShieldImpact, _init_shieldHardening, _init_extra_shieldHardening, _init_shieldBoosting, _init_extra_shieldBoosting, _init_armorDamageShader, _init_extra_armorDamageShader, _init_armorImpactEmitter, _init_extra_armorImpactEmitter, _init_armorRepairing, _init_extra_armorRepairing, _init_armorHardening, _init_extra_armorHardening, _init_hullRepairing, _init_extra_hullRepairing, _init_hullDamageFlickerCurve, _init_extra_hullDamageFlickerCurve, _init_hullDamageFactor, _init_extra_hullDamageFactor, _init_hullImpactEmitter, _init_extra_hullImpactEmitter;

/**
 * The damage presentation for one ship: shield, armour and hull impact
 * resources, the faders driving hardening and repair effects, and the
 * data-texture bookkeeping that feeds them.
 */
let _EveImpactOverlay;
new class extends _identity {
  static [class EveImpactOverlay extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_seed, _init_extra_seed, _init_display, _init_extra_display, _init_configuration, _init_extra_configuration, _init_impactDataNextIdx, _init_extra_impactDataNextIdx, _init_armorImpactGoalCount, _init_extra_armorImpactGoalCount, _init_armorImpactParentSize, _init_extra_armorImpactParentSize, _init_shieldImpactColorFade, _init_extra_shieldImpactColorFade, _init_shieldImpactParentSize, _init_extra_shieldImpactParentSize, _init_shieldIsEllipsoid, _init_extra_shieldIsEllipsoid, _init_debugForceSpawnDebris, _init_extra_debugForceSpawnDebris, _init_renderPriority, _init_extra_renderPriority, _init_mesh, _init_extra_mesh, _init_dataTextureBlockID, _init_extra_dataTextureBlockID, _init_maxShieldImpacts, _init_extra_maxShieldImpacts, _init_overallShieldImpact, _init_extra_overallShieldImpact, _init_shieldHardening, _init_extra_shieldHardening, _init_shieldBoosting, _init_extra_shieldBoosting, _init_armorDamageShader, _init_extra_armorDamageShader, _init_armorImpactEmitter, _init_extra_armorImpactEmitter, _init_armorRepairing, _init_extra_armorRepairing, _init_armorHardening, _init_extra_armorHardening, _init_hullRepairing, _init_extra_hullRepairing, _init_hullDamageFlickerCurve, _init_extra_hullDamageFlickerCurve, _init_hullDamageFactor, _init_extra_hullDamageFactor, _init_hullImpactEmitter, _init_extra_hullImpactEmitter, _initProto],
        c: [_EveImpactOverlay, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveImpactOverlay",
        family: "eve/overlays/impact"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.uint32], 16, "seed"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.read, type, type.int32, void 0, schema.enum("ImpactConfiguration")], 16, "configuration"], [[io, io.read, type, type.int32], 16, "impactDataNextIdx"], [[io, io.read, type, type.uint64], 16, "armorImpactGoalCount"], [[io, io.read, type, type.float32], 16, "armorImpactParentSize"], [[io, io.readwrite, type, type.float32], 16, "shieldImpactColorFade"], [[io, io.read, type, type.float32], 16, "shieldImpactParentSize"], [[io, io.readwrite, type, type.boolean], 16, "shieldIsEllipsoid"], [[io, io.readwrite, type, type.boolean], 16, "debugForceSpawnDebris"], [[io, io.read, type, type.float32], 16, "renderPriority"], [[io, io.persist, void 0, type.objectRef("Tr2MeshBase")], 16, "mesh"], [[io, io.read, type, type.int32], 16, "dataTextureBlockID"], [[io, io.read, type, type.uint32], 16, "maxShieldImpacts"], [[io, io.readwrite, type, type.float32], 16, "overallShieldImpact"], [[io, io.readwrite, void 0, type.objectRef("Tr2ScalarFader")], 16, "shieldHardening"], [[io, io.readwrite, void 0, type.objectRef("Tr2ScalarFader")], 16, "shieldBoosting"], [[io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "armorDamageShader"], [[io, io.persist, void 0, type.objectRef("Tr2GpuUniqueEmitter")], 16, "armorImpactEmitter"], [[io, io.readwrite, void 0, type.objectRef("Tr2ScalarFader")], 16, "armorRepairing"], [[io, io.readwrite, void 0, type.objectRef("Tr2ScalarFader")], 16, "armorHardening"], [[io, io.readwrite, void 0, type.objectRef("Tr2ScalarFader")], 16, "hullRepairing"], [[io, io.persist, void 0, type.objectRef("TriPerlinCurve")], 16, "hullDamageFlickerCurve"], [[io, io.readwrite, type, type.float32], 16, "hullDamageFactor"], [[io, io.persist, void 0, type.objectRef("Tr2GpuUniqueEmitter")], 16, "hullImpactEmitter"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "Set"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetSeed"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDamageLocatorCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDamageLocatorCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetArmorImpactLifeTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetLastDamageState"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDataTextureOffset"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetImpactConfiguration"], [[carbon, carbon.method, impl, impl.adapted], 18, "HasShieldEllipsoid"], [[carbon, carbon.method, impl, impl.adapted], 18, "ToggleEffect"]], 0, void 0, CjsModel));
    }
    name = (_initProto(this), _init_name(this, ""));
    seed = (_init_extra_name(this), _init_seed(this, 0));
    display = (_init_extra_seed(this), _init_display(this, true));
    configuration = (_init_extra_display(this), _init_configuration(this, 0));
    impactDataNextIdx = (_init_extra_configuration(this), _init_impactDataNextIdx(this, 1));
    armorImpactGoalCount = (_init_extra_impactDataNextIdx(this), _init_armorImpactGoalCount(this, 0));
    armorImpactParentSize = (_init_extra_armorImpactGoalCount(this), _init_armorImpactParentSize(this, 0));
    shieldImpactColorFade = (_init_extra_armorImpactParentSize(this), _init_shieldImpactColorFade(this, 0));
    shieldImpactParentSize = (_init_extra_shieldImpactColorFade(this), _init_shieldImpactParentSize(this, 0));
    shieldIsEllipsoid = (_init_extra_shieldImpactParentSize(this), _init_shieldIsEllipsoid(this, true));
    debugForceSpawnDebris = (_init_extra_shieldIsEllipsoid(this), _init_debugForceSpawnDebris(this, false));
    renderPriority = (_init_extra_debugForceSpawnDebris(this), _init_renderPriority(this, 0));
    mesh = (_init_extra_renderPriority(this), _init_mesh(this, null));
    dataTextureBlockID = (_init_extra_mesh(this), _init_dataTextureBlockID(this, -1));
    maxShieldImpacts = (_init_extra_dataTextureBlockID(this), _init_maxShieldImpacts(this, 8));
    overallShieldImpact = (_init_extra_maxShieldImpacts(this), _init_overallShieldImpact(this, -1));
    shieldHardening = (_init_extra_overallShieldImpact(this), _init_shieldHardening(this, new _Tr2ScalarFader()));
    shieldBoosting = (_init_extra_shieldHardening(this), _init_shieldBoosting(this, new _Tr2ScalarFader()));
    armorDamageShader = (_init_extra_shieldBoosting(this), _init_armorDamageShader(this, null));
    armorImpactEmitter = (_init_extra_armorDamageShader(this), _init_armorImpactEmitter(this, null));
    armorRepairing = (_init_extra_armorImpactEmitter(this), _init_armorRepairing(this, new _Tr2ScalarFader()));
    armorHardening = (_init_extra_armorRepairing(this), _init_armorHardening(this, new _Tr2ScalarFader()));
    hullRepairing = (_init_extra_armorHardening(this), _init_hullRepairing(this, new _Tr2ScalarFader()));
    hullDamageFlickerCurve = (_init_extra_hullRepairing(this), _init_hullDamageFlickerCurve(this, null));
    hullDamageFactor = (_init_extra_hullDamageFlickerCurve(this), _init_hullDamageFactor(this, 0));
    hullImpactEmitter = (_init_extra_hullDamageFactor(this), _init_hullImpactEmitter(this, null));

    // Derived at lifecycle time from the owner's "damage" locator set; not an
    // authored value, so it never enters the values interchange.
    #damageLocatorCount = (_init_extra_hullImpactEmitter(this), 0);
    #armorImpactLifeTime = 10;
    #dataTextureOffset = -1;
    #lastDamageState = vec3.fromValues(1, 1, 1);

    /** Post-hydration hook; the overlay needs no additional setup. */
    Initialize() {
      return true;
    }

    /**
     * Assigns the overlay's authored resources in one call - the hull flicker
     * curve, the armour and hull impact emitters, the armour damage shader and the
     * shield impact mesh - together with the shield shape flag.
     */
    Set(hullDamageFlickerCurve, armorDamageEmitter, hullImpactEmitter, armorDamageShader, shieldImpactMesh, shieldIsEllipsoid) {
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
    SetSeed(seed) {
      this.seed = Number(seed) >>> 0;
      return true;
    }

    /**
     * Records how many damage locators the owning object exposes; derived from the
     * owner at lifecycle time, so it is deliberately kept out of the values
     * interchange.
     */
    SetDamageLocatorCount(count) {
      this.#damageLocatorCount = Number(count) >>> 0;
      return true;
    }

    /**
     * Number of damage locators the owning object exposes, as last recorded by
     * SetDamageLocatorCount.
     */
    GetDamageLocatorCount() {
      return this.#damageLocatorCount;
    }

    /** Seconds an armour impact stays alive before it is retired. */
    GetArmorImpactLifeTime() {
      return this.#armorImpactLifeTime;
    }

    /**
     * Copies the last recorded shield, armour and hull damage state.
     * @param {Array} out - caller-owned vec3; a fresh vector is allocated when omitted
     * @returns {Array} out
     */
    GetLastDamageState(out = vec3.create()) {
      return vec3.copy(out, this.#lastDamageState);
    }

    /**
     * Row offset of this overlay's block in the shared impact data texture, or -1
     * while it has no block.
     */
    GetDataTextureOffset() {
      return this.#dataTextureOffset;
    }

    /** Which ImpactConfiguration this overlay was authored for. */
    GetImpactConfiguration() {
      return this.configuration;
    }

    /**
     * Whether the shield is presented as a generated ellipsoid rather than the
     * authored shield impact mesh.
     */
    HasShieldEllipsoid() {
      return this.shieldIsEllipsoid;
    }

    /**
     * Starts a fade on the named shield, armour or hull effect; the fade runs over a quarter of the requested duration.
     * @param {String} name - one of shieldboost, shieldhardening, armorhardening, armorrepair, hullrepair
     * @returns {Boolean} false when the name matches no fader
     */
    ToggleEffect(name, on, duration) {
      const fader = _EveImpactOverlay.#effectFader(this, name);
      if (!fader) return false;
      fader.StartFade(!!on, Number(duration) / 4);
      return true;
    }

    /**
     * Maps an effect name to the fader that drives it, or null when the name is
     * unknown.
     */
  }];
  #effectFader(overlay, name) {
    switch (name) {
      case "shieldboost":
        return overlay.shieldBoosting;
      case "shieldhardening":
        return overlay.shieldHardening;
      case "armorhardening":
        return overlay.armorHardening;
      case "armorrepair":
        return overlay.armorRepairing;
      case "hullrepair":
        return overlay.hullRepairing;
      default:
        return null;
    }
  }
  ImpactConfiguration = ImpactConfiguration;
  constructor() {
    super(_EveImpactOverlay), _initClass();
  }
}();

export { _EveImpactOverlay as EveImpactOverlay };
//# sourceMappingURL=EveImpactOverlay.js.map
