import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Model as _Tr2Model } from './Tr2Model.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_geometryResPath, _init_extra_geometryResPath, _init_geometryRes, _init_extra_geometryRes, _init_skeletonName, _init_extra_skeletonName, _init_skinScale, _init_extra_skinScale;

/** Tr2SkinnedModel (trinityCore) - generated from schema shapeHash 026a62f4.... */
let _Tr2SkinnedModel;
class Tr2SkinnedModel extends _Tr2Model {
  static {
    ({
      e: [_init_geometryResPath, _init_extra_geometryResPath, _init_geometryRes, _init_extra_geometryRes, _init_skeletonName, _init_extra_skeletonName, _init_skinScale, _init_extra_skinScale, _initProto],
      c: [_Tr2SkinnedModel, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SkinnedModel",
      family: "trinityCore"
    })], [[[io, io.notify, io, io.persist, type, type.string], 16, "geometryResPath"], [[io, io.read, void 0, type.objectRef("TriGeometryRes")], 16, "geometryRes"], [[io, io.notify, io, io.persist, type, type.string], 16, "skeletonName"], [[io, io.persist, type, type.vec3], 16, "skinScale"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Compares cached JavaScript values because the cooperative mutation hook does not receive native Be::Var field handles; resource acquisition remains outside runtime-character.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "ReleaseCachedData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Consumes the structural TriGeometryRes skeleton-query surface supplied by an outer resource adapter.")], 18, "RebuildCachedData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Returns the selected structural geometry-resource skeleton object rather than a native pointer.")], 18, "GetSkeleton"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Uses JavaScript bone-name arrays and structural mesh BindToRig methods instead of native string pointers and mesh objects.")], 18, "BindToRig"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetBindings"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetAnimationBindings"]], 0, void 0, _Tr2Model));
  }
  constructor(...args) {
    super(...args);
    _init_extra_skinScale(this);
  }
  #areAllMeshesBound = (_initProto(this), false);
  #boneList = null;
  #cachedGeometryResPath = "";
  #cachedSkeletonName = "";
  #skeletonIndex = -1;
  #skeletonResource = null;

  /** m_geometryResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  geometryResPath = _init_geometryResPath(this, "");

  /** m_geometryRes (TriGeometryResPtr) [READ] */
  geometryRes = (_init_extra_geometryResPath(this), _init_geometryRes(this, null));

  /** m_skeletonName (std::string) [READWRITE, NOTIFY, PERSIST] */
  skeletonName = (_init_extra_geometryRes(this), _init_skeletonName(this, ""));

  /** m_skinScale (Vector3) [READWRITE, PERSIST] */
  skinScale = (_init_extra_skeletonName(this), _init_skinScale(this, vec3.fromValues(1, 1, 1)));

  /** Carbon INotify hook: refreshes the selected skeleton from an already supplied resource. */
  OnModified(_options = {}) {
    if (this.#skeletonResource !== this.geometryRes || this.#cachedGeometryResPath !== this.geometryResPath || this.#cachedSkeletonName !== this.skeletonName) {
      this.RebuildCachedData(this.geometryRes);
    }
    return true;
  }

  /** Carbon resource-notify hook: clears the selected skeleton index. */
  ReleaseCachedData(_resource = null) {
    this.#skeletonIndex = -1;
  }

  /** Carbon resource-notify hook: selects the exact named skeleton. */
  RebuildCachedData(resource = this.geometryRes) {
    this.#skeletonIndex = -1;
    this.#skeletonResource = resource ?? null;
    this.#cachedGeometryResPath = this.geometryResPath;
    this.#cachedSkeletonName = this.skeletonName;
    if (!resource || typeof resource.GetSkeletonCount !== "function" || typeof resource.GetSkeletonData !== "function") {
      return;
    }
    const count = Number(resource.GetSkeletonCount());
    if (!Number.isInteger(count) || count < 0) {
      throw new TypeError("Tr2SkinnedModel geometry resource returned an invalid skeleton count");
    }
    for (let index = 0; index < count; index++) {
      const skeleton = resource.GetSkeletonData(index);
      const name = skeleton?.name ?? skeleton?.m_name;
      if (name === this.skeletonName) {
        this.#skeletonIndex = index;
        break;
      }
    }
  }

  /** Carbon native method GetSkeleton. */
  GetSkeleton() {
    if (this.#skeletonIndex < 0 || !this.#skeletonResource || typeof this.#skeletonResource.GetSkeletonData !== "function") {
      return null;
    }
    return this.#skeletonResource.GetSkeletonData(this.#skeletonIndex) ?? null;
  }

  /** Carbon native method BindToRig. */
  BindToRig(boneList, numBones = boneList?.length ?? 0, forceRebind = false) {
    if (!forceRebind && boneList === this.#boneList && this.#areAllMeshesBound) {
      return;
    }
    const skeleton = this.GetSkeleton();
    if (!skeleton) {
      return;
    }
    if (boneList === null || boneList === undefined) {
      this.#boneList = null;
      this.#areAllMeshesBound = false;
      return;
    }
    if (!Array.isArray(boneList)) {
      throw new TypeError("Tr2SkinnedModel.BindToRig requires a bone-name array or null");
    }
    const count = Number(numBones);
    if (!Number.isInteger(count) || count < 0 || count > boneList.length) {
      throw new TypeError("Tr2SkinnedModel.BindToRig received an invalid bone count");
    }
    const rebind = forceRebind || !this.#areAllMeshesBound;
    this.#areAllMeshesBound = true;
    for (const mesh of this.meshes) {
      if (!mesh || typeof mesh.BindToRig !== "function" || mesh.BindToRig(boneList, count, skeleton, rebind) === false) {
        this.#areAllMeshesBound = false;
      }
    }
    this.#boneList = boneList;
  }

  /** Carbon native method ResetBindings. */
  ResetBindings() {
    this.#areAllMeshesBound = false;
  }

  /** Carbon method ResetAnimationBindings -> ResetBindings (MAP_METHOD_AND_WRAP). */
  ResetAnimationBindings() {
    this.ResetBindings();
  }
  static {
    _initClass();
  }
}

export { _Tr2SkinnedModel as Tr2SkinnedModel };
//# sourceMappingURL=Tr2SkinnedModel.js.map
