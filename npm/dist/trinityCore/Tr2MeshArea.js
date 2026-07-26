import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_index, _init_extra_index, _init_count, _init_extra_count, _init_reversed, _init_extra_reversed, _init_useSHLighting, _init_extra_useSHLighting, _init_effect, _init_extra_effect, _init_castsShadows, _init_extra_castsShadows, _init_generateDepthArea, _init_extra_generateDepthArea, _init_minLod, _init_extra_minLod;

/**
 * One drawable range of a mesh: the index and count of geometry groups plus the
 * effect, shadow, depth and LOD state that decide how the range is batched.
 */
let _Tr2MeshArea;
class Tr2MeshArea extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_display, _init_extra_display, _init_index, _init_extra_index, _init_count, _init_extra_count, _init_reversed, _init_extra_reversed, _init_useSHLighting, _init_extra_useSHLighting, _init_effect, _init_extra_effect, _init_castsShadows, _init_extra_castsShadows, _init_generateDepthArea, _init_extra_generateDepthArea, _init_minLod, _init_extra_minLod, _initProto],
      c: [_Tr2MeshArea, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2MeshArea",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[void 0, io.rebuild("batches"), io, io.persist, type, type.int32], 16, "index"], [[void 0, io.rebuild("batches"), io, io.persist, type, type.int32], 16, "count"], [[void 0, io.rebuild("batches"), io, io.persistOnly, type, type.boolean], 16, "reversed"], [[void 0, io.rebuild("batches"), io, io.persist, type, type.boolean], 16, "useSHLighting"], [[void 0, io.rebuild("batches"), io, io.notify, io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[void 0, io.rebuild("batches"), io, io.persist, type, type.boolean], 16, "castsShadows"], [[void 0, io.rebuild("batches"), io, io.persist, type, type.boolean], 16, "generateDepthArea"], [[void 0, io.rebuild("batches"), io, io.persist, type, type.int32], 16, "minLod"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDisplay"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDisplay"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetReversed"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsReversed"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetReversed"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetUseSHLighting"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetUseSHLighting"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMaterialInterface"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMaterial"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsCastingShadows"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetCastsShadows"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetGenerateDepthArea"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetGenerateDepthArea"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMinLod"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMinLod"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetJointCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetJointCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetJointMappingAnimRig"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetJointMappingAnimRig"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyFrom"]], 0, void 0, CjsModel));
  }
  name = (_initProto(this), _init_name(this, ""));
  display = (_init_extra_name(this), _init_display(this, true));
  index = (_init_extra_display(this), _init_index(this, 0));
  count = (_init_extra_index(this), _init_count(this, 1));
  reversed = (_init_extra_count(this), _init_reversed(this, false));
  useSHLighting = (_init_extra_reversed(this), _init_useSHLighting(this, false));
  effect = (_init_extra_useSHLighting(this), _init_effect(this, null));

  // DIVERGENCE (deliberate, precedent: EvePlaneSetItem.blinkData): Carbon
  // keeps these three as private runtime state stamped by SOF through
  // setters. The JS values path has no setter side channel, so they are
  // schema-backed here so SOF-authored shadow/depth/LOD state survives
  // values exchange. Without them every area defaults to shadow-casting.

  /** m_castsShadows - per-batch-type shadow participation (SOF-stamped). */
  castsShadows = (_init_extra_effect(this), _init_castsShadows(this, true));

  /** m_generateDepthArea - authored depth-area participation (SOF-stamped). */
  generateDepthArea = (_init_extra_castsShadows(this), _init_generateDepthArea(this, false));

  /** m_minLod (Tr2Lod) - minimal visible lod; TR2_LOD_UNSPECIFIED = -1. */
  minLod = (_init_extra_generateDepthArea(this), _init_minLod(this, -1));

  /** m_jointCount - skinning joint count, fed by Tr2MeshBase.BindToRig. */
  #jointCount = (_init_extra_minLod(this), 0);

  /** m_jointMappingAnimRig - shared joint mapping owned by the parent mesh. */
  #jointMappingAnimRig = null;

  /** First geometry group of the area's range. */
  GetIndex() {
    return this.index;
  }

  /**
   * Sets the first geometry group, coerced to a signed integer; schedules the
   * batches rebuild.
   */
  SetIndex(value) {
    this.index = Number(value) | 0;
  }

  /** Number of geometry groups in the area's range. */
  GetCount() {
    return this.count;
  }

  /**
   * Sets the group count, coerced to a signed integer; schedules the batches
   * rebuild.
   */
  SetCount(value) {
    this.count = Number(value) | 0;
  }

  /** Whether the area is drawn; a hidden area emits no batch. */
  GetDisplay() {
    return this.display;
  }

  /** Shows or hides the area. */
  SetDisplay(value) {
    this.display = !!value;
  }

  /** Whether the area is drawn with reversed winding. */
  GetReversed() {
    return this.reversed;
  }

  /** Carbon's second name for GetReversed. */
  IsReversed() {
    return this.reversed;
  }

  /** Sets the reversed-winding flag; schedules the batches rebuild. */
  SetReversed(value) {
    this.reversed = !!value;
  }

  /** Whether the area is lit with spherical-harmonic lighting. */
  GetUseSHLighting() {
    return this.useSHLighting;
  }

  /** Sets the spherical-harmonic lighting flag; schedules the batches rebuild. */
  SetUseSHLighting(value) {
    this.useSHLighting = !!value;
  }

  /**
   * The area's effect, which serves as its material and shader key during batch
   * collection; null areas produce no batch.
   */
  GetMaterialInterface() {
    return this.effect;
  }

  /** Binds the effect used as this area's material. */
  SetMaterial(value) {
    this.effect = value ?? null;
  }

  /**
   * The authored area name, which SOF and effect bindings use to address this
   * area of the mesh.
   */
  GetName() {
    return this.name;
  }

  /** Sets the area name, coercing null to an empty string. */
  SetName(value) {
    this.name = String(value ?? "");
  }

  /**
   * Whether the area takes part in shadow and overlay area-block collection; SOF
   * stamps this per batch type and it defaults to true.
   */
  IsCastingShadows() {
    return this.castsShadows;
  }

  /** Sets shadow participation; schedules the batches rebuild. */
  SetCastsShadows(value) {
    this.castsShadows = !!value;
  }

  /** Whether the authored area participates in depth-area generation. */
  GetGenerateDepthArea() {
    return this.generateDepthArea;
  }

  /** Sets depth-area participation; schedules the batches rebuild. */
  SetGenerateDepthArea(value) {
    this.generateDepthArea = !!value;
  }

  /**
   * Lowest LOD at which the area is visible; -1 (TR2_LOD_UNSPECIFIED) means
   * unrestricted.
   */
  GetMinLod() {
    return this.minLod;
  }

  /** Sets the minimum visible LOD, coerced to a signed integer. */
  SetMinLod(lod) {
    this.minLod = Number(lod) | 0;
  }

  /** Skinning joint count, filled in when the parent mesh binds to a rig. */
  GetJointCount() {
    return this.#jointCount;
  }

  /**
   * Sets the skinning joint count; CopyFrom deliberately resets it to zero for a
   * new owner.
   */
  SetJointCount(value) {
    this.#jointCount = Number(value) >>> 0;
  }

  /**
   * The joint mapping array; it is owned by the parent mesh and shared by every
   * area, so it must not be mutated here.
   */
  GetJointMappingAnimRig() {
    return this.#jointMappingAnimRig;
  }

  /**
   * The provided array is NOT owned by this instance, it is owned by the
   * parent mesh; each mesh area shares the same array.
   */
  SetJointMappingAnimRig(value) {
    this.#jointMappingAnimRig = value ?? null;
  }

  /**
   * Carbon's operator= - copies authored fields and deliberately resets the
   * joint state, which BindToRig must rebuild for the new owner.
   */
  CopyFrom(other) {
    this.name = other.name;
    this.index = other.index;
    this.count = other.count;
    this.reversed = other.reversed;
    this.effect = other.effect;
    this.#jointCount = 0;
    this.#jointMappingAnimRig = null;
    this.display = other.display;
    this.useSHLighting = other.useSHLighting;
    this.generateDepthArea = other.GetGenerateDepthArea();
    return this;
  }
  static {
    _initClass();
  }
}

export { _Tr2MeshArea as Tr2MeshArea };
//# sourceMappingURL=Tr2MeshArea.js.map
